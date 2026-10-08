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
  | { tipo: "interno"; papel: Papel; nome: string; email: string; lojaId?: string; lojaNome?: string };

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

type Perfil = { nome: string; tipo: string | null; lojaNome?: string };

/**
 * Nome e tipo do cadastro, lidos direto do Supabase: a policy do RLS só devolve a linha do próprio
 * usuário. O tipo serve para flagrar conta da equipe cujo token veio sem cargo.
 */
async function perfilDoUsuario(idAuth: string, email: string): Promise<Perfil> {
  try {
    const { data } = await supabase()
      .from("usuario")
      .select("nome, tipo_usuario(codigo), loja(nome)")
      .eq("auth_user_id", idAuth)
      .maybeSingle();
    const tipo = Array.isArray(data?.tipo_usuario) ? data.tipo_usuario[0] : data?.tipo_usuario;
    const loja = Array.isArray(data?.loja) ? data.loja[0] : data?.loja;
    return {
      nome: typeof data?.nome === "string" && data.nome ? data.nome : nomePeloEmail(email),
      tipo: typeof tipo?.codigo === "string" ? tipo.codigo : null,
      // Nome real da loja do cadastro (a policy deixa ler as lojas ativas).
      lojaNome: typeof loja?.nome === "string" && loja.nome ? loja.nome : undefined,
    };
  } catch {
    // Sem perfil legível: cai para o e-mail e para o tipo do token.
    return { nome: nomePeloEmail(email), tipo: null };
  }
}

function daConta(conta: SessaoApi, nome: string, lojaNome?: string): Sessao {
  if (conta.tipo === "interno") {
    return {
      tipo: "interno",
      papel: conta.papel,
      nome,
      email: conta.email,
      lojaId: conta.idLoja == null ? undefined : String(conta.idLoja),
      lojaNome,
    };
  }
  // Telas antigas ainda precisam de um cliente local para funcionar quando o modo API esta desligado.
  return { tipo: "cliente", clienteId: CLIENTE_DEMO_ID, nome, email: conta.email };
}

export type ResultadoLogin =
  | { ok: true; sessao: Sessao }
  | { ok: false; motivo: "credenciais" | "indisponivel" | "sem_cargo"; detalhe?: string };

/**
 * Login pelo Supabase Auth (a função pronta `signInWithPassword`). O front não guarda senha nem
 * conhece nenhuma conta: o tipo de usuário (cliente ou cargo da equipe) vem do token.
 */
export async function entrar(email: string, senha: string): Promise<ResultadoLogin> {
  let conta: SessaoApi;
  try {
    conta = await entrarNoSupabase(email, senha);
  } catch (erro) {
    const credenciais = erro instanceof ErroApi && erro.codigo === "nao_autenticado";
    if (credenciais) return { ok: false, motivo: "credenciais" };
    return { ok: false, motivo: "indisponivel", detalhe: erro instanceof ErroApi ? erro.message : undefined };
  }
  const perfil = await perfilDoUsuario(conta.id, conta.email);
  // Conta da equipe cujo token não trouxe o cargo (hook de claims desligado ou conta não ligada ao
  // cadastro): sem isto a pessoa seria tratada como cliente e cairia na loja sem nenhum aviso.
  if (conta.tipo === "cliente" && perfil.tipo && perfil.tipo !== "cliente") {
    await sairDaConta().catch(() => undefined);
    return {
      ok: false,
      motivo: "sem_cargo",
      detalhe:
        "Sua conta é da equipe, mas o login não trouxe o seu cargo. Peça ao administrador para conferir a ligação da conta e o hook de claims do Supabase.",
    };
  }
  const nova = daConta(conta, perfil.nome, perfil.lojaNome);
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
    if (conta) {
      const perfil = await perfilDoUsuario(conta.id, conta.email);
      sessao = daConta(conta, perfil.nome, perfil.lojaNome);
    } else {
      sessao = null;
    }
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
      const mesma = sessao?.email === conta.email ? sessao : null;
      const nome = mesma ? mesma.nome : nomePeloEmail(conta.email);
      sessao = daConta(conta, nome, mesma?.tipo === "interno" ? mesma.lojaNome : undefined);
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
