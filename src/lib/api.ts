import { config } from "@/api/config";
import { ErroApi, type CodigoErro } from "@/api/erros";
import { supabase, tokenAtual } from "@/api/supabase";

/** Mesmo ErroApi do resto do front: o status HTTP vira o código estável da interface. */
function codigoDoStatus(status: number): CodigoErro {
  if (status === 0) return "rede";
  if (status === 401) return "nao_autenticado";
  if (status === 403) return "sem_permissao";
  if (status === 404) return "nao_encontrado";
  if (status === 409) return "conflito";
  if (status === 422) return "validacao";
  if (status === 429) return "limite";
  return "servidor";
}

const erroApi = (status: number, mensagem: string) => new ErroApi(codigoDoStatus(status), mensagem, status);

/** Token da sessão atual; sem Supabase configurado ou sem login, null. */
async function obterToken(): Promise<string | null> {
  try {
    return await tokenAtual();
  } catch {
    return null;
  }
}

/** Força a renovação do token; null se a sessão não pode mais ser renovada. */
async function renovarToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase().auth.refreshSession();
    return error ? null : (data.session?.access_token ?? null);
  } catch {
    return null;
  }
}

export type Parametros = Record<string, string | number | undefined | null>;

export type OpcoesApi = {
  sinal?: AbortSignal;
  timeoutMs?: number;
};

type Dependencias = {
  baseUrl: string;
  obterToken: () => Promise<string | null>;
  renovarToken: () => Promise<string | null>;
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

function mensagemDoStatus(status: number, detalhe: unknown): string {
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 403) return "Você não tem permissão para ver estes dados.";
  if (status === 429) return "Muitas requisições. Aguarde um instante e tente de novo.";
  if (status === 422 && typeof detalhe === "string") return detalhe;
  if (status >= 500) return "O servidor está indisponível no momento. Tente de novo em instantes.";
  return "Não foi possível carregar os dados.";
}

async function detalheDoCorpo(resposta: Response): Promise<unknown> {
  try {
    const corpo: unknown = await resposta.json();
    return corpo && typeof corpo === "object" ? (corpo as { detail?: unknown }).detail : undefined;
  } catch {
    return undefined;
  }
}

function montarUrl(baseUrl: string, caminho: string, parametros?: Parametros): string {
  const consulta = new URLSearchParams();
  for (const [nome, valor] of Object.entries(parametros ?? {})) {
    if (valor !== undefined && valor !== null && valor !== "") consulta.set(nome, String(valor));
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
    token: string,
    opcoes: OpcoesApi,
  ): Promise<Response> {
    const tempo = sinalComTimeout(opcoes.sinal, opcoes.timeoutMs ?? TIMEOUT_PADRAO_MS);
    try {
      return await buscar(montarUrl(baseUrl, caminho, parametros), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
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
   * GET autenticado. Em 401 renova o token uma vez e repete; se ainda falhar, a sessão acabou.
   * `validar` confere o formato da resposta antes de qualquer tela usá-la.
   */
  async function get<T>(
    caminho: string,
    validar: (dados: unknown) => T,
    parametros?: Parametros,
    opcoes: OpcoesApi = {},
  ): Promise<T> {
    let token = await dependencias.obterToken();
    if (!token) throw erroApi(401, mensagemDoStatus(401, undefined));

    let resposta = await requisitar(caminho, parametros, token, opcoes);
    if (resposta.status === 401) {
      token = await dependencias.renovarToken();
      if (!token) throw erroApi(401, mensagemDoStatus(401, undefined));
      resposta = await requisitar(caminho, parametros, token, opcoes);
    }

    if (!resposta.ok) {
      const detalhe = await detalheDoCorpo(resposta);
      throw erroApi(resposta.status, mensagemDoStatus(resposta.status, detalhe));
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

  return { get };
}

const baseUrlPadrao = config.apiUrl || "http://127.0.0.1:8000";

export const api = criarClienteApi({ baseUrl: baseUrlPadrao, obterToken, renovarToken });
