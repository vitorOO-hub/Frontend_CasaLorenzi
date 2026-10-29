import { api, type OpcoesApi } from "./api";
import { lista, objeto, texto } from "./validacao";

const BASE = "/api/v1/assistente";
const TEMPO_DA_PERGUNTA_MS = 60_000;
export const TAMANHO_MAXIMO_PERGUNTA_ADMIN = 2000;

export type ConversaAdmin = {
  id_conversa: string;
  titulo: string | null;
  criada_em: string;
  atualizada_em: string;
};

export type MensagemAdmin = {
  autor: string;
  texto: string;
  criada_em: string;
  modelo: string | null;
};

export function validarConversaAdmin(dados: unknown, campo = "conversa"): ConversaAdmin {
  const o = objeto(dados, campo);
  return {
    id_conversa: texto(o.id_conversa, `${campo}.id_conversa`),
    titulo: o.titulo === null ? null : texto(o.titulo, `${campo}.titulo`),
    criada_em: texto(o.criada_em, `${campo}.criada_em`),
    atualizada_em: texto(o.atualizada_em, `${campo}.atualizada_em`),
  };
}

export function validarMensagemAdmin(dados: unknown, campo = "mensagem"): MensagemAdmin {
  const o = objeto(dados, campo);
  return {
    autor: texto(o.autor, `${campo}.autor`),
    texto: texto(o.texto, `${campo}.texto`),
    criada_em: texto(o.criada_em, `${campo}.criada_em`),
    modelo: o.modelo == null ? null : texto(o.modelo, `${campo}.modelo`),
  };
}

export const listarConversasAdmin = (o?: OpcoesApi) =>
  api.get(BASE + "/conversas", (d) => lista(d, "conversas").map((c, i) => validarConversaAdmin(c, `conversas[${i}]`)), undefined, o);

export const criarConversaAdmin = (o?: OpcoesApi) =>
  api.post(BASE + "/conversas", (d) => validarConversaAdmin(d), {}, o);

export const obterConversaAdmin = (idConversa: string, o?: OpcoesApi) =>
  api.get(
    `${BASE}/conversas/${encodeURIComponent(idConversa)}`,
    (d) => {
      const r = objeto(d, "histórico");
      return {
        conversa: validarConversaAdmin(r),
        mensagens: lista(r.mensagens, "mensagens").map((m, i) => validarMensagemAdmin(m, `mensagens[${i}]`)),
      };
    },
    undefined,
    o,
  );

export const perguntarAdmin = (idConversa: string, pergunta: string, o?: OpcoesApi) =>
  api.post(
    `${BASE}/conversas/${encodeURIComponent(idConversa)}/mensagens`,
    (d) => {
      const r = objeto(d, "resposta");
      return {
        id_conversa: texto(r.id_conversa, "resposta.id_conversa"),
        resposta: texto(r.resposta, "resposta.resposta"),
        provedor: r.provedor == null ? null : texto(r.provedor, "resposta.provedor"),
        modelo: r.modelo == null ? null : texto(r.modelo, "resposta.modelo"),
      };
    },
    { texto: pergunta },
    { timeoutMs: TEMPO_DA_PERGUNTA_MS, ...o },
  );
