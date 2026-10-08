import { config } from "@/api/config";
import { ErroApi, codigoDoStatus, type ErroCampo } from "@/api/erros";
import { supabase, tokenAtual } from "@/api/supabase";

/** O status HTTP vira o código estável da interface (0 = sem resposta do servidor). */
const erroApi = (status: number, mensagem: string, campos: ErroCampo[] = []) =>
  new ErroApi(status === 0 ? "rede" : codigoDoStatus(status), mensagem, status, campos);

/** Token da sessão atual; sem Supabase configurado ou sem login, null. */
export async function obterToken(): Promise<string | null> {
  try {
    return await tokenAtual();
  } catch {
    return null;
  }
}

/** Força a renovação do token; null se a sessão não pode mais ser renovada. */
export async function renovarToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase().auth.refreshSession();
    return error ? null : (data.session?.access_token ?? null);
  } catch {
    return null;
  }
}

export type Parametros = Record<string, string | number | string[] | undefined | null>;

export type OpcoesApi = {
  sinal?: AbortSignal;
  timeoutMs?: number;
  /** Envia o header Idempotency-Key (ex.: checkout, para duplo clique não comprar duas vezes). */
  idempotencia?: string;
  /** Rotas públicas (catálogo) não mandam token nem tentam renovar a sessão. */
  semToken?: boolean;
};

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Pedido = { metodo: Metodo; corpo?: unknown };

type Dependencias = {
  baseUrl: string;
  obterToken: () => Promise<string | null>;
  renovarToken: () => Promise<string | null>;
  /** Chamado quando a sessão acabou de vez (sem token, ou 401 mesmo depois de renovar). */
  aoSessaoExpirar?: () => void;
  buscar?: typeof fetch;
};

const TIMEOUT_PADRAO_MS = 15_000;
const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

function validarBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" && !LOCAL.has(url.hostname)) {
    throw new Error("VITE_API_URL precisa usar HTTPS fora do ambiente local.");
  }
  return baseUrl.replace(/\/+$/, "");
}

/** O que o FastAPI responde quando a ROTA não existe (as nossas respostas 404 vêm em português). */
const ROTA_INEXISTENTE = "Not Found";

function mensagemDoStatus(status: number, detalhe: unknown): string {
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  // Rota que o servidor não tem: backend desatualizado, e não "registro não encontrado".
  if (status === 404 && detalhe === ROTA_INEXISTENTE)
    return "Esta função ainda não existe no servidor. Atualize o backend e reinicie a API.";
  // O backend responde 403, 404, 409 e 422 com a explicação em português ("X já assumiu este chamado").
  if ([403, 404, 409, 422].includes(status) && typeof detalhe === "string" && detalhe) return detalhe;
  if (status === 403) return "Você não tem permissão para ver estes dados.";
  if (status === 404) return "Não encontramos este registro.";
  if (status === 409) return "Este registro mudou enquanto você olhava. Atualize e tente de novo.";
  if (status === 429) return "Muitas requisições. Aguarde um instante e tente de novo.";
  if (status >= 500) return "O servidor está indisponível no momento. Tente de novo em instantes.";
  return "Não foi possível carregar os dados.";
}

type CorpoDeErro = { detalhe?: unknown; campos: ErroCampo[] };

/** Lê `detail` e, na validação (422), a lista `campos` que o backend manda em português. */
async function corpoDoErro(resposta: Response): Promise<CorpoDeErro> {
  try {
    const corpo: unknown = await resposta.json();
    if (!corpo || typeof corpo !== "object") return { campos: [] };
    const { detail, campos } = corpo as { detail?: unknown; campos?: unknown };
    const lista = Array.isArray(campos)
      ? campos.filter(
          (c): c is ErroCampo =>
            !!c && typeof (c as ErroCampo).campo === "string" && typeof (c as ErroCampo).mensagem === "string",
        )
      : [];
    return { detalhe: detail, campos: lista };
  } catch {
    return { campos: [] };
  }
}

function montarUrl(baseUrl: string, caminho: string, parametros?: Parametros): string {
  const consulta = new URLSearchParams();
  for (const [nome, valor] of Object.entries(parametros ?? {})) {
    if (Array.isArray(valor)) valor.forEach((item) => consulta.append(nome, item));
    else if (valor !== undefined && valor !== null && valor !== "") consulta.set(nome, String(valor));
  }
  const texto = consulta.toString();
  return `${baseUrl}${caminho}${texto ? `?${texto}` : ""}`;
}

/** Junta o cancelamento de quem chamou com o timeout, sem vazar listeners. */
function sinalComTimeout(sinal: AbortSignal | undefined, ms: number) {
  const controle = new AbortController();
  const temporizador = setTimeout(() => controle.abort(new DOMException("timeout", "TimeoutError")), ms);
  const aoCancelar = () => controle.abort(sinal?.reason);
  if (sinal?.aborted) aoCancelar();
  sinal?.addEventListener("abort", aoCancelar, { once: true });
  return {
    sinal: controle.signal,
    limpar() {
      clearTimeout(temporizador);
      sinal?.removeEventListener("abort", aoCancelar);
    },
  };
}

export function criarClienteApi(dependencias: Dependencias) {
  const baseUrl = validarBaseUrl(dependencias.baseUrl);
  const buscar = dependencias.buscar ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function requisitar(
    caminho: string,
    parametros: Parametros | undefined,
    token: string | null,
    opcoes: OpcoesApi,
    pedido: Pedido,
  ): Promise<Response> {
    const tempo = sinalComTimeout(opcoes.sinal, opcoes.timeoutMs ?? TIMEOUT_PADRAO_MS);
    const cabecalhos: Record<string, string> = { Accept: "application/json" };
    if (token) cabecalhos.Authorization = `Bearer ${token}`;
    if (opcoes.idempotencia) cabecalhos["Idempotency-Key"] = opcoes.idempotencia;
    if (pedido.corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
    try {
      return await buscar(montarUrl(baseUrl, caminho, parametros), {
        method: pedido.metodo,
        headers: cabecalhos,
        body: pedido.corpo === undefined ? undefined : JSON.stringify(pedido.corpo),
        signal: tempo.sinal,
      });
    } catch (erro) {
      // Quem cancelou (troca de filtro, desmontagem) não quer mensagem de erro.
      if (opcoes.sinal?.aborted) throw erro;
      if (tempo.sinal.aborted) throw erroApi(0, "O servidor demorou demais para responder.");
      throw erroApi(0, "Sem conexão com o servidor. Verifique sua internet.");
    } finally {
      tempo.limpar();
    }
  }

  /**
   * Chamada autenticada. Em 401 renova o token uma vez e repete (seguro também para POST: 401 quer
   * dizer que nada foi executado); se ainda falhar, a sessão acabou. `validar` confere o formato da
   * resposta antes de qualquer tela usá-la.
   */
  async function chamar<T>(
    pedido: Pedido,
    caminho: string,
    validar: (dados: unknown) => T,
    parametros: Parametros | undefined,
    opcoes: OpcoesApi,
  ): Promise<T> {
    const sessaoAcabou = () => {
      dependencias.aoSessaoExpirar?.();
      return erroApi(401, mensagemDoStatus(401, undefined));
    };
    let token = opcoes.semToken ? null : await dependencias.obterToken();
    if (!opcoes.semToken && !token) throw sessaoAcabou();

    let resposta = await requisitar(caminho, parametros, token, opcoes, pedido);
    if (resposta.status === 401 && !opcoes.semToken) {
      token = await dependencias.renovarToken();
      if (!token) throw sessaoAcabou();
      resposta = await requisitar(caminho, parametros, token, opcoes, pedido);
      if (resposta.status === 401) throw sessaoAcabou();
    }

    if (!resposta.ok) {
      const { detalhe, campos } = await corpoDoErro(resposta);
      throw erroApi(resposta.status, mensagemDoStatus(resposta.status, detalhe), campos);
    }

    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch {
      throw erroApi(502, "Resposta inesperada do servidor.");
    }
    try {
      return validar(corpo);
    } catch {
      throw erroApi(502, "Resposta inesperada do servidor.");
    }
  }

  const get = <T>(
    caminho: string,
    validar: (dados: unknown) => T,
    parametros?: Parametros,
    opcoes: OpcoesApi = {},
  ) => chamar({ metodo: "GET" }, caminho, validar, parametros, opcoes);

  const post = <T>(
    caminho: string,
    validar: (dados: unknown) => T,
    corpo?: unknown,
    opcoes: OpcoesApi = {},
  ) => chamar({ metodo: "POST", corpo: corpo ?? {} }, caminho, validar, undefined, opcoes);

  const put = <T>(
    caminho: string,
    validar: (dados: unknown) => T,
    corpo?: unknown,
    opcoes: OpcoesApi = {},
  ) => chamar({ metodo: "PUT", corpo: corpo ?? {} }, caminho, validar, undefined, opcoes);

  const patch = <T>(
    caminho: string,
    validar: (dados: unknown) => T,
    corpo?: unknown,
    opcoes: OpcoesApi = {},
  ) => chamar({ metodo: "PATCH", corpo: corpo ?? {} }, caminho, validar, undefined, opcoes);

  const del = <T>(
    caminho: string,
    validar: (dados: unknown) => T,
    parametros?: Parametros,
    opcoes: OpcoesApi = {},
  ) => chamar({ metodo: "DELETE" }, caminho, validar, parametros, opcoes);

  return { get, post, put, patch, delete: del };
}

const baseUrlPadrao = config.apiUrl || "http://127.0.0.1:8000";

let aoSessaoExpirar: () => void = () => undefined;

/** A sessão registra aqui o que fazer quando o servidor recusa o token de vez: volta para o login. */
export function definirAoSessaoExpirar(acao: () => void) {
  aoSessaoExpirar = acao;
}

/** Dispara a ação registrada (o cliente do portal usa a mesma, para a sessão ter um fim só). */
export const avisarSessaoExpirada = () => aoSessaoExpirar();

export const api = criarClienteApi({
  baseUrl: baseUrlPadrao,
  obterToken,
  renovarToken,
  aoSessaoExpirar: avisarSessaoExpirada,
});
