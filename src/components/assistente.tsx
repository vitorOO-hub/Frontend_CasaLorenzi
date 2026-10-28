import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ErroApi, mensagemDeErro } from "@/api/erros";
import { sincronizarCarrinho } from "@/lib/acoes";
import {
  LIMITE_TEXTO_ASSISTENTE,
  enviarMensagemAssistente,
  enviarMensagemVisitante,
  iniciarConversaAssistente,
  obterConversaAssistente,
  type MensagemAnteriorAssistente,
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
import { entrarComEmailOuCpf, tipoDoIdentificador } from "@/lib/sessao";
import { cn, inputClasses } from "./ui";

type Mensagem = Pick<MensagemAssistenteApi, "autor" | "texto"> & { id: string; sacola?: boolean };

const novaMensagem = (autor: Mensagem["autor"], texto: string, sacola = false): Mensagem => ({
  id: crypto.randomUUID(),
  autor,
  texto,
  sacola,
});

const comoHistorico = (mensagens: Mensagem[]): MensagemAnteriorAssistente[] =>
  mensagens.map((m) => ({ autor: m.autor, texto: m.texto }));

type Equipe = { mensagens: MensagemChamadoClienteApi[]; encerrado: boolean };

/**
 * Assistente da loja: botão flutuante que abre a conversa, para visitante e para cliente logado.
 *
 * - Visitante: só catálogo público (peças, estoque, lojas). Quando pede algo da conta (pontos,
 *   pedidos, sacola, falar com a equipe), o painel mostra o login ali mesmo; depois de entrar, a
 *   conversa segue pelo assistente do cliente com o que já foi dito e o pedido é retomado.
 * - Cliente: o backend decide o que o assistente consulta. Quando a conversa passa para a equipe, o
 *   mesmo painel vira o chat com o atendente (mensagens do chamado, ao vivo).
 *
 * `conta` é o e-mail do cliente logado (null = visitante); a conversa fica guardada por conta.
 */
export function AssistenteLoja({ conta }: { conta: string | null }) {
  const { pathname, search } = useLocation();
  const [aberto, setAberto] = useState(false);
  const [contaVista, setContaVista] = useState(conta);
  const [idConversa, setIdConversa] = useState<string | null>(() => (conta ? lerConversaGuardada(conta) : null));
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  // Sem conversa guardada não há o que buscar no servidor.
  const [carregada, setCarregada] = useState(() => !(conta && lerConversaGuardada(conta)));
  const [idAtendimento, setIdAtendimento] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<Equipe | null>(null);
  const [vistas, setVistas] = useState(0);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Login pedido pelo assistente: o pedido que ficou esperando e se o login é pelo próprio painel.
  const [pedindoLogin, setPedindoLogin] = useState(false);
  const [pendente, setPendente] = useState<string | null>(null);
  const [entrandoPeloPainel, setEntrandoPeloPainel] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  // A recarga ao vivo precisa saber se o painel está à vista (para não acender o selo à toa).
  const abertoRef = useRef(aberto);
  useEffect(() => {
    abertoRef.current = aberto;
  }, [aberto]);

  // Trocou de conta (entrou por outra tela, saiu, ou outra pessoa entrou): começa do zero com a
  // conversa guardada da conta nova. O login feito pelo painel continua a conversa (ver entrarNoPainel).
  if (conta !== contaVista) {
    setContaVista(conta);
    if (!entrandoPeloPainel) {
      const guardada = conta ? lerConversaGuardada(conta) : null;
      setIdConversa(guardada);
      setCarregada(!guardada);
      setMensagens([]);
      setIdAtendimento(null);
      setEquipe(null);
      setVistas(0);
      setErro(null);
      setPedindoLogin(false);
      setPendente(null);
    }
  }

  // Retoma a conversa desta conta (se ainda existir no servidor), mesmo com o painel fechado: se ela
  // estiver com a equipe, a resposta do atendente acende o selo no botão.
  useEffect(() => {
    if (carregada || !idConversa || !conta) return;
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
  }, [mensagens, equipe, enviando, aberto, pedindoLogin]);

  const comEquipe = idAtendimento !== null;
  const encerrado = equipe?.encerrado ?? false;
  const naoVistas = equipe ? Math.max(0, respostasDaEquipe(equipe.mensagens) - vistas) : 0;
  const aguardandoAtendente = comEquipe && !encerrado && equipe !== null && respostasDaEquipe(equipe.mensagens) === 0;

  function abrir() {
    setAberto(true);
    if (equipe) setVistas(respostasDaEquipe(equipe.mensagens));
  }

  function recomecar() {
    if (conta) esquecerConversa(conta);
    setIdConversa(null);
    setMensagens([]);
    setIdAtendimento(null);
    setEquipe(null);
    setVistas(0);
    setErro(null);
    setPedindoLogin(false);
    setPendente(null);
  }

  async function conversaAtual(email: string, historico: MensagemAnteriorAssistente[] = []): Promise<string> {
    if (idConversa) return idConversa;
    const nova = await iniciarConversaAssistente(historico);
    guardarConversa(email, nova.id_conversa);
    setIdConversa(nova.id_conversa);
    return nova.id_conversa;
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

  /** Pergunta do cliente logado. `idDaConversa` vem pronto quando o login acabou de criá-la. */
  async function perguntarAoAssistente(email: string, pergunta: string, idDaConversa?: string) {
    const resposta = await enviarMensagemAssistente(idDaConversa ?? (await conversaAtual(email)), pergunta);
    if (resposta.carrinho_alterado) {
      // A sacola mudou no servidor: o cabeçalho e a página da sacola passam a mostrar a peça.
      await sincronizarCarrinho().catch(() => undefined);
    }
    setMensagens((atuais) => [...atuais, novaMensagem("assistente", resposta.resposta, resposta.carrinho_alterado)]);
    // Passou para a equipe: daqui em diante o mesmo painel conversa com o atendente.
    if (resposta.status === "com_atendente") setIdAtendimento(resposta.id_atendimento);
  }

  async function perguntarComoVisitante(pergunta: string, anteriores: Mensagem[]) {
    const resposta = await enviarMensagemVisitante(pergunta, comoHistorico(anteriores));
    setMensagens((atuais) => [...atuais, novaMensagem("assistente", resposta.resposta)]);
    if (resposta.precisa_login) {
      setPendente(pergunta);
      setPedindoLogin(true);
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const pergunta = texto.trim();
    if (!pergunta || enviando || encerrado) return;
    const minha = novaMensagem("usuario", pergunta);
    const anteriores = mensagens;
    setTexto("");
    setErro(null);
    setEnviando(true);
    if (!comEquipe) setMensagens((atuais) => [...atuais, minha]);
    try {
      if (comEquipe) await falarComEquipe(pergunta);
      else if (conta) await perguntarAoAssistente(conta, pergunta);
      else await perguntarComoVisitante(pergunta, anteriores);
    } catch (falha) {
      setMensagens((atuais) => atuais.filter((m) => m.id !== minha.id));
      setTexto(pergunta);
      if (falha instanceof ErroApi && falha.codigo === "nao_encontrado" && conta && !comEquipe) {
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

  /**
   * Login feito no próprio chat: a conversa de visitante vira a conversa do cliente (com o histórico)
   * e o pedido que esperava o login é feito de novo, agora com a conta.
   */
  async function entrarNoPainel(identificador: string, senha: string): Promise<string | null> {
    setEntrandoPeloPainel(true);
    try {
      const r = await entrarComEmailOuCpf(identificador, senha);
      if (!r.ok) {
        if (r.motivo === "credenciais")
          return tipoDoIdentificador(identificador) === "cpf" ? "CPF ou senha incorretos." : "E-mail ou senha incorretos.";
        return r.detalhe ?? "Não foi possível entrar agora. Tente de novo em instantes.";
      }
      setPedindoLogin(false);
      // Conta da equipe não usa o assistente da loja: o painel some com a troca de sessão.
      if (r.sessao.tipo !== "cliente") return null;
      const email = r.sessao.email;
      setEnviando(true);
      try {
        const nova = await iniciarConversaAssistente(comoHistorico(mensagens));
        guardarConversa(email, nova.id_conversa);
        setIdConversa(nova.id_conversa);
        setCarregada(true);
        if (pendente) await perguntarAoAssistente(email, pendente, nova.id_conversa);
        setPendente(null);
      } catch (falha) {
        setErro(mensagemDeErro(falha));
      } finally {
        setEnviando(false);
      }
      return null;
    } finally {
      setEntrandoPeloPainel(false);
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
              {mensagens.length && (!comEquipe || encerrado) ? (
                <button onClick={recomecar} className="text-[11px] uppercase tracking-[0.12em] text-suave hover:text-tinta">
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

            {pedindoLogin && !conta ? (
              <LoginNoChat
                voltar={`${pathname}${search}`}
                onEntrar={entrarNoPainel}
                onCancelar={() => {
                  setPedindoLogin(false);
                  setPendente(null);
                }}
              />
            ) : null}

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

/** Login dentro do chat: e-mail ou CPF e senha. Quem não tem conta vai para o cadastro e volta aqui. */
function LoginNoChat({
  voltar,
  onEntrar,
  onCancelar,
}: {
  voltar: string;
  onEntrar: (identificador: string, senha: string) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!tipoDoIdentificador(identificador)) return setErro("Informe seu e-mail ou CPF.");
    setEntrando(true);
    setErro(null);
    const falha = await onEntrar(identificador, senha).catch(() => "Não foi possível entrar agora. Tente de novo em instantes.");
    setEntrando(false);
    if (falha) {
      setSenha("");
      setErro(falha);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-2.5 border border-linha bg-papel p-4" aria-label="Entrar na sua conta">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-suave">Entrar na sua conta</p>
      <label className="block text-sm">
        <span className="sr-only">E-mail ou CPF</span>
        <input
          autoFocus
          value={identificador}
          onChange={(ev) => setIdentificador(ev.target.value)}
          autoComplete="username"
          placeholder="E-mail ou CPF"
          className={inputClasses}
        />
      </label>
      <label className="block text-sm">
        <span className="sr-only">Senha</span>
        <input
          type="password"
          value={senha}
          onChange={(ev) => setSenha(ev.target.value)}
          autoComplete="current-password"
          placeholder="Senha"
          className={inputClasses}
        />
      </label>
      {erro ? (
        <p role="alert" className="text-[13px] text-terracota">
          {erro}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="submit"
          disabled={entrando || !identificador.trim() || !senha}
          className="bg-marinho px-4 py-2 text-[12px] font-medium uppercase tracking-[0.12em] text-white disabled:opacity-40"
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>
        <button type="button" onClick={onCancelar} className="text-[12px] text-suave hover:text-tinta">
          Agora não
        </button>
      </div>
      <p className="text-[12px] text-suave">
        Ainda não tem conta ou não lembra a senha?{" "}
        <Link to={`/entrar?voltar=${encodeURIComponent(voltar)}`} className="text-caramelo hover:underline">
          Acesse por aqui
        </Link>
      </p>
    </form>
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
