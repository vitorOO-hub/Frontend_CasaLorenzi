import { config, faltandoParaApi } from "./config";
import { ErroApi, erroDaResposta } from "./erros";
import { supabase } from "./supabase";

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type OpcoesRequisicao = {
  corpo?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Envia o header Idempotency-Key (ex.: POST /pedidos contra duplo clique). */
  idempotencia?: string;
  /** Rotas públicas (ex.: /health) não mandam token. */
  semToken?: boolean;
};

/** Como o cliente HTTP obtém e renova o JWT do Supabase (trocável nos testes). */
export type FonteToken = { obter: () => Promise<string | null>; renovar: () => Promise<string | null> };

let fonteToken: FonteToken = {
  obter: async () => (await supabase().auth.getSession()).data.session?.access_token ?? null,
  renovar: async () => (await supabase().auth.refreshSession()).data.session?.access_token ?? null,
};

export function definirFonteToken(fonte: FonteToken) {
  fonteToken = fonte;
}

/** Chave nova para o header Idempotency-Key; gere uma por tentativa de compra, não por clique. */
export const novaChaveIdempotencia = () => crypto.randomUUID();

function montarUrl(caminho: string, params?: OpcoesRequisicao["params"]) {
  const url = new URL(`${config.apiUrl}/api/v1${caminho}`);
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== null && valor !== "") url.searchParams.set(chave, String(valor));
  }
  return url.toString();
}

async function enviar(metodo: Metodo, caminho: string, op: OpcoesRequisicao, token: string | null) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (op.corpo !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (op.idempotencia) headers["Idempotency-Key"] = op.idempotencia;

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), config.timeoutMs);
  try {
    return await fetch(montarUrl(caminho, op.params), {
      method: metodo,
      headers,
      body: op.corpo === undefined ? undefined : JSON.stringify(op.corpo),
      signal: controle.signal,
    });
  } catch {
    throw new ErroApi("rede");
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * Chamada ao FastAPI em /api/v1. Manda o JWT do Supabase como Bearer; se o servidor
 * responder 401, renova a sessão uma vez e repete. Erros viram ErroApi com mensagem em pt-BR.
 */
export async function requisitar<T>(metodo: Metodo, caminho: string, op: OpcoesRequisicao = {}): Promise<T> {
  if (!config.apiUrl) throw new ErroApi("configuracao", `Faltam variáveis de ambiente: ${faltandoParaApi().join(", ")}.`);

  let token = op.semToken ? null : await fonteToken.obter();
  let resposta = await enviar(metodo, caminho, op, token);
  if (resposta.status === 401 && !op.semToken) {
    token = await fonteToken.renovar();
    if (token) resposta = await enviar(metodo, caminho, op, token);
  }

  const texto = await resposta.text();
  let corpo: unknown = null;
  try {
    corpo = texto ? JSON.parse(texto) : null;
  } catch {
    corpo = null;
  }
  if (!resposta.ok) throw erroDaResposta(resposta.status, corpo);
  return corpo as T;
}

export const api = {
  get: <T>(caminho: string, params?: OpcoesRequisicao["params"]) => requisitar<T>("GET", caminho, { params }),
  post: <T>(caminho: string, corpo?: unknown, op?: Omit<OpcoesRequisicao, "corpo">) =>
    requisitar<T>("POST", caminho, { ...op, corpo }),
  put: <T>(caminho: string, corpo?: unknown) => requisitar<T>("PUT", caminho, { corpo }),
  patch: <T>(caminho: string, corpo?: unknown) => requisitar<T>("PATCH", caminho, { corpo }),
  delete: <T>(caminho: string) => requisitar<T>("DELETE", caminho),
};
