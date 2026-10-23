import { describe, expect, it } from "vitest";
import type { Produto } from "@/lib/dados";
import { filtrarProdutosCatalogo, tamanhosDoCatalogo } from "./filtrosCatalogo";

const produtos: Produto[] = [
  {
    sku: "CAM-1",
    nome: "Camisa",
    categoria: "Camisaria",
    preco: 300,
    saldos: [],
    movimentacoes: [],
    variacoes: [
      { sku: "CAM-1-P", cor: "Branca", tamanho: "P", preco: 300, estoque: [{ lojaId: "l1", loja: "Pinheiros", quantidade: 2 }] },
      { sku: "CAM-1-M", cor: "Branca", tamanho: "M", preco: 300, estoque: [{ lojaId: "l1", loja: "Pinheiros", quantidade: 0 }] },
    ],
  },
  {
    sku: "CAL-1",
    nome: "Calça",
    categoria: "Calças",
    preco: 500,
    saldos: [],
    movimentacoes: [],
    variacoes: [{ sku: "CAL-1-42", cor: "Preta", tamanho: "42", preco: 500, estoque: [] }],
  },
];

describe("filtros do catálogo", () => {
  it("lista tamanhos distintos do menor para o maior: letras e depois números", () => {
    expect(tamanhosDoCatalogo(produtos)).toEqual(["P", "M", "42"]);
  });

  it("mantém produtos que possuem a variação do tamanho", () => {
    expect(filtrarProdutosCatalogo(produtos, { tamanho: "M" }).map((produto) => produto.sku)).toEqual(["CAM-1"]);
  });

  it("aplica limites de preço inclusivos", () => {
    expect(filtrarProdutosCatalogo(produtos, { precoMin: 300, precoMax: 300 }).map((produto) => produto.sku)).toEqual(["CAM-1"]);
  });

  it("considera disponível apenas produto com saldo positivo agregado", () => {
    expect(filtrarProdutosCatalogo(produtos, { somenteDisponiveis: true }).map((produto) => produto.sku)).toEqual(["CAM-1"]);
  });

  it("combina tamanho, faixa e disponibilidade", () => {
    expect(filtrarProdutosCatalogo(produtos, { tamanho: "P", precoMin: 250, precoMax: 350, somenteDisponiveis: true }).map((produto) => produto.sku)).toEqual(["CAM-1"]);
  });
});
