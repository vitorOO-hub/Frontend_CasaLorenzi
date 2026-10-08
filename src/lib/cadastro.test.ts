import { describe, expect, it } from "vitest";
import { dadosDoCadastro, FORM_VAZIO, formatarCep, formatarTelefone, validarCadastro } from "./cadastro";

const ok = {
  nome: " Helena Souza ",
  email: " Helena@Exemplo.com ",
  telefone: "(11) 99999-0001",
  senha: "senha1234",
  cep: "01001-000",
  rua: "Rua das Flores",
  bairro: "Centro",
  numero: "120",
  complemento: " ",
};

describe("cadastro de cliente", () => {
  it("aceita o formulário completo e normaliza os dados enviados", () => {
    expect(validarCadastro(ok)).toEqual({});
    expect(dadosDoCadastro(ok)).toMatchObject({
      nome: "Helena Souza",
      email: "helena@exemplo.com",
      telefone: "11999990001",
      cep: "01001000",
      complemento: undefined,
    });
  });

  it("exige nome, e-mail, telefone, senha, CEP, rua, bairro e número", () => {
    expect(Object.keys(validarCadastro(FORM_VAZIO)).sort()).toEqual([
      "bairro",
      "cep",
      "email",
      "nome",
      "numero",
      "rua",
      "senha",
      "telefone",
    ]);
  });

  it("complemento é opcional; CEP e senha seguem as regras do banco e do Auth", () => {
    expect(validarCadastro({ ...ok, cep: "0100100" }).cep).toBeDefined();
    expect(validarCadastro({ ...ok, senha: "curta1" }).senha).toBeDefined();
    expect(validarCadastro({ ...ok, senha: "somenteletras" }).senha).toBeDefined();
    expect(validarCadastro({ ...ok, rua: "   " }).rua).toBeDefined();
  });

  it("formata CEP e telefone enquanto digita", () => {
    expect(formatarCep("01001000")).toBe("01001-000");
    expect(formatarTelefone("11999990001")).toBe("(11) 99999-0001");
    expect(formatarTelefone("1133334444")).toBe("(11) 3333-4444");
  });
});
