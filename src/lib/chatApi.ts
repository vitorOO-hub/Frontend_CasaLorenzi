import { api, type OpcoesApi } from "./api";
import { validarMensagem, validarMensagens, type MensagemChamado } from "./chamadosApi";
import {
  booleano,
  falha,
  lista,
  numero,
  objeto,
  opcao,
  texto,
  textoOuNulo,
  type Opcao,
} from "./validacao";

/** Tipos e chamadas do chat ao vivo do painel (espelham app/chat/schemas.py do backend). */

const BASE = "/api/v1/painel/chat";

export type SecaoConversas = "todas" | "fila" | "minhas";

export type UltimaMensagem = { texto: string; enviada_em: string; autor: "cliente" | "atendente" };

export type ItemConversa = {
  id_atendimento: string;
  protocolo: string;
  assunto: string;
  cliente_nome: string;
  canal: Opcao;
  prioridade: Opcao;
  status: Opcao;
  id_loja: string | null;
  loja_nome: string | null;
  aberto_em: string;
  id_usuario_responsavel: string | null;
  responsavel_nome: string | null;
  sou_responsavel: boolean;
  nao_lidas: number;
  /** A última mensagem é do cliente: a bola está com a equipe. */
  aguardando_resposta: boolean;
  ultima_mensagem: UltimaMensagem | null;
};

export type ListaConversas = { total: number; itens: ItemConversa[] };

export type ResumoConversas = {
  fila: number;
  minhas: number;
  com_nao_lidas: number;
  nao_lidas: number;
  aguardando_resposta: number;
};

export type SessaoChat = {
  id_atendimento: string;
  /** Canal privado do Realtime (digitando e presença): `chamado:<uuid>`. */
  topico: string;
  canal_privado: boolean;
  /** Filtro do Postgres Changes para as mensagens deste chamado. */
  filtro_mensagens: string;
  eu: { id_usuario: string; nome: string; papel: string };
  status: Opcao;
  id_usuario_responsavel: string | null;
  responsavel_nome: string | null;
  sou_responsavel: boolean;
  pode_responder: boolean;
  motivo_bloqueio: string | null;
  ultimo_id_mensagem: string | null;
  nao_lidas: number;
};

export type MensagensChat = { mensagens: MensagemChamado[]; ultimo_id_mensagem: string | null };

export type FiltrosConversas = {
  secao: SecaoConversas;
  apenasNaoLidas: boolean;
  idLoja?: string;
  limit: number;
  offset: number;
};

// ---------- Validação ----------

const autor = (valor: unknown, campo: string): "cliente" | "atendente" =>
  valor === "cliente" || valor === "atendente" ? valor : falha(campo);

export function validarItemConversa(dados: unknown): ItemConversa {
  const o = objeto(dados, "conversa");
  const u = o.ultima_mensagem;
  return {
    id_atendimento: texto(o.id_atendimento, "id_atendimento"),
    protocolo: texto(o.protocolo, "protocolo"),
    assunto: texto(o.assunto, "assunto"),
    cliente_nome: texto(o.cliente_nome, "cliente_nome"),
    canal: opcao(o.canal, "canal"),
    prioridade: opcao(o.prioridade, "prioridade"),
    status: opcao(o.status, "status"),
    id_loja: textoOuNulo(o.id_loja, "id_loja"),
    loja_nome: textoOuNulo(o.loja_nome, "loja_nome"),
    aberto_em: texto(o.aberto_em, "aberto_em"),
    id_usuario_responsavel: textoOuNulo(o.id_usuario_responsavel, "id_usuario_responsavel"),
    responsavel_nome: textoOuNulo(o.responsavel_nome, "responsavel_nome"),
    sou_responsavel: booleano(o.sou_responsavel, "sou_responsavel"),
    nao_lidas: numero(o.nao_lidas, "nao_lidas"),
    aguardando_resposta: booleano(o.aguardando_resposta, "aguardando_resposta"),
    ultima_mensagem:
      u === null || u === undefined
        ? null
        : (() => {
            const m = objeto(u, "ultima_mensagem");
            return {
              texto: texto(m.texto, "ultima_mensagem.texto"),
              enviada_em: texto(m.enviada_em, "ultima_mensagem.enviada_em"),
              autor: autor(m.autor, "ultima_mensagem.autor"),
            };
          })(),
  };
}

export function validarListaConversas(dados: unknown): ListaConversas {
  const o = objeto(dados, "conversas");
  return { total: numero(o.total, "total"), itens: lista(o.itens, "itens").map(validarItemConversa) };
}

export function validarResumoConversas(dados: unknown): ResumoConversas {
  const o = objeto(dados, "resumo");
  return {
    fila: numero(o.fila, "fila"),
    minhas: numero(o.minhas, "minhas"),
    com_nao_lidas: numero(o.com_nao_lidas, "com_nao_lidas"),
    nao_lidas: numero(o.nao_lidas, "nao_lidas"),
    aguardando_resposta: numero(o.aguardando_resposta, "aguardando_resposta"),
  };
}

const TOPICO = /^chamado:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function validarSessao(dados: unknown): SessaoChat {
  const o = objeto(dados, "sessao");
  const eu = objeto(o.eu, "eu");
  const topico = texto(o.topico, "topico");
  // O canal só é aberto se o nome for exatamente o combinado: nada de nome vindo de fora da regra.
  if (!TOPICO.test(topico)) return falha("topico");
  return {
    id_atendimento: texto(o.id_atendimento, "id_atendimento"),
    topico,
    canal_privado: booleano(o.canal_privado, "canal_privado"),
    filtro_mensagens: texto(o.filtro_mensagens, "filtro_mensagens"),
    eu: {
      id_usuario: texto(eu.id_usuario, "eu.id_usuario"),
      nome: texto(eu.nome, "eu.nome"),
      papel: texto(eu.papel, "eu.papel"),
    },
    status: opcao(o.status, "status"),
    id_usuario_responsavel: textoOuNulo(o.id_usuario_responsavel, "id_usuario_responsavel"),
    responsavel_nome: textoOuNulo(o.responsavel_nome, "responsavel_nome"),
    sou_responsavel: booleano(o.sou_responsavel, "sou_responsavel"),
    pode_responder: booleano(o.pode_responder, "pode_responder"),
    motivo_bloqueio: textoOuNulo(o.motivo_bloqueio, "motivo_bloqueio"),
    ultimo_id_mensagem: textoOuNulo(o.ultimo_id_mensagem, "ultimo_id_mensagem"),
    nao_lidas: numero(o.nao_lidas, "nao_lidas"),
  };
}

export function validarMensagensChat(dados: unknown): MensagensChat {
  const o = objeto(dados, "mensagens");
  return {
    mensagens: validarMensagens(o.mensagens),
    ultimo_id_mensagem: textoOuNulo(o.ultimo_id_mensagem, "ultimo_id_mensagem"),
  };
}

export const validarLido = (dados: unknown) => numero(objeto(dados, "lido").nao_lidas, "nao_lidas");

// ---------- Chamadas ----------

export const listarConversas = (f: FiltrosConversas, o?: OpcoesApi) =>
  api.get(
    `${BASE}/conversas`,
    validarListaConversas,
    {
      secao: f.secao,
      apenas_nao_lidas: f.apenasNaoLidas ? "true" : undefined,
      id_loja: f.idLoja,
      limit: f.limit,
      offset: f.offset,
    },
    o,
  );

export const resumoDasConversas = (idLoja?: string, o?: OpcoesApi) =>
  api.get(`${BASE}/conversas/resumo`, validarResumoConversas, { id_loja: idLoja }, o);

export const abrirSessaoChat = (id: string, o?: OpcoesApi) =>
  api.get(`${BASE}/conversas/${id}/sessao`, validarSessao, undefined, o);

/** Sem `apos`: as últimas mensagens. Com `apos`: só o que veio depois dela. */
export const mensagensDoChat = (id: string, apos?: string | null, o?: OpcoesApi) =>
  api.get(`${BASE}/conversas/${id}/mensagens`, validarMensagensChat, { apos }, o);

export const enviarMensagemChat = (id: string, textoDaMensagem: string, o?: OpcoesApi) =>
  api.post(`${BASE}/conversas/${id}/mensagens`, validarMensagem, { texto: textoDaMensagem }, o);

export const marcarConversaLida = (id: string, o?: OpcoesApi) =>
  api.post(`${BASE}/conversas/${id}/lido`, validarLido, undefined, o);
