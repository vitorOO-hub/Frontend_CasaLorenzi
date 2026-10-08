import { avisarSessaoExpirada, criarClienteApi, obterToken, renovarToken, type Parametros } from "@/lib/api";
import { config, faltandoParaApi } from "./config";
import { ErroApi } from "./erros";

/**
 * Camada fina sobre o cliente HTTP único (`lib/api.ts`): só traduz o formato antigo
 * (`requisitar("GET", "/pedidos", { params })`, caminho relativo a /api/v1) para ele. Token,
 * renovação em 401, timeout e mapeamento de erros moram num lugar só.
 */

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type OpcoesRequisicao = {
  corpo?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Envia o header Idempotency-Key (ex.: POST /pedidos contra duplo clique). */
  idempotencia?: string;
  /** Rotas públicas (ex.: catálogo) não mandam token. */
  semToken?: boolean;
};

/** Como o cliente HTTP obtém e renova o JWT do Supabase (trocável nos testes). */
export type FonteToken = { obter: () => Promise<string | null>; renovar: () => Promise<string | null> };

let fonteToken: FonteToken = { obter: obterToken, renovar: renovarToken };

export function definirFonteToken(fonte: FonteToken) {
  fonteToken = fonte;
}

/** Chave nova para o header Idempotency-Key; gere uma por tentativa de compra, não por clique. */
export const novaChaveIdempotencia = () => crypto.randomUUID();

const comoParametros = (params: OpcoesRequisicao["params"]): Parametros =>
  Object.fromEntries(Object.entries(params ?? {}).map(([k, v]) => [k, v === undefined ? undefined : v === null ? null : String(v)]));

/** Chamada ao FastAPI em /api/v1. Erros viram ErroApi com mensagem em pt-BR. */
export async function requisitar<T>(metodo: Metodo, caminho: string, op: OpcoesRequisicao = {}): Promise<T> {
  if (!config.apiUrl) throw new ErroApi("configuracao", `Faltam variáveis de ambiente: ${faltandoParaApi().join(", ")}.`);

  const cliente = criarClienteApi({
    baseUrl: config.apiUrl,
    obterToken: fonteToken.obter,
    renovarToken: fonteToken.renovar,
    aoSessaoExpirar: avisarSessaoExpirada,
  });
  const url = `/api/v1${caminho}`;
  const validar = (dados: unknown) => dados as T;
  const opcoes = { idempotencia: op.idempotencia, semToken: op.semToken, timeoutMs: config.timeoutMs };
  switch (metodo) {
    case "GET":
      return cliente.get(url, validar, comoParametros(op.params), opcoes);
    case "POST":
      return cliente.post(url, validar, op.corpo, opcoes);
    case "PUT":
      return cliente.put(url, validar, op.corpo, opcoes);
    case "PATCH":
      return cliente.patch(url, validar, op.corpo, opcoes);
    case "DELETE":
      return cliente.delete(url, validar, comoParametros(op.params), opcoes);
  }
}

export const api = {
  get: <T>(caminho: string, params?: OpcoesRequisicao["params"]) => requisitar<T>("GET", caminho, { params }),
  post: <T>(caminho: string, corpo?: unknown, op?: Omit<OpcoesRequisicao, "corpo">) =>
    requisitar<T>("POST", caminho, { ...op, corpo }),
  put: <T>(caminho: string, corpo?: unknown) => requisitar<T>("PUT", caminho, { corpo }),
  patch: <T>(caminho: string, corpo?: unknown) => requisitar<T>("PATCH", caminho, { corpo }),
  delete: <T>(caminho: string) => requisitar<T>("DELETE", caminho),
};
