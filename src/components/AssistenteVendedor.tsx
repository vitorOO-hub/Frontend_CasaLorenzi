import { Archive, ChevronLeft, History, LoaderCircle, Plus, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { mensagemDeErro } from "@/api/erros";
import {
  TAMANHO_MAXIMO_PERGUNTA,
  arquivarConversa,
  criarConversa,
  linhasDaResposta,
  listarConversas,
  obterMensagens,
  perguntar,
  rotuloFerramenta,
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

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

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

function Bolha({ mensagem }: { mensagem: MensagemAssistente }) {
  const minha = mensagem.autor === "usuario";
  const consultas = mensagem.ferramentas.map(rotuloFerramenta).filter((r): r is string => Boolean(r));
  return (
    <div className={cn("flex flex-col", minha ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-sm px-3.5 py-2.5 text-sm leading-relaxed",
          minha ? "whitespace-pre-wrap bg-marinho text-creme" : "border border-linha bg-papel text-tinta",
        )}
      >
        {minha ? mensagem.texto : <TextoDaResposta texto={mensagem.texto} />}
      </div>
      {consultas.length ? <p className="mt-1 text-[11px] text-suave">Consultou: {consultas.join(", ")}</p> : null}
    </div>
  );
}

/**
 * Assistente de vendas: bolinha no canto inferior direito do painel (só para o vendedor) que abre o
 * chat, com "novo chat" e as conversas anteriores. Quem é o vendedor e a loja vêm do token no servidor.
 */
export function AssistenteVendedor() {
  const [aberto, setAberto] = useState(false);
  const [vista, setVista] = useState<"chat" | "conversas">("chat");
  const [conversas, setConversas] = useState<ConversaAssistente[]>([]);
  const [atual, setAtual] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemAssistente[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView?.({ block: "end" });
  }, [mensagens, enviando]);

  async function carregarConversas() {
    try {
      setConversas(await listarConversas());
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  function abrir() {
    setAberto(true);
    setErro(null);
    void carregarConversas();
  }

  function novoChat() {
    setAtual(null);
    setMensagens([]);
    setErro(null);
    setVista("chat");
  }

  async function abrirConversa(id: string) {
    setCarregando(true);
    setErro(null);
    setVista("chat");
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

  async function enviar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || enviando) return;
    setEnviando(true);
    setErro(null);
    setTexto("");
    // Mostra a pergunta na hora; a resposta do servidor troca pelo registro gravado.
    const provisoria: MensagemAssistente = { id_mensagem: "provisoria", autor: "usuario", texto: limpa, criada_em: "", ferramentas: [] };
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

  return (
    <>
      {aberto ? (
        <section
          role="dialog"
          aria-label="Assistente de vendas"
          className="fixed inset-0 z-50 flex flex-col bg-creme sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(620px,calc(100vh-8rem))] sm:w-[400px] sm:rounded-sm sm:border sm:border-linha sm:shadow-suave"
        >
          <header className="flex items-center gap-2 border-b border-linha bg-marinho px-4 py-3 text-creme sm:rounded-t-sm">
            {vista === "conversas" ? (
              <button onClick={() => setVista("chat")} aria-label="Voltar ao chat" className="text-creme/80 hover:text-creme">
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <Sparkles className="h-4 w-4 text-dourado-claro" />
            )}
            <h2 className="flex-1 text-base font-normal">{vista === "conversas" ? "Conversas anteriores" : "Assistente de vendas"}</h2>
            <button onClick={novoChat} aria-label="Novo chat" title="Novo chat" className="rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme">
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setVista(vista === "conversas" ? "chat" : "conversas")}
              aria-label="Conversas anteriores"
              title="Conversas anteriores"
              className="rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme"
            >
              <History className="h-4 w-4" />
            </button>
            <button onClick={() => setAberto(false)} aria-label="Fechar assistente" className="rounded-sm p-1 text-creme/80 hover:bg-white/10 hover:text-creme">
              <X className="h-4 w-4" />
            </button>
          </header>

          {vista === "conversas" ? (
            <div className="flex-1 overflow-y-auto">
              {conversas.length === 0 ? <p className="p-6 text-center text-sm text-suave">Nenhuma conversa ainda.</p> : null}
              {conversas.map((c) => (
                <div key={c.id_conversa} className={cn("group flex items-center gap-2 border-b border-linha px-4 py-3", c.id_conversa === atual && "bg-areia/60")}>
                  <button onClick={() => void abrirConversa(c.id_conversa)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm text-tinta">{c.titulo}</span>
                    <span className="text-[11px] text-suave">{dataCurta(c.atualizada_em)}</span>
                  </button>
                  <button onClick={() => void arquivar(c.id_conversa)} aria-label={`Arquivar ${c.titulo}`} title="Arquivar" className="p-1 text-suave hover:text-perigo">
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {carregando ? <p className="text-center text-sm text-suave">Carregando a conversa…</p> : null}
              {!carregando && mensagens.length === 0 ? (
                <div className="pt-4">
                  <p className="text-sm text-tinta">Olá! Pergunte sobre as vendas, o estoque, os clientes ou as lojas. Eu consulto os dados da sua loja.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {SUGESTOES.map((s) => (
                      <button key={s} onClick={() => void enviar(s)} className="rounded-full border border-linha bg-papel px-3 py-1.5 text-xs text-marinho hover:border-marinho">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {mensagens.map((m) => (
                <Bolha key={m.id_mensagem} mensagem={m} />
              ))}
              {enviando ? (
                <p className="flex items-center gap-2 text-xs text-suave" role="status">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Consultando os dados da loja…
                </p>
              ) : null}
              <div ref={fim} />
            </div>
          )}

          {erro ? (
            <p role="alert" className="border-t border-linha bg-dourado-claro px-4 py-2 text-xs text-perigo">
              {erro}
            </p>
          ) : null}

          {vista === "chat" ? (
            <form onSubmit={aoEnviar} className="flex items-end gap-2 border-t border-linha bg-papel p-3 sm:rounded-b-sm">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={aoTeclar}
                maxLength={TAMANHO_MAXIMO_PERGUNTA}
                rows={1}
                placeholder="Pergunte ao assistente…"
                aria-label="Sua pergunta"
                className="max-h-32 min-h-[40px] flex-1 resize-none rounded-sm border border-linha bg-papel px-3 py-2 text-sm text-tinta outline-none focus:border-marinho"
              />
              <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar" className="rounded-sm bg-marinho p-2.5 text-creme hover:bg-marinho-escuro disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      <button
        onClick={() => (aberto ? setAberto(false) : abrir())}
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente de vendas"}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-marinho text-creme shadow-suave transition-transform hover:scale-105",
          aberto && "hidden sm:flex",
        )}
      >
        {aberto ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </>
  );
}
