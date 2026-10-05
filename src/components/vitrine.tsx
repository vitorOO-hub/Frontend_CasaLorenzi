import { Link } from "react-router-dom";
import { fotoProduto, moeda, totalProduto, type Produto } from "@/lib/dados";
import { cn } from "./ui";

export function FotoProduto({
  sku,
  alt,
  className,
}: {
  sku: string;
  alt: string;
  className?: string;
}) {
  const foto = fotoProduto(sku.slice(0, 7));
  return (
    <div className={cn("overflow-hidden bg-areia", className)}>
      {foto ? (
        <img src={foto} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center font-display text-lg text-suave">
          Casa Lorenzi
        </div>
      )}
    </div>
  );
}

export const parcela = (valor: number) => `ou 10x de ${moeda(valor / 10)}`;

export function CartaoProduto({ produto }: { produto: Produto }) {
  const esgotado = totalProduto(produto) === 0;
  return (
    <Link to={`/loja/${produto.sku}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-areia">
        <FotoProduto
          sku={produto.sku}
          alt={produto.nome}
          className="h-full transition-transform duration-700 group-hover:scale-[1.04]"
        />
        {esgotado ? (
          <span className="absolute left-3 top-3 bg-papel/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-suave">
            Esgotado
          </span>
        ) : null}
      </div>
      <div className="pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-dourado">
          {produto.categoria}
        </p>
        <h3 className="mt-1 font-display text-xl leading-snug text-tinta group-hover:text-marinho">
          {produto.nome}
        </h3>
        <p className="mt-1 text-sm text-tinta">{moeda(produto.preco)}</p>
        <p className="text-xs text-suave">{parcela(produto.preco)}</p>
      </div>
    </Link>
  );
}

/** Cabeçalho de seção da vitrine: sobretítulo dourado + título serifado. */
export function TituloVitrine({
  sobre,
  titulo,
  acao,
  centro = false,
}: {
  sobre: string;
  titulo: string;
  acao?: React.ReactNode;
  centro?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-wrap items-end justify-between gap-4",
        centro && "flex-col items-center text-center",
      )}
    >
      <div>
        <p className="rotulo !text-dourado">{sobre}</p>
        <h2 className="mt-2 text-4xl font-light md:text-5xl">{titulo}</h2>
      </div>
      {acao}
    </div>
  );
}
