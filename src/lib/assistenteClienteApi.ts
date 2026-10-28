import { api } from "@/api/http";
import { booleano, lista, numero, objeto, texto, textoOuNulo } from "./validacao";

/** Assistente virtual do cliente (backend em /assistente/cliente). O cliente vem sempre do token. */

export type StatusConversaAssistente = "ativa" | "com_atendente" | "encerrada";

/** Cor e tamanho em estoque que o cliente pode escolher no cartão. */
export type VariacaoOfertaApi = { id_variacao: string; sku: string; cor: string; tamanho: string; preco: number };

/**
 * Peça que o assistente mostra com o botão "Adicionar à sacola" (quem põe na sacola é o cliente).
 * Peça exata: uma variação. Opção de um pedido vago: várias, para escolher no cartão.
 */
export type OfertaAssistenteApi = {
  id_variacao: string;
  sku: string;
  produto: string;
  cor: string;
  tamanho: string;
  preco: number;
  imagem_url: string | null;
  imagem_alt: string | null;
  tecido: string | null;
  quantidade: number;
  variacoes: VariacaoOfertaApi[];
};

export type MensagemAssistenteApi = {
  autor: "usuario" | "assistente";
  texto: string;
  criada_em: string;
  ofertas: OfertaAssistenteApi[];
};

export type ConversaAssistenteApi = {
  id_conversa: string;
  status: StatusConversaAssistente;
  id_atendimento: string | null;
  criada_em: string;
  mensagens: MensagemAssistenteApi[];
};

export type RespostaAssistenteApi = {
  id_conversa: string;
  status: "ativa" | "com_atendente";
  resposta: string;
  sem_resposta: boolean;
  /** Peças com o botão "Adicionar à sacola"; o assistente não mexe na sacola. */
  ofertas: OfertaAssistenteApi[];
  /** Chamado aberto quando a conversa passou para a equipe. */
  id_atendimento: string | null;
};

/** Mesmo limite do backend (MensagemCriacao.texto). */
export const LIMITE_TEXTO_ASSISTENTE = 1000;

function status<T extends string>(valor: unknown, aceitos: readonly T[], campo: string): T {
  const s = texto(valor, campo);
  if (!aceitos.includes(s as T)) throw new Error(`campo inválido: ${campo}`);
  return s as T;
}

function preco(valor: unknown, campo: string): number {
  // O backend manda Decimal como texto ("899.00").
  const n = typeof valor === "string" ? Number(valor) : valor;
  return numero(n, campo);
}

function validarVariacao(dados: unknown): VariacaoOfertaApi {
  const o = objeto(dados, "variacao");
  return {
    id_variacao: texto(o.id_variacao, "id_variacao"),
    sku: texto(o.sku, "sku"),
    cor: texto(o.cor, "cor"),
    tamanho: texto(o.tamanho, "tamanho"),
    preco: preco(o.preco, "preco"),
  };
}

export function validarOferta(dados: unknown): OfertaAssistenteApi {
  const o = objeto(dados, "oferta");
  const base = {
    id_variacao: texto(o.id_variacao, "id_variacao"),
    sku: texto(o.sku, "sku"),
    cor: texto(o.cor, "cor"),
    tamanho: texto(o.tamanho, "tamanho"),
    preco: preco(o.preco, "preco"),
  };
  // Backend anterior (sem a lista): a própria peça é a única variação.
  const variacoes = o.variacoes === undefined || o.variacoes === null ? [] : lista(o.variacoes, "variacoes").map(validarVariacao);
  return {
    ...base,
    produto: texto(o.produto, "produto"),
    imagem_url: textoOuNulo(o.imagem_url, "imagem_url"),
    imagem_alt: textoOuNulo(o.imagem_alt, "imagem_alt"),
    tecido: textoOuNulo(o.tecido, "tecido"),
    quantidade: o.quantidade === undefined ? 1 : numero(o.quantidade, "quantidade"),
    variacoes: variacoes.length ? variacoes : [base],
  };
}

/** Lista de ofertas que pode não vir (versão anterior do backend). */
const ofertas = (valor: unknown) => (valor === undefined || valor === null ? [] : lista(valor, "ofertas").map(validarOferta));

function validarMensagem(dados: unknown): MensagemAssistenteApi {
  const o = objeto(dados, "mensagem");
  return {
    autor: status(o.autor, ["usuario", "assistente"] as const, "autor"),
    texto: texto(o.texto, "texto"),
    criada_em: texto(o.criada_em, "criada_em"),
    ofertas: ofertas(o.ofertas),
  };
}

export function validarConversaAssistente(dados: unknown): ConversaAssistenteApi {
  const o = objeto(dados, "conversa");
  return {
    id_conversa: texto(o.id_conversa, "id_conversa"),
    status: status(o.status, ["ativa", "com_atendente", "encerrada"] as const, "status"),
    id_atendimento: textoOuNulo(o.id_atendimento, "id_atendimento"),
    criada_em: texto(o.criada_em, "criada_em"),
    mensagens: lista(o.mensagens, "mensagens").map(validarMensagem),
  };
}

export function validarRespostaAssistente(dados: unknown): RespostaAssistenteApi {
  const o = objeto(dados, "resposta_assistente");
  return {
    id_conversa: texto(o.id_conversa, "id_conversa"),
    status: status(o.status, ["ativa", "com_atendente"] as const, "status"),
    resposta: texto(o.resposta, "resposta"),
    sem_resposta: booleano(o.sem_resposta, "sem_resposta"),
    ofertas: ofertas(o.ofertas),
    id_atendimento: textoOuNulo(o.id_atendimento, "id_atendimento"),
  };
}

export const iniciarConversaAssistente = async () =>
  validarConversaAssistente(await api.post<unknown>("/assistente/cliente/conversas"));

export const obterConversaAssistente = async (idConversa: string) =>
  validarConversaAssistente(await api.get<unknown>(`/assistente/cliente/conversas/${encodeURIComponent(idConversa)}`));

/**
 * O backend espera o modelo de IA (até 30 s por chamada, com consultas no meio): o padrão de 15 s
 * cortaria a resposta no meio e o cliente veria "o servidor demorou" com a resposta ainda a caminho.
 */
export const TEMPO_DA_RESPOSTA_DO_ASSISTENTE_MS = 60_000;

export const enviarMensagemAssistente = async (idConversa: string, mensagem: string) =>
  validarRespostaAssistente(
    await api.post<unknown>(
      `/assistente/cliente/conversas/${encodeURIComponent(idConversa)}/mensagens`,
      { texto: mensagem },
      { timeoutMs: TEMPO_DA_RESPOSTA_DO_ASSISTENTE_MS },
    ),
  );
