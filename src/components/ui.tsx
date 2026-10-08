import { clsx, type ClassValue } from "clsx";
import { Check, ChevronDown, ChevronLeft, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent as EventoTeclado,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { twMerge } from "tailwind-merge";

export const cn = (...classes: ClassValue[]) => twMerge(clsx(classes));

export type Tom = "neutro" | "ok" | "alerta" | "perigo" | "destaque";

const tons: Record<Tom, string> = {
  neutro: "bg-areia text-suave",
  // Terracota e azul-aço ficam fracos em letra miúda: a cor vai no ponto e no fundo, o texto fica escuro.
  ok: "bg-sucesso/10 text-tinta before:bg-sucesso",
  alerta: "bg-alerta/12 text-tinta before:bg-alerta",
  perigo: "bg-perigo/10 text-perigo before:bg-perigo",
  destaque: "bg-marinho-claro text-marinho",
};

export function Badge({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        tom !== "neutro" && tom !== "destaque" && "before:mr-1.5 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:content-['']",
        tons[tom],
      )}
    >
      {children}
    </span>
  );
}

/** Selo numérico de pendências (barra lateral e abas). */
export function Contador({ valor, claro = false }: { valor: number; claro?: boolean }) {
  if (!valor) return null;
  return (
    <span
      className={cn(
        "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
        claro ? "bg-dourado text-marinho-escuro" : "bg-marinho text-white",
      )}
    >
      {valor}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-sm border border-linha bg-papel", className)}>{children}</div>;
}

export function CardTitulo({ titulo, acao }: { titulo: string; acao?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-linha px-5 py-4">
      <h2 className="font-sans text-sm font-semibold">{titulo}</h2>
      {acao}
    </div>
  );
}

export function Titulo({
  titulo,
  descricao,
  acao,
  sobre,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  sobre?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {sobre ? <p className="rotulo mb-2 text-dourado">{sobre}</p> : null}
        <h1 className="text-4xl font-light leading-tight text-tinta">{titulo}</h1>
        {descricao ? <p className="mt-1 text-sm text-suave">{descricao}</p> : null}
      </div>
      {acao ? <div className="flex flex-wrap gap-2">{acao}</div> : null}
    </div>
  );
}

type Variante = "primario" | "secundario" | "fantasma" | "perigo";

const variantes: Record<Variante, string> = {
  primario: "bg-marinho text-white hover:bg-marinho-escuro",
  secundario: "border border-linha bg-papel text-tinta hover:border-marinho hover:text-marinho",
  fantasma: "text-suave hover:text-marinho",
  perigo: "border border-perigo/30 bg-papel text-perigo hover:bg-perigo hover:text-white",
};

export const classesBotao = (variante: Variante = "primario", pequeno = false) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
    pequeno ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
    variantes[variante],
  );

export function Botao({
  variante = "primario",
  pequeno = false,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; pequeno?: boolean }) {
  return <button type={type} className={cn(classesBotao(variante, pequeno), className)} {...props} />;
}

export function Campo({
  label,
  children,
  ajuda,
  className,
}: {
  label: string;
  children: ReactNode;
  ajuda?: string;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="rotulo mb-1.5 block">{label}</span>
      {children}
      {ajuda ? <span className="mt-1 block text-xs text-suave">{ajuda}</span> : null}
    </label>
  );
}

export const inputClasses =
  "w-full rounded-sm border border-linha bg-papel px-3 py-2 text-sm text-tinta outline-none transition-colors placeholder:text-suave/70 hover:border-marinho/40 focus:border-marinho focus:ring-2 focus:ring-marinho/10 [&[readonly]]:bg-areia/50 [&[readonly]]:text-suave";

export type OpcaoSelect = { value: string; label: string };

/** Mesmo formato do evento do <select> nativo, para as telas lerem `e.target.value`. */
export type MudancaSelect = { target: { value: string } };

// A lista aberta segue a paleta de cada área: o painel em papel e marinho, a loja em creme e terracota.
const visualSelect = {
  painel: {
    botao: cn(inputClasses, "flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60"),
    seta: "h-4 w-4 text-suave",
    lista: "rounded-sm border border-linha bg-papel py-1 shadow-[0_14px_34px_-14px_rgba(22,32,58,.38)]",
    opcao: "px-3 py-2 text-sm text-tinta",
    ativa: "bg-areia",
    escolhida: "font-medium text-marinho",
    marca: "text-dourado",
  },
  loja: {
    botao:
      "flex cursor-pointer items-center gap-1.5 border-b border-dashed border-caramelo bg-transparent py-1 text-left text-tinta outline-none focus-visible:border-solid disabled:cursor-not-allowed disabled:opacity-60",
    seta: "h-3.5 w-3.5 text-caramelo",
    lista: "border border-linha bg-creme py-2 shadow-[0_14px_34px_-14px_rgba(22,32,58,.3)]",
    opcao: "px-4 py-2 text-[14px] text-tinta",
    ativa: "text-terracota",
    escolhida: "text-terracota",
    marca: "text-terracota",
  },
};

/**
 * Seletor com a lista desenhada pelo site (o <select> nativo abre com a fonte e as cores do sistema).
 * Abre com clique, setas, Enter ou Espaço; fecha com Esc, Tab, clique fora ou rolagem. A lista fica em
 * posição fixa para não ser cortada por modais e barras com rolagem própria.
 */
export function Select({
  opcoes,
  value,
  onChange,
  className,
  disabled,
  id,
  variante = "painel",
  "aria-label": rotulo,
}: {
  opcoes: OpcaoSelect[];
  value?: string | number;
  onChange?: (e: MudancaSelect) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  variante?: keyof typeof visualSelect;
  "aria-label"?: string;
}) {
  const v = visualSelect[variante];
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const base = useId();
  const [posicao, setPosicao] = useState<CSSProperties | null>(null);
  const [ativa, setAtiva] = useState(0);
  const aberto = posicao !== null;
  const indiceAtual = Math.max(0, opcoes.findIndex((o) => o.value === String(value ?? "")));
  const atual = opcoes[indiceAtual];

  const fechar = useCallback(() => setPosicao(null), []);

  function abrir() {
    const r = botao.current?.getBoundingClientRect();
    if (!r || disabled) return;
    // Abre para cima quando falta espaço embaixo; na loja, alinha pela direita do campo.
    const vertical = window.innerHeight - r.bottom < 260 ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 };
    const horizontal = variante === "loja" ? { right: window.innerWidth - r.right } : { left: r.left };
    setPosicao({ position: "fixed", minWidth: r.width, ...vertical, ...horizontal });
    setAtiva(indiceAtual);
  }

  function escolher(i: number) {
    const o = opcoes[i];
    fechar();
    botao.current?.focus();
    if (o && o.value !== String(value ?? "")) onChange?.({ target: { value: o.value } });
  }

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (!botao.current?.contains(alvo) && !lista.current?.contains(alvo)) fechar();
    };
    const rolou = (e: Event) => {
      if (!lista.current?.contains(e.target as Node)) fechar();
    };
    document.addEventListener("pointerdown", fora);
    window.addEventListener("scroll", rolou, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("pointerdown", fora);
      window.removeEventListener("scroll", rolou, true);
      window.removeEventListener("resize", fechar);
    };
  }, [aberto, fechar]);

  useEffect(() => {
    if (aberto) lista.current?.children[ativa]?.scrollIntoView({ block: "nearest" });
  }, [aberto, ativa]);

  function teclas(e: EventoTeclado<HTMLButtonElement>) {
    const ultimo = opcoes.length - 1;
    if (!aberto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === "ArrowDown") setAtiva((a) => Math.min(ultimo, a + 1));
    else if (e.key === "ArrowUp") setAtiva((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setAtiva(0);
    else if (e.key === "End") setAtiva(ultimo);
    else if (e.key === "Enter" || e.key === " ") escolher(ativa);
    else if (e.key === "Escape") {
      // Fecha só a lista, sem fechar junto o modal em que ela estiver.
      e.stopPropagation();
      fechar();
    } else if (e.key === "Tab") {
      fechar();
      return;
    } else if (e.key.length === 1) {
      // Digitar uma letra pula para a próxima opção que começa com ela.
      const letra = e.key.toLocaleLowerCase("pt-BR");
      const proxima = opcoes.findIndex((o, i) => i > ativa && o.label.toLocaleLowerCase("pt-BR").startsWith(letra));
      const primeira = opcoes.findIndex((o) => o.label.toLocaleLowerCase("pt-BR").startsWith(letra));
      const alvo = proxima >= 0 ? proxima : primeira;
      if (alvo >= 0) setAtiva(alvo);
    } else return;
    e.preventDefault();
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={botao}
        id={id}
        type="button"
        role="combobox"
        aria-label={rotulo}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={`${base}-lista`}
        aria-activedescendant={aberto ? `${base}-${ativa}` : undefined}
        disabled={disabled}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={teclas}
        className={v.botao}
      >
        <span className="truncate">{atual?.label ?? ""}</span>
        <ChevronDown className={cn("shrink-0 transition-transform", v.seta, aberto && "rotate-180")} />
      </button>
      {/* A lista fica sempre na página (escondida quando fechada), com as opções legíveis. */}
      <ul
        ref={lista}
        id={`${base}-lista`}
        role="listbox"
        aria-label={rotulo}
        hidden={!aberto}
        style={posicao ?? undefined}
        className={cn("z-[60] max-h-64 max-w-[min(22rem,calc(100vw-2rem))] overflow-y-auto", v.lista)}
      >
        {opcoes.map((o, i) => {
          const escolhida = i === indiceAtual;
          return (
            <li
              key={o.value}
              id={`${base}-${i}`}
              role="option"
              aria-selected={escolhida}
              onPointerEnter={() => setAtiva(i)}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => escolher(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-4 whitespace-nowrap transition-colors",
                v.opcao,
                i === ativa && v.ativa,
                escolhida && v.escolhida,
              )}
            >
              {o.label}
              {escolhida ? <Check className={cn("h-3.5 w-3.5 shrink-0", v.marca)} strokeWidth={2} /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Barra de filtros acima de tabelas. */
export function Filtros({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-sm border border-linha bg-areia/40 p-4 [&>*]:min-w-40">
      {children}
    </div>
  );
}

/** Seletor de opções lado a lado (ex.: Entrada | Saída). */
export function Segmentado<T extends string>({
  valor,
  opcoes,
  onChange,
}: {
  valor: T;
  opcoes: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-sm border border-linha bg-papel p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
            valor === o.value ? "bg-marinho text-white" : "text-suave hover:text-tinta",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  largo = false,
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  largo?: boolean;
}) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto, onFechar]);

  if (!aberto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-marinho-escuro/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-sm border border-linha bg-papel p-6 shadow-suave",
          largo ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <span className="filete mb-3" />
            <h2 className="text-2xl font-normal">{titulo}</h2>
          </div>
          <button onClick={onFechar} className="text-suave hover:text-tinta" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabela({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export const th =
  "rotulo whitespace-nowrap border-b border-linha bg-areia/30 px-4 py-3 text-[10px] font-bold";
export const td = "border-b border-linha/70 px-4 py-3 align-middle";
export const linhaClicavel = "cursor-pointer transition-colors hover:bg-areia/50";

export function LinhaVazia({ colunas, texto }: { colunas: number; texto: string }) {
  return (
    <tr>
      <td className={cn(td, "py-8 text-center text-suave")} colSpan={colunas}>
        {texto}
      </td>
    </tr>
  );
}

export function Voltar({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-marinho hover:text-dourado"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}

/** Quadro de indicador (dashboard e resumos). */
export function Metrica({
  rotulo,
  valor,
  nota,
  to,
  destaque = false,
  extra,
}: {
  rotulo: string;
  valor: ReactNode;
  nota?: string;
  to?: string;
  destaque?: boolean;
  extra?: ReactNode;
}) {
  const conteudo = (
    <Card
      className={cn(
        "h-full p-5 transition-colors",
        to && "hover:border-marinho",
        destaque && "border-dourado/60 bg-dourado-claro/40",
      )}
    >
      <p className="rotulo">{rotulo}</p>
      <p className="mt-3 font-display text-3xl font-medium leading-none text-marinho sm:text-4xl">{valor}</p>
      {nota ? <p className="mt-2 text-xs text-suave">{nota}</p> : null}
      {extra ? <div className="mt-2">{extra}</div> : null}
    </Card>
  );
  return to ? (
    <Link to={to} className="block">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

export const sinal = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Mensagem de erro de uma ação (403, 409, 422…), com botão para dispensar. */
export function AvisoErro({ erro, onFechar, className }: { erro: string | null; onFechar?: () => void; className?: string }) {
  if (!erro) return null;
  return (
    <div role="alert" className={cn("flex items-start justify-between gap-3 rounded-sm border border-perigo/30 bg-perigo/5 px-4 py-3 text-sm text-perigo", className)}>
      <span>{erro}</span>
      {onFechar ? (
        <button type="button" onClick={onFechar} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dispensar">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
