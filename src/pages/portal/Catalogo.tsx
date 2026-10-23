import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Select, cn } from "@/components/ui";
import { CartaoProduto } from "@/components/vitrine";
import { produtoTemEstoque } from "@/lib/dados";
import { filtrarProdutosCatalogo, tamanhosDoCatalogo } from "@/lib/filtrosCatalogo";
import { useProdutosCatalogo } from "@/lib/catalogoApi";
import { EDICAO } from "@/lib/loja";
import { useEstado } from "@/lib/store";
import { mesmaCategoria, rotuloDaCategoria } from "@/lib/categorias";
import { MARCAS_FILTRO, daMarca, type MarcaFiltro } from "@/lib/vultoMais";
import { PaginaDaLinha } from "./PaginaDaLinha";

type Ordem = "edicao" | "menor" | "maior";

const CARREGANDO = "Carregando produtos...";

/** /loja com uma marca escolhida é a página daquela linha; sem marca (ou com busca), o catálogo geral. */
export function Catalogo() {
  const [params] = useSearchParams();
  const marca = params.get("marca");
  const busca = (params.get("busca") ?? "").trim();
  if (!busca && (marca === "casa-lorenzi" || marca === "vulto")) return <PaginaDaLinha linha={marca} />;
  return <CatalogoGeral />;
}

function CatalogoGeral() {
  const estado = useEstado();
  const { produtos, carregando, erro } = useProdutosCatalogo(estado.produtos);
  const [params, setParams] = useSearchParams();
  const categoria = params.get("categoria") ?? "";
  const tipo = params.get("tipo") ?? "";
  const busca = (params.get("busca") ?? "").trim();
  const ordem = (params.get("ordem") as Ordem) || "edicao";
  const marca = (params.get("marca") as MarcaFiltro) || "";
  const tamanho = params.get("tamanho") ?? "";
  const precoMin = params.get("preco_min") ?? "";
  const precoMax = params.get("preco_max") ?? "";
  const somenteDisponiveis = params.get("disponivel") === "sim";

  // Dentro de uma categoria, o topo mostra só os subtipos dela; trocar de categoria é pelo menu.
  const tipos = useMemo(
    () => Array.from(new Set(produtos.filter((p) => mesmaCategoria(p.categoria, categoria) && p.tipo).map((p) => p.tipo!))).sort(),
    [produtos, categoria],
  );

  // A busca também procura no tecido e no nome das cores ("linho", "Areia de Ipanema").
  const produtosBase = produtos
    .filter((p) => daMarca(p, marca))
    .filter((p) => !categoria || mesmaCategoria(p.categoria, categoria))
    .filter((p) => !tipo || p.tipo === tipo)
    .filter((p) => {
      if (!busca) return true;
      return `${p.nome} ${p.categoria} ${p.tipo ?? ""} ${p.tecido ?? ""} ${p.cores?.map((c) => c.nome).join(" ") ?? ""}`
        .toLowerCase()
        .includes(busca.toLowerCase());
    });

  const minimo = precoMin === "" ? null : Number(precoMin);
  const maximo = precoMax === "" ? null : Number(precoMax);
  const tamanhos = tamanhosDoCatalogo(produtosBase);
  const lista = filtrarProdutosCatalogo(produtosBase, {
    tamanho,
    precoMin: minimo,
    precoMax: maximo,
    somenteDisponiveis,
  }).sort((a, b) => {
      if (ordem === "menor") return a.preco - b.preco;
      if (ordem === "maior") return b.preco - a.preco;
      return Number(produtoTemEstoque(b)) - Number(produtoTemEstoque(a));
    });

  function alterar(chave: string, valor: string) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    setParams(novo);
  }

  const semFiltro = !categoria && !tipo && !busca && !marca && !tamanho && !precoMin && !precoMax && !somenteDisponiveis && ordem === "edicao";
  const filtrosAtivos = Boolean(tamanho || precoMin || precoMax || somenteDisponiveis);
  const titulo = busca ? <>“{busca}”</> : tipo || rotuloDaCategoria(categoria) || EDICAO.nome;
  const linha = marca === "vulto" ? "Linha Vulto" : marca === "casa-lorenzi" ? "Linha Lorenzi" : "Casa Lorenzi+";

  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-10 md:px-12">
      <div className="grid gap-6 border-b border-dashed border-linha pb-10 md:grid-cols-[1fr_1fr] md:items-end">
        <div>
          <p className="text-[15px] text-caramelo">
            {linha} · {categoria && tipo ? rotuloDaCategoria(categoria) : `Edição ${EDICAO.numero}`}
          </p>
          <h1 className="mt-2 text-[56px] leading-none md:text-[76px]">
            {titulo}
            <i className="text-caramelo">.</i>
          </h1>
        </div>
        <p className="font-display text-[19px] leading-normal text-suave md:text-right">
          {carregando ? CARREGANDO : `${lista.length} ${lista.length === 1 ? "peça" : "peças"}.`} Todas com a barra e as mangas ajustadas na hora, em qualquer uma das três casas.
        </p>
      </div>

      {erro ? <p className="border-b border-dashed border-linha py-3 text-sm text-suave">{erro}</p> : null}

      <div className="flex flex-col gap-5 py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          {tipos.length > 1 ? (
            <nav
              className="flex min-w-0 gap-6 overflow-x-auto text-[14px] [scrollbar-width:none]"
              aria-label={`Tipos de ${categoria}`}
            >
              {["", ...tipos].map((t) => (
                <button
                  key={t || "todos"}
                  onClick={() => alterar("tipo", t)}
                  className={cn(
                    "shrink-0 whitespace-nowrap border-b pb-1 transition-colors",
                    tipo === t ? "border-tinta text-tinta" : "border-transparent text-suave hover:text-tinta",
                  )}
                >
                  {t || `Ver tudo em ${rotuloDaCategoria(categoria)}`}
                </button>
              ))}
            </nav>
          ) : (
            <span className="hidden xl:block" />
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-suave">
            {/* Casa Lorenzi e Vulto no mesmo catálogo: o filtro separa as duas linhas. */}
            <span className="flex items-center gap-1.5" role="group" aria-label="Marca">
              {MARCAS_FILTRO.map((m) => (
                <button
                  key={m.valor || "todas"}
                  onClick={() => alterar("marca", m.valor)}
                  aria-pressed={marca === m.valor}
                  className={cn(
                    "border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] transition-colors",
                    marca === m.valor ? "border-marinho bg-marinho text-creme" : "border-linha text-tinta hover:border-tinta",
                  )}
                >
                  {m.rotulo}
                </button>
              ))}
            </span>
            {busca ? (
              <button onClick={() => alterar("busca", "")} className="link-tracejado text-tinta">
                Limpar busca
              </button>
            ) : null}
            <span className="flex items-center gap-2">
              Ordem
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
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-5 gap-y-4 border-t border-linha pt-5">
          <label className="flex min-w-40 flex-col gap-1.5 text-xs text-suave">
            Tamanho
            <Select
              variante="loja"
              aria-label="Filtrar por tamanho"
              value={tamanho}
              onChange={(e) => alterar("tamanho", e.target.value)}
              opcoes={[{ value: "", label: "Todos os tamanhos" }, ...tamanhos.map((t) => ({ value: t, label: t }))]}
            />
          </label>

          <fieldset className="flex min-w-64 flex-col gap-1.5 text-xs text-suave">
            <legend>Faixa de preço</legend>
            <div className="flex items-center gap-2">
              <label className="flex h-10 items-center gap-1.5 border border-linha px-2.5 text-sm text-tinta focus-within:border-tinta">
                <span aria-hidden="true">R$</span>
                <input
                  aria-label="Preço mínimo"
                  className="w-24 bg-transparent outline-none placeholder:text-suave"
                  type="number"
                  min="0"
                  step="10"
                  inputMode="decimal"
                  placeholder="Mínimo"
                  value={precoMin}
                  onChange={(e) => alterar("preco_min", e.target.value)}
                />
              </label>
              <span aria-hidden="true">–</span>
              <label className="flex h-10 items-center gap-1.5 border border-linha px-2.5 text-sm text-tinta focus-within:border-tinta">
                <span aria-hidden="true">R$</span>
                <input
                  aria-label="Preço máximo"
                  className="w-24 bg-transparent outline-none placeholder:text-suave"
                  type="number"
                  min="0"
                  step="10"
                  inputMode="decimal"
                  placeholder="Máximo"
                  value={precoMax}
                  onChange={(e) => alterar("preco_max", e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5 text-xs text-suave">
            <span>Disponibilidade</span>
            <div className="flex" role="group" aria-label="Disponibilidade">
              {[{ value: "", label: "Todos" }, { value: "sim", label: "Em estoque" }].map((opcao) => (
                <button
                  key={opcao.value || "todos"}
                  type="button"
                  aria-pressed={somenteDisponiveis === (opcao.value === "sim")}
                  onClick={() => alterar("disponivel", opcao.value)}
                  className={cn(
                    "h-10 border px-3 text-xs transition-colors",
                    somenteDisponiveis === (opcao.value === "sim")
                      ? "border-marinho bg-marinho text-creme"
                      : "border-linha text-tinta hover:border-tinta",
                    opcao.value === "sim" ? "border-l-0" : "",
                  )}
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          </div>

          {filtrosAtivos ? (
            <button
              type="button"
              onClick={() => {
                const novo = new URLSearchParams(params);
                ["tamanho", "preco_min", "preco_max", "disponivel"].forEach((chave) => novo.delete(chave));
                setParams(novo);
              }}
              className="h-10 px-1 text-sm text-tinta underline underline-offset-4"
            >
              Limpar filtros
            </button>
          ) : null}
          {!carregando ? (
            <span className="ml-auto text-sm text-suave" aria-live="polite">
              {lista.length} {lista.length === 1 ? "peça" : "peças"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((p, i) => (
          <CartaoProduto
            key={p.sku}
            produto={p}
            grande={semFiltro && i === 0}
            legenda={semFiltro && i === 0 ? p.nota : undefined}
          />
        ))}
      </div>
      {/* Enquanto carrega, a lista ainda está vazia: não é "nada encontrado". */}
      {carregando ? (
        <p className="py-24 text-center font-display text-2xl text-suave">{CARREGANDO}</p>
      ) : lista.length === 0 && !erro ? (
        <p className="py-24 text-center font-display text-2xl text-suave">
          Nada com esse nome nesta edição. Que tal procurar por um tecido — “linho”, “merino”, “couro”?
        </p>
      ) : null}
    </div>
  );
}
