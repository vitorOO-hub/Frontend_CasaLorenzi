import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ErroApi, mensagemDeErro } from "@/api/erros";
import { sincronizarCarrinho } from "@/lib/acoes";
import {
  LIMITE_TEXTO_ASSISTENTE,
  enviarMensagemAssistente,
  iniciarConversaAssistente,
  obterConversaAssistente,
  type MensagemAssistenteApi,
} from "@/lib/assistenteClienteApi";
import { SAUDACAO_ASSISTENTE, esquecerConversa, guardarConversa, lerConversaGuardada } from "@/lib/assistenteConversa";
import { cn } from "./ui";

type Mensagem = Pick<MensagemAssistenteApi, "autor" | "texto"> & { id: string; sacola?: boolean };

const novaMensagem = (autor: Mensagem["autor"], texto: string, sacola = false): Mensagem => ({
  id: crypto.randomUUID(),
  autor,
  texto,
  sacola,
});

/**
 * Assistente virtual do cliente logado: botão flutuante que abre a conversa. O backend decide o que
 * o assistente pode consultar; aqui só mostramos a conversa, recarregamos a sacola quando ele coloca
 * uma peça nela e levamos ao chamado quando a conversa passa para a equipe.
 */
export function AssistenteCliente({ clienteId }: { clienteId: string }) {
  const [aberto, setAberto] = useState(false);
  const [idConversa, setIdConversa] = useState<string | null>(() => lerConversaGuardada(clienteId));
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  // Sem conversa guardada não há o que buscar no servidor.
  const [carregada, setCarregada] = useState(() => !lerConversaGuardada(clienteId));
  const [idAtendimento, setIdAtendimento] = useState<string | null>(null);
  const [comEquipe, setComEquipe] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  // Ao abrir pela primeira vez, retoma a conversa desta aba (se ainda existir no servidor).
  useEffect(() => {
    if (!aberto || carregada || !idConversa) return;
    let ativo = true;
    obterConversaAssistente(idConversa)
      .then((conversa) => {
        if (!ativo) return;
        setMensagens(conversa.mensagens.map((m) => novaMensagem(m.autor, m.texto)));
        setComEquipe(conversa.status !== "ativa");
        setIdAtendimento(conversa.id_atendimento);
      })
      .catch(() => {
        if (!ativo) return;
        // Conversa sumiu ou não é mais deste login: começa outra no próximo envio.
        esquecerConversa(clienteId);
        setIdConversa(null);
      })
      .finally(() => ativo && setCarregada(true));
    return () => {
      ativo = false;
    };
  }, [aberto, carregada, idConversa, clienteId]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens, enviando, aberto]);

  async function conversaAtual(): Promise<string> {
    if (idConversa) return idConversa;
    const nova = await iniciarConversaAssistente();
    guardarConversa(clienteId, nova.id_conversa);
    setIdConversa(nova.id_conversa);
    return nova.id_conversa;
  }

  function recomecar() {
    esquecerConversa(clienteId);
    setIdConversa(null);
    setMensagens([]);
    setComEquipe(false);
    setIdAtendimento(null);
    setErro(null);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const pergunta = texto.trim();
    if (!pergunta || enviando || comEquipe) return;
    const minha = novaMensagem("usuario", pergunta);
    setMensagens((atuais) => [...atuais, minha]);
    setTexto("");
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await enviarMensagemAssistente(await conversaAtual(), pergunta);
      if (resposta.carrinho_alterado) {
        // A sacola mudou no servidor: o cabeçalho e a página da sacola passam a mostrar a peça.
        await sincronizarCarrinho().catch(() => undefined);
      }
      setMensagens((atuais) => [...atuais, novaMensagem("assistente", resposta.resposta, resposta.carrinho_alterado)]);
      if (resposta.status === "com_atendente") {
        setComEquipe(true);
        setIdAtendimento(resposta.id_atendimento);
      }
    } catch (falha) {
      setMensagens((atuais) => atuais.filter((m) => m.id !== minha.id));
      setTexto(pergunta);
      if (falha instanceof ErroApi && falha.codigo === "nao_encontrado") {
        esquecerConversa(clienteId);
        setIdConversa(null);
        setErro("Sua conversa expirou. Envie a mensagem de novo para começar outra.");
      } else if (falha instanceof ErroApi && falha.codigo === "conflito") {
        setComEquipe(true);
        setErro(mensagemDeErro(falha));
      } else {
        setErro(mensagemDeErro(falha));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {aberto ? (
        <section
          aria-label="Assistente da Casa Lorenzi"
          className="loja fixed bottom-4 right-4 z-50 flex h-[min(600px,calc(100dvh-32px))] w-[400px] max-w-[calc(100vw-32px)] flex-col border border-linha bg-creme text-tinta shadow-[0_18px_50px_-20px_rgba(20,30,50,0.45)] [font-family:var(--font-sans)]"
          onKeyDown={(ev) => ev.key === "Escape" && setAberto(false)}
        >
          <header className="flex items-center justify-between border-b border-linha px-5 py-4">
            <div>
              <p className="font-display text-[20px] leading-none">Assistente</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-suave">Casa Lorenzi · com Vulto</p>
            </div>
            <div className="flex items-center gap-3">
              {mensagens.length ? (
                <button onClick={recomecar} className="text-[11px] uppercase tracking-[0.12em] text-suave hover:text-tinta">
                  Nova conversa
                </button>
              ) : null}
              <button onClick={() => setAberto(false)} aria-label="Fechar assistente" className="hover:text-terracota">
                <X className="h-5 w-5" strokeWidth={1.4} />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
            <Balao autor="assistente" texto={SAUDACAO_ASSISTENTE} />
            {!carregada ? <p className="text-center text-xs text-suave">Carregando a conversa…</p> : null}
            {mensagens.map((m) => (
              <div key={m.id}>
                <Balao autor={m.autor} texto={m.texto} />
                {m.sacola ? (
                  <Link to="/sacola" onClick={() => setAberto(false)} className="mt-1.5 inline-block text-[12px] font-medium text-caramelo underline-offset-2 hover:underline">
                    Ver sacola
                  </Link>
                ) : null}
              </div>
            ))}
            {enviando ? (
              <p className="text-xs italic text-suave" role="status">
                Assistente digitando…
              </p>
            ) : null}
            <div ref={fim} />
          </div>

          {erro ? (
            <p role="alert" className="border-t border-linha bg-areia/60 px-5 py-2.5 text-[13px] text-terracota">
              {erro}
            </p>
          ) : null}

          {comEquipe ? (
            <div className="space-y-2 border-t border-linha px-5 py-4 text-sm">
              <p>Sua conversa foi passada para a nossa equipe. A resposta chega pela área Atendimento.</p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to={idAtendimento ? `/conta/atendimento/${idAtendimento}` : "/conta/atendimento"}
                  onClick={() => setAberto(false)}
                  className="text-[12px] font-medium uppercase tracking-[0.12em] text-caramelo hover:underline"
                >
                  Ver chamado
                </Link>
                <button onClick={recomecar} className="text-[12px] uppercase tracking-[0.12em] text-suave hover:text-tinta">
                  Nova conversa
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={enviar} className="flex items-end gap-2 border-t border-linha px-4 py-3">
              <label className="sr-only" htmlFor="assistente-texto">
                Mensagem para o assistente
              </label>
              <textarea
                id="assistente-texto"
                rows={2}
                maxLength={LIMITE_TEXTO_ASSISTENTE}
                value={texto}
                onChange={(ev) => setTexto(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && !ev.shiftKey) {
                    ev.preventDefault();
                    ev.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Escreva sua pergunta…"
                className="flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-suave"
              />
              <button
                type="submit"
                disabled={!texto.trim() || enviando || !carregada}
                aria-label="Enviar mensagem"
                className="mb-1 flex h-9 w-9 items-center justify-center bg-marinho text-white transition-opacity disabled:opacity-40"
              >
                <Send className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </form>
          )}
        </section>
      ) : (
        <button
          onClick={() => setAberto(true)}
          aria-label="Abrir o assistente"
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-marinho px-4 py-3 text-[12px] font-medium uppercase tracking-[0.12em] text-white shadow-[0_12px_30px_-12px_rgba(20,30,50,0.6)] hover:opacity-90 [font-family:var(--font-menu)]"
        >
          <MessageCircle className="h-[17px] w-[17px]" strokeWidth={1.5} />
          <span className="hidden sm:inline">Assistente</span>
        </button>
      )}
    </>
  );
}

function Balao({ autor, texto }: { autor: Mensagem["autor"]; texto: string }) {
  const minha = autor === "usuario";
  return (
    <div className={cn("flex", minha && "justify-end")}>
      <p className={cn("max-w-[85%] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed", minha ? "bg-marinho text-white" : "bg-areia/70")}>{texto}</p>
    </div>
  );
}
