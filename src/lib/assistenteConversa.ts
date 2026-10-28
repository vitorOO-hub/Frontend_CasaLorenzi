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
