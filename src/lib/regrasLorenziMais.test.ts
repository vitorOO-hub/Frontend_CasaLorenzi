import { describe, expect, it } from "vitest";
import { REGRAS_PADRAO, descontoDosPontos, maximoResgatavel, pontosDaCompra, validarRegras } from "./regrasLorenziMais";

describe("regras do Lorenzi+", () => {
  it("compra rende R$ 1 = 1 ponto na loja e 2 no site, meio arredonda para o par (como o backend)", () => {
    expect(pontosDaCompra(259.9, false)).toBe(260);
    expect(pontosDaCompra(100.5, false)).toBe(100);
    expect(pontosDaCompra(101.5, false)).toBe(102);
    expect(pontosDaCompra(50.25, true)).toBe(100);
    expect(pontosDaCompra(50.75, true)).toBe(102);
    expect(pontosDaCompra(410, true)).toBe(820);
  });

  it("R$ 5 a cada 100 pontos", () => {
    expect(descontoDosPontos(400)).toBe(20);
    expect(descontoDosPontos(0)).toBe(0);
  });

  it("máximo: múltiplo de 100, cabe no saldo e não passa do valor das peças", () => {
    expect(maximoResgatavel(1050, 1000)).toBe(1000);
    expect(maximoResgatavel(20000, 400)).toBe(8000); // R$ 400 em peças
    expect(maximoResgatavel(20000, 399.99)).toBe(7900);
    expect(maximoResgatavel(99, 1000)).toBe(0);
  });

  it("regras do backend (decimal em texto) e padrão quando não vêm", () => {
    expect(validarRegras(undefined)).toEqual(REGRAS_PADRAO);
    expect(
      validarRegras({ reais_a_cada_100_pontos: "5", multiplo_de_resgate: 100, pontos_por_real_loja: 1, pontos_por_real_online: 2 }),
    ).toEqual(REGRAS_PADRAO);
    expect(() => validarRegras({ reais_a_cada_100_pontos: "cinco" })).toThrow();
  });
});
