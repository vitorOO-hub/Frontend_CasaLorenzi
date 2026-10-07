import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/api/supabase";
import {
  abrirChatAoVivo,
  assinarMudancasDaCaixa,
  ESTADO_INICIAL,
  type ChatAoVivo,
  type ClienteRealtime,
  type EstadoChat,
} from "@/lib/chatAoVivo";
import {
  abrirSessaoChat,
  enviarMensagemChat,
  listarConversas,
  marcarConversaLida,
  mensagensDoChat,
  resumoDasConversas,
  type FiltrosConversas,
  type ListaConversas,
  type ResumoConversas,
} from "@/lib/chatApi";
import { sair } from "@/lib/sessao";
import { useConsulta } from "./useChamados";

/** O cliente do Supabase já usa o token da sessão; o Realtime recebe o mesmo token. */
const realtimeDoSupabase = () => supabase() as unknown as ClienteRealtime;

/** Conversa aberta: mensagens ao vivo, digitando, presença e envio. Fecha os canais ao sair da tela. */
export function useChatAoVivo(id: string) {
  // O estado guarda de qual conversa é: ao trocar de chamado, o da anterior não aparece na nova.
  const [guardado, setGuardado] = useState<{ id: string; estado: EstadoChat }>({ id, estado: ESTADO_INICIAL });
  const estado = guardado.id === id ? guardado.estado : ESTADO_INICIAL;
  const chat = useRef<ChatAoVivo | null>(null);

  useEffect(() => {
    const aberto = abrirChatAoVivo(
      {
        api: {
          abrirSessao: (i) => abrirSessaoChat(i),
          mensagens: (i, apos) => mensagensDoChat(i, apos),
          enviar: (i, t) => enviarMensagemChat(i, t),
          marcarLido: (i) => marcarConversaLida(i),
        },
        realtime: realtimeDoSupabase,
        autenticarRealtime: () => supabase().realtime.setAuth(),
        visivel: () => document.visibilityState === "visible",
        aoSessaoExpirar: sair,
      },
      id,
      (novo) => setGuardado({ id, estado: novo }),
    );
    chat.current = aberto;
    // Voltar para a aba depois de um tempo: confere o que chegou e marca como lido.
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      void aberto.recarregar();
      aberto.marcarLido();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      aberto.fechar();
      chat.current = null;
    };
  }, [id]);

  const enviar = useCallback((texto: string) => chat.current?.enviar(texto) ?? Promise.resolve(), []);
  const avisarDigitando = useCallback(() => chat.current?.avisarDigitando(), []);
  const recarregar = useCallback(() => chat.current?.recarregar() ?? Promise.resolve(), []);
  return { ...estado, enviar, avisarDigitando, recarregar };
}

/**
 * Caixa de conversas (seções fila / minhas / todas). Atualiza sozinha quando chega mensagem ou o
 * chamado muda, e confere a cada 30 s caso o Realtime esteja fora.
 */
export function useCaixaDeConversas(filtros: FiltrosConversas) {
  const lista = useConsulta<ListaConversas>((sinal) => listarConversas(filtros, { sinal }), JSON.stringify(filtros), {
    intervaloMs: 30_000,
  });
  const resumo = useConsulta<ResumoConversas>((sinal) => resumoDasConversas(filtros.idLoja, { sinal }), `resumo-chat:${filtros.idLoja ?? ""}`, {
    intervaloMs: 30_000,
  });
  const { recarregar: recarregarLista } = lista;
  const { recarregar: recarregarResumo } = resumo;

  useEffect(() => {
    try {
      return assinarMudancasDaCaixa(realtimeDoSupabase(), () => {
        recarregarLista();
        recarregarResumo();
      });
    } catch {
      return undefined; // sem Realtime a conferência periódica segura a tela
    }
  }, [recarregarLista, recarregarResumo]);

  return { lista, resumo };
}
