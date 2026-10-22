import { describe, expect, it } from "vitest";
import { validarEvolucaoMarcas, validarMarcas } from "@/lib/gerenciaApi";
import { nomeDaMarca, seriesPorMarca } from "./marcas";

describe("vendas por marca", () => {
  it("monta uma série por marca, mês a mês, com zero no mês sem venda", () => {
    const { rotulos, series } = seriesPorMarca([
      { mes: "2025-11-01", marca: "vulto", faturamento: 100 },
      { mes: "2025-12-01", marca: "vulto", faturamento: 200 },
      { mes: "2025-12-01", marca: "casa lorenzi", faturamento: 50 },
    ]);
    expect(rotulos).toEqual(["nov/25", "dez/25"]);
    expect(series.map((s) => [s.nome, s.valores])).toEqual([
      ["Casa Lorenzi", [0, 50]],
      ["Vulto", [100, 200]],
    ]);
  });

  it("nome da marca vem com maiúsculas", () => {
    expect(nomeDaMarca("casa lorenzi")).toBe("Casa Lorenzi");
  });

  it("API anterior, sem os campos, vira lista vazia; campo presente é validado", () => {
    expect(validarMarcas(undefined)).toEqual([]);
    expect(validarEvolucaoMarcas(undefined)).toEqual([]);
    expect(() => validarMarcas([{ marca: "vulto", faturamento: "x" }])).toThrow();
  });
});
