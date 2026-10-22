import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("./api", () => ({ api }));

import { ativarConta, ATIVACAO_VAZIA, consultarAtivacao, validarAtivacao, validarConsulta, validarCpfDaAtivacao, validarResultado } from "./ativarConta";

const ok = { cpf: "529.982.247-25", senha: "senha1234", confirmar: "senha1234", email: "" };

beforeEach(() => vi.clearAllMocks());

describe("ativação de conta", () => {
  it("o CPF é obrigatório e precisa ser válido", () => {
    expect(validarCpfDaAtivacao("")).toBe("Informe seu CPF.");
    expect(validarCpfDaAtivacao("111.111.111-11")).toBe("Confira o CPF.");
    expect(validarCpfDaAtivacao("529.982.247-25")).toBeNull();
  });

  it("aceita senha e confirmação quando o cadastro já tem e-mail", () => {
    expect(validarAtivacao(ok, false)).toEqual({});
  });

  it("segue a regra de senha do cadastro e exige a confirmação igual", () => {
    expect(validarAtivacao({ ...ok, senha: "curta1", confirmar: "curta1" }, false).senha).toMatch(/pelo menos 8/);
    expect(validarAtivacao({ ...ok, senha: "somenteletras", confirmar: "somenteletras" }, false).senha).toMatch(/letras e números/);
    expect(validarAtivacao({ ...ok, confirmar: "outra1234" }, false).confirmar).toBe("As senhas não são iguais.");
  });

  it("só exige o e-mail quando o cadastro não tem", () => {
    expect(validarAtivacao(ok, false).email).toBeUndefined();
    expect(validarAtivacao(ok, true).email).toBe("Informe um e-mail válido.");
    expect(validarAtivacao({ ...ok, email: "ana@exemplo.com" }, true)).toEqual({});
  });

  it("valida o formato das respostas do servidor", () => {
    expect(validarConsulta({ pede_email: true })).toEqual({ pede_email: true });
    expect(() => validarConsulta({ pede_email: "sim" })).toThrow();
    expect(validarResultado({ email: "j***@gmail.com" })).toEqual({ email: "j***@gmail.com" });
    expect(() => validarResultado({})).toThrow();
  });

  it("consulta e ativa pelas rotas públicas, sem token, com o CPF só em dígitos", async () => {
    api.post.mockResolvedValue({});
    await consultarAtivacao("529.982.247-25");
    expect(api.post).toHaveBeenCalledWith("/api/v1/ativacao-conta/consultar", expect.any(Function), { cpf: "52998224725" }, { semToken: true });

    await ativarConta(ok, false);
    expect(api.post).toHaveBeenLastCalledWith(
      "/api/v1/ativacao-conta",
      expect.any(Function),
      { cpf: "52998224725", senha: "senha1234" },
      { semToken: true },
    );
  });

  it("manda o e-mail em minúsculas só quando a tela o pediu", async () => {
    api.post.mockResolvedValue({});
    await ativarConta({ ...ATIVACAO_VAZIA, ...ok, email: " Ana@Exemplo.COM " }, true);
    expect(api.post.mock.calls[0][2]).toEqual({ cpf: "52998224725", senha: "senha1234", email: "ana@exemplo.com" });
    await ativarConta({ ...ok, email: "ignorado@x.com" }, false);
    expect(api.post.mock.calls[1][2]).not.toHaveProperty("email");
  });
});
