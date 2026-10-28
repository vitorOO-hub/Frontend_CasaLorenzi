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
import {
  SAUDACAO_ASSISTENTE,
  atendimentoEncerrado,
  esquecerConversa,
  guardarConversa,
  lerConversaGuardada,
  mensagensDaEquipeNoPainel,
  respostasDaEquipe,
} from "@/lib/assistenteConversa";
import {
  enviarMensagemChamadoCliente,
  listarMensagensChamadoCliente,
  obterChamadoCliente,
  type MensagemChamadoClienteApi,
} from "@/lib/chamadosClienteApi";
import { manterConversaEmDia, ouvirMensagensDoChamado } from "@/lib/conversaClienteAoVivo";
import { cn } from "./ui";

type Mensagem = Pick<MensagemAssistenteApi, "autor" | "texto"> & { id: string; sacola?: boolean };

const novaMensagem = (autor: Mensagem["autor"], texto: string, sacola = false): Mensagem => ({
  id: crypto.randomUUID(),
  autor,
  texto,
  sacola,
});

type Equipe = { mensagens: MensagemChamadoClienteApi[]; encerrado: boolean };

/**
 * Assistente virtual do cliente logado: botão flutuante que abre a conversa. O backend decide o que
 * o assistente pode consultar. Quando a conversa passa para a equipe, o mesmo painel vira o chat com
 * o atendente (as mensagens do chamado, ao vivo): o cliente não precisa ir até a área Atendimento.
 *
 * Só para cliente logado. `conta` é o e-mail da sessão: a conversa fica guardada por conta (no modo
 * API o `clienteId` da sessão é o mesmo para todos os clientes).
 */
export function AssistenteCliente({ conta }: { conta: string }) {
  const [aberto, setAberto] = useState(false);
  const [idConversa, setIdConversa] = useState<string | null>(() => lerConversaGuardada(conta));
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  // Sem conversa guardada não há o que buscar no servidor.
  const [carregada, setCarregada] = useState(() => !lerConversaGuardada(conta));
  const [idAtendimento, setIdAtendimento] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<Equipe | null>(null);
  const [vistas, setVistas] = useState(0);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  // A recarga ao vivo precisa saber se o painel está à vista (para não acender o selo à toa).
  const abertoRef = useRef(aberto);
  useEffect(() => {
    abertoRef.current = aberto;
  }, [aberto]);

  // Retoma a conversa desta aba (se ainda existir no servidor), mesmo com o painel fechado: se ela
  // estiver com a equipe, a resposta do atendente acende o selo no botão.
  useEffect(() => {
    if (carregada || !idConversa) return;
    let ativo = true;
    obterConversaAssistente(idConversa)
      .then((conversa) => {
        if (!ativo) return;
        setMensagens(conversa.mensagens.map((m) => novaMensagem(m.autor, m.texto)));
        setIdAtendimento(conversa.status === "ativa" ? null : conversa.id_atendimento);
      })
      .catch(() => {
        if (!ativo) return;
        // Conversa sumiu ou não é mais deste login: começa outra no próximo envio.
        esquecerConversa(conta);
        setIdConversa(null);
      })
      .finally(() => ativo && setCarregada(true));
    return () => {
      ativo = false;
    };
  }, [carregada, idConversa, conta]);

  // Com a equipe: mensagens do chamado ao vivo (Realtime e, por garantia, conferência periódica).
  useEffect(() => {
    if (!idAtendimento) return;
    const recarregar = async () => {
      const [detalhe, doChamado] = await Promise.all([
        obterChamadoCliente(idAtendimento),
        listarMensagensChamadoCliente(idAtendimento),
      ]);
      const visiveis = mensagensDaEquipeNoPainel(doChamado);
      setEquipe({ mensagens: visiveis, encerrado: atendimentoEncerrado(detalhe.status.codigo) });
      if (abertoRef.current) setVistas(respostasDaEquipe(visiveis));
    };
    void recarregar().catch(() => undefined);
    return manterConversaEmDia({
      recarregar,
      ouvirNovas: (aoChegar) => ouvirMensagensDoChamado(idAtendimento, aoChegar),
      visivel: () => document.visibilityState === "visible",
    });
  }, [idAtendimento]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens, equipe, enviando, aberto]);

  const comEquipe = idAtendimento !== null;
  const encerrado = equipe?.encerrado ?? false;
  const naoVistas = equipe ? Math.max(0, respostasDaEquipe(equipe.mensagens) - vistas) : 0;
  const aguardandoAtendente = comEquipe && !encerrado && equipe !== null && respostasDaEquipe(equipe.mensagens) === 0;

  function abrir() {
    setAberto(true);
    if (equipe) setVistas(respostasDaEquipe(equipe.mensagens));
  }

  async function conversaAtual(): Promise<string> {
    if (idConversa) return idConversa;
    const nova = await iniciarConversaAssistente();
    guardarConversa(conta, nova.id_conversa);
    setIdConversa(nova.id_conversa);
    return nova.id_conversa;
  }

  function recomecar() {
    esquecerConversa(conta);
    setIdConversa(null);
    setMensagens([]);
    setIdAtendimento(null);
    setEquipe(null);
    setVistas(0);
    setErro(null);
  }

  async function falarComEquipe(pergunta: string) {
    if (!idAtendimento) return;
    const enviada = await enviarMensagemChamadoCliente(idAtendimento, pergunta);
    setEquipe((atual) =>
      atual && !atual.mensagens.some((m) => m.id_mensagem === enviada.id_mensagem)
        ? { ...atual, mensagens: [...atual.mensagens, enviada] }
        : atual,
    );
  }

  async function falarComAssistente(pergunta: string) {
    const minha = novaMensagem("usuario", pergunta);
    setMensagens((atuais) => [...atuais, minha]);
    try {
      const resposta = await enviarMensagemAssistente(await conversaAtual(), pergunta);
      if (resposta.carrinho_alterado) {
        // A sacola mudou no servidor: o cabeçalho e a página da sacola passam a mostrar a peça.
        await sincronizarCarrinho().catch(() => undefined);
      }
      setMensagens((atuais) => [...atuais, novaMensagem("assistente", resposta.resposta, resposta.carrinho_alterado)]);
      // Passou para a equipe: daqui em diante o mesmo painel conversa com o atendente.
      if (resposta.status === "com_atendente") setIdAtendimento(resposta.id_atendimento);
    } catch (falha) {
      setMensagens((atuais) => atuais.filter((m) => m.id !== minha.id));
      throw falha;
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const pergunta = texto.trim();
    if (!pergunta || enviando || encerrado) return;
    setTexto("");
    setErro(null);
    setEnviando(true);
    try {
      if (comEquipe) await falarComEquipe(pergunta);
      else await falarComAssistente(pergunta);
    } catch (falha) {
      setTexto(pergunta);
      if (falha instanceof ErroApi && falha.codigo === "nao_encontrado" && !comEquipe) {
        esquecerConversa(conta);
        setIdConversa(null);
        setErro("Sua conversa expirou. Envie a mensagem de novo para começar outra.");
      } else if (falha instanceof ErroApi && falha.codigo === "conflito" && idConversa) {
        // A conversa já estava com a equipe (outra aba): passa a falar com o atendente.
        const conversa = await obterConversaAssistente(idConversa).catch(() => null);
        if (conversa?.id_atendimento) setIdAtendimento(conversa.id_atendimento);
        else setErro(mensagemDeErro(falha));
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
          aria-label={comEquipe ? "Atendimento da Casa Lorenzi" : "Assistente da Casa Lorenzi"}
          className="loja fixed bottom-4 right-4 z-50 flex h-[min(600px,calc(100dvh-32px))] w-[400px] max-w-[calc(100vw-32px)] flex-col border border-linha bg-creme text-tinta shadow-[0_18px_50px_-20px_rgba(20,30,50,0.45)] [font-family:var(--font-sans)]"
          onKeyDown={(ev) => ev.key === "Escape" && setAberto(false)}
        >
          <header className="flex items-center justify-between border-b border-linha px-5 py-4">
            <div>
              <p className="font-display text-[20px] leading-none">{comEquipe ? "Atendimento" : "Assistente"}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-suave">
                {comEquipe ? "Equipe Casa Lorenzi" : "Casa Lorenzi · com Vulto"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Sempre disponível: um atendimento em andamento continua na área Atendimento. */}
              {mensagens.length || comEquipe ? (
                <button
                  onClick={recomecar}
                  title={comEquipe && !encerrado ? "O atendimento com a equipe continua na área Atendimento" : undefined}
                  className="text-[11px] uppercase tracking-[0.12em] text-suave hover:text-tinta"
                >
                  Nova conversa
                </button>
              ) : null}
              <button onClick={() => setAberto(false)} aria-label="Fechar" className="hover:text-terracota">
                <X className="h-5 w-5" strokeWidth={1.4} />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
            <Balao lado="outro" texto={SAUDACAO_ASSISTENTE} />
            {!carregada ? <p className="text-center text-xs text-suave">Carregando a conversa…</p> : null}
            {mensagens.map((m) => (
              <div key={m.id}>
                <Balao lado={m.autor === "usuario" ? "meu" : "outro"} texto={m.texto} />
                {m.sacola ? (
                  <Link to="/sacola" onClick={() => setAberto(false)} className="mt-1.5 inline-block text-[12px] font-medium text-caramelo underline-offset-2 hover:underline">
                    Ver sacola
                  </Link>
                ) : null}
              </div>
            ))}

            {comEquipe ? (
              <>
                <p className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-[0.14em] text-suave">
                  <span className="h-px flex-1 bg-linha" />
                  Agora com a nossa equipe
                  <span className="h-px flex-1 bg-linha" />
                </p>
                {equipe === null ? <p className="text-center text-xs text-suave">Conectando ao atendimento…</p> : null}
                {equipe?.mensagens.map((m) => (
                  <Balao
                    key={m.id_mensagem}
                    lado={m.autor === "cliente" ? "meu" : "outro"}
                    texto={m.texto}
                    rotulo={m.autor === "atendente" ? m.nome : undefined}
                  />
                ))}
                {aguardandoAtendente ? (
                  <p className="text-xs italic text-suave" role="status">
                    Aguardando um atendente. A equipe já recebeu o resumo da conversa; você pode continuar escrevendo aqui.
                  </p>
                ) : null}
              </>
            ) : null}

            {enviando && !comEquipe ? (
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

          {encerrado ? (
            <div className="space-y-2 border-t border-linha px-5 py-4 text-sm">
              <p>Este atendimento foi encerrado pela equipe.</p>
              <button onClick={recomecar} className="text-[12px] font-medium uppercase tracking-[0.12em] text-caramelo hover:underline">
                Nova conversa
              </button>
            </div>
          ) : (
            <form onSubmit={enviar} className="flex items-end gap-2 border-t border-linha px-4 py-3">
              <label className="sr-only" htmlFor="assistente-texto">
                {comEquipe ? "Mensagem para a equipe" : "Mensagem para o assistente"}
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
                placeholder={comEquipe ? "Escreva para a equipe…" : "Escreva sua pergunta…"}
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
          onClick={abrir}
          aria-label={naoVistas ? `Abrir o atendimento (${naoVistas} mensagem nova)` : "Abrir o assistente"}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-marinho px-4 py-3 text-[12px] font-medium uppercase tracking-[0.12em] text-white shadow-[0_12px_30px_-12px_rgba(20,30,50,0.6)] hover:opacity-90 [font-family:var(--font-menu)]"
        >
          <MessageCircle className="h-[17px] w-[17px]" strokeWidth={1.5} />
          <span className="hidden sm:inline">{comEquipe ? "Atendimento" : "Assistente"}</span>
          {naoVistas ? (
            <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-terracota px-1.5 text-[11px] leading-none">
              {naoVistas}
            </span>
          ) : null}
        </button>
      )}
    </>
  );
}

function Balao({ lado, texto, rotulo }: { lado: "meu" | "outro"; texto: string; rotulo?: string }) {
  const meu = lado === "meu";
  return (
    <div className={cn("flex", meu && "justify-end")}>
      <div className={cn("max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed", meu ? "bg-marinho text-white" : "bg-areia/70")}>
        {rotulo ? <p className="mb-1 text-[11px] font-semibold text-suave">{rotulo}</p> : null}
        <p className="whitespace-pre-wrap">{texto}</p>
      </div>
    </div>
  );
}
