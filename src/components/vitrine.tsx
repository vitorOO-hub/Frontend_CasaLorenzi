import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { moeda, totalProduto, type Produto } from "@/lib/dados";
import { detalheDe, fotoEstudio, fotoVestida, unsplash } from "@/lib/loja";
import { cn } from "./ui";

/** Foto com o tratamento da casa (tom quente + grão de filme). */
export function Foto({
  src,
  alt = "",
  className,
  posicao,
  children,
}: {
  src?: string;
  alt?: string;
  className?: string;
  posicao?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("foto-grao", className)}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: posicao }} />
      ) : null}
      {children}
    </div>
  );
}

/** Foto de campanha pelo id do Unsplash. */
export const FotoCampanha = ({ id, largura, ...props }: { id: string; largura?: number } & Omit<Parameters<typeof Foto>[0], "src">) => (
  <Foto src={unsplash(id, largura)} {...props} />
);

/** Foto de estúdio da peça (packshot), usada em listas compactas. */
export function FotoProduto({ sku, alt, className }: { sku: string; alt: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden bg-areia", className)}>
      <img src={fotoEstudio(sku)} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}

export const parcela = (valor: number) => `ou 10x de ${moeda(valor / 10)}`;

/** Etiqueta de preço de papel, com furo — como a que vai pendurada na peça. */
export function Etiqueta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-2 whitespace-nowrap bg-etiqueta py-1.5 pl-7 pr-3.5 text-[13px] font-medium text-tinta",
        "[clip-path:polygon(11px_0,100%_0,100%_100%,11px_100%,0_50%)]",
        "before:absolute before:left-[9px] before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-creme before:shadow-[inset_0_0_0_1px_var(--color-ouro-claro)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Preco({ valor }: { valor: number }) {
  return (
    <Etiqueta>
      {moeda(valor)} <small className="text-[11px] font-normal text-suave">ou 10x</small>
    </Etiqueta>
  );
}

/** Legenda de revista: quem veste o quê, e onde. */
export function Legenda({ destaque, children, className }: { destaque?: string; children?: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-2.5 text-[13px] leading-relaxed text-suave", className)}>
      {destaque ? <i className="font-display text-[15px] text-tinta">{destaque} </i> : null}
      {children}
    </p>
  );
}

/** Nome completo da peça: nome + tecido em itálico. */
export function NomePeca({ produto, className }: { produto: Produto; className?: string }) {
  const { tecido } = detalheDe(produto.sku);
  return (
    <span className={cn("font-display leading-tight", className)}>
      {produto.nome} {tecido ? <em className="text-suave">{tecido}</em> : null}
    </span>
  );
}

/** Cartão de peça: foto vestida (estúdio ao passar o mouse), nome com tecido, cor e etiqueta. */
export function CartaoProduto({
  produto,
  grande = false,
  legenda,
}: {
  produto: Produto;
  grande?: boolean;
  legenda?: string;
}) {
  const { cores } = detalheDe(produto.sku);
  const esgotado = totalProduto(produto) === 0;
  const vestida = fotoVestida(produto.sku, grande ? 1400 : 800);
  return (
    <Link to={`/loja/${produto.sku}`} className={cn("group block", grande && "lg:row-span-2")}>
      {/* Como num catálogo: a peça sozinha em fundo liso; ao passar o mouse, a peça vestida. */}
      <div className={cn("relative aspect-[4/5] overflow-hidden bg-areia", grande && "lg:aspect-auto lg:h-[calc(100%-132px)] lg:min-h-[620px]")}>
        {/* No cartão grande do catálogo a ordem se inverte: primeiro a foto vestida. */}
        <img
          src={grande && vestida ? vestida : fotoEstudio(produto.sku)}
          alt={produto.nome}
          loading="lazy"
          className={cn("h-full w-full", grande && vestida ? "object-cover" : "object-contain")}
        />
        {vestida ? (
          <img
            src={grande ? fotoEstudio(produto.sku) : vestida}
            alt=""
            loading="lazy"
            className={cn(
              "absolute inset-0 z-[1] h-full w-full bg-areia opacity-0 transition-opacity duration-500 group-hover:opacity-100",
              grande ? "object-contain" : "object-cover",
            )}
          />
        ) : null}
        {esgotado ? (
          <span className="absolute left-3 top-3 z-[2] bg-creme px-2.5 py-1 text-xs text-suave">Esgotado — volta na próxima edição</span>
        ) : null}
      </div>
      <h3 className="mt-4 text-[21px]">
        <NomePeca produto={produto} />
      </h3>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] text-suave">
          <i className="h-[11px] w-[11px] rounded-full" style={{ background: cores[0]?.hex }} />
          {cores.map((c) => c.nome).join(" · ")}
        </span>
        <Preco valor={produto.preco} />
      </div>
      {legenda ? <Legenda>{legenda}</Legenda> : null}
    </Link>
  );
}

/** Cabeçalho de seção da loja: título serifado à esquerda e link tracejado à direita. */
export function CabecalhoSecao({ titulo, acao, para }: { titulo: string; acao?: string; para?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
      <h2 className="text-[40px] leading-tight">{titulo}</h2>
      {acao && para ? (
        <Link to={para} className="link-tracejado text-sm">
          {acao}
        </Link>
      ) : null}
    </div>
  );
}

/** Botão da loja: retângulo escuro, texto em caixa normal. */
export const botaoLoja = (variante: "tabaco" | "marinho" | "contorno" = "tabaco") =>
  cn(
    "inline-flex items-center justify-center gap-2 px-7 py-4 text-sm tracking-wide transition-colors disabled:opacity-40",
    variante === "tabaco" && "bg-tabaco text-creme hover:bg-tinta",
    variante === "marinho" && "bg-marinho text-white hover:bg-tinta",
    variante === "contorno" && "border border-tinta hover:bg-tinta hover:text-creme",
  );

/** Ficha técnica no formato da etiqueta costurada no forro. */
export function FichaTecnica({ produto, tamanho }: { produto: Produto; tamanho?: string }) {
  const d = detalheDe(produto.sku);
  const linhas: [string, string][] = [
    [produto.nome, `nº ${produto.sku.slice(3)}`],
    ["Tecido", d.tecido.replace(/^em /, "")],
    ["Origem", d.tecelagem],
    ["Costurado em", d.costuradoEm],
    ["Tamanho", tamanho ?? "—"],
    ["Ajuste", "na loja, sem custo"],
  ];
  return (
    <div className="relative rotate-[-1deg] bg-etiqueta px-8 py-7 font-mono text-[13px] leading-[1.85] text-tinta shadow-[0_14px_30px_#16203a26] before:pointer-events-none before:absolute before:inset-[9px] before:border-[1.5px] before:border-dashed before:border-camelo/60">
      <b className="tracking-wider">CASA LORENZI · DESDE 1962</b>
      {linhas.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span>{k}</span>
          <span className="flex-1 overflow-hidden whitespace-nowrap text-camelo/60">{".".repeat(60)}</span>
          <span className="text-right">{v}</span>
        </div>
      ))}
      <span className="mt-2 block font-mao text-[14px] leading-relaxed text-ferrugem">— conferido no ateliê</span>
    </div>
  );
}
