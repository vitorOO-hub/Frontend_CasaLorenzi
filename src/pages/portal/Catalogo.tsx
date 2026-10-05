import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Select, cn } from "@/components/ui";
import { CartaoProduto } from "@/components/vitrine";
import { totalProduto } from "@/lib/dados";
import { useEstado } from "@/lib/store";

type Ordem = "relevancia" | "menor" | "maior";

export function Catalogo() {
  const { produtos } = useEstado();
  const [params, setParams] = useSearchParams();
  const categoria = params.get("categoria") ?? "";
  const busca = params.get("busca") ?? "";
  const ordem = (params.get("ordem") as Ordem) ?? "relevancia";

  const categorias = useMemo(
    () =>
      Array.from(new Set(produtos.map((p) => p.categoria)))
        .sort()
        .map((c) => ({ nome: c, total: produtos.filter((p) => p.categoria === c).length })),
    [produtos],
  );

  const lista = produtos
    .filter((p) => !categoria || p.categoria === categoria)
    .filter(
      (p) =>
        !busca ||
        `${p.nome} ${p.categoria}`.toLowerCase().includes(busca.toLowerCase()),
    )
    .sort((a, b) => {
      if (ordem === "menor") return a.preco - b.preco;
      if (ordem === "maior") return b.preco - a.preco;
      // Relevância: disponíveis primeiro.
      return Number(totalProduto(b) > 0) - Number(totalProduto(a) > 0);
    });

  function alterar(chave: string, valor: string) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    setParams(novo);
  }

  const titulo = busca ? `Busca: “${busca}”` : categoria || "A coleção";

  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 md:px-8">
      <div className="mb-12 text-center">
        <p className="rotulo !text-dourado">Casa Lorenzi</p>
        <h1 className="mt-2 text-5xl font-light">{titulo}</h1>
        <span className="filete mx-auto mt-5" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[12rem_1fr]">
        <aside>
          <p className="rotulo mb-4">Categorias</p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-0">
            <li>
              <button
                onClick={() => alterar("categoria", "")}
                className={cn(
                  "w-full py-1.5 text-left text-sm transition-colors max-lg:rounded-full max-lg:border max-lg:px-4",
                  !categoria ? "font-semibold text-marinho max-lg:border-marinho" : "text-suave hover:text-tinta",
                )}
              >
                Ver tudo <span className="text-xs text-suave">({produtos.length})</span>
              </button>
            </li>
            {categorias.map((c) => (
              <li key={c.nome}>
                <button
                  onClick={() => alterar("categoria", c.nome)}
                  className={cn(
                    "w-full py-1.5 text-left text-sm transition-colors max-lg:rounded-full max-lg:border max-lg:px-4",
                    categoria === c.nome
                      ? "font-semibold text-marinho max-lg:border-marinho"
                      : "text-suave hover:text-tinta",
                  )}
                >
                  {c.nome} <span className="text-xs text-suave">({c.total})</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-linha pb-4">
            <p className="text-sm text-suave">
              {lista.length} {lista.length === 1 ? "peça" : "peças"}
              {busca ? (
                <button onClick={() => alterar("busca", "")} className="ml-3 text-marinho underline">
                  limpar busca
                </button>
              ) : null}
            </p>
            <Select
              aria-label="Ordenar"
              value={ordem}
              onChange={(e) => alterar("ordem", e.target.value === "relevancia" ? "" : e.target.value)}
              className="w-48"
              opcoes={[
                { value: "relevancia", label: "Ordenar: relevância" },
                { value: "menor", label: "Menor preço" },
                { value: "maior", label: "Maior preço" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6">
            {lista.map((p) => (
              <CartaoProduto key={p.sku} produto={p} />
            ))}
          </div>
          {lista.length === 0 ? (
            <p className="py-20 text-center text-sm text-suave">
              Nenhuma peça encontrada. Tente outra categoria ou termo de busca.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
