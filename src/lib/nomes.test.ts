import { describe, expect, it } from "vitest";
import { nomeDeVitrine } from "./nomes";

describe("nome da peça na vitrine", () => {
  it("maiúscula em cada palavra, preposições minúsculas", () => {
    expect(nomeDeVitrine("bermuda cargo utilitária")).toBe("Bermuda Cargo Utilitária");
    expect(nomeDeVitrine("meia cano alto (par) básico")).toBe("Meia Cano Alto (par) Básico");
    expect(nomeDeVitrine("calça de linho com pregas")).toBe("Calça de Linho com Pregas");
    expect(nomeDeVitrine("de volta")).toBe("De Volta");
  });

  it("mantém siglas e maiúsculas que já vêm no meio", () => {
    expect(nomeDeVitrine("camiseta T-Shirt PP")).toBe("Camiseta T-Shirt PP");
    expect(nomeDeVitrine("  ")).toBe("");
  });
});
