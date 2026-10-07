/**
 * Configuração da integração com o backend, lida das variáveis VITE_* (ver .env.example).
 *
 * - "simulado": dados em memória (protótipo), sem backend. É o padrão.
 * - "api": Supabase (leituras simples, Auth, Realtime, Storage) + FastAPI (ações sensíveis).
 */
export type FonteDados = "simulado" | "api";

const env = import.meta.env;

export const config = {
  fonte: (env.VITE_FONTE_DADOS === "api" ? "api" : "simulado") as FonteDados,
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
