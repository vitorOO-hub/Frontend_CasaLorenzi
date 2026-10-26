import { describe, expect, it } from "vitest";
import { validarSenhaEquipe } from "./senhaEquipe";

describe("validarSenhaEquipe", () => {
  it("exige comprimento mínimo, letras e números", () => {
    expect(validarSenhaEquipe("curta1", "curta1")).toMatch(/8 caracteres/);
    expect(validarSenhaEquipe("somenteletras", "somenteletras")).toMatch(/letras e números/);
    expect(validarSenhaEquipe("12345678", "12345678")).toMatch(/letras e números/);
  });

  it("exige confirmação igual e aceita uma senha válida", () => {
    expect(validarSenhaEquipe("senha1234", "senha5678")).toMatch(/não coincidem/);
    expect(validarSenhaEquipe("senha1234", "senha1234")).toBeNull();
  });
});
