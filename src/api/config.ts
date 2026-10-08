/**
 * Configuração da integração com o backend, lida das variáveis VITE_* (ver .env.example).
 *
 * - "simulado": dados em memória (protótipo), sem backend. Padrão só quando falta configuração.
 * - "api": Supabase (leituras simples, Auth, Realtime, Storage) + FastAPI (ações sensíveis).
 */
export type FonteDados = "simulado" | "api";

const env = import.meta.env;

/**
 * Qual fonte o app usa. Com a API e o Supabase configurados o padrão é "api": o modo simulado mostra
 * os mesmos dados de exemplo a qualquer pessoa logada, então só vale se for pedido de propósito
 * (VITE_FONTE_DADOS=simulado) ou se faltar configuração.
 */
export function escolherFonte(valores: {
  fonte?: string;
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}): FonteDados {
  if (valores.fonte === "simulado") return "simulado";
  if (valores.fonte === "api") return "api";
  return valores.apiUrl && valores.supabaseUrl && valores.supabaseAnonKey ? "api" : "simulado";
}

export const config = {
  fonte: escolherFonte({
    fonte: env.VITE_FONTE_DADOS,
    apiUrl: env.VITE_API_URL,
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
  }),
  /** Base do FastAPI, sem barra no fim. As rotas ficam em `${apiUrl}/api/v1/...`. */
  apiUrl: (env.VITE_API_URL ?? "").replace(/\/+$/, ""),
  supabaseUrl: env.VITE_SUPABASE_URL ?? "",
  /** Chave pública (anon). A service role key nunca entra no front. */
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY ?? "",
  /** Bucket do Storage onde ficam os anexos de chamado. */
  bucketAnexos: env.VITE_SUPABASE_BUCKET_ANEXOS ?? "chamado-anexos",
  /** Tempo máximo de uma chamada ao FastAPI, em milissegundos. */
  timeoutMs: Number(env.VITE_API_TIMEOUT_MS ?? 15000),
};

export const usandoApi = () => config.fonte === "api";

/** Lista o que falta para ligar o modo "api"; vazio quando está tudo configurado. */
export function faltandoParaApi(): string[] {
  const faltas: string[] = [];
  if (!config.apiUrl) faltas.push("VITE_API_URL");
  if (!config.supabaseUrl) faltas.push("VITE_SUPABASE_URL");
  if (!config.supabaseAnonKey) faltas.push("VITE_SUPABASE_ANON_KEY");
  return faltas;
}
