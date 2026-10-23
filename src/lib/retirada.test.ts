import { describe, expect, it } from "vitest";
import type { Produto } from "./dados";
import { lojaFisica, temTudo } from "./retirada";
import type { ItemCarrinho } from "./store";

const produto = (sku: string, idVariacao: string, estoque: Record<string, number>): Produto => ({
  sku,
  nome: sku,
  categoria: "camisa",
  preco: 100,
  saldos: [],
  movimentacoes: [],
  variacoes: [
    { idVariacao, sku, cor: "azul", tamanho: "M", preco: 100, estoque: Object.entries(estoque).map(([lojaId, quantidade]) => ({ lojaId, loja: lojaId, quantidade })) },
  ],
});
const item = (sku: string, idVariacao: string, quantidade: number) =>
  ({ sku, idVariacao, quantidade, nome: sku, valor: 100, skuBase: sku, tamanho: "M", cor: "azul" }) as unknown as ItemCarrinho;

describe("retirada na loja", () => {
  it("só lojas físicas das duas marcas, sem e-commerce, CD, canais antigos nem lojas genéricas", () => {
    expect(["casa lorenzi barra", "vulto pinheiros"].every(lojaFisica)).toBe(true);
    expect(["e-commerce casa lorenzi", "cd cajamar", "vulto app", "vulto e-commerce", "casa lorenzi", "vulto"].some(lojaFisica)).toBe(false);
  });

  it("a loja precisa ter todas as peças na quantidade pedida", () => {
    const produtos = [produto("A", "va", { barra: 2, centro: 1 }), produto("B", "vb", { barra: 1 })];
    const sacola = [item("A", "va", 2), item("B", "vb", 1)];
    expect(temTudo("barra", sacola, produtos)).toBe(true);
    expect(temTudo("centro", sacola, produtos)).toBe(false); // falta A e falta B
    expect(temTudo("barra", [item("A", "va", 3)], produtos)).toBe(false);
  });
});
