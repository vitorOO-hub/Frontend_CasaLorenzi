/// <reference types="vite/client" />

/** Variáveis de ambiente do front (ver .env.example). Só valores públicos: nunca a service role key. */
interface ImportMetaEnv {
  readonly VITE_FONTE_DADOS?: "simulado" | "api";
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_BUCKET_ANEXOS?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
