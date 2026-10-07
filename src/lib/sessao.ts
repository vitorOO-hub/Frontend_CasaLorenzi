import { useSyncExternalStore } from "react";
import {
  entrar as entrarNoSupabase,
  ouvirSessao,
  sairDaConta,
  sessaoAtual as sessaoDoSupabase,
  type SessaoApi,
} from "@/api/auth";
import { config } from "@/api/config";
import { ErroApi } from "@/api/erros";
import { supabase } from "@/api/supabase";
import type { Papel } from "@/api/tipos";
import { CLIENTE_DEMO_ID, lojas, type Loja } from "./dados";

export type { Papel };

/** Elenco e escopo de loja usados pelas telas que ainda trabalham com dados simulados. */
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
  | { tipo: "interno"; papel: Papel; nome: string; email: string; lojaId?: string };

// ---------- Estado da sessão ----------
//
// A fonte da verdade é a sessão do Supabase Auth (JWT). Nada daqui é gravado no navegador: o
// papel e a loja são lidos do token a cada carga da página, então editar o armazenamento da aba
// não muda o que a tela mostra. Quem autoriza de verdade é sempre a API e o RLS.

const supabaseConfigurado = Boolean(config.supabaseUrl && config.supabaseAnonKey);

let sessao: Sessao | null = null;
/** Falso só enquanto a sessão guardada pelo Supabase ainda está sendo lida na abertura da página. */
let pronta = !supabaseConfigurado;
let filtroUnidade = "";
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((fn) => fn());
}

function subscrever(fn: () => void) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export function useSessao(): Sessao | null {
  return useSyncExternalStore(subscrever, () => sessao);
}

/** As rotas protegidas esperam isto antes de decidir mandar a pessoa para o login. */
export function useSessaoPronta(): boolean {
  return useSyncExternalStore(subscrever, () => pronta);
}

/** Define a sessão. Usado pelo login e pelos testes; não concede nenhum acesso no servidor. */
export function iniciarSessao(nova: Sessao) {
  sessao = nova;
  pronta = true;
  filtroUnidade = "";
  avisar();
}

const nomePeloEmail = (email: string) => email.split("@")[0] || email;

/** Nome do cadastro, lido direto do Supabase: a policy do RLS só devolve a linha do próprio usuário. */
async function nomeDoPerfil(idAuth: string, email: string): Promise<string> {
  try {
    const { data } = await supabase().from("usuario").select("nome").eq("auth_user_id", idAuth).maybeSingle();
    if (typeof data?.nome === "string" && data.nome) return data.nome;
  } catch {
    // Sem perfil legível: cai para o e-mail.
  }
  return nomePeloEmail(email);
}

function daConta(conta: SessaoApi, nome: string): Sessao {
  if (conta.tipo === "interno") {
    return {
      tipo: "interno",
      papel: conta.papel,
      nome,
      email: conta.email,
      lojaId: conta.idLoja == null ? undefined : String(conta.idLoja),
    };
  }
  // A loja virtual ainda lê pedidos e chamados simulados: o cliente real vê o acervo de demonstração.
  return { tipo: "cliente", clienteId: CLIENTE_DEMO_ID, nome, email: conta.email };
}

export type Lado = "cliente" | "interno";

export type ResultadoLogin =
  | { ok: true; sessao: Sessao }
  | { ok: false; motivo: "credenciais" | "lado_errado" | "indisponivel" };

/**
 * Login pelo Supabase Auth (a função pronta `signInWithPassword`). O front não guarda senha nem
 * conhece nenhuma conta: o tipo de usuário vem do token, e a aba escolhida precisa combinar com ele.
 */
export async function entrar(email: string, senha: string, lado: Lado): Promise<ResultadoLogin> {
  let conta: SessaoApi;
  try {
    conta = await entrarNoSupabase(email, senha);
  } catch (erro) {
    const credenciais = erro instanceof ErroApi && erro.codigo === "nao_autenticado";
    return { ok: false, motivo: credenciais ? "credenciais" : "indisponivel" };
  }
  if ((conta.tipo === "interno") !== (lado === "interno")) {
    await sairDaConta().catch(() => undefined);
    return { ok: false, motivo: "lado_errado" };
  }
  const nova = daConta(conta, await nomeDoPerfil(conta.id, conta.email));
  iniciarSessao(nova);
  return { ok: true, sessao: nova };
}

let sincronizando = false;

/** Chamado uma vez ao abrir o app: lê a sessão do Supabase e passa a acompanhar renovações do token. */
export async function sincronizarSessao() {
  if (sincronizando) return;
  sincronizando = true;
  if (!supabaseConfigurado) return;
  try {
    const conta = await sessaoDoSupabase();
    sessao = conta ? daConta(conta, await nomeDoPerfil(conta.id, conta.email)) : null;
  } catch {
    sessao = null;
  }
  pronta = true;
  avisar();
  try {
    // Quando o token renova, papel e loja novos valem na hora; sem sessão, a tela volta ao login.
    ouvirSessao((conta) => {
      if (!conta) {
        if (sessao) {
          sessao = null;
          avisar();
        }
        return;
      }
      const nome = sessao?.email === conta.email ? sessao.nome : nomePeloEmail(conta.email);
      sessao = daConta(conta, nome);
      avisar();
    });
  } catch {
    // Sem como acompanhar o token: a API continua barrando o que não for permitido.
  }
}

/** Sessão atual fora de componentes (as ações leem quem executa daqui, como o backend lê do token). */
export const sessaoAtual = () => sessao;

/** Loja fixa do cargo; null para quem enxerga a rede inteira (admin, atendente). */
export const lojaDoPapel = (papel: Papel): string | null => equipe[papel].lojaId ?? null;

export function sair() {
  sessao = null;
  filtroUnidade = "";
  avisar();
  void sairDaConta().catch(() => undefined);
}

// ---------- Time interno ----------

/** Cargo do usuário interno logado (atendente quando não há sessão interna). */
export function usePapel(): Papel {
  const s = useSessao();
  return s?.tipo === "interno" ? s.papel : "atendente";
}

export function useNomeUsuario(): string {
  const s = useSessao();
  const papel = usePapel();
  return s?.tipo === "interno" ? s.nome : equipe[papel].nome;
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
