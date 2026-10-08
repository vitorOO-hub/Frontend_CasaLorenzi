/**
 * Cadastro de cliente: validação e formatação do formulário (sem React, para testar). As mesmas
 * regras existem no banco (trigger do cadastro e checks da tabela `usuario`); aqui servem para
 * avisar a pessoa antes de enviar.
 */

export type FormCadastro = {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  cep: string;
  rua: string;
  bairro: string;
  numero: string;
  complemento: string;
};

export const FORM_VAZIO: FormCadastro = {
  nome: "",
  email: "",
  telefone: "",
  senha: "",
  cep: "",
  rua: "",
  bairro: "",
  numero: "",
  complemento: "",
};

export type ErrosCadastro = Partial<Record<keyof FormCadastro, string>>;

export const soDigitos = (valor: string) => valor.replace(/\D/g, "");

/** "01001000" → "01001-000" enquanto a pessoa digita (no máximo 8 dígitos). */
export function formatarCep(valor: string): string {
  const d = soDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** "11999990001" → "(11) 99999-0001"; aceita fixo (10 dígitos) e celular (11). */
export function formatarTelefone(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = `(${d.slice(0, 2)}) `;
  if (d.length <= 6) return ddd + d.slice(2);
  const corte = d.length === 11 ? 7 : 6;
  return `${ddd}${d.slice(2, corte)}-${d.slice(corte)}`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const SENHA_MINIMA = 8;

/** Confere o formulário; devolve os erros por campo (vazio = pode enviar). */
export function validarCadastro(f: FormCadastro): ErrosCadastro {
  const erros: ErrosCadastro = {};
  if (f.nome.trim().length < 2) erros.nome = "Informe seu nome.";
  if (!EMAIL.test(f.email.trim())) erros.email = "Informe um e-mail válido.";
  const tel = soDigitos(f.telefone).length;
  if (tel < 10 || tel > 11) erros.telefone = "Informe o telefone com DDD.";
  if (f.senha.length < SENHA_MINIMA) erros.senha = `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`;
  else if (!/[A-Za-z]/.test(f.senha) || !/\d/.test(f.senha)) erros.senha = "Use letras e números na senha.";
  if (soDigitos(f.cep).length !== 8) erros.cep = "O CEP tem 8 números.";
  if (!f.rua.trim()) erros.rua = "Informe a rua.";
  if (!f.bairro.trim()) erros.bairro = "Informe o bairro.";
  if (!f.numero.trim()) erros.numero = "Informe o número.";
  return erros;
}

/** Dados no formato que o cadastro envia ao Supabase (CEP e telefone só com dígitos). */
export function dadosDoCadastro(f: FormCadastro) {
  return {
    nome: f.nome.trim(),
    email: f.email.trim().toLowerCase(),
    senha: f.senha,
    telefone: soDigitos(f.telefone),
    cep: soDigitos(f.cep),
    rua: f.rua.trim(),
    bairro: f.bairro.trim(),
    numero: f.numero.trim(),
    complemento: f.complemento.trim() || undefined,
  };
}

export type DadosCadastro = ReturnType<typeof dadosDoCadastro>;
