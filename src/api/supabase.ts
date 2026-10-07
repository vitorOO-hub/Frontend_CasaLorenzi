import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, faltandoParaApi } from "./config";
import { ErroApi } from "./erros";

let cliente: SupabaseClient | null = null;

/**
 * Cliente Supabase com a chave pública (anon): tudo o que ele lê ou escreve passa pelas
 * políticas de RLS. Criado só na primeira chamada, para o modo simulado não exigir as variáveis.
 */
export function supabase(): SupabaseClient {
  if (cliente) return cliente;
  const faltas = faltandoParaApi().filter((v) => v.startsWith("VITE_SUPABASE"));
  if (faltas.length) throw new ErroApi("configuracao", `Faltam variáveis de ambiente: ${faltas.join(", ")}.`);
  cliente = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cliente;
}

/** Access token (JWT) da sessão atual, ou null sem login. */
export async function tokenAtual(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}
