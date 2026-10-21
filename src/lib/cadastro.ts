/**
 * Cadastro de cliente: validação e formatação do formulário (sem React, para testar). As mesmas
 * regras existem no banco (trigger do cadastro e checks da tabela `usuario`); aqui servem para
 * avisar a pessoa antes de enviar.
 */

export type FormCadastro = {
  nome: string;
  email: string;
  cpf: string;
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
  cpf: "",
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

/** "52998224725" → "529.982.247-25" enquanto a pessoa digita (no máximo 11 dígitos). */
export function formatarCpf(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

/** CPF com os dois dígitos verificadores certos (e não uma sequência como 111.111.111-11). */
export function cpfValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(d[tamanho])) return false;
  }
  return true;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const SENHA_MINIMA = 8;

/** Confere o formulário; devolve os erros por campo (vazio = pode enviar). */
export function validarCadastro(f: FormCadastro): ErrosCadastro {
  const erros: ErrosCadastro = {};
  if (f.nome.trim().length < 2) erros.nome = "Informe seu nome.";
  if (!EMAIL.test(f.email.trim())) erros.email = "Informe um e-mail válido.";
  // CPF é opcional; quem já é cliente Vulto+ informa para trazer os pontos para a conta.
  if (f.cpf.trim() && !cpfValido(f.cpf)) erros.cpf = "Confira o CPF.";
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
    cpf: soDigitos(f.cpf) || undefined,
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

/** Faixas de CEP por estado (pelos 5 primeiros dígitos). Só ajuda a preencher; a pessoa pode trocar. */
const FAIXAS_UF: [number, number, string][] = [
  [1000, 19999, "SP"], [20000, 28999, "RJ"], [29000, 29999, "ES"], [30000, 39999, "MG"],
  [40000, 48999, "BA"], [49000, 49999, "SE"], [50000, 56999, "PE"], [57000, 57999, "AL"],
  [58000, 58999, "PB"], [59000, 59999, "RN"], [60000, 63999, "CE"], [64000, 64999, "PI"],
  [65000, 65999, "MA"], [66000, 68899, "PA"], [68900, 68999, "AP"], [69000, 69299, "AM"],
  [69300, 69399, "RR"], [69400, 69899, "AM"], [69900, 69999, "AC"], [70000, 72799, "DF"],
  [72800, 72999, "GO"], [73000, 73699, "DF"], [73700, 76799, "GO"], [76800, 76999, "RO"],
  [77000, 77999, "TO"], [78000, 78899, "MT"], [78900, 78999, "RO"], [79000, 79999, "MS"],
  [80000, 87999, "PR"], [88000, 89999, "SC"], [90000, 99999, "RS"],
];

/** Estado provável de um CEP (8 dígitos); undefined quando não dá para saber. */
export function ufDoCep(cep: string): string | undefined {
  const d = soDigitos(cep);
  if (d.length !== 8) return undefined;
  const prefixo = Number(d.slice(0, 5));
  return FAIXAS_UF.find(([de, ate]) => prefixo >= de && prefixo <= ate)?.[2];
}

export type EnderecoDeEntrega = { cep: string; rua: string; bairro: string; numero: string; complemento: string; uf: string };

export const ENDERECO_VAZIO: EnderecoDeEntrega = { cep: "", rua: "", bairro: "", numero: "", complemento: "", uf: "SP" };

type PerfilComEndereco = {
  cep: string | null;
  rua: string | null;
  bairro: string | null;
  numero_endereco: string | null;
  complemento: string | null;
};

/**
 * Preenche o endereço de entrega com o do cadastro, sem sobrescrever o que a pessoa já digitou
 * (campo vazio recebe o do cadastro; campo mexido fica como está).
 */
export function preencherComCadastro(atual: EnderecoDeEntrega, perfil: PerfilComEndereco): EnderecoDeEntrega {
  const cep = atual.cep || (perfil.cep ? formatarCep(perfil.cep) : "");
  const cepMexido = atual.cep !== "";
  return {
    cep,
    rua: atual.rua || perfil.rua || "",
    bairro: atual.bairro || perfil.bairro || "",
    numero: atual.numero || perfil.numero_endereco || "",
    complemento: atual.complemento || perfil.complemento || "",
    uf: cepMexido ? atual.uf : (ufDoCep(perfil.cep ?? "") ?? atual.uf),
  };
}
