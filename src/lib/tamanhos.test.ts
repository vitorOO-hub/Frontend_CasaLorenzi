import { describe, expect, it } from "vitest";
import { ordenarTamanhos } from "./tamanhos";

describe("ordem dos tamanhos", () => {
  it("letras do menor para o maior (o print mostrava G, GG, M, P)", () => {
    expect(ordenarTamanhos(["G", "GG", "M", "P"])).toEqual(["P", "M", "G", "GG"]);
    expect(ordenarTamanhos(["GG", "PP", "XG", "M"])).toEqual(["PP", "M", "GG", "XG"]);
  });

  it("números em ordem numérica, não alfabética", () => {
    expect(ordenarTamanhos(["100", "90", "95"])).toEqual(["90", "95", "100"]);
    expect(ordenarTamanhos(["41", "37", "39"])).toEqual(["37", "39", "41"]);
  });

  it("lista misturada: letras, números e o tamanho único por último", () => {
    expect(ordenarTamanhos(["U", "41", "G", "37", "P", "100", "M", "90"])).toEqual(["P", "M", "G", "37", "41", "90", "100", "U"]);
    expect(ordenarTamanhos(["Único", "m", "p"])).toEqual(["p", "m", "Único"]);
  });

  it("não altera a lista original", () => {
    const lista = ["G", "P"];
    ordenarTamanhos(lista);
    expect(lista).toEqual(["G", "P"]);
  });
});
