import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/components/ui";
import { CartaoProduto } from "@/components/vitrine";
import { totalProduto } from "@/lib/dados";
import { EDICAO, detalheDe } from "@/lib/loja";
import { useEstado } from "@/lib/store";

type Ordem = "edicao" | "menor" | "maior";

export function Catalogo() {
  const { produtos } = useEstado();
  const [params, setParams] = useSearchParams();
  const categoria = params.get("categoria") ?? "";
  const busca = (params.get("busca") ?? "").trim();
  const ordem = (params.get("ordem") as Ordem) || "edicao";

  const categorias = useMemo(() => Array.from(new Set(produtos.map((p) => p.categoria))).sort(), [produtos]);

  // A busca também procura no tecido e no nome das cores ("linho", "Areia de Ipanema").
  const lista = produtos
    .filter((p) => !categoria || p.categoria === categoria)
    .filter((p) => {
      if (!busca) return true;
      const d = detalheDe(p.sku);
      return `${p.nome} ${p.categoria} ${d.tecido} ${d.cores.map((c) => c.nome).join(" ")}`
        .toLowerCase()
        .includes(busca.toLowerCase());
    })
    .sort((a, b) => {
      if (ordem === "menor") return a.preco - b.preco;
      if (ordem === "maior") return b.preco - a.preco;
      return Number(totalProduto(b) > 0) - Number(totalProduto(a) > 0);
    });

  function alterar(chave: string, valor: string) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    setParams(novo);
  }

  const semFiltro = !categoria && !busca && ordem === "edicao";

  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-10 md:px-12">
      <div className="grid gap-6 border-b border-dashed border-linha pb-10 md:grid-cols-[1fr_1fr] md:items-end">
        <div>
          <p className="text-[15px] text-caramelo">
            Pronta-entrega · Edição {EDICAO.numero}
          </p>
          <h1 className="mt-2 text-[56px] leading-none md:text-[76px]">
            {busca ? <>“{busca}”</> : categoria || EDICAO.nome}
            <i className="text-caramelo">.</i>
          </h1>
        </div>
        <p className="font-display text-[19px] leading-normal text-suave md:text-right">
          {lista.length} {lista.length === 1 ? "peça" : "peças"}. Todas com a barra e as mangas ajustadas na hora, em qualquer uma das três casas.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]" aria-label="Categorias">
          {["", ...categorias].map((c) => (
            <button
              key={c || "todas"}
              onClick={() => alterar("categoria", c)}
              className={cn(
                "border-b-[1.5px] pb-0.5",
                categoria === c ? "border-dashed border-caramelo text-tinta" : "border-transparent text-suave hover:text-tinta",
              )}
            >
              {c || "Tudo"}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm text-suave">
          {busca ? (
            <button onClick={() => alterar("busca", "")} className="link-tracejado text-tinta">
              Limpar busca
            </button>
          ) : null}
          <label className="flex items-center gap-2">
            Ordem
            <select
              value={ordem}
              onChange={(e) => alterar("ordem", e.target.value === "edicao" ? "" : e.target.value)}
              className="cursor-pointer border-b border-dashed border-caramelo bg-transparent py-1 text-tinta outline-none"
            >
              <option value="edicao">da edição</option>
              <option value="menor">menor preço</option>
              <option value="maior">maior preço</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((p, i) => (
          <CartaoProduto
            key={p.sku}
            produto={p}
            grande={semFiltro && i === 0}
            legenda={semFiltro && i === 0 ? detalheDe(p.sku).nota : undefined}
          />
        ))}
      </div>
      {lista.length === 0 ? (
        <p className="py-24 text-center font-display text-2xl text-suave">
          Nada com esse nome nesta edição. Que tal procurar por um tecido — “linho”, “merino”, “couro”?
        </p>
      ) : null}
    </div>
  );
}
