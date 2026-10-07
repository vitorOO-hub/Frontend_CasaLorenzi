import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente do Supabase Auth. Usa só a chave pública (anon/publishable); a service role nunca
 * entra no front. A sessão fica em sessionStorage, como o resto do estado da aba.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && chavePublica);

export const supabase: SupabaseClient | null =
  url && chavePublica
    ? createClient(url, chavePublica, {
        auth: {
          storage: typeof sessionStorage === "undefined" ? undefined : sessionStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

/** Token de acesso da sessão atual (o supabase-js renova sozinho quando está para vencer). */
export async function obterToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Força a renovação do token; devolve o novo ou null se a sessão não pode mais ser renovada. */
export async function renovarToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.refreshSession();
  return error ? null : (data.session?.access_token ?? null);
}
