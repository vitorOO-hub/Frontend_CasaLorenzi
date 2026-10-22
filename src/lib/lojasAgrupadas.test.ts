import { describe, expect, it } from "vitest";
import { grupoDaLoja, nomeDaLoja, opcoesDeLojas } from "./lojasAgrupadas";

const lojas = [
  "vulto pinheiros",
  "e-commerce casa lorenzi",
  "casa lorenzi savassi",
  "cd cajamar",
  "vulto app",
  "casa lorenzi barra",
  "vulto e-commerce",
  "vulto savassi",
].map((nome, i) => ({ id_loja: `l-${i}`, nome }));

describe("lojas agrupadas", () => {
  it("separa por marca; o e-commerce é das duas e os canais antigos da Vulto ficam à parte", () => {
    expect(grupoDaLoja("casa lorenzi centro")).toBe("Casa Lorenzi");
    expect(grupoDaLoja("vulto batel")).toBe("Vulto");
    expect(grupoDaLoja("e-commerce casa lorenzi")).toBe("Online · as duas marcas");
    expect(grupoDaLoja("E-commerce Casa Lorenzi")).toBe("Online · as duas marcas");
    expect(grupoDaLoja("vulto app")).toBe("Vulto · canais antigos");
    expect(grupoDaLoja("cd cajamar")).toBe("Centro de distribuição");
  });

  it("nome com maiúsculas e siglas", () => {
    expect(nomeDaLoja("casa lorenzi barra")).toBe("Casa Lorenzi Barra");
    expect(nomeDaLoja("cd cajamar")).toBe("CD Cajamar");
    expect(nomeDaLoja("e-commerce casa lorenzi")).toBe("E-commerce Casa Lorenzi");
    expect(nomeDaLoja("Loja Já Escrita")).toBe("Loja Já Escrita");
  });

  it("opções em ordem de grupo, com 'Todas' no topo", () => {
    const o = opcoesDeLojas(lojas, "Todas");
    expect(o[0]).toEqual({ value: "", label: "Todas" });
    expect(o.slice(1).map((x) => x.label)).toEqual([
      "Casa Lorenzi Barra",
      "Casa Lorenzi Savassi",
      "Vulto Pinheiros",
      "Vulto Savassi",
      "E-commerce Casa Lorenzi",
      "CD Cajamar",
      "Vulto App",
      "Vulto E-commerce",
    ]);
    expect(o[1]!.grupo).toBe("Casa Lorenzi");
  });
});
