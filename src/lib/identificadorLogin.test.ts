import { describe, expect, it } from "vitest";
import { tipoDoIdentificador } from "./sessao";

describe("login por e-mail ou CPF", () => {
  it("o mesmo campo aceita e-mail ou CPF", () => {
    expect(tipoDoIdentificador("cliente@teste.com")).toBe("email");
    expect(tipoDoIdentificador("529.982.247-25")).toBe("cpf");
    expect(tipoDoIdentificador("52998224725")).toBe("cpf");
    expect(tipoDoIdentificador("5299822")).toBeNull();
    expect(tipoDoIdentificador("fulano")).toBeNull();
  });
});
