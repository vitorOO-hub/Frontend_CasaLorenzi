import { api } from "./api";
import { cpfValido, SENHA_MINIMA, soDigitos } from "./cadastro";
import { booleano, objeto, texto } from "./validacao";

/**
 * Ativação da conta de quem já é cliente (importado do Vulto+) e ainda não tem login: a pessoa
 * informa o CPF, cria a senha e, se o cadastro não tiver e-mail, informa o e-mail também.
 * Espelha app/ativacao do backend. As rotas são públicas (sem token).
 */

const BASE = "/api/v1/ativacao-conta";
const SEM_TOKEN = { semToken: true } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FormAtivacao = { cpf: string; senha: string; confirmar: string; email: string };

export const ATIVACAO_VAZIA: FormAtivacao = { cpf: "", senha: "", confirmar: "", email: "" };

export type ErrosAtivacao = Partial<Record<keyof FormAtivacao, string>>;

/** Etapa 1: só o CPF. */
export function validarCpfDaAtivacao(cpf: string): string | null {
  if (!cpf.trim()) return "Informe seu CPF.";
  return cpfValido(cpf) ? null : "Confira o CPF.";
}

/** Etapa 2: senha (igual à do cadastro), confirmação e, só se o cadastro não tem e-mail, o e-mail. */
export function validarAtivacao(f: FormAtivacao, pedeEmail: boolean): ErrosAtivacao {
  const erros: ErrosAtivacao = {};
  const cpf = validarCpfDaAtivacao(f.cpf);
  if (cpf) erros.cpf = cpf;
  if (f.senha.length < SENHA_MINIMA) erros.senha = `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`;
  else if (!/[A-Za-z]/.test(f.senha) || !/\d/.test(f.senha)) erros.senha = "Use letras e números na senha.";
  if (!erros.senha && f.confirmar !== f.senha) erros.confirmar = "As senhas não são iguais.";
  if (pedeEmail && !EMAIL.test(f.email.trim())) erros.email = "Informe um e-mail válido.";
  return erros;
}

export type ConsultaAtivacao = { pede_email: boolean };
export type ResultadoAtivacao = { email: string };

export function validarConsulta(dados: unknown): ConsultaAtivacao {
  return { pede_email: booleano(objeto(dados, "consulta").pede_email, "pede_email") };
}

export function validarResultado(dados: unknown): ResultadoAtivacao {
  return { email: texto(objeto(dados, "ativacao").email, "email") };
}

/** Diz se a tela precisa pedir o e-mail (CPF sem cadastro ou já ativo também pede: não revela nada). */
export const consultarAtivacao = (cpf: string) =>
  api.post(`${BASE}/consultar`, validarConsulta, { cpf: soDigitos(cpf) }, SEM_TOKEN);

/** Cria o login. Devolve o e-mail mascarado ("j***@gmail.com") para a pessoa saber com qual entrar. */
export const ativarConta = (f: FormAtivacao, pedeEmail: boolean) =>
  api.post(
    BASE,
    validarResultado,
    { cpf: soDigitos(f.cpf), senha: f.senha, ...(pedeEmail ? { email: f.email.trim().toLowerCase() } : {}) },
    SEM_TOKEN,
  );
