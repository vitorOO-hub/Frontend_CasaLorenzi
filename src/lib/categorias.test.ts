import { describe, expect, it } from "vitest";
import { categoriasUnicas, chaveDaCategoria, mesmaCategoria, rotuloDaCategoria } from "./categorias";

describe("categorias sem duplicar", () => {
  it("acento e maiúsculas não separam a categoria", () => {
    expect(mesmaCategoria("calca", "Calça")).toBe(true);
    expect(mesmaCategoria("trico", "tricô")).toBe(true);
    expect(mesmaCategoria("camisa", "camiseta")).toBe(false);
    expect(chaveDaCategoria("  Acessório ")).toBe("acessorio");
  });

  it("uma entrada por categoria, na forma acentuada e com maiúscula na tela", () => {
    const r = categoriasUnicas(["calca", "calça", "Calça", "trico", "tricô", "acessorio", "acessório", "camisa", "", null]);
    expect(r).toEqual([
      { valor: "acessório", rotulo: "Acessório" },
      { valor: "calça", rotulo: "Calça" },
      { valor: "camisa", rotulo: "Camisa" },
      { valor: "tricô", rotulo: "Tricô" },
    ]);
  });

  it("rótulo de uma categoria", () => {
    expect(rotuloDaCategoria("outerwear")).toBe("Outerwear");
    expect(rotuloDaCategoria("")).toBe("");
  });
});
