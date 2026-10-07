import { ErroApi, mensagemDeErro } from "@/api/erros";
import type { MensagemChamado } from "./chamadosApi";
import type { MensagensChat, SessaoChat } from "./chatApi";

/**
 * Chat ao vivo sobre o Supabase Realtime, sem React (para testar com canais falsos).
 *
 * - Mensagens: Postgres Changes em `mensagem`. O evento só avisa que há novidade; o conteúdo vem da
 *   API (`mensagens?apos=`), que já traz autor e nome e respeita o escopo. Assim o Realtime nunca é a
 *   única fonte da verdade: se um evento se perder, a conferência periódica recupera.
 * - Digitando e presença: canal PRIVADO `chamado:<uuid>` (Broadcast e Presence), liberado pelo RLS só a
 *   quem enxerga o chamado.
 */

export type Conexao = "conectando" | "ao_vivo" | "reconectando";

export type EstadoChat = {
  sessao: SessaoChat | null;
  mensagens: MensagemChamado[];
  /** Nomes de quem está digitando agora (nunca eu). */
  digitando: string[];
  /** Nomes de outras pessoas da equipe com esta conversa aberta. */
  presentes: string[];
  conexao: Conexao;
  carregando: boolean;
  erro: string | null;
};

export const ESTADO_INICIAL: EstadoChat = {
  sessao: null,
  mensagens: [],
  digitando: [],
  presentes: [],
  conexao: "conectando",
  carregando: true,
  erro: null,
};

export const VALIDADE_DIGITANDO_MS = 4_000;
export const INTERVALO_AVISO_DIGITANDO_MS = 2_000;
export const CONFERENCIA_MS = 15_000;
export const ESPERA_CAIXA_MS = 500;

// ---------- Funções puras ----------

/** Junta mensagens novas às atuais: sem repetir (o evento e a resposta do envio chegam os dois). */
export function mesclarMensagens(atuais: MensagemChamado[], novas: MensagemChamado[]): MensagemChamado[] {
  if (novas.length === 0) return atuais;
  const vistas = new Set(atuais.map((m) => m.id_mensagem));
  const acrescentar = novas.filter((m) => !vistas.has(m.id_mensagem) && vistas.add(m.id_mensagem));
  return acrescentar.length ? [...atuais, ...acrescentar] : atuais;
}

export type Digitando = { id_usuario: string; nome: string };

/** O payload do Broadcast vem de outro navegador: só vale se tiver o formato combinado. */
export function lerDigitando(payload: unknown): Digitando | null {
  const p = (payload as { payload?: unknown } | null)?.payload ?? payload;
  if (!p || typeof p !== "object") return null;
  const { id_usuario, nome } = p as Record<string, unknown>;
  if (typeof id_usuario !== "string" || typeof nome !== "string" || !id_usuario || !nome.trim()) return null;
  return { id_usuario, nome: nome.trim().slice(0, 80) };
}

/** Nomes de quem está na conversa (Presence), sem mim e sem repetir quem abriu em duas abas. */
export function nomesPresentes(estado: Record<string, unknown[]>, meuId: string): string[] {
  const nomes = new Map<string, string>();
  for (const entradas of Object.values(estado)) {
    for (const entrada of entradas) {
      const e = entrada as Record<string, unknown> | null;
      if (!e || typeof e.id_usuario !== "string" || typeof e.nome !== "string") continue;
      if (e.id_usuario !== meuId && e.nome.trim()) nomes.set(e.id_usuario, e.nome.trim().slice(0, 80));
    }
  }
  return [...nomes.values()];
}

// ---------- Dependências (o que o Supabase e a API fornecem) ----------

export type CanalRealtime = {
  on(tipo: string, filtro: Record<string, unknown>, callback: (payload: unknown) => void): CanalRealtime;
  subscribe(callback?: (status: string) => void): CanalRealtime;
  send(mensagem: Record<string, unknown>): unknown;
  track(payload: Record<string, unknown>): unknown;
  presenceState(): Record<string, unknown[]>;
};

export type ClienteRealtime = {
  channel(nome: string, opcoes?: Record<string, unknown>): CanalRealtime;
  removeChannel(canal: CanalRealtime): unknown;
};

export type ApiDoChat = {
  abrirSessao(id: string): Promise<SessaoChat>;
  mensagens(id: string, apos?: string | null): Promise<MensagensChat>;
  enviar(id: string, texto: string): Promise<MensagemChamado>;
  marcarLido(id: string): Promise<unknown>;
};

export type DependenciasChat = {
  api: ApiDoChat;
  realtime: () => ClienteRealtime;
  /** Entrega o token atual ao Realtime antes de abrir canal privado. */
  autenticarRealtime?: () => Promise<unknown>;
  /** A aba está à vista? Só então a conversa conta como lida. */
  visivel?: () => boolean;
  agora?: () => number;
  aoSessaoExpirar?: () => void;
};

export type ChatAoVivo = {
  fechar(): void;
  /** Avisa os outros que estou digitando (no máximo uma vez a cada 2 s). */
  avisarDigitando(): void;
  /** Envia e já mostra a mensagem. Lança o erro da API para a tela mostrar. */
  enviar(texto: string): Promise<void>;
  /** Relê a sessão e as mensagens do servidor. */
  recarregar(): Promise<void>;
  /** Marca como lida (se a aba está à vista). */
  marcarLido(): void;
};

export function abrirChatAoVivo(
  deps: DependenciasChat,
  id: string,
  aoMudar: (estado: EstadoChat) => void,
): ChatAoVivo {
  const agora = deps.agora ?? Date.now;
  const visivel = deps.visivel ?? (() => true);
  let estado: EstadoChat = ESTADO_INICIAL;
  let fechado = false;
  let cursor: string | null = null;
  let buscando = false;
  let repetir = false;
  let ultimoAviso = 0;
  let ticks = 0;
  const digitandoAte = new Map<string, { nome: string; ate: number }>();
  let realtime: ClienteRealtime | null = null;
  let canalBanco: CanalRealtime | null = null;
  let canalChat: CanalRealtime | null = null;
  let relogioDigitando: ReturnType<typeof setTimeout> | null = null;
  let conferencia: ReturnType<typeof setInterval> | null = null;

  const emitir = (parcial: Partial<EstadoChat>) => {
    if (fechado) return;
    estado = { ...estado, ...parcial };
    aoMudar(estado);
  };

  const falhou = (e: unknown) => {
    if (e instanceof ErroApi && e.status === 401) deps.aoSessaoExpirar?.();
    emitir({ erro: mensagemDeErro(e), carregando: false });
  };

  const marcarLido = () => {
    if (fechado || !visivel()) return;
    deps.api.marcarLido(id).catch(() => undefined); // contador de não lidas: não vale interromper o chat
  };

  async function atualizar(): Promise<void> {
    if (fechado) return;
    if (buscando) {
      repetir = true;
      return;
    }
    buscando = true;
    try {
      let recomecou = false;
      do {
        repetir = false;
        try {
          const r = await deps.api.mensagens(id, cursor);
          if (fechado) return;
          const novas = mesclarMensagens(estado.mensagens, r.mensagens);
          cursor = r.ultimo_id_mensagem ?? cursor;
          if (novas !== estado.mensagens) {
            emitir({ mensagens: novas, erro: null });
            if (r.mensagens.some((m) => m.autor === "cliente")) marcarLido();
          }
        } catch (e) {
          // A mensagem de referência sumiu: relê do começo uma vez.
          if (e instanceof ErroApi && e.status === 404 && cursor && !recomecou) {
            cursor = null;
            recomecou = true;
            repetir = true;
          } else {
            throw e;
          }
        }
      } while (repetir && !fechado);
    } catch (e) {
      falhou(e);
    } finally {
      buscando = false;
    }
  }

  async function recarregarSessao(): Promise<void> {
    try {
      const sessao = await deps.api.abrirSessao(id);
      emitir({ sessao });
    } catch (e) {
      falhou(e);
    }
  }

  const limparDigitando = () => {
    const t = agora();
    for (const [chave, d] of digitandoAte) if (d.ate <= t) digitandoAte.delete(chave);
    emitir({ digitando: [...digitandoAte.values()].map((d) => d.nome) });
    relogioDigitando = null;
    agendarLimpeza();
  };

  function agendarLimpeza() {
    if (relogioDigitando || digitandoAte.size === 0 || fechado) return;
    const proximo = Math.min(...[...digitandoAte.values()].map((d) => d.ate));
    relogioDigitando = setTimeout(limparDigitando, Math.max(proximo - agora(), 0) + 50);
  }

  function conectar(sessao: SessaoChat) {
    realtime = deps.realtime();
    const meu = sessao.eu;

    // Mensagens e mudança de responsável/status: Postgres Changes (o RLS decide o que chega).
    canalBanco = realtime
      .channel(`chat-banco:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagem", filter: sessao.filtro_mensagens }, () => {
        void atualizar();
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "atendimento", filter: `id_atendimento=eq.${id}` },
        () => {
          void recarregarSessao();
        },
      )
      .subscribe((status) => {
        if (fechado) return;
        if (status === "SUBSCRIBED") {
          emitir({ conexao: "ao_vivo" });
          void atualizar(); // o que chegou enquanto o canal estava fora
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          emitir({ conexao: "reconectando" });
        }
      });

    // Digitando e presença: canal privado, só para quem enxerga o chamado.
    canalChat = realtime
      .channel(sessao.topico, {
        config: { private: sessao.canal_privado, broadcast: { self: false }, presence: { key: meu.id_usuario } },
      })
      .on("broadcast", { event: "digitando" }, (payload) => {
        const d = lerDigitando(payload);
        if (!d || d.id_usuario === meu.id_usuario) return;
        digitandoAte.set(d.id_usuario, { nome: d.nome, ate: agora() + VALIDADE_DIGITANDO_MS });
        emitir({ digitando: [...digitandoAte.values()].map((x) => x.nome) });
        agendarLimpeza();
      })
      .on("presence", { event: "sync" }, () => {
        if (canalChat) emitir({ presentes: nomesPresentes(canalChat.presenceState(), meu.id_usuario) });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && !fechado) {
          void canalChat?.track({ id_usuario: meu.id_usuario, nome: meu.nome, papel: meu.papel });
        }
      });

    // Rede de segurança: se um evento se perder (ou o canal cair), a conferência recupera.
    conferencia = setInterval(() => {
      ticks += 1;
      if (estado.conexao !== "ao_vivo" || ticks % 2 === 0) void atualizar();
    }, CONFERENCIA_MS);
  }

  async function iniciar() {
    try {
      const sessao = await deps.api.abrirSessao(id);
      const lote = await deps.api.mensagens(id);
      if (fechado) return;
      cursor = lote.ultimo_id_mensagem;
      emitir({ sessao, mensagens: lote.mensagens, carregando: false, erro: null });
      if (sessao.nao_lidas > 0) marcarLido();
      await deps.autenticarRealtime?.();
      if (fechado) return;
      conectar(sessao);
    } catch (e) {
      falhou(e);
    }
  }

  void iniciar();

  return {
    fechar() {
      fechado = true;
      if (relogioDigitando) clearTimeout(relogioDigitando);
      if (conferencia) clearInterval(conferencia);
      if (canalBanco) realtime?.removeChannel(canalBanco);
      if (canalChat) realtime?.removeChannel(canalChat);
    },
    avisarDigitando() {
      const sessao = estado.sessao;
      if (!canalChat || !sessao || agora() - ultimoAviso < INTERVALO_AVISO_DIGITANDO_MS) return;
      ultimoAviso = agora();
      void canalChat.send({
        type: "broadcast",
        event: "digitando",
        payload: { id_usuario: sessao.eu.id_usuario, nome: sessao.eu.nome },
      });
    },
    async enviar(texto) {
      const mensagem = await deps.api.enviar(id, texto);
      emitir({ mensagens: mesclarMensagens(estado.mensagens, [mensagem]), erro: null });
      // Responder pode assumir o chamado; e o cursor traz qualquer mensagem do cliente que chegou antes.
      void recarregarSessao();
      void atualizar();
    },
    async recarregar() {
      await Promise.all([recarregarSessao(), atualizar()]);
    },
    marcarLido,
  };
}

// ---------- Caixa de conversas ao vivo ----------

/**
 * Avisa quando algo muda nas conversas que a pessoa enxerga (mensagem nova, chamado assumido ou
 * encerrado). O RLS filtra os eventos; vários seguidos viram um aviso só. Devolve a função que desliga.
 */
export function assinarMudancasDaCaixa(
  realtime: ClienteRealtime,
  aoMudar: () => void,
  espera = ESPERA_CAIXA_MS,
): () => void {
  let relogio: ReturnType<typeof setTimeout> | null = null;
  let ativa = true;
  const avisar = () => {
    if (!ativa || relogio) return;
    relogio = setTimeout(() => {
      relogio = null;
      if (ativa) aoMudar();
    }, espera);
  };
  const canal = realtime
    .channel("caixa-de-conversas")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagem" }, avisar)
    .on("postgres_changes", { event: "*", schema: "public", table: "atendimento" }, avisar)
    .subscribe();
  return () => {
    ativa = false;
    if (relogio) clearTimeout(relogio);
    realtime.removeChannel(canal);
  };
}
