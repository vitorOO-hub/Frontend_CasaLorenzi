/**
 * Login pelo Supabase Auth (seção 3): o front não guarda senha nem emite token.
 * O papel e a loja do usuário interno viajam no JWT, gravados pelo Custom Access Token Hook.
 * Estas claims servem só para montar a tela; quem decide permissão é o backend/RLS.
 */
import { ErroApi } from "./erros";
import { supabase } from "./supabase";
import { PAPEIS, type ClaimsToken, type Id, type Papel, type Uuid } from "./tipos";

export type SessaoApi =
  | { tipo: "cliente"; id: Uuid; email: string }
  | { tipo: "interno"; id: Uuid; email: string; papel: Papel; idLoja: Id | null };

/** Lê o payload do JWT (base64url) sem validar a assinatura: validar é papel do backend. */
export function lerClaims(token: string): ClaimsToken {
  const parte = token.split(".")[1];
  if (!parte) throw new ErroApi("nao_autenticado");
  const base64 = parte.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parte.length / 4) * 4, "=");
  const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  return JSON.parse(json) as ClaimsToken;
}

export function sessaoDoToken(token: string): SessaoApi {
  const c = lerClaims(token);
  const email = c.email ?? "";
  if (c.papel && (PAPEIS as readonly string[]).includes(c.papel)) {
    return { tipo: "interno", id: c.sub, email, papel: c.papel, idLoja: c.loja_id ?? null };
  }
  return { tipo: "cliente", id: c.sub, email };
}

/**
 * Só credenciais erradas viram "e-mail ou senha incorretos". Qualquer outro motivo (login por e-mail
 * desligado no projeto, limite de tentativas, Supabase fora do ar) mostra o que de fato aconteceu:
 * dizer "senha inválida" para uma falha de configuração faz a pessoa trocar de senha à toa.
 */
export function erroDoLogin(erro: { code?: string; status?: number; message?: string } | null): ErroApi {
  if (erro?.code === "email_provider_disabled")
    return new ErroApi("configuracao", "O login por e-mail e senha está desligado neste projeto do Supabase.", erro.status ?? 422);
  if (erro?.status === 429 || erro?.code === "over_request_rate_limit")
    return new ErroApi("limite", "Muitas tentativas de login. Aguarde um minuto e tente de novo.", 429);
  if (erro?.status && erro.status >= 500) return new ErroApi("servidor", undefined, erro.status);
  if (!erro) return new ErroApi("nao_autenticado", "E-mail ou senha incorretos.", 401);
  // Credenciais erradas, e-mail não confirmado e conta inexistente: sem distinguir, de propósito.
  const credenciais = ["invalid_credentials", "email_not_confirmed", "user_not_found", "validation_failed"];
  if (!erro.code || credenciais.includes(erro.code))
    return new ErroApi("nao_autenticado", "E-mail ou senha incorretos.", 401);
  return new ErroApi("servidor", undefined, erro.status ?? 0);
}

export async function entrar(email: string, senha: string): Promise<SessaoApi> {
  const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
  if (error || !data.session) throw erroDoLogin(error);
  return sessaoDoToken(data.session.access_token);
}

/** Cadastro de cliente. A linha em `cliente` é criada no banco a partir de auth.users. */
export async function cadastrarCliente(dados: { nome: string; email: string; senha: string }) {
  const { error } = await supabase().auth.signUp({
    email: dados.email.trim().toLowerCase(),
    password: dados.senha,
    options: { data: { nome: dados.nome } },
  });
  if (error) throw new ErroApi("validacao", error.message, 422);
}

export async function sairDaConta() {
  await supabase().auth.signOut();
}

export async function sessaoAtual(): Promise<SessaoApi | null> {
  const { data } = await supabase().auth.getSession();
  return data.session ? sessaoDoToken(data.session.access_token) : null;
}

/** Avisa quando a sessão muda (login, logout, renovação do token com papel novo). */
export function ouvirSessao(aoMudar: (s: SessaoApi | null) => void): () => void {
  const { data } = supabase().auth.onAuthStateChange((_evento, sessao) => {
    aoMudar(sessao ? sessaoDoToken(sessao.access_token) : null);
  });
  return () => data.subscription.unsubscribe();
}
