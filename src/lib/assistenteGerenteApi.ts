import { api, type OpcoesApi } from "./api";
import { lista, objeto, texto } from "./validacao";

const BASE = "/api/v1/assistente/gerente";
const TEMPO_DA_PERGUNTA_MS = 60_000;
export const TAMANHO_MAXIMO_PERGUNTA_GERENTE = 2000;

export type ConversaGerente = {
  id_conversa: string;
  titulo: string | null;
  criada_em: string;
  atualizada_em: string;
};

export type MensagemGerente = {
  autor: string;
  texto: string;
  criada_em: string;
  modelo: string | null;
};

export function validarConversaGerente(dados: unknown, campo = "conversa"): ConversaGerente {
  const o = objeto(dados, campo);
  return {
    id_conversa: texto(o.id_conversa, `${campo}.id_conversa`),
    titulo: o.titulo === null ? null : texto(o.titulo, `${campo}.titulo`),
    criada_em: texto(o.criada_em, `${campo}.criada_em`),
    atualizada_em: texto(o.atualizada_em, `${campo}.atualizada_em`),
  };
}

export function validarMensagemGerente(dados: unknown, campo = "mensagem"): MensagemGerente {
  const o = objeto(dados, campo);
  return {
    autor: texto(o.autor, `${campo}.autor`),
    texto: texto(o.texto, `${campo}.texto`),
    criada_em: texto(o.criada_em, `${campo}.criada_em`),
    modelo: o.modelo == null ? null : texto(o.modelo, `${campo}.modelo`),
  };
}

export const listarConversasGerente = (o?: OpcoesApi) =>
  api.get(BASE + "/conversas", (d) => lista(d, "conversas").map((c, i) => validarConversaGerente(c, `conversas[${i}]`)), undefined, o);

export const criarConversaGerente = (o?: OpcoesApi) =>
  api.post(BASE + "/conversas", (d) => validarConversaGerente(d), {}, o);

export const obterConversaGerente = (idConversa: string, o?: OpcoesApi) =>
  api.get(
    `${BASE}/conversas/${encodeURIComponent(idConversa)}`,
    (d) => {
      const r = objeto(d, "histórico");
      return {
        conversa: validarConversaGerente(r),
        mensagens: lista(r.mensagens, "mensagens").map((m, i) => validarMensagemGerente(m, `mensagens[${i}]`)),
      };
    },
    undefined,
    o,
  );

export const perguntarGerente = (idConversa: string, pergunta: string, o?: OpcoesApi) =>
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
