import { describe, expect, it } from "vitest";
import { erroDoCadastro } from "./auth";

describe("erroDoCadastro", () => {
  it("não entrega detalhes técnicos nem confirma e-mail existente", () => {
    expect(erroDoCadastro({ code: "user_already_exists", status: 422 }).message).toMatch(/já tem conta/);
    expect(erroDoCadastro({ message: "Database error saving new user", status: 500 }).message).toMatch(/Confira/);
    expect(erroDoCadastro({ code: "weak_password", status: 422 }).message).toMatch(/8 caracteres/);
    expect(erroDoCadastro({ status: 429 }).message).toMatch(/Muitas tentativas/);
  });
});
