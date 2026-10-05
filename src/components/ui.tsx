import { clsx, type ClassValue } from "clsx";
import { ChevronDown, ChevronLeft, X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { twMerge } from "tailwind-merge";

export const cn = (...classes: ClassValue[]) => twMerge(clsx(classes));

export type Tom = "neutro" | "ok" | "alerta" | "perigo" | "destaque";

const tons: Record<Tom, string> = {
  neutro: "bg-areia text-suave",
  ok: "bg-sucesso/10 text-sucesso",
  alerta: "bg-alerta/10 text-alerta",
  perigo: "bg-perigo/10 text-perigo",
  destaque: "bg-marinho-claro text-marinho",
};

export function Badge({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
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

export function Select({
  opcoes,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { opcoes: { value: string; label: string }[] }) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className={cn(inputClasses, "cursor-pointer appearance-none pr-9 disabled:opacity-60")}
      >
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
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
}: {
  rotulo: string;
  valor: ReactNode;
  nota?: string;
  to?: string;
  destaque?: boolean;
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
