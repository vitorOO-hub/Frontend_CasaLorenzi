import { api } from "@/api/http";
import { falha, lista, numero, objeto, texto, textoOuNulo } from "./validacao";

export type ItemCarrinhoClienteApi = {
  id_carrinho: string;
  id_variacao: string;
  sku: string;
  produto: string;
  imagem_url: string | null;
  imagem_alt: string | null;
  tecido: string | null;
  cor: string;
  tamanho: string;
  quantidade: number;
  preco_unitario: string;
  valor_total: string;
};

export type CarrinhoClienteApi = {
  itens: ItemCarrinhoClienteApi[];
  subtotal: string;
};

function decimal(valor: unknown, campo: string): string {
  if (typeof valor === "string" && valor.trim()) return valor;
  if (typeof valor === "number" && Number.isFinite(valor)) return valor.toFixed(2);
  return falha(campo);
}

function validarItemCarrinho(dados: unknown): ItemCarrinhoClienteApi {
  const o = objeto(dados, "item_carrinho");
  return {
    id_carrinho: texto(o.id_carrinho, "id_carrinho"),
    id_variacao: texto(o.id_variacao, "id_variacao"),
    sku: texto(o.sku, "sku"),
    produto: texto(o.produto, "produto"),
    imagem_url: textoOuNulo(o.imagem_url, "imagem_url"),
    imagem_alt: textoOuNulo(o.imagem_alt, "imagem_alt"),
    tecido: textoOuNulo(o.tecido, "tecido"),
    cor: texto(o.cor, "cor"),
    tamanho: texto(o.tamanho, "tamanho"),
    quantidade: numero(o.quantidade, "quantidade"),
    preco_unitario: decimal(o.preco_unitario, "preco_unitario"),
    valor_total: decimal(o.valor_total, "valor_total"),
  };
}

export function validarCarrinhoCliente(dados: unknown): CarrinhoClienteApi {
  const o = objeto(dados, "carrinho");
  return {
    itens: lista(o.itens, "itens").map(validarItemCarrinho),
    subtotal: decimal(o.subtotal, "subtotal"),
  };
}

export const obterCarrinhoCliente = async () =>
  validarCarrinhoCliente(await api.get<unknown>("/cliente/carrinho"));

export const adicionarItemCarrinhoCliente = async (dados: { id_variacao: string; quantidade: number }) =>
  validarCarrinhoCliente(await api.post<unknown>("/cliente/carrinho/itens", dados));

export const atualizarItemCarrinhoCliente = async (idVariacao: string, quantidade: number) =>
  validarCarrinhoCliente(await api.patch<unknown>(`/cliente/carrinho/itens/${idVariacao}`, { quantidade }));

export const removerItemCarrinhoCliente = async (idVariacao: string) =>
  validarCarrinhoCliente(await api.delete<unknown>(`/cliente/carrinho/itens/${idVariacao}`));

export const limparCarrinhoCliente = async () =>
  validarCarrinhoCliente(await api.delete<unknown>("/cliente/carrinho"));
