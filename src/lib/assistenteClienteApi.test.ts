import { afterEach, describe, expect, it, vi } from "vitest";
import { validarConversaAssistente, validarRespostaAssistente } from "./assistenteClienteApi";
import { esquecerConversa, guardarConversa, lerConversaGuardada } from "./assistenteConversa";

describe("assistente do cliente: respostas da API", () => {
  it("valida a resposta e mantém os sinais de sacola e de chamado", () => {
    const r = validarRespostaAssistente({
      id_conversa: "c1",
      status: "com_atendente",
      resposta: "Passei para a equipe.",
      sem_resposta: false,
      carrinho_alterado: true,
      id_atendimento: "a1",
      modelo: "nao deveria passar",
    });
    expect(r).toEqual({
      id_conversa: "c1",
      status: "com_atendente",
      resposta: "Passei para a equipe.",
      sem_resposta: false,
      carrinho_alterado: true,
      id_atendimento: "a1",
    });
  });

  it("recusa status ou autor fora do combinado", () => {
    const base = { id_conversa: "c1", resposta: "x", sem_resposta: false, carrinho_alterado: false, id_atendimento: null };
    expect(() => validarRespostaAssistente({ ...base, status: "encerrada" })).toThrow();
    expect(() =>
      validarConversaAssistente({
        id_conversa: "c1",
        status: "ativa",
        id_atendimento: null,
        criada_em: "2026-10-27T10:00:00Z",
        mensagens: [{ autor: "ferramenta", texto: "{}", criada_em: "2026-10-27T10:00:00Z" }],
      }),
    ).toThrow();
  });

  it("valida a conversa retomada", () => {
    const c = validarConversaAssistente({
      id_conversa: "c1",
      status: "ativa",
      id_atendimento: null,
      criada_em: "2026-10-27T10:00:00Z",
      mensagens: [
        { autor: "usuario", texto: "oi", criada_em: "2026-10-27T10:00:00Z" },
        { autor: "assistente", texto: "Olá!", criada_em: "2026-10-27T10:00:01Z" },
      ],
    });
    expect(c.mensagens.map((m) => m.autor)).toEqual(["usuario", "assistente"]);
  });
});

describe("assistente do cliente: conversa guardada na aba", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("guarda por cliente e esquece", () => {
    const dados = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, v),
      removeItem: (k: string) => void dados.delete(k),
    });
    guardarConversa("cliente-a", "conversa-1");
    expect(lerConversaGuardada("cliente-a")).toBe("conversa-1");
    expect(lerConversaGuardada("cliente-b")).toBeNull();
    esquecerConversa("cliente-a");
    expect(lerConversaGuardada("cliente-a")).toBeNull();
  });

  it("sem armazenamento (aba anônima, bloqueado) não quebra", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    });
    expect(() => guardarConversa("c", "x")).not.toThrow();
    expect(lerConversaGuardada("c")).toBeNull();
    expect(() => esquecerConversa("c")).not.toThrow();
  });
});
