import { useSearchParams } from "react-router-dom";
import { Select, cn } from "@/components/ui";
import { CartaoDaLinha } from "@/components/vitrine";
import { categoriasUnicas, mesmaCategoria } from "@/lib/categorias";
import { useProdutosCatalogo } from "@/lib/catalogoApi";
import { produtoTemEstoque } from "@/lib/dados";
import { filtrarProdutosCatalogo, tamanhosDoCatalogo } from "@/lib/filtrosCatalogo";
import { useEstado } from "@/lib/store";
import { daMarca } from "@/lib/vultoMais";

/**
 * Página de produtos de uma linha da casa: Linha Lorenzi (/loja?marca=casa-lorenzi) e Vulto (/vulto)
 * usam o mesmo modelo (cabeçalho, abas de categoria, filtros, contagem e grade). Muda só o conteúdo
 * e o selo da marca no cartão. Os filtros ficam na URL, como no catálogo.
 */

export type Linha = "casa-lorenzi" | "vulto";

const LINHAS: Record<Linha, { titulo: string; frase: string }> = {
  "casa-lorenzi": { titulo: "Linha Lorenzi", frase: "Barra e mangas ajustadas na hora." },
  vulto: { titulo: "Vulto", frase: "A linha urbana da casa, com os mesmos ajustes e trocas." },
};

type Ordem = "edicao" | "menor" | "maior";
const FILTROS = ["tamanho", "preco_min", "preco_max", "disponivel"];

const rotulo = "font-mao text-[10px] uppercase tracking-[0.18em] text-suave";
const sublinhado = "border-b border-dashed border-linha";

export function PaginaDaLinha({ linha }: { linha: Linha }) {
  const estado = useEstado();
  const { produtos, carregando, erro } = useProdutosCatalogo(estado.produtos);
  const [params, setParams] = useSearchParams();
  const categoria = params.get("categoria") ?? "";
  const tamanho = params.get("tamanho") ?? "";
  const precoMin = params.get("preco_min") ?? "";
  const precoMax = params.get("preco_max") ?? "";
  const somenteDisponiveis = params.get("disponivel") === "sim";
  const ordem = (params.get("ordem") as Ordem) || "edicao";
  const { titulo, frase } = LINHAS[linha];

  const daLinha = produtos.filter((p) => daMarca(p, linha));
  const categorias = categoriasUnicas(daLinha.map((p) => p.categoria));
  const naCategoria = daLinha.filter((p) => !categoria || mesmaCategoria(p.categoria, categoria));
  const tamanhos = tamanhosDoCatalogo(naCategoria);
  const lista = filtrarProdutosCatalogo(naCategoria, {
    tamanho,
    precoMin: precoMin === "" ? null : Number(precoMin),
    precoMax: precoMax === "" ? null : Number(precoMax),
    somenteDisponiveis,
  }).sort((a, b) => {
    if (ordem === "menor") return a.preco - b.preco;
    if (ordem === "maior") return b.preco - a.preco;
    return Number(produtoTemEstoque(b)) - Number(produtoTemEstoque(a));
  });
  const filtrosAtivos = Boolean(tamanho || precoMin || precoMax || somenteDisponiveis);

  function alterar(chave: string, valor: string) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    setParams(novo);
  }

  function limparFiltros() {
    const novo = new URLSearchParams(params);
    FILTROS.forEach((chave) => novo.delete(chave));
    setParams(novo);
  }

  return (
    <div className="mx-auto max-w-[1360px] px-5 md:px-12">
      <header className="pt-10 md:pt-12">
        <p className={cn(rotulo, "flex items-center gap-4 tracking-[0.22em]")}>
          Casa Lorenzi+
          <i aria-hidden="true" className="h-0 flex-1 border-t border-dashed border-linha" />
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_340px] md:items-end md:gap-14">
          <h1 className="text-[44px] leading-[0.92] tracking-[-0.015em] md:text-[80px]">{titulo}</h1>
          <p className="max-w-[34ch] font-display text-[17px] leading-snug text-suave md:mb-2 md:justify-self-end md:text-right md:text-[20px]">
            {frase}
          </p>
        </div>
      </header>

      <nav
        aria-label={`Categorias da ${titulo}`}
        className="mt-8 flex gap-6 overflow-x-auto border-b border-linha [scrollbar-width:none] md:mt-10"
      >
        {[{ valor: "", rotulo: "Toda a linha" }, ...categorias].map((c) => {
          const ativa = c.valor ? mesmaCategoria(categoria, c.valor) : !categoria;
          return (
            <button
              key={c.valor || "toda"}
              type="button"
              aria-pressed={ativa}
              onClick={() => alterar("categoria", c.valor)}
              className={cn(
                "-mb-px shrink-0 whitespace-nowrap border-b pb-3 font-menu text-[12px] uppercase tracking-[0.13em] transition-colors",
                ativa ? "border-tinta text-tinta" : "border-transparent text-suave hover:text-tinta",
              )}
            >
              {c.rotulo}
            </button>
          );
        })}
      </nav>

      <div className="grid grid-cols-2 items-end gap-x-4 gap-y-4 border-b border-dashed border-linha py-4 md:flex md:flex-wrap md:gap-x-11">
        <label className="flex min-w-0 flex-col gap-1.5 md:w-40">
          <span className={rotulo}>Tamanho</span>
          <Select
            variante="loja"
            aria-label="Filtrar por tamanho"
            value={tamanho}
            onChange={(e) => alterar("tamanho", e.target.value)}
            opcoes={[{ value: "", label: "Todos os tamanhos" }, ...tamanhos.map((t) => ({ value: t, label: t }))]}
          />
        </label>

        <fieldset className="flex min-w-0 flex-col gap-1.5 md:w-64">
          <legend className={cn(rotulo, "mb-1.5")}>Faixa de preço</legend>
          <div className={cn("flex items-center gap-1.5 pb-1 focus-within:border-tinta", sublinhado)}>
            <span className="font-mao text-[10px] text-suave" aria-hidden="true">
              R$
            </span>
            <input
              aria-label="Preço mínimo"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="mín."
              value={precoMin}
              onChange={(e) => alterar("preco_min", e.target.value)}
              className="w-full min-w-0 bg-transparent text-[13px] tabular-nums text-tinta outline-none placeholder:text-suave [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-linha" aria-hidden="true">
              —
            </span>
            <span className="font-mao text-[10px] text-suave" aria-hidden="true">
              R$
            </span>
            <input
              aria-label="Preço máximo"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="máx."
              value={precoMax}
              onChange={(e) => alterar("preco_max", e.target.value)}
              className="w-full min-w-0 bg-transparent text-[13px] tabular-nums text-tinta outline-none placeholder:text-suave [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </fieldset>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={rotulo}>Disponibilidade</span>
          <div className="flex gap-4" role="group" aria-label="Disponibilidade">
            {[
              { valor: "", rotulo: "Todos" },
              { valor: "sim", rotulo: "Em estoque" },
            ].map((o) => {
              const ativa = somenteDisponiveis === (o.valor === "sim");
              return (
                <button
                  key={o.valor || "todos"}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => alterar("disponivel", o.valor)}
                  className={cn(
                    "pb-1 text-[13px] transition-colors",
                    ativa ? "border-b border-tinta text-tinta" : cn(sublinhado, "text-suave hover:text-tinta"),
                  )}
                >
                  {o.rotulo}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex min-w-0 flex-col gap-1.5 md:w-40">
          <span className={rotulo}>Ordem</span>
          <Select
            variante="loja"
            aria-label="Ordem"
            value={ordem}
            onChange={(e) => alterar("ordem", e.target.value === "edicao" ? "" : e.target.value)}
            opcoes={[
              { value: "edicao", label: "da edição" },
              { value: "menor", label: "menor preço" },
              { value: "maior", label: "maior preço" },
            ]}
          />
        </label>

        <div className="col-span-2 flex items-center justify-between gap-4 border-t border-dashed border-linha pt-3 md:ml-auto md:border-0 md:pt-0">
          {filtrosAtivos ? (
            <button type="button" onClick={limparFiltros} className="text-[13px] text-tinta underline underline-offset-4">
              Limpar filtros
            </button>
          ) : (
            <span />
          )}
          {!carregando ? (
            <span className="whitespace-nowrap font-mao text-[11px] tracking-[0.06em] text-suave" aria-live="polite">
              {lista.length} {lista.length === 1 ? "produto" : "produtos"}
            </span>
          ) : null}
        </div>
      </div>

      {erro ? <p className="py-6 text-sm text-suave">{erro}</p> : null}

      {carregando ? (
        <p className="py-24 text-center font-display text-2xl text-suave">Carregando produtos...</p>
      ) : lista.length === 0 && !erro ? (
        <div className="my-9 border border-dashed border-linha px-6 py-20 text-center">
          <p className="font-mao text-[11px] uppercase tracking-[0.14em] text-suave">Nenhum produto com esses filtros</p>
          {filtrosAtivos ? (
            <button
              type="button"
              onClick={limparFiltros}
              className="mt-4 border-b border-tinta pb-0.5 font-menu text-[12px] uppercase tracking-[0.12em] text-tinta"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 pb-16 pt-6 md:gap-x-6 md:gap-y-11 md:pt-9 lg:grid-cols-3">
          {lista.map((p) => (
            <CartaoDaLinha key={p.sku} produto={p} />
          ))}
        </div>
      )}
    </div>
  );
}
