import { describe, expect, it } from "vitest";
import { horarioDasLinhas, linhasDoHorario, resumoHorario, validarHorario } from "./horarioLoja";

const SHOPPING = {
  seg: { abre: "10:00", fecha: "22:00" },
  ter: { abre: "10:00", fecha: "22:00" },
  qua: { abre: "10:00", fecha: "22:00" },
  qui: { abre: "10:00", fecha: "22:00" },
  sex: { abre: "10:00", fecha: "22:00" },
  sab: { abre: "10:00", fecha: "18:00" },
  dom: null,
};

describe("horário da loja", () => {
  it("valida a resposta da API e trata dia ausente como fechado", () => {
    const h = validarHorario({ seg: { abre: "09:00", fecha: "18:00" } });
    expect(h?.seg).toEqual({ abre: "09:00", fecha: "18:00" });
    expect(h?.dom).toBeNull();
    expect(validarHorario(null)).toBeNull();
    expect(() => validarHorario({ seg: { abre: "9h", fecha: "18:00" } })).toThrow();
  });

  it("resume juntando dias seguidos com o mesmo horário", () => {
    expect(resumoHorario(validarHorario(SHOPPING))).toBe("Seg a Sex 10:00–22:00 · Sáb 10:00–18:00 · Dom fechada");
    expect(resumoHorario(null)).toBe("Horário não cadastrado");
  });

  it("vai e volta pelo formulário", () => {
    const linhas = linhasDoHorario(validarHorario(SHOPPING));
    expect(linhas.find((l) => l.dia === "dom")?.aberta).toBe(false);
    expect(horarioDasLinhas(linhas)).toEqual({ horario: SHOPPING });
  });

  it("recusa fechar antes de abrir", () => {
    const linhas = linhasDoHorario(null).map((l) => (l.dia === "seg" ? { ...l, aberta: true, abre: "22:00", fecha: "10:00" } : l));
    expect(horarioDasLinhas(linhas)).toEqual({ erro: "Segunda: o horário de fechar precisa ser depois do de abrir." });
  });
});
