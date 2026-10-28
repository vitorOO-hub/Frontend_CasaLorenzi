/**
 * Qual conversa do assistente o cliente tinha aberta nesta aba. É só uma conveniência: se o
 * navegador não guardar (aba anônima, armazenamento bloqueado), o painel começa uma conversa nova.
 * A conversa em si (e quem pode lê-la) fica no backend.
 */

const prefixo = "assistente-conversa:";

export function lerConversaGuardada(clienteId: string): string | null {
  try {
    return sessionStorage.getItem(prefixo + clienteId);
  } catch {
    return null;
  }
}

export function guardarConversa(clienteId: string, idConversa: string) {
  try {
    sessionStorage.setItem(prefixo + clienteId, idConversa);
  } catch {
    /* sem armazenamento: a próxima abertura começa do zero */
  }
}

export function esquecerConversa(clienteId: string) {
  try {
    sessionStorage.removeItem(prefixo + clienteId);
  } catch {
    /* idem */
  }
}

export const SAUDACAO_ASSISTENTE =
  "Olá! Sou o assistente da Casa Lorenzi. Posso procurar peças, ver estoque nas lojas, seus pontos Lorenzi+ e seus pedidos, colocar peças na sacola ou chamar alguém da equipe.";

/** Primeira linha do chamado que o assistente abre (app/assistente/cliente/passagem.py no backend). */
export const CABECALHO_PASSAGEM = "Chamado aberto pelo assistente do site.";

/**
 * Mensagens do chamado que o painel mostra depois da passagem. A primeira é a transcrição que a
 * equipe recebe; o cliente já vê essa conversa logo acima, então ela não se repete.
 */
export function mensagensDaEquipeNoPainel<T extends { texto: string }>(mensagens: T[]): T[] {
  return mensagens[0]?.texto.startsWith(CABECALHO_PASSAGEM) ? mensagens.slice(1) : mensagens;
}

/** Respostas da equipe que chegaram com o painel fechado (o selo no botão). */
export const respostasDaEquipe = (mensagens: { autor: string }[]) => mensagens.filter((m) => m.autor === "atendente").length;

/** Chamado já fechado pela equipe: o painel encerra o atendimento e oferece nova conversa. */
export const atendimentoEncerrado = (codigoStatus: string) => ["resolvido", "encerrado", "cancelado"].includes(codigoStatus);
