import { describe, expect, it } from "vitest";
import { dadosDoCadastro, ENDERECO_VAZIO, FORM_VAZIO, formatarCep, formatarTelefone, preencherComCadastro, ufDoCep, validarCadastro } from "./cadastro";

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

describe("endereço do cadastro no checkout", () => {
  const perfil = { cep: "01001000", rua: "Rua das Flores", bairro: "Centro", numero_endereco: "120", complemento: "Ap 4" };

  it("preenche tudo com o endereço do cadastro, com CEP formatado e estado pelo CEP", () => {
    expect(preencherComCadastro(ENDERECO_VAZIO, perfil)).toEqual({
      cep: "01001-000",
      rua: "Rua das Flores",
      bairro: "Centro",
      numero: "120",
      complemento: "Ap 4",
      uf: "SP",
    });
    expect(preencherComCadastro(ENDERECO_VAZIO, { ...perfil, cep: "30130010" }).uf).toBe("MG");
  });

  it("não sobrescreve o que a pessoa já digitou", () => {
    const digitado = { ...ENDERECO_VAZIO, rua: "Av. Outra", cep: "20040020", uf: "RJ" };
    const r = preencherComCadastro(digitado, perfil);
    expect(r.rua).toBe("Av. Outra");
    expect(r.cep).toBe("20040020");
    expect(r.uf).toBe("RJ");
    expect(r.bairro).toBe("Centro"); // o que estava vazio recebe o do cadastro
  });

  it("conta antiga sem endereço deixa o formulário em branco", () => {
    const vazio = { cep: null, rua: null, bairro: null, numero_endereco: null, complemento: null };
    expect(preencherComCadastro(ENDERECO_VAZIO, vazio)).toEqual(ENDERECO_VAZIO);
  });

  it("estado pelo CEP: faixas conhecidas e CEP incompleto", () => {
    expect(ufDoCep("70040-010")).toBe("DF");
    expect(ufDoCep("90010-000")).toBe("RS");
    expect(ufDoCep("123")).toBeUndefined();
  });
});
