import { api } from "@/api/http";
import { booleano, lista, objeto, texto, textoOuNulo } from "./validacao";

/** Assistente virtual do cliente (backend em /assistente/cliente). O cliente vem sempre do token. */

export type StatusConversaAssistente = "ativa" | "com_atendente" | "encerrada";

export type MensagemAssistenteApi = {
  autor: "usuario" | "assistente";
  texto: string;
  criada_em: string;
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
  /** O assistente colocou peça na sacola: a tela recarrega a sacola do servidor. */
  carrinho_alterado: boolean;
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

function validarMensagem(dados: unknown): MensagemAssistenteApi {
  const o = objeto(dados, "mensagem");
  return {
    autor: status(o.autor, ["usuario", "assistente"] as const, "autor"),
    texto: texto(o.texto, "texto"),
    criada_em: texto(o.criada_em, "criada_em"),
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
    carrinho_alterado: booleano(o.carrinho_alterado, "carrinho_alterado"),
    id_atendimento: textoOuNulo(o.id_atendimento, "id_atendimento"),
  };
}

/** Mensagem que o painel mostrou antes do login; vai junto para o assistente manter o contexto. */
export type MensagemAnteriorAssistente = { autor: "usuario" | "assistente"; texto: string };

/** Mesmo teto do backend para o histórico enviado. */
export const LIMITE_HISTORICO_ASSISTENTE = 10;

export const iniciarConversaAssistente = async (historico: MensagemAnteriorAssistente[] = []) =>
  validarConversaAssistente(
    await api.post<unknown>("/assistente/cliente/conversas", {
      historico: historico.slice(-LIMITE_HISTORICO_ASSISTENTE).map((m) => ({ ...m, texto: m.texto.slice(0, 2000) })),
    }),
  );

export const obterConversaAssistente = async (idConversa: string) =>
  validarConversaAssistente(await api.get<unknown>(`/assistente/cliente/conversas/${encodeURIComponent(idConversa)}`));

export const enviarMensagemAssistente = async (idConversa: string, mensagem: string) =>
  validarRespostaAssistente(
    await api.post<unknown>(`/assistente/cliente/conversas/${encodeURIComponent(idConversa)}/mensagens`, { texto: mensagem }),
  );

export type RespostaVisitanteApi = {
  resposta: string;
  sem_resposta: boolean;
  /** O pedido depende da conta (pontos, pedidos, sacola, equipe): o painel mostra o login. */
  precisa_login: boolean;
};

export function validarRespostaVisitante(dados: unknown): RespostaVisitanteApi {
  const o = objeto(dados, "resposta_visitante");
  return {
    resposta: texto(o.resposta, "resposta"),
    sem_resposta: booleano(o.sem_resposta, "sem_resposta"),
    precisa_login: booleano(o.precisa_login, "precisa_login"),
  };
}

/** Quem navega sem login: só catálogo público; nada fica gravado no servidor. */
export const enviarMensagemVisitante = async (mensagem: string, historico: MensagemAnteriorAssistente[]) =>
  validarRespostaVisitante(
    await api.post<unknown>(
      "/assistente/visitante/mensagens",
      {
        texto: mensagem,
        historico: historico.slice(-LIMITE_HISTORICO_ASSISTENTE).map((m) => ({ ...m, texto: m.texto.slice(0, 2000) })),
      },
      { semToken: true },
    ),
  );
