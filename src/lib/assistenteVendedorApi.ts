import { api, type OpcoesApi } from "./api";
import { falha, lista, objeto, texto } from "./validacao";

/** Chat do assistente do vendedor (espelha app/assistente/schemas.py do backend). */

const BASE = "/api/v1/assistente/vendedor";
/** O modelo pode consultar algumas ferramentas antes de responder: mais tempo que o padrão. */
const TEMPO_DA_PERGUNTA_MS = 60_000;
export const TAMANHO_MAXIMO_PERGUNTA = 1000;

export type StatusConversa = "ativa" | "com_atendente" | "encerrada";
export type ConversaAssistente = {
  id_conversa: string;
  titulo: string;
  status: StatusConversa;
  criada_em: string;
  atualizada_em: string;
};
export type MensagemAssistente = {
  id_mensagem: string;
  autor: "usuario" | "assistente";
  texto: string;
  criada_em: string;
  ferramentas: string[];
  avaliacao: Avaliacao | null;
};
export type Avaliacao = "util" | "nao_util";

const STATUS: StatusConversa[] = ["ativa", "com_atendente", "encerrada"];

export function validarConversa(dados: unknown, campo = "conversa"): ConversaAssistente {
  const o = objeto(dados, campo);
  const status = texto(o.status, `${campo}.status`);
  return {
    id_conversa: texto(o.id_conversa, `${campo}.id_conversa`),
    titulo: texto(o.titulo, `${campo}.titulo`),
    status: STATUS.includes(status as StatusConversa) ? (status as StatusConversa) : falha(`${campo}.status`),
    criada_em: texto(o.criada_em, `${campo}.criada_em`),
    atualizada_em: texto(o.atualizada_em, `${campo}.atualizada_em`),
  };
}

export function validarMensagem(dados: unknown, campo = "mensagem"): MensagemAssistente {
  const o = objeto(dados, campo);
  const autor = texto(o.autor, `${campo}.autor`);
  if (autor !== "usuario" && autor !== "assistente") falha(`${campo}.autor`);
  return {
    id_mensagem: texto(o.id_mensagem, `${campo}.id_mensagem`),
    autor: autor as MensagemAssistente["autor"],
    texto: texto(o.texto, `${campo}.texto`),
    criada_em: texto(o.criada_em, `${campo}.criada_em`),
    ferramentas: lista(o.ferramentas ?? [], `${campo}.ferramentas`).map((f, i) => texto(f, `${campo}.ferramentas[${i}]`)),
    avaliacao: o.avaliacao === "util" || o.avaliacao === "nao_util" ? o.avaliacao : null,
  };
}

export const listarConversas = (o?: OpcoesApi) =>
  api.get(`${BASE}/conversas`, (d) => lista(objeto(d, "conversas").itens, "itens").map((c, i) => validarConversa(c, `itens[${i}]`)), undefined, o);

export const criarConversa = (o?: OpcoesApi) => api.post(`${BASE}/conversas`, (d) => validarConversa(d), undefined, o);

export const obterMensagens = (idConversa: string, o?: OpcoesApi) =>
  api.get(
    `${BASE}/conversas/${encodeURIComponent(idConversa)}/mensagens`,
    (d) => {
      const r = objeto(d, "mensagens");
      return {
        conversa: validarConversa(r.conversa),
        mensagens: lista(r.mensagens, "mensagens").map((m, i) => validarMensagem(m, `mensagens[${i}]`)),
      };
    },
    undefined,
    o,
  );

export const perguntar = (idConversa: string, pergunta: string, o?: OpcoesApi) =>
  api.post(
    `${BASE}/conversas/${encodeURIComponent(idConversa)}/mensagens`,
    (d) => {
      const r = objeto(d, "resposta");
      return { pergunta: validarMensagem(r.pergunta, "pergunta"), resposta: validarMensagem(r.resposta, "resposta") };
    },
    { texto: pergunta },
    { timeoutMs: TEMPO_DA_PERGUNTA_MS, ...o },
  );

/** 👍/👎 numa resposta do assistente (null tira a avaliação). */
export const avaliarResposta = (idConversa: string, idMensagem: string, avaliacao: Avaliacao | null, o?: OpcoesApi) =>
  api.put(
    `${BASE}/conversas/${encodeURIComponent(idConversa)}/mensagens/${encodeURIComponent(idMensagem)}/avaliacao`,
    (d) => objeto(d, "avaliacao"),
    { avaliacao },
    o,
  );

export const arquivarConversa =(idConversa: string, arquivada = true, o?: OpcoesApi) =>
  api.patch(`${BASE}/conversas/${encodeURIComponent(idConversa)}`, (d) => validarConversa(d), { arquivada }, o);

/** Nome amigável das ferramentas que o assistente consultou (chips embaixo da resposta). */
export const ROTULO_FERRAMENTA: Record<string, string> = {
  vendas_do_periodo: "vendas do período",
  buscar_vendas: "vendas",
  detalhe_venda: "detalhe do pedido",
  buscar_clientes: "clientes",
  clientes_que_mais_compram: "melhores clientes",
  consultar_estoque: "contagem do estoque",
  consultar_pecas: "estoque da loja",
  resumo_do_estoque: "resumo do estoque",
  pecas_em_alerta: "peças em alerta",
  guia_do_painel: "guia das telas",
  lojas_e_horarios: "lojas e horários",
  formas_de_pagamento: "formas de pagamento",
};

export const rotuloFerramenta = (nome: string) => ROTULO_FERRAMENTA[nome] ?? null;

/** Trecho de texto com negrito, para o markdown simples que os modelos devolvem (**assim**). */
export type Trecho = { texto: string; negrito: boolean };
export type Linha = { tipo: "paragrafo" | "item"; trechos: Trecho[] };

// Negrito só em volta de texto com letra ou número: "***.***.***-01" (máscara de CPF) fica como está.
const NEGRITO = /(?<!\*)\*\*(?!\s)([^*]*[\p{L}\p{N}][^*]*?)(?<!\s)\*\*(?!\*)/gu;

export function trechosDe(linha: string): Trecho[] {
  const trechos: Trecho[] = [];
  let resto = 0;
  for (const achado of linha.matchAll(NEGRITO)) {
    if (achado.index > resto) trechos.push({ texto: linha.slice(resto, achado.index), negrito: false });
    trechos.push({ texto: achado[1]!, negrito: true });
    resto = achado.index + achado[0].length;
  }
  if (resto < linha.length) trechos.push({ texto: linha.slice(resto), negrito: false });
  return trechos;
}

/** Quebra a resposta em parágrafos e itens de lista; nada vira HTML cru (sem risco de injeção). */
export function linhasDaResposta(resposta: string): Linha[] {
  return resposta
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^#+\s*$/.test(l))
    .map((l) => {
      const item = l.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
      const conteudo = (item ? item[1] : l).replace(/^#+\s+/, "");
      return { tipo: item ? "item" : "paragrafo", trechos: trechosDe(conteudo) };
    });
}
