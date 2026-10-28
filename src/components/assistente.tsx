import { Archive, LoaderCircle, Maximize2, Minimize2, PanelLeft, Send, Sparkles, SquarePen, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErroApi, mensagemDeErro } from "@/api/erros";
import { adicionarAoCarrinho } from "@/lib/acoes";
import {
  LIMITE_TEXTO_ASSISTENTE,
  arquivarConversaAssistente,
  avaliarRespostaAssistente,
  enviarMensagemAssistente,
  iniciarConversaAssistente,
  listarConversasAssistente,
  obterConversaAssistente,
  type AvaliacaoAssistente,
  type ConversaResumoApi,
  type MensagemAssistenteApi,
  type OfertaAssistenteApi,
} from "@/lib/assistenteClienteApi";
import {
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
import { moeda } from "@/lib/dados";
import { fotoEstudio } from "@/lib/loja";
import { nomeDeVitrine } from "@/lib/nomes";
import { ehVulto } from "@/lib/vultoMais";
import { TextoDaResposta } from "./AssistenteVendedor";
import {
  ALCAS,
  ALTURA_MINIMA,
  CENTRO_DA_BOLINHA,
  LARGURA_COM_LATERAL,
  LARGURA_MINIMA,
  MARGEM,
  acompanharPonteiro,
  dataCurta,
  entre,
  guardaDaCaixa,
  limitar,
  semAnimacao,
  telaGrande,
  type Borda,
  type Caixa,
} from "./janelaDoAssistente";
import { cn } from "./ui";
import { Foto } from "./vitrine";

/** Mesmo visual e comportamento do chat do vendedor (AssistenteVendedor), com o que é do cliente:
 * cartões de peça com "Adicionar à sacola" e o chat ao vivo com o atendente depois da passagem. */

const SUGESTOES = ["Qual o prazo de troca?", "Quantos pontos eu tenho?", "Tem algo para um casamento?", "Que horas abre a loja?"];
const { ler: caixaSalva, salvar: salvarCaixa } = guardaDaCaixa("assistente-cliente:caixa");

type Mensagem = Pick<MensagemAssistenteApi, "autor" | "texto" | "ofertas" | "id_mensagem" | "avaliacao"> & { id: string };

const novaMensagem = (m: Omit<Mensagem, "id" | "ofertas" | "id_mensagem" | "avaliacao"> & Partial<Mensagem>): Mensagem => ({
  id: crypto.randomUUID(),
  ofertas: [],
  id_mensagem: null,
  avaliacao: null,
  ...m,
});

type Equipe = { mensagens: MensagemChamadoClienteApi[]; encerrado: boolean };

function Bolha({
  mensagem,
  onAvaliar,
  aoAdicionar,
}: {
  mensagem: Mensagem;
  onAvaliar?: (valor: AvaliacaoAssistente) => void;
  aoAdicionar: () => void;
}) {
  const minha = mensagem.autor === "usuario";
  const botao = (valor: AvaliacaoAssistente, Icone: typeof ThumbsUp, rotulo: string) => (
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
      {mensagem.ofertas.length ? (
        <ul className="mt-2 w-full space-y-2" aria-label="Peças sugeridas">
          {mensagem.ofertas.map((oferta) => (
            <li key={oferta.sku}>
              <CartaoOferta oferta={oferta} aoAdicionar={aoAdicionar} />
            </li>
          ))}
        </ul>
      ) : null}
      {!minha && onAvaliar && mensagem.id_mensagem ? (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-suave">
          {botao("util", ThumbsUp, "Resposta útil")}
          {botao("nao_util", ThumbsDown, "Resposta não ajudou")}
        </div>
      ) : null}
    </div>
  );
}

/** Mensagem do chamado depois da passagem: a do cliente num balão, a da equipe com o nome. */
function BolhaDaEquipe({ mensagem }: { mensagem: MensagemChamadoClienteApi }) {
  const minha = mensagem.autor === "cliente";
  return (
    <div className={cn("flex flex-col", minha ? "items-end" : "items-start")}>
      {minha ? null : <p className="mb-1 text-[11px] font-medium text-suave">{mensagem.nome} · equipe</p>}
      <div
        className={cn(
          "text-sm leading-relaxed text-tinta",
          minha ? "max-w-[80%] whitespace-pre-wrap rounded-2xl bg-areia px-4 py-2.5" : "w-full whitespace-pre-wrap",
        )}
      >
        {mensagem.texto}
      </div>
    </div>
  );
}

/**
 * Assistente da loja para o cliente logado, no mesmo formato do chat do vendedor: bolinha no canto,
 * janela com histórico de conversas na lateral, "novo chat" e a conversa ao lado; no computador a
 * janela pode ser arrastada, redimensionada e maximizada. Quando a conversa passa para a equipe, a
 * mesma janela vira o chat com o atendente (mensagens do chamado, ao vivo).
 *
 * `conta` é o e-mail da sessão: a última conversa fica guardada por conta (no modo API o `clienteId`
 * da sessão é o mesmo para todos os clientes).
 */
export function AssistenteCliente({ conta }: { conta: string }) {
  // `montado` segura a janela na tela enquanto a animação de saída roda.
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [lateral, setLateral] = useState(true);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  // Caixa de antes de maximizar, para o botão de restaurar.
  const [antesDeMaximizar, setAntesDeMaximizar] = useState<Caixa | null | undefined>(undefined);
  const [acao, setAcao] = useState<"arrastando" | "redimensionando" | null>(null);
  const [conversas, setConversas] = useState<ConversaResumoApi[]>([]);
  const [idConversa, setIdConversa] = useState<string | null>(() => lerConversaGuardada(conta));
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  // Sem conversa guardada não há o que buscar no servidor.
  const [carregando, setCarregando] = useState(() => Boolean(lerConversaGuardada(conta)));
  const [idAtendimento, setIdAtendimento] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<Equipe | null>(null);
  const [vistas, setVistas] = useState(0);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLElement>(null);
  // A recarga ao vivo precisa saber se a janela está à vista (para não acender o selo à toa).
  const abertoRef = useRef(aberto);
  useEffect(() => {
    abertoRef.current = aberto;
  }, [aberto]);

  /** Mostra uma conversa do servidor (a guardada desta conta ou uma escolhida no histórico). */
  function aplicarConversa(conversa: Awaited<ReturnType<typeof obterConversaAssistente>>) {
    setIdConversa(conversa.id_conversa);
    guardarConversa(conta, conversa.id_conversa);
    setMensagens(conversa.mensagens.map((m) => novaMensagem(m)));
    setEquipe(null);
    setIdAtendimento(conversa.status === "ativa" ? null : conversa.id_atendimento);
  }

  // Retoma a última conversa desta conta, mesmo com a janela fechada: se ela estiver com a equipe,
  // a resposta do atendente acende o selo na bolinha.
  useEffect(() => {
    const guardada = lerConversaGuardada(conta);
    if (!guardada) return;
    let ativo = true;
    obterConversaAssistente(guardada)
      .then((conversa) => ativo && conversa.status !== "encerrada" && aplicarConversa(conversa))
      .catch(() => {
        // Sumiu ou não é mais deste login: começa outra no próximo envio.
        if (ativo) esquecerConversa(conta);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
    // Só ao montar: trocar de conta recria o componente (key no layout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Com a equipe: mensagens do chamado ao vivo (Realtime e, por garantia, conferência periódica).
  useEffect(() => {
    if (!idAtendimento) return;
    const recarregar = async () => {
      const [detalhe, doChamado] = await Promise.all([obterChamadoCliente(idAtendimento), listarMensagensChamadoCliente(idAtendimento)]);
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
    fim.current?.scrollIntoView?.({ block: "end" });
  }, [mensagens, equipe, enviando]);

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
  const comEquipe = idAtendimento !== null;
  const encerrado = equipe?.encerrado ?? false;
  const naoVistas = equipe ? Math.max(0, respostasDaEquipe(equipe.mensagens) - vistas) : 0;
  const aguardandoAtendente = comEquipe && !encerrado && equipe !== null && respostasDaEquipe(equipe.mensagens) === 0;

  async function carregarConversas() {
    try {
      setConversas(await listarConversasAssistente());
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
    if (equipe) setVistas(respostasDaEquipe(equipe.mensagens));
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
    esquecerConversa(conta);
    setIdConversa(null);
    setMensagens([]);
    setIdAtendimento(null);
    setEquipe(null);
    setVistas(0);
    setErro(null);
    recolherLateralSobreposta();
  }

  async function abrirConversa(id: string) {
    setCarregando(true);
    setErro(null);
    recolherLateralSobreposta();
    try {
      aplicarConversa(await obterConversaAssistente(id));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  async function arquivar(id: string) {
    try {
      await arquivarConversaAssistente(id);
      setConversas((lista) => lista.filter((c) => c.id_conversa !== id));
      if (idConversa === id) novoChat();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function avaliar(mensagem: Mensagem, valor: AvaliacaoAssistente) {
    if (!idConversa || !mensagem.id_mensagem) return;
    // Clicar de novo no mesmo botão tira a avaliação.
    const nova = mensagem.avaliacao === valor ? null : valor;
    const trocar = (avaliacao: AvaliacaoAssistente | null) =>
      setMensagens((m) => m.map((x) => (x.id === mensagem.id ? { ...x, avaliacao } : x)));
    trocar(nova);
    try {
      await avaliarRespostaAssistente(idConversa, mensagem.id_mensagem, nova);
    } catch (e) {
      trocar(mensagem.avaliacao);
      setErro(mensagemDeErro(e));
    }
  }

  async function conversaAtual(): Promise<string> {
    if (idConversa) return idConversa;
    const nova = await iniciarConversaAssistente();
    guardarConversa(conta, nova.id_conversa);
    setIdConversa(nova.id_conversa);
    return nova.id_conversa;
  }

  async function falarComEquipe(pergunta: string) {
    if (!idAtendimento) return;
    const enviada = await enviarMensagemChamadoCliente(idAtendimento, pergunta);
    setEquipe((atual) =>
      atual && !atual.mensagens.some((m) => m.id_mensagem === enviada.id_mensagem) ? { ...atual, mensagens: [...atual.mensagens, enviada] } : atual,
    );
  }

  async function falarComAssistente(pergunta: string) {
    const minha = novaMensagem({ autor: "usuario", texto: pergunta });
    setMensagens((atuais) => [...atuais, minha]);
    try {
      const resposta = await enviarMensagemAssistente(await conversaAtual(), pergunta);
      // Peças oferecidas (ou opções de um pedido vago) aparecem como cartões com "Adicionar à sacola".
      setMensagens((atuais) => [
        ...atuais,
        novaMensagem({ autor: "assistente", texto: resposta.resposta, ofertas: resposta.ofertas, id_mensagem: resposta.id_mensagem }),
      ]);
      // Passou para a equipe: daqui em diante a mesma janela conversa com o atendente.
      if (resposta.status === "com_atendente") setIdAtendimento(resposta.id_atendimento);
      void carregarConversas();
    } catch (falha) {
      setMensagens((atuais) => atuais.filter((m) => m.id !== minha.id));
      throw falha;
    }
  }

  async function enviar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || enviando || encerrado) return;
    setTexto("");
    setErro(null);
    setEnviando(true);
    try {
      if (comEquipe) await falarComEquipe(limpa);
      else await falarComAssistente(limpa);
    } catch (falha) {
      setTexto(limpa);
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
            className={cn("group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-papel", c.id_conversa === idConversa && "bg-papel")}
          >
            <button
              onClick={() => void abrirConversa(c.id_conversa)}
              aria-current={c.id_conversa === idConversa ? "true" : undefined}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm text-tinta">{c.titulo}</span>
              <span className="text-[11px] text-suave">
                {dataCurta(c.atualizada_em)}
                {c.status === "com_atendente" ? " · com a equipe" : ""}
              </span>
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

  const vazia = !carregando && mensagens.length === 0 && !comEquipe;

  return (
    <>
      {montado ? (
        <section
          ref={painel}
          role="dialog"
          aria-label={comEquipe ? "Atendimento Casa Lorenzi" : "Assistente Casa Lorenzi"}
          style={{
            transformOrigin: origemDaAnimacao,
            ...(caixa ? { left: caixa.x, top: caixa.y, width: caixa.largura, height: caixa.altura, right: "auto", bottom: "auto" } : {}),
          }}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && !aberto) setMontado(false);
          }}
          onKeyDown={(e) => e.key === "Escape" && fechar()}
          className={cn(
            "fixed inset-0 z-50 flex flex-col overflow-hidden bg-creme sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100vh-8rem))] sm:rounded-xl sm:border sm:border-linha sm:shadow-suave",
            lateral ? "sm:w-[min(820px,calc(100vw-3rem))]" : "sm:w-[min(560px,calc(100vw-3rem))]",
            // Sem transição enquanto o cliente arrasta ou puxa a borda, para a janela seguir o mouse.
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
            {/* Na loja, `.loja h2` afina o título; aqui fica igual ao do chat do vendedor. */}
            <h2 className="flex-1 truncate text-base font-normal" style={{ fontWeight: 400, letterSpacing: "normal" }}>
              {comEquipe ? "Atendimento Casa Lorenzi" : "Assistente Casa Lorenzi"}
            </h2>
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
                  {vazia ? (
                    <div className="pt-6 text-center">
                      <Sparkles className="mx-auto h-7 w-7 text-dourado" />
                      <p className="mt-3 text-lg text-tinta">Como posso ajudar?</p>
                      <p className="mt-1 text-sm text-suave">
                        Pergunte sobre peças, estoque, lojas, seus pontos Lorenzi+, seus pedidos, trocas e entregas. Se precisar, eu chamo alguém da equipe.
                      </p>
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
                    <Bolha
                      key={m.id}
                      mensagem={m}
                      onAvaliar={(valor) => void avaliar(m, valor)}
                      aoAdicionar={fechar}
                    />
                  ))}

                  {comEquipe ? (
                    <>
                      <p className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-wider text-suave">
                        <span className="h-px flex-1 bg-linha" />
                        Agora com a nossa equipe
                        <span className="h-px flex-1 bg-linha" />
                      </p>
                      {equipe === null ? <p className="text-center text-xs text-suave">Conectando ao atendimento…</p> : null}
                      {equipe?.mensagens.map((m) => (
                        <BolhaDaEquipe key={m.id_mensagem} mensagem={m} />
                      ))}
                      {aguardandoAtendente ? (
                        <p className="text-xs text-suave" role="status">
                          Aguardando um atendente. A equipe já recebeu o resumo da conversa; você pode continuar escrevendo aqui.
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {enviando && !comEquipe ? (
                    <p className="flex items-center gap-2 text-xs text-suave" role="status">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Consultando…
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

              {encerrado ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-linha px-4 py-3 text-sm text-tinta sm:px-6">
                  <span>Este atendimento foi encerrado pela equipe.</span>
                  <button onClick={novoChat} className="flex items-center gap-2 rounded-lg border border-linha bg-papel px-3 py-1.5 text-sm text-marinho hover:border-marinho">
                    <SquarePen className="h-4 w-4" /> Novo chat
                  </button>
                </div>
              ) : (
                <form onSubmit={aoEnviar} className="px-3 pb-3 pt-1 sm:px-6 sm:pb-4">
                  <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-linha bg-papel p-2 shadow-sm transition-colors focus-within:border-marinho">
                    <textarea
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      onKeyDown={aoTeclar}
                      maxLength={LIMITE_TEXTO_ASSISTENTE}
                      rows={1}
                      placeholder={comEquipe ? "Escreva para a equipe…" : "Pergunte ao assistente…"}
                      aria-label={comEquipe ? "Mensagem para a equipe" : "Sua pergunta"}
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
              )}
            </div>
          </div>
        </section>
      ) : null}

      <button
        onClick={() => (aberto ? fechar() : abrir())}
        aria-label={aberto ? "Fechar assistente" : naoVistas ? `Abrir o atendimento (${naoVistas} mensagem nova)` : "Abrir o assistente"}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-marinho text-creme shadow-suave transition-transform duration-200 hover:scale-105 active:scale-95",
          aberto && "hidden sm:flex",
        )}
      >
        {/* Os dois ícones ficam sobrepostos e trocam girando. */}
        <Sparkles className={cn("absolute h-6 w-6 transition-all duration-300", aberto ? "rotate-90 scale-50 opacity-0" : "rotate-0 opacity-100")} />
        <X className={cn("absolute h-6 w-6 transition-all duration-300", aberto ? "rotate-0 opacity-100" : "-rotate-90 scale-50 opacity-0")} />
        {naoVistas && !aberto ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-terracota px-1.5 text-[11px] leading-none text-white">
            {naoVistas}
          </span>
        ) : null}
      </button>
    </>
  );
}

/**
 * Peça sugerida pelo assistente: foto pequena, cor, tamanho, preço e o botão. O clique usa a mesma
 * ação de sacola do site (a do botão da página da peça) e leva o cliente para a sacola.
 */
function CartaoOferta({ oferta, aoAdicionar }: { oferta: OfertaAssistenteApi; aoAdicionar: () => void }) {
  const navigate = useNavigate();
  const [adicionando, setAdicionando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Opção de um pedido vago: o cliente escolhe cor e tamanho aqui (só o que tem em estoque).
  const [skuEscolhido, setSkuEscolhido] = useState(oferta.variacoes[0]?.sku ?? oferta.sku);
  const escolhida = oferta.variacoes.find((v) => v.sku === skuEscolhido) ?? oferta;
  const nome = nomeDeVitrine(oferta.produto);
  const foto = oferta.imagem_url ?? fotoEstudio(oferta.sku);

  async function adicionar() {
    setAdicionando(true);
    setErro(null);
    try {
      await adicionarAoCarrinho({
        idVariacao: escolhida.id_variacao,
        sku: escolhida.sku,
        skuBase: escolhida.sku,
        nome,
        quantidade: oferta.quantidade,
        valor: escolhida.preco,
        cor: escolhida.cor,
        tamanho: escolhida.tamanho,
        imagemUrl: oferta.imagem_url,
        imagemAlt: oferta.imagem_alt ?? nome,
        tecido: oferta.tecido,
      });
      aoAdicionar();
      navigate("/sacola");
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setAdicionando(false);
    }
  }

  return (
    <div className="flex gap-3 rounded-xl border border-linha bg-papel p-2.5">
      {foto ? (
        <Foto src={foto} alt={oferta.imagem_alt ?? nome} className="aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-lg" />
      ) : (
        // Peça sem foto: o mesmo quadro do catálogo ("Vulto · foto em breve"), em tamanho de cartão.
        <div
          role="img"
          aria-label={`${nome}: foto em breve`}
          className="flex aspect-[4/5] w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg bg-areia px-1 text-center text-suave"
        >
          {ehVulto({ marca: oferta.marca }) ? (
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-tinta">Vulto</span>
          ) : (
            <span className="font-display text-[11px] leading-tight text-tinta">Casa Lorenzi</span>
          )}
          <span className="text-[7px] uppercase leading-tight tracking-[0.12em]">foto em breve</span>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium">{nome}</p>
        {oferta.variacoes.length > 1 ? (
          <label className="mt-1 block">
            <span className="sr-only">Cor e tamanho de {nome}</span>
            <select
              value={skuEscolhido}
              onChange={(ev) => setSkuEscolhido(ev.target.value)}
              className="w-full rounded-md border border-linha bg-papel px-1.5 py-1 text-[12px]"
            >
              {oferta.variacoes.map((v) => (
                <option key={v.sku} value={v.sku}>
                  {v.cor} · {v.tamanho}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-[12px] text-suave">
            {escolhida.cor} · {escolhida.tamanho}
            {oferta.quantidade > 1 ? ` · ${oferta.quantidade} peças` : ""}
          </p>
        )}
        <p className="mt-0.5 text-sm">{moeda(escolhida.preco)}</p>
        <button
          onClick={() => void adicionar()}
          disabled={adicionando}
          className="mt-1.5 self-start rounded-lg bg-marinho px-3 py-1.5 text-xs text-creme transition-colors hover:bg-marinho-escuro disabled:opacity-50"
        >
          {adicionando ? "Adicionando…" : "Adicionar à sacola"}
        </button>
        {erro ? (
          <p role="alert" className="mt-1 text-[12px] text-terracota">
            {erro}
          </p>
        ) : null}
      </div>
    </div>
  );
}
