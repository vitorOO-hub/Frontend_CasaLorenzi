import { Archive, LoaderCircle, Maximize2, Minimize2, PanelLeft, Send, Sparkles, SquarePen, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { mensagemDeErro } from "@/api/erros";
import {
  TAMANHO_MAXIMO_PERGUNTA,
  arquivarConversa,
  avaliarResposta,
  criarConversa,
  linhasDaResposta,
  listarConversas,
  obterMensagens,
  perguntar,
  rotuloFerramenta,
  type Avaliacao,
  type ConversaAssistente,
  type MensagemAssistente,
} from "@/lib/assistenteVendedorApi";
import { cn } from "./ui";

const SUGESTOES = [
  "Quanto vendemos hoje?",
  "Quais peças mais saíram este mês?",
  "Tem camisa de linho azul no M?",
  "Que horas fecha a loja do shopping?",
];

/** Distância mínima entre a janela e a borda da tela. */
const MARGEM = 8;
const LARGURA_MINIMA = 360;
const ALTURA_MINIMA = 380;
/** Abaixo dessa largura o histórico abre por cima da conversa, em vez de ao lado. */
const LARGURA_COM_LATERAL = 640;
/** Centro da bolinha, medido a partir do canto inferior direito da tela (bottom-6 right-6, 56px). */
const CENTRO_DA_BOLINHA = 52;
const CHAVE_DA_CAIXA = "assistente-vendedor:caixa";

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const telaGrande = () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;
const semAnimacao = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Posição e tamanho da janela depois que o vendedor arrasta ou redimensiona (null = canto padrão). */
type Caixa = { x: number; y: number; largura: number; altura: number };
type Borda = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/** Alças invisíveis nas bordas e cantos para aumentar ou diminuir a janela. */
const ALCAS: [Borda, string][] = [
  ["n", "inset-x-4 top-0 h-1.5 cursor-ns-resize"],
  ["s", "inset-x-4 bottom-0 h-1.5 cursor-ns-resize"],
  ["w", "inset-y-4 left-0 w-1.5 cursor-ew-resize"],
  ["e", "inset-y-4 right-0 w-1.5 cursor-ew-resize"],
  ["nw", "left-0 top-0 h-4 w-4 cursor-nwse-resize"],
  ["se", "bottom-0 right-0 h-4 w-4 cursor-nwse-resize"],
  ["ne", "right-0 top-0 h-4 w-4 cursor-nesw-resize"],
  ["sw", "bottom-0 left-0 h-4 w-4 cursor-nesw-resize"],
];

const entre = (valor: number, minimo: number, maximo: number) => Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));

/** Mantém a janela inteira dentro da tela (encolhe se a tela ficou menor que ela). */
function limitar({ x, y, largura, altura }: Caixa): Caixa {
  const l = entre(largura, LARGURA_MINIMA, window.innerWidth - 2 * MARGEM);
  const a = entre(altura, ALTURA_MINIMA, window.innerHeight - 2 * MARGEM);
  return {
    x: entre(x, MARGEM, window.innerWidth - l - MARGEM),
    y: entre(y, MARGEM, window.innerHeight - a - MARGEM),
    largura: l,
    altura: a,
  };
}

function caixaSalva(): Caixa | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE_DA_CAIXA) ?? "null") as Caixa | null;
    return c && [c.x, c.y, c.largura, c.altura].every(Number.isFinite) ? limitar(c) : null;
  } catch {
    return null;
  }
}

function salvarCaixa(caixa: Caixa | null) {
  try {
    if (caixa) localStorage.setItem(CHAVE_DA_CAIXA, JSON.stringify(caixa));
    else localStorage.removeItem(CHAVE_DA_CAIXA);
  } catch {
    // Sem armazenamento (aba anônima): a janela só não lembra o tamanho.
  }
}

/** Segue o ponteiro até soltar o botão. */
function acompanharPonteiro(mover: (e: globalThis.PointerEvent) => void, aoSoltar: () => void) {
  const soltar = () => {
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
    aoSoltar();
  };
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
}

/** Resposta do assistente: parágrafos, listas e negrito, sem HTML cru. */
export function TextoDaResposta({ texto }: { texto: string }) {
  const linhas = linhasDaResposta(texto);
  return (
    <div className="space-y-1.5">
      {linhas.map((linha, i) => {
        const conteudo = linha.trechos.map((t, j) => (t.negrito ? <strong key={j}>{t.texto}</strong> : <span key={j}>{t.texto}</span>));
        return linha.tipo === "item" ? (
          <p key={i} className="flex gap-2">
            <span aria-hidden className="text-dourado">•</span>
            <span>{conteudo}</span>
          </p>
        ) : (
          <p key={i}>{conteudo}</p>
        );
      })}
    </div>
  );
}

function Bolha({ mensagem, onAvaliar }: { mensagem: MensagemAssistente; onAvaliar?: (valor: Avaliacao) => void }) {
  const minha = mensagem.autor === "usuario";
  const consultas = mensagem.ferramentas.map(rotuloFerramenta).filter((r): r is string => Boolean(r));
  const botao = (valor: Avaliacao, Icone: typeof ThumbsUp, rotulo: string) => (
    <button
      type="button"
      onClick={() => onAvaliar?.(valor)}
      aria-label={rotulo}
      aria-pressed={mensagem.avaliacao === valor}
      title={rotulo}
      className={cn("rounded-sm p-1 hover:text-marinho", mensagem.avaliacao === valor ? "text-marinho" : "text-suave/70")}
    >
      <Icone className="h-3.5 w-3.5" fill={mensagem.avaliacao === valor ? "currentColor" : "none"} />
    </button>
  );
  return (
    <div className={cn("flex flex-col", minha ? "items-end" : "items-start")}>
      {/* Como no Claude: a pergunta num balão, a resposta solta na página. */}
      <div
        className={cn(
          "text-sm leading-relaxed text-tinta",
          minha ? "max-w-[80%] whitespace-pre-wrap rounded-2xl bg-areia px-4 py-2.5" : "w-full",
        )}
      >
        {minha ? mensagem.texto : <TextoDaResposta texto={mensagem.texto} />}
      </div>
      {!minha && onAvaliar ? (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-suave">
          {botao("util", ThumbsUp, "Resposta útil")}
          {botao("nao_util", ThumbsDown, "Resposta não ajudou")}
          {consultas.length ? <span className="ml-1">Consultou: {consultas.join(", ")}</span> : null}
        </div>
      ) : consultas.length ? (
        <p className="mt-1 text-[11px] text-suave">Consultou: {consultas.join(", ")}</p>
      ) : null}
    </div>
  );
}

/**
 * Assistente de vendas: bolinha no canto inferior direito do painel (só para o vendedor) que abre o
 * chat no estilo do Claude: histórico de conversas na lateral, "novo chat" no topo e a conversa ao lado.
 * No computador a janela pode ser arrastada pelo cabeçalho, aumentada ou diminuída pelas bordas e
 * maximizada; dois cliques no cabeçalho voltam ao canto e ao tamanho padrão. Quem é o vendedor e a
 * loja vêm do token no servidor.
 */
export function AssistenteVendedor() {
  // `montado` segura a janela na tela enquanto a animação de saída roda.
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [lateral, setLateral] = useState(true);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  // Caixa de antes de maximizar, para o botão de restaurar.
  const [antesDeMaximizar, setAntesDeMaximizar] = useState<Caixa | null | undefined>(undefined);
  const [acao, setAcao] = useState<"arrastando" | "redimensionando" | null>(null);
  const [conversas, setConversas] = useState<ConversaAssistente[]>([]);
  const [atual, setAtual] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemAssistente[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView?.({ block: "end" });
  }, [mensagens, enviando]);

  // Se a tela diminuir, a janela continua inteira à vista (e no celular volta a ocupar a tela).
  useEffect(() => {
    if (!caixa) return;
    function aoRedimensionar() {
      setCaixa((c) => (c && telaGrande() ? limitar(c) : null));
    }
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [caixa]);

  const compacta = caixa !== null && caixa.largura < LARGURA_COM_LATERAL;
  const maximizada = antesDeMaximizar !== undefined;

  async function carregarConversas() {
    try {
      setConversas(await listarConversas());
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  function abrir() {
    const salva = telaGrande() ? caixaSalva() : null;
    setCaixa(salva);
    setAntesDeMaximizar(undefined);
    setMontado(true);
    setAberto(true);
    setLateral(telaGrande() && !(salva && salva.largura < LARGURA_COM_LATERAL));
    setErro(null);
    void carregarConversas();
  }

  function fechar() {
    setAberto(false);
    if (semAnimacao()) setMontado(false);
  }

  /** No celular ou com a janela estreita, o histórico fica por cima: some ao escolher uma conversa. */
  function recolherLateralSobreposta() {
    if (!telaGrande() || compacta) setLateral(false);
  }

  function novoChat() {
    setAtual(null);
    setMensagens([]);
    setErro(null);
    recolherLateralSobreposta();
  }

  async function abrirConversa(id: string) {
    setCarregando(true);
    setErro(null);
    recolherLateralSobreposta();
    try {
      const r = await obterMensagens(id);
      setAtual(id);
      setMensagens(r.mensagens);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  async function arquivar(id: string) {
    try {
      await arquivarConversa(id);
      setConversas((lista) => lista.filter((c) => c.id_conversa !== id));
      if (atual === id) novoChat();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function avaliar(mensagem: MensagemAssistente, valor: Avaliacao) {
    if (!atual) return;
    // Clicar de novo no mesmo botão tira a avaliação.
    const nova = mensagem.avaliacao === valor ? null : valor;
    const trocar = (avaliacao: Avaliacao | null) =>
      setMensagens((m) => m.map((x) => (x.id_mensagem === mensagem.id_mensagem ? { ...x, avaliacao } : x)));
    trocar(nova);
    try {
      await avaliarResposta(atual, mensagem.id_mensagem, nova);
    } catch (e) {
      trocar(mensagem.avaliacao);
      setErro(mensagemDeErro(e));
    }
  }

  async function enviar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || enviando) return;
    setEnviando(true);
    setErro(null);
    setTexto("");
    // Mostra a pergunta na hora; a resposta do servidor troca pelo registro gravado.
    const provisoria: MensagemAssistente = { id_mensagem: "provisoria", autor: "usuario", texto: limpa, criada_em: "", ferramentas: [], avaliacao: null };
    setMensagens((m) => [...m, provisoria]);
    try {
      const id = atual ?? (await criarConversa()).id_conversa;
      setAtual(id);
      const r = await perguntar(id, limpa);
      setMensagens((m) => [...m.filter((x) => x.id_mensagem !== "provisoria"), r.pergunta, r.resposta]);
      void carregarConversas();
    } catch (e) {
      setMensagens((m) => m.filter((x) => x.id_mensagem !== "provisoria"));
      setTexto(limpa);
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    void enviar(texto);
  }

  function aoTeclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void enviar(texto);
    }
  }

  /** Arrasta a janela pelo cabeçalho (só no computador; os botões do cabeçalho continuam clicáveis). */
  function comecarArraste(e: PointerEvent<HTMLElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button") || !telaGrande()) return;
    const r = painel.current?.getBoundingClientRect();
    if (!r) return;
    e.preventDefault();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    let ultima: Caixa | null = null;
    setAcao("arrastando");
    setAntesDeMaximizar(undefined);
    acompanharPonteiro(
      (ev) => {
        ultima = limitar({ x: ev.clientX - dx, y: ev.clientY - dy, largura: r.width, altura: r.height });
        setCaixa(ultima);
      },
      () => {
        setAcao(null);
        if (ultima) salvarCaixa(ultima);
      },
    );
  }

  /** Aumenta ou diminui a janela puxando uma borda ou um canto; o lado oposto fica parado. */
  function comecarRedimensionar(borda: Borda, e: PointerEvent<HTMLElement>) {
    const r = painel.current?.getBoundingClientRect();
    if (e.button !== 0 || !r) return;
    e.preventDefault();
    e.stopPropagation();
    let ultima: Caixa | null = null;
    setAcao("redimensionando");
    setAntesDeMaximizar(undefined);
    acompanharPonteiro(
      (ev) => {
        const dx = ev.clientX - e.clientX;
        const dy = ev.clientY - e.clientY;
        let { left: x, top: y, width: largura, height: altura } = r;
        if (borda.includes("e")) largura = entre(r.width + dx, LARGURA_MINIMA, window.innerWidth - MARGEM - r.left);
        if (borda.includes("w")) {
          largura = entre(r.width - dx, LARGURA_MINIMA, r.right - MARGEM);
          x = r.right - largura;
        }
        if (borda.includes("s")) altura = entre(r.height + dy, ALTURA_MINIMA, window.innerHeight - MARGEM - r.top);
        if (borda.includes("n")) {
          altura = entre(r.height - dy, ALTURA_MINIMA, r.bottom - MARGEM);
          y = r.bottom - altura;
        }
        ultima = { x, y, largura, altura };
        setCaixa(ultima);
      },
      () => {
        setAcao(null);
        if (ultima) salvarCaixa(ultima);
      },
    );
  }

  function alternarMaximizar() {
    if (maximizada) {
      setCaixa(antesDeMaximizar ?? null);
      setAntesDeMaximizar(undefined);
      return;
    }
    setAntesDeMaximizar(caixa);
    setCaixa({ x: MARGEM, y: MARGEM, largura: window.innerWidth - 2 * MARGEM, altura: window.innerHeight - 2 * MARGEM });
    setLateral(true);
  }

  function voltarAoPadrao() {
    setCaixa(null);
    setAntesDeMaximizar(undefined);
    salvarCaixa(null);
  }

  // A janela cresce da bolinha e volta para ela, esteja onde estiver na tela.
  const origemDaAnimacao =
    caixa && typeof window !== "undefined"
      ? `${window.innerWidth - CENTRO_DA_BOLINHA - caixa.x}px ${window.innerHeight - CENTRO_DA_BOLINHA - caixa.y}px`
      : telaGrande()
        ? "calc(100% - 28px) calc(100% + 44px)"
        : "calc(100% - 52px) calc(100% - 52px)";

  const historico = (
    <aside
      aria-label="Histórico de conversas"
      className={cn(
        "flex w-64 shrink-0 flex-col border-r border-linha bg-creme",
        // No celular ou com a janela estreita o histórico abre por cima da conversa, então precisa ser opaco.
        "absolute inset-y-0 left-0 z-10 shadow-suave",
        !compacta && "sm:static sm:bg-areia/50 sm:shadow-none",
      )}
    >
      <div className="p-3">
        <button
          onClick={novoChat}
          className="flex w-full items-center gap-2 rounded-lg border border-linha bg-papel px-3 py-2 text-sm text-marinho transition-colors hover:border-marinho"
        >
          <SquarePen className="h-4 w-4" /> Novo chat
        </button>
      </div>
      <p className="px-4 pb-1 text-[11px] uppercase tracking-wider text-suave">Recentes</p>
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {conversas.length === 0 ? <p className="px-2 py-4 text-xs text-suave">Nenhuma conversa ainda.</p> : null}
        {conversas.map((c) => (
          <div
            key={c.id_conversa}
            className={cn(
              "group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-papel",
              c.id_conversa === atual && "bg-papel",
            )}
          >
            <button
              onClick={() => void abrirConversa(c.id_conversa)}
              aria-current={c.id_conversa === atual ? "true" : undefined}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm text-tinta">{c.titulo}</span>
              <span className="text-[11px] text-suave">{dataCurta(c.atualizada_em)}</span>
            </button>
            <button
              onClick={() => void arquivar(c.id_conversa)}
              aria-label={`Arquivar ${c.titulo}`}
              title="Arquivar"
              className="p-1 text-suave opacity-100 transition-opacity hover:text-perigo sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
            >
              <Archive className="h-4 w-4" />
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );

  return (
    <>
      {montado ? (
        <section
          ref={painel}
          role="dialog"
          aria-label="Assistente de vendas"
          style={{
            transformOrigin: origemDaAnimacao,
            ...(caixa ? { left: caixa.x, top: caixa.y, width: caixa.largura, height: caixa.altura, right: "auto", bottom: "auto" } : {}),
          }}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && !aberto) setMontado(false);
          }}
          className={cn(
            "fixed inset-0 z-50 flex flex-col overflow-hidden bg-creme sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100vh-8rem))] sm:rounded-xl sm:border sm:border-linha sm:shadow-suave",
            lateral ? "sm:w-[min(820px,calc(100vw-3rem))]" : "sm:w-[min(560px,calc(100vw-3rem))]",
            // Sem transição enquanto o vendedor arrasta ou puxa a borda, para a janela seguir o mouse.
            !acao && "transition-[width,height,left,top] duration-200 ease-out",
            aberto
              ? "animate-[assistente-entrar_320ms_cubic-bezier(0.16,1,0.3,1)_both]"
              : "pointer-events-none animate-[assistente-sair_200ms_cubic-bezier(0.4,0,1,1)_both]",
            acao && "select-none",
          )}
        >
          {ALCAS.map(([borda, posicaoDaAlca]) => (
            <div
              key={borda}
              aria-hidden
              onPointerDown={(e) => comecarRedimensionar(borda, e)}
              onDoubleClick={voltarAoPadrao}
              className={cn("absolute z-30 hidden touch-none transition-colors hover:bg-dourado/40 sm:block", posicaoDaAlca)}
            />
          ))}
          <header
            onPointerDown={comecarArraste}
            onDoubleClick={(e) => {
              if (!(e.target as HTMLElement).closest("button")) voltarAoPadrao();
            }}
            title="Arraste para mover, puxe as bordas para aumentar ou diminuir"
            className={cn(
              "flex items-center gap-2 border-b border-linha bg-marinho px-3 py-2.5 text-creme sm:touch-none",
              acao === "arrastando" ? "sm:cursor-grabbing" : "sm:cursor-grab",
            )}
          >
            <button
              onClick={() => setLateral((v) => !v)}
              aria-label={lateral ? "Esconder histórico" : "Mostrar histórico"}
              aria-expanded={lateral}
              title={lateral ? "Esconder histórico" : "Mostrar histórico"}
              className="rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <Sparkles className="h-4 w-4 text-dourado-claro" />
            <h2 className="flex-1 truncate text-base font-normal">Assistente de vendas</h2>
            <button onClick={novoChat} aria-label="Novo chat" title="Novo chat" className="rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme">
              <SquarePen className="h-4 w-4" />
            </button>
            <button
              onClick={alternarMaximizar}
              aria-label={maximizada ? "Restaurar tamanho" : "Maximizar"}
              title={maximizada ? "Restaurar tamanho" : "Maximizar"}
              className="hidden rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme sm:block"
            >
              {maximizada ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button onClick={fechar} aria-label="Fechar assistente" className="rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="relative flex min-h-0 flex-1">
            {lateral ? historico : null}

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <div className="mx-auto max-w-2xl space-y-5">
                  {carregando ? <p className="text-center text-sm text-suave">Carregando a conversa…</p> : null}
                  {!carregando && mensagens.length === 0 ? (
                    <div className="pt-6 text-center">
                      <Sparkles className="mx-auto h-7 w-7 text-dourado" />
                      <p className="mt-3 text-lg text-tinta">Como posso ajudar?</p>
                      <p className="mt-1 text-sm text-suave">Pergunte sobre as vendas, o estoque, os clientes ou as lojas. Eu consulto os dados da sua loja.</p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {SUGESTOES.map((s) => (
                          <button
                            key={s}
                            onClick={() => void enviar(s)}
                            className="rounded-full border border-linha bg-papel px-3 py-1.5 text-xs text-marinho transition-colors hover:border-marinho"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {mensagens.map((m) => (
                    <Bolha key={m.id_mensagem} mensagem={m} onAvaliar={(valor) => void avaliar(m, valor)} />
                  ))}
                  {enviando ? (
                    <p className="flex items-center gap-2 text-xs text-suave" role="status">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Consultando os dados da loja…
                    </p>
                  ) : null}
                  <div ref={fim} />
                </div>
              </div>

              {erro ? (
                <p role="alert" className="border-t border-linha bg-dourado-claro px-4 py-2 text-xs text-perigo">
                  {erro}
                </p>
              ) : null}

              <form onSubmit={aoEnviar} className="px-3 pb-3 pt-1 sm:px-6 sm:pb-4">
                <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-linha bg-papel p-2 shadow-sm transition-colors focus-within:border-marinho">
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={aoTeclar}
                    maxLength={TAMANHO_MAXIMO_PERGUNTA}
                    rows={1}
                    placeholder="Pergunte ao assistente…"
                    aria-label="Sua pergunta"
                    className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-tinta outline-none"
                  />
                  <button
                    type="submit"
                    disabled={enviando || !texto.trim()}
                    aria-label="Enviar"
                    className="rounded-lg bg-marinho p-2 text-creme transition-colors hover:bg-marinho-escuro disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      ) : null}

      <button
        onClick={() => (aberto ? fechar() : abrir())}
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente de vendas"}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-marinho text-creme shadow-suave transition-transform duration-200 hover:scale-105 active:scale-95",
          aberto && "hidden sm:flex",
        )}
      >
        {/* Os dois ícones ficam sobrepostos e trocam girando. */}
        <Sparkles className={cn("absolute h-6 w-6 transition-all duration-300", aberto ? "rotate-90 scale-50 opacity-0" : "rotate-0 opacity-100")} />
        <X className={cn("absolute h-6 w-6 transition-all duration-300", aberto ? "rotate-0 opacity-100" : "-rotate-90 scale-50 opacity-0")} />
      </button>
    </>
  );
}
