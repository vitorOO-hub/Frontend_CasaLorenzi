/**
 * Mantém a conversa do cliente em dia: relê do servidor quando chega mensagem nova (Realtime) e, por
 * garantia, a cada poucos segundos enquanto a aba está à vista (caso o Realtime caia).
 * Sempre relê do servidor em vez de montar a mensagem do evento: assim autor e nome vêm certos e
 * nada que a equipe escreveu se perde nem duplica.
 */

import { supabase } from "@/api/supabase";

export const CONFERENCIA_CLIENTE_MS = 15_000;

export type DependenciasConversaCliente = {
  /** Relê o chamado e as mensagens do servidor. */
  recarregar: () => Promise<unknown>;
  /** Avisa quando entra mensagem nova; devolve a função que cancela o aviso. */
  ouvirNovas: (aoChegar: () => void) => () => void;
  visivel?: () => boolean;
  intervaloMs?: number;
};

export function manterConversaEmDia(deps: DependenciasConversaCliente): () => void {
  const visivel = deps.visivel ?? (() => true);
  let ativo = true;
  let lendo = false;

  // Uma leitura por vez: rajada de eventos não empilha chamadas.
  const ler = () => {
    if (!ativo || lendo) return;
    lendo = true;
    deps
      .recarregar()
      .catch(() => undefined)
      .finally(() => {
        lendo = false;
      });
  };

  let parar: () => void = () => undefined;
  try {
    parar = deps.ouvirNovas(ler);
  } catch {
    // Sem Realtime a conferência periódica cobre.
  }
  const relogio = setInterval(() => {
    if (visivel()) ler();
  }, deps.intervaloMs ?? CONFERENCIA_CLIENTE_MS);

  return () => {
    ativo = false;
    clearInterval(relogio);
    try {
      parar();
    } catch {
      // Já estava fechado.
    }
  };
}

/**
 * Avisa quando entra mensagem nova neste chamado (Supabase Realtime). O RLS decide o que o token
 * pode receber: o cliente só recebe as mensagens dos próprios chamados.
 */
export function ouvirMensagensDoChamado(idAtendimento: string, aoChegar: () => void): () => void {
  const cliente = supabase();
  const canal = cliente
    .channel(`cliente-chamado-${idAtendimento}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "mensagem", filter: `id_atendimento=eq.${idAtendimento}` },
      () => aoChegar(),
    )
    .subscribe();
  return () => void cliente.removeChannel(canal);
}
