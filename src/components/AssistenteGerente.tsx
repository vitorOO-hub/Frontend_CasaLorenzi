import { LoaderCircle, Maximize2, Minimize2, PanelLeft, Send, Sparkles, SquarePen, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { mensagemDeErro } from "@/api/erros";
import { TAMANHO_MAXIMO_PERGUNTA_GERENTE, criarConversaGerente, listarConversasGerente, obterConversaGerente, perguntarGerente, type ConversaGerente, type MensagemGerente } from "@/lib/assistenteGerenteApi";
import { linhasDaResposta } from "@/lib/assistenteVendedorApi";
import { cn } from "./ui";

const SUGESTOES = [
  "O que precisa de reposição na minha unidade?",
  "Quais peças estão paradas há 60 dias?",
  "Quais são as pendências atuais da unidade?",
  "Como estão os indicadores da unidade?",
];

const MARGEM = 8;
const LARGURA_MINIMA = 360;
const ALTURA_MINIMA = 380;
const LARGURA_COM_LATERAL = 640;
const CENTRO_DA_BOLINHA = 52;
const CHAVE_DA_CAIXA = "assistente-gerente:caixa";

type Caixa = { x: number; y: number; largura: number; altura: number };
type Borda = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type MensagemLocal = MensagemGerente & { id: string };

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
const telaGrande = () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;
const semAnimacao = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function limitar({ x, y, largura, altura }: Caixa): Caixa {
  const l = entre(largura, LARGURA_MINIMA, window.innerWidth - 2 * MARGEM);
  const a = entre(altura, ALTURA_MINIMA, window.innerHeight - 2 * MARGEM);
  return { x: entre(x, MARGEM, window.innerWidth - l - MARGEM), y: entre(y, MARGEM, window.innerHeight - a - MARGEM), largura: l, altura: a };
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
    // O chat continua utilizável sem armazenamento local.
  }
}

function acompanharPonteiro(mover: (e: globalThis.PointerEvent) => void, aoSoltar: () => void) {
  const soltar = () => {
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
    aoSoltar();
  };
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
}

function TextoDaResposta({ texto }: { texto: string }) {
  return (
    <div className="space-y-1.5">
      {linhasDaResposta(texto).map((linha, i) => {
        const conteudo = linha.trechos.map((t, j) => (t.negrito ? <strong key={j}>{t.texto}</strong> : <span key={j}>{t.texto}</span>));
        return linha.tipo === "item" ? <p key={i} className="flex gap-2"><span aria-hidden className="text-dourado">•</span><span>{conteudo}</span></p> : <p key={i}>{conteudo}</p>;
      })}
    </div>
  );
}

function Bolha({ mensagem }: { mensagem: MensagemLocal }) {
  const minha = mensagem.autor === "usuario";
  return (
    <div className={cn("flex flex-col", minha ? "items-end" : "items-start")}>
      <div className={cn("text-sm leading-relaxed text-tinta", minha ? "max-w-[80%] whitespace-pre-wrap rounded-2xl bg-areia px-4 py-2.5" : "w-full")}>
        {minha ? mensagem.texto : <TextoDaResposta texto={mensagem.texto} />}
      </div>
    </div>
  );
}

export function AssistenteGerente() {
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [lateral, setLateral] = useState(true);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [antesDeMaximizar, setAntesDeMaximizar] = useState<Caixa | null | undefined>(undefined);
  const [acao, setAcao] = useState<"arrastando" | "redimensionando" | null>(null);
  const [conversas, setConversas] = useState<ConversaGerente[]>([]);
  const [atual, setAtual] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemLocal[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLElement>(null);
  const compacto = caixa !== null && caixa.largura < LARGURA_COM_LATERAL;
  const maximizada = antesDeMaximizar !== undefined;

  useEffect(() => { fim.current?.scrollIntoView?.({ block: "end" }); }, [mensagens, enviando]);

  useEffect(() => {
    if (!caixa) return;
    const aoRedimensionar = () => setCaixa((c) => (c && telaGrande() ? limitar(c) : null));
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [caixa]);

  async function carregarConversas() {
    try { setConversas(await listarConversasGerente()); }
    catch (e) { setErro(mensagemDeErro(e)); }
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

  function recolherLateralSobreposta() {
    if (!telaGrande() || compacto) setLateral(false);
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
      const r = await obterConversaGerente(id);
      setAtual(id);
      setMensagens(r.mensagens.map((m, i) => ({ ...m, id: `${id}-${i}` })));
    } catch (e) { setErro(mensagemDeErro(e)); }
    finally { setCarregando(false); }
  }

  async function enviar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || enviando) return;
    setEnviando(true);
    setErro(null);
    setTexto("");
    const provisoriaId = `provisoria-${mensagens.length}`;
    setMensagens((m) => [...m, { id: provisoriaId, autor: "usuario", texto: limpa, criada_em: "", modelo: null }]);
    try {
      const id = atual ?? (await criarConversaGerente()).id_conversa;
      setAtual(id);
      const r = await perguntarGerente(id, limpa);
      setMensagens((m) => [...m.filter((x) => x.id !== provisoriaId),
        { id: `${id}-${m.length}`, autor: "usuario", texto: limpa, criada_em: "", modelo: null },
        { id: `${id}-${m.length + 1}`, autor: "assistente", texto: r.resposta, criada_em: "", modelo: r.modelo },
      ]);
      void carregarConversas();
    } catch (e) {
      setMensagens((m) => m.filter((x) => x.id !== provisoriaId));
      setTexto(limpa);
      setErro(mensagemDeErro(e));
    } finally { setEnviando(false); }
  }

  function aoEnviar(e: FormEvent) { e.preventDefault(); void enviar(texto); }
  function aoTeclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(texto); }
  }

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
    acompanharPonteiro((ev) => { ultima = limitar({ x: ev.clientX - dx, y: ev.clientY - dy, largura: r.width, altura: r.height }); setCaixa(ultima); }, () => {
      setAcao(null);
      if (ultima) salvarCaixa(ultima);
    });
  }

  function comecarRedimensionar(borda: Borda, e: PointerEvent<HTMLElement>) {
    const r = painel.current?.getBoundingClientRect();
    if (e.button !== 0 || !r) return;
    e.preventDefault(); e.stopPropagation();
    let ultima: Caixa | null = null;
    setAcao("redimensionando");
    setAntesDeMaximizar(undefined);
    acompanharPonteiro((ev) => {
      const dx = ev.clientX - e.clientX; const dy = ev.clientY - e.clientY;
      let { left: x, top: y, width: largura, height: altura } = r;
      if (borda.includes("e")) largura = entre(r.width + dx, LARGURA_MINIMA, window.innerWidth - MARGEM - r.left);
      if (borda.includes("w")) { largura = entre(r.width - dx, LARGURA_MINIMA, r.right - MARGEM); x = r.right - largura; }
      if (borda.includes("s")) altura = entre(r.height + dy, ALTURA_MINIMA, window.innerHeight - MARGEM - r.top);
      if (borda.includes("n")) { altura = entre(r.height - dy, ALTURA_MINIMA, r.bottom - MARGEM); y = r.bottom - altura; }
      ultima = { x, y, largura, altura }; setCaixa(ultima);
    }, () => { setAcao(null); if (ultima) salvarCaixa(ultima); });
  }

  function alternarMaximizar() {
    if (maximizada) { setCaixa(antesDeMaximizar ?? null); setAntesDeMaximizar(undefined); return; }
    setAntesDeMaximizar(caixa);
    setCaixa({ x: MARGEM, y: MARGEM, largura: window.innerWidth - 2 * MARGEM, altura: window.innerHeight - 2 * MARGEM });
    setLateral(true);
  }

  function voltarAoPadrao() { setCaixa(null); setAntesDeMaximizar(undefined); salvarCaixa(null); }

  const origemDaAnimacao = caixa && typeof window !== "undefined"
    ? `${window.innerWidth - CENTRO_DA_BOLINHA - caixa.x}px ${window.innerHeight - CENTRO_DA_BOLINHA - caixa.y}px`
    : telaGrande() ? "calc(100% - 28px) calc(100% + 44px)" : "calc(100% - 52px) calc(100% - 52px)";

  const historico = (
    <aside aria-label="Histórico de conversas" className={cn("absolute inset-y-0 left-0 z-10 flex w-64 shrink-0 flex-col border-r border-linha bg-creme shadow-suave", !compacto && "sm:static sm:bg-areia/50 sm:shadow-none")}>
      <div className="p-3"><button onClick={novoChat} className="flex w-full items-center gap-2 rounded-lg border border-linha bg-papel px-3 py-2 text-sm text-marinho transition-colors hover:border-marinho"><SquarePen className="h-4 w-4" /> Novo chat</button></div>
      <p className="px-4 pb-1 text-[11px] uppercase tracking-wider text-suave">Recentes</p>
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {conversas.length === 0 ? <p className="px-2 py-4 text-xs text-suave">Nenhuma conversa ainda.</p> : null}
        {conversas.map((c) => <button key={c.id_conversa} onClick={() => void abrirConversa(c.id_conversa)} aria-current={c.id_conversa === atual ? "true" : undefined} className={cn("mb-1 block w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-papel", c.id_conversa === atual && "bg-papel")}>
          <span className="block truncate text-sm text-tinta">{c.titulo || "Nova conversa"}</span><span className="text-[11px] text-suave">{dataCurta(c.atualizada_em)}</span>
        </button>)}
      </nav>
    </aside>
  );

  return <>
    {montado ? <section ref={painel} role="dialog" aria-label="Assistente do gerente" style={{ transformOrigin: origemDaAnimacao, ...(caixa ? { left: caixa.x, top: caixa.y, width: caixa.largura, height: caixa.altura, right: "auto", bottom: "auto" } : {}) }} onAnimationEnd={(e) => { if (e.target === e.currentTarget && !aberto) setMontado(false); }} className={cn("fixed inset-0 z-50 flex flex-col overflow-hidden bg-creme sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100vh-8rem))] sm:rounded-xl sm:border sm:border-linha sm:shadow-suave", lateral ? "sm:w-[min(820px,calc(100vw-3rem))]" : "sm:w-[min(560px,calc(100vw-3rem))]", !acao && "transition-[width,height,left,top] duration-200 ease-out", aberto ? "animate-[assistente-entrar_320ms_cubic-bezier(0.16,1,0.3,1)_both]" : "pointer-events-none animate-[assistente-sair_200ms_cubic-bezier(0.4,0,1,1)_both]", acao && "select-none")}>
      {ALCAS.map(([borda, posicao]) => <div key={borda} aria-hidden onPointerDown={(e) => comecarRedimensionar(borda, e)} onDoubleClick={voltarAoPadrao} className={cn("absolute z-30 hidden touch-none transition-colors hover:bg-dourado/40 sm:block", posicao)} />)}
      <header onPointerDown={comecarArraste} onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest("button")) voltarAoPadrao(); }} title="Arraste para mover, puxe as bordas para redimensionar" className={cn("flex items-center gap-2 border-b border-linha bg-marinho px-3 py-2.5 text-creme sm:touch-none", acao === "arrastando" ? "sm:cursor-grabbing" : "sm:cursor-grab")}>
        <button onClick={() => setLateral((v) => !v)} aria-label={lateral ? "Esconder histórico" : "Mostrar histórico"} aria-expanded={lateral} title={lateral ? "Esconder histórico" : "Mostrar histórico"} className="rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme"><PanelLeft className="h-4 w-4" /></button>
        <Sparkles className="h-4 w-4 text-dourado-claro" /><h2 className="flex-1 truncate text-base font-normal">Assistente do gerente</h2>
        <button onClick={novoChat} aria-label="Novo chat" title="Novo chat" className="rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme"><SquarePen className="h-4 w-4" /></button>
        <button onClick={alternarMaximizar} aria-label={maximizada ? "Restaurar tamanho" : "Maximizar"} title={maximizada ? "Restaurar tamanho" : "Maximizar"} className="hidden rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme sm:block">{maximizada ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
        <button onClick={fechar} aria-label="Fechar assistente" className="rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme"><X className="h-4 w-4" /></button>
      </header>
      <div className="relative flex min-h-0 flex-1">
        {lateral ? historico : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"><div className="mx-auto max-w-2xl space-y-5">
            {carregando ? <p className="text-center text-sm text-suave">Carregando a conversa…</p> : null}
            {!carregando && mensagens.length === 0 ? <div className="pt-6 text-center"><Sparkles className="mx-auto h-7 w-7 text-dourado" /><p className="mt-3 text-lg text-tinta">Como posso ajudar?</p><p className="mt-1 text-sm text-suave">Pergunte sobre vendas, reposição, estoque parado ou pendências da sua unidade.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{SUGESTOES.map((s) => <button key={s} onClick={() => void enviar(s)} className="rounded-full border border-linha bg-papel px-3 py-1.5 text-xs text-marinho transition-colors hover:border-marinho">{s}</button>)}</div></div> : null}
            {mensagens.map((m) => <Bolha key={m.id} mensagem={m} />)}
            {enviando ? <p className="flex items-center gap-2 text-xs text-suave" role="status"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Consultando os dados da unidade…</p> : null}
            <div ref={fim} />
          </div></div>
          {erro ? <p role="alert" className="border-t border-linha bg-dourado-claro px-4 py-2 text-xs text-perigo">{erro}</p> : null}
          <form onSubmit={aoEnviar} className="px-3 pb-3 pt-1 sm:px-6 sm:pb-4"><div className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-linha bg-papel p-2 shadow-sm transition-colors focus-within:border-marinho">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={aoTeclar} maxLength={TAMANHO_MAXIMO_PERGUNTA_GERENTE} rows={1} placeholder="Pergunte ao assistente…" aria-label="Sua pergunta" className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-tinta outline-none" />
            <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar" className="rounded-lg bg-marinho p-2 text-creme transition-colors hover:bg-marinho-escuro disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </div></form>
        </div>
      </div>
    </section> : null}
    <button onClick={() => (aberto ? fechar() : abrir())} aria-label={aberto ? "Fechar assistente" : "Abrir assistente do gerente"} className={cn("fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-marinho text-creme shadow-suave transition-transform duration-200 hover:scale-105 active:scale-95", aberto && "hidden sm:flex")}>
      <Sparkles className={cn("absolute h-6 w-6 transition-all duration-300", aberto ? "rotate-90 scale-50 opacity-0" : "rotate-0 opacity-100")} /><X className={cn("absolute h-6 w-6 transition-all duration-300", aberto ? "rotate-0 opacity-100" : "-rotate-90 scale-50 opacity-0")} />
    </button>
  </>;
}
