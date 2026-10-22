import { produtoTemEstoque, type Produto } from "@/lib/dados";

export type FiltrosCatalogo = {
  tamanho?: string;
  precoMin?: number | null;
  precoMax?: number | null;
  somenteDisponiveis?: boolean;
};

export function tamanhosDoCatalogo(produtos: Produto[]) {
  return Array.from(new Set(produtos.flatMap((produto) => produto.variacoes?.map((variacao) => variacao.tamanho) ?? [])))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
}

export function filtrarProdutosCatalogo(produtos: Produto[], filtros: FiltrosCatalogo) {
  return produtos.filter((produto) => {
    if (filtros.tamanho && !produto.variacoes?.some((variacao) => variacao.tamanho === filtros.tamanho)) return false;
    if (filtros.precoMin != null && Number.isFinite(filtros.precoMin) && produto.preco < filtros.precoMin) return false;
    if (filtros.precoMax != null && Number.isFinite(filtros.precoMax) && produto.preco > filtros.precoMax) return false;
    if (filtros.somenteDisponiveis && !produtoTemEstoque(produto)) return false;
    return true;
  });
}
