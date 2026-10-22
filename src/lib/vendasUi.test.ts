import { describe, expect, it } from "vitest";
import { adicionarPeca, montarVenda, mudarQuantidade, rotuloDaPeca, totalDePecas, totalDoCarrinho, validarVenda } from "./vendasUi";
import type { PecaNoEstoque } from "./vendasApi";

const peca = (id: string, preco: number, disponivel: number): PecaNoEstoque => ({
  id_variacao: id,
  sku: `SKU-${id}`,
  produto: "Camisa Oxford",
  cor: "Branco",
  tamanho: "M",
  preco_venda: preco,
  disponivel,
});

describe("carrinho da venda em loja", () => {
  it("a peça entra com 1 unidade e repetir soma 1, sem passar do saldo", () => {
    let c = adicionarPeca([], peca("a", 100, 2));
    expect(c[0]!.quantidade).toBe(1);
    c = adicionarPeca(c, peca("a", 100, 2));
    c = adicionarPeca(c, peca("a", 100, 2));
    expect(c).toHaveLength(1);
    expect(c[0]!.quantidade).toBe(2);
  });

  it("peça sem saldo não entra", () => {
    expect(adicionarPeca([], peca("a", 100, 0))).toEqual([]);
  });

  it("a quantidade respeita o saldo e o máximo de 99; zero tira a peça", () => {
    let c = adicionarPeca([], peca("a", 100, 150));
    expect(mudarQuantidade(c, "a", 500)[0]!.quantidade).toBe(99);
    c = adicionarPeca([], peca("b", 10, 3));
    expect(mudarQuantidade(c, "b", 9)[0]!.quantidade).toBe(3);
    expect(mudarQuantidade(c, "b", 2.7)[0]!.quantidade).toBe(2);
    expect(mudarQuantidade(c, "b", 0)).toEqual([]);
    expect(mudarQuantidade(c, "b", Number.NaN)).toEqual([]);
  });

  it("soma em centavos sem erro de ponto flutuante", () => {
    const c = mudarQuantidade(adicionarPeca(adicionarPeca([], peca("a", 0.1, 5)), peca("b", 0.2, 5)), "a", 3);
    expect(totalDoCarrinho(c)).toBe(0.5);
    expect(totalDePecas(c)).toBe(4);
    expect(totalDoCarrinho([])).toBe(0);
  });

  it("exige cliente, ao menos uma peça e forma de pagamento", () => {
    expect(validarVenda(null, [], "")).toEqual({
      cliente: "Busque o cliente pelo CPF.",
      itens: "Adicione ao menos uma peça.",
      pagamento: "Escolha a forma de pagamento.",
    });
    const c = adicionarPeca([], peca("a", 100, 2));
    expect(validarVenda("cliente-1", c, "pix")).toEqual({});
  });

  it("monta o corpo só com o que o servidor aceita (nada de loja, vendedor nem preço)", () => {
    const c = mudarQuantidade(adicionarPeca([], peca("a", 100, 5)), "a", 2);
    expect(montarVenda("529.982.247-25", c, "pix")).toEqual({
      cpf: "529.982.247-25",
      metodo_pagamento: "pix",
      itens: [{ id_variacao: "a", quantidade: 2 }],
    });
  });

  it("descreve a peça sem sobras quando falta cor ou tamanho", () => {
    expect(rotuloDaPeca({ produto: "Bolsa", cor: null, tamanho: "U" })).toBe("Bolsa · U");
  });
});
