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
  // O Supabase só devolve este código depois de conferir a senha, então não revela contas alheias.
  if (erro.code === "email_not_confirmed")
    return new ErroApi("validacao", "Confirme seu e-mail primeiro: enviamos um link para a sua caixa de entrada (veja também o spam).", 401);
  // Credenciais erradas e conta inexistente: sem distinguir, de propósito.
  const credenciais = ["invalid_credentials", "user_not_found", "validation_failed"];
  if (!erro.code || credenciais.includes(erro.code))
    return new ErroApi("nao_autenticado", "E-mail ou senha incorretos.", 401);
  return new ErroApi("servidor", undefined, erro.status ?? 0);
}

export async function entrar(email: string, senha: string): Promise<SessaoApi> {
  const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
  if (error || !data.session) throw erroDoLogin(error);
  return sessaoDoToken(data.session.access_token);
}

/**
 * Traduz o erro do cadastro. Nunca confirma se um e-mail já existe de forma que ajude a descobrir
 * contas (a mensagem é genérica); o resto vira orientação para a pessoa.
 */
export function erroDoCadastro(erro: { code?: string; status?: number; message?: string }): ErroApi {
  if (erro.code === "email_provider_disabled" || erro.code === "signup_disabled")
    return new ErroApi("configuracao", "O cadastro por e-mail está desligado neste projeto do Supabase.", erro.status ?? 422);
  if (erro.status === 429 || erro.code === "over_request_rate_limit" || erro.code === "over_email_send_rate_limit")
    return new ErroApi("limite", "Muitas tentativas. Aguarde um minuto e tente de novo.", 429);
  if (erro.code === "weak_password")
    return new ErroApi("validacao", "Senha fraca. Use pelo menos 8 caracteres, com letras e números.", 422);
  if (erro.code === "email_address_invalid")
    return new ErroApi("validacao", "Informe um e-mail válido.", 422);
  if (erro.code === "user_already_exists" || erro.code === "email_exists")
    return new ErroApi("conflito", "Não foi possível criar a conta com estes dados. Se você já tem conta, entre por aqui.", 409);
  // O banco recusou os dados (ou o e-mail já era de outro cadastro): sem detalhes técnicos.
  if (erro.code === "unexpected_failure" || /database error/i.test(erro.message ?? ""))
    return new ErroApi("validacao", "Não foi possível criar a conta com estes dados. Confira tudo e tente de novo.", 422);
  if (erro.status && erro.status >= 500) return new ErroApi("servidor", undefined, erro.status);
  return new ErroApi("validacao", "Não foi possível criar a conta. Confira os dados e tente de novo.", erro.status ?? 422);
}

export type DadosDoCadastro = {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  cep: string;
  rua: string;
  bairro: string;
  numero: string;
  complemento?: string;
};

/**
 * Cadastro de cliente pelo Supabase Auth. Os dados vão nos metadados do usuário e um trigger no banco
 * cria a linha de `usuario` com cargo SEMPRE cliente: o cargo e a loja nunca vêm do navegador. Devolve
 * se a pessoa já ficou logada (o projeto pode exigir confirmação do e-mail antes).
 */
export async function cadastrarCliente(d: DadosDoCadastro): Promise<{ logado: boolean }> {
  const { data, error } = await supabase().auth.signUp({
    email: d.email.trim().toLowerCase(),
    password: d.senha,
    options: {
      data: {
        cadastro_cliente: true,
        nome: d.nome,
        telefone: d.telefone,
        cep: d.cep,
        rua: d.rua,
        bairro: d.bairro,
        numero_endereco: d.numero,
        complemento: d.complemento ?? "",
      },
    },
  });
  if (error) throw erroDoCadastro(error);
  return { logado: Boolean(data.session) };
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
