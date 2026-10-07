import { useSyncExternalStore } from "react";
import type { Papel } from "@/api/tipos";
import { CLIENTE_DEMO_ID, clientes, lojas, type Loja } from "./dados";

export type { Papel };

export const equipe: Record<Papel, { nome: string; cargo: string; lojaId?: string }> = {
  atendente: { nome: "Rafael Nunes", cargo: "Atendente · SAC" },
  operador_estoque: { nome: "Vinícius Prado", cargo: "Operador de estoque", lojaId: "l1" },
  gerente_loja: { nome: "Marina Toledo", cargo: "Gerente de unidade", lojaId: "l1" },
  admin: { nome: "Cecília Lorenzi", cargo: "Administradora da rede" },
};

export const rotuloPapel: Record<Papel, string> = {
  atendente: "Atendente",
  operador_estoque: "Operador de estoque",
  gerente_loja: "Gerente de unidade",
  admin: "Administrador",
};

export type Sessao =
  | { tipo: "cliente"; clienteId: string; nome: string; email: string }
  | { tipo: "interno"; papel: Papel; nome: string; email: string };

type Credencial = { email: string; senha: string };

/** Credenciais fictícias de demonstração (nenhum dado real é armazenado). */
export const credenciaisInternas: Record<Papel, Credencial> = {
  atendente: { email: "rafael.nunes@casalorenzi.com.br", senha: "atende123" },
  operador_estoque: { email: "vinicius.prado@casalorenzi.com.br", senha: "estoque123" },
  gerente_loja: { email: "marina.toledo@casalorenzi.com.br", senha: "gerente123" },
  admin: { email: "cecilia.lorenzi@casalorenzi.com.br", senha: "admin123" },
};

export const credencialCliente: Credencial = {
  email: clientes.find((c) => c.id === CLIENTE_DEMO_ID)!.email,
  senha: "cliente123",
};

// ---------- Estado da sessão (persistido na aba para sobreviver ao recarregar) ----------

const CHAVE = "casa-lorenzi:sessao:v2";

function lerSessao(): Sessao | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Sessao) : null;
  } catch {
    return null;
  }
}

let sessao: Sessao | null = lerSessao();
let filtroUnidade = "";
const ouvintes = new Set<() => void>();

function avisar() {
  try {
    if (sessao) sessionStorage.setItem(CHAVE, JSON.stringify(sessao));
    else sessionStorage.removeItem(CHAVE);
  } catch {
    // Sem storage disponível: a sessão vale só enquanto a página estiver aberta.
  }
  ouvintes.forEach((fn) => fn());
}

function subscrever(fn: () => void) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export function useSessao(): Sessao | null {
  return useSyncExternalStore(subscrever, () => sessao);
}

export function entrarComoCliente(email: string, senha: string): Sessao | null {
  const cliente = clientes.find((c) => c.id === CLIENTE_DEMO_ID)!;
  if (email.trim().toLowerCase() !== cliente.email || senha !== credencialCliente.senha)
    return null;
  sessao = { tipo: "cliente", clienteId: cliente.id, nome: cliente.nome, email: cliente.email };
  avisar();
  return sessao;
}

export function entrarComoFuncionario(email: string, senha: string): Sessao | null {
  const papel = (Object.keys(credenciaisInternas) as Papel[]).find(
    (p) =>
      credenciaisInternas[p].email === email.trim().toLowerCase() &&
      credenciaisInternas[p].senha === senha,
  );
  if (!papel) return null;
  sessao = { tipo: "interno", papel, nome: equipe[papel].nome, email: credenciaisInternas[papel].email };
  filtroUnidade = "";
  avisar();
  return sessao;
}

/** Sessão atual fora de componentes (as ações leem quem executa daqui, como o backend lê do token). */
export const sessaoAtual = () => sessao;

/** Loja fixa do cargo; null para quem enxerga a rede inteira (admin, atendente). */
export const lojaDoPapel = (papel: Papel): string | null => equipe[papel].lojaId ?? null;

export function sair() {
  sessao = null;
  filtroUnidade = "";
  avisar();
}

// ---------- Time interno ----------

/** Cargo do usuário interno logado (atendente quando não há sessão interna). */
export function usePapel(): Papel {
  const s = useSessao();
  return s?.tipo === "interno" ? s.papel : "atendente";
}

export function useNomeUsuario(): string {
  return equipe[usePapel()].nome;
}

export function definirFiltroUnidade(id: string) {
  filtroUnidade = id;
  avisar();
}

/** Filtro de unidade do administrador ("" = rede inteira). */
export function useFiltroUnidade(): string {
  return useSyncExternalStore(subscrever, () => filtroUnidade);
}

/** Loja à qual o cargo está restrito; null quando enxerga a rede inteira. */
export function useLojaEscopo(): string | null {
  const papel = usePapel();
  const filtro = useFiltroUnidade();
  if (papel === "admin") return filtro || null;
  return equipe[papel].lojaId ?? null;
}

export function useLojasVisiveis(): Loja[] {
  const escopo = useLojaEscopo();
  return escopo ? lojas.filter((l) => l.id === escopo) : lojas;
}

export const podeAprovar = (papel: Papel) => papel === "gerente_loja" || papel === "admin";

// ---------- Cliente ----------

export function useClienteId(): string {
  const s = useSessao();
  return s?.tipo === "cliente" ? s.clienteId : CLIENTE_DEMO_ID;
}
