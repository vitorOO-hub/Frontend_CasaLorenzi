import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./api", () => ({ api: { get, post } }));

import {
  criarConversaGerente,
  listarConversasGerente,
  obterConversaGerente,
  perguntarGerente,
  validarConversaGerente,
  validarMensagemGerente,
} from "./assistenteGerenteApi";

const conversa = {
  id_conversa: "abc-123",
  titulo: "Reposição de linho",
  criada_em: "2026-10-28T12:00:00Z",
  atualizada_em: "2026-10-28T12:01:00Z",
};

describe("assistente do gerente: API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("valida conversa sem status do vendedor e aceita título nulo", () => {
    expect(validarConversaGerente({ ...conversa, titulo: null }).titulo).toBeNull();
    expect(() => validarConversaGerente({ ...conversa, status: "ativa" })).not.toThrow();
  });

  it("valida mensagens do histórico, inclusive modelo nulo", () => {
    expect(validarMensagemGerente({ autor: "assistente", texto: "Tudo certo", criada_em: conversa.criada_em }).modelo).toBeNull();
    expect(() => validarMensagemGerente({ autor: "assistente", texto: "Tudo certo" })).toThrow();
  });

  it("usa a lista direta de conversas do endpoint do gerente", async () => {
    get.mockImplementation((_url, validar) => validar([conversa]));

    await listarConversasGerente();

    expect(get.mock.calls[0]?.[0]).toBe("/api/v1/assistente/gerente/conversas");
    expect(get.mock.results[0]?.value).toEqual([validarConversaGerente(conversa)]);
  });

  it("carrega o histórico pelo recurso da conversa", async () => {
    const historico = { ...conversa, mensagens: [{ autor: "usuario", texto: "Oi", criada_em: conversa.criada_em }] };
    get.mockImplementation((_url, validar) => validar(historico));

    await obterConversaGerente("abc/123");

    expect(get.mock.calls[0]?.[0]).toBe("/api/v1/assistente/gerente/conversas/abc%2F123");
    expect(get.mock.results[0]?.value.mensagens[0]?.texto).toBe("Oi");
  });

  it("cria conversa com objeto vazio e envia texto com timeout maior", async () => {
    post.mockImplementation((_url, validar) => validar(conversa));
    await criarConversaGerente();
    expect(post.mock.calls[0]).toEqual([
      "/api/v1/assistente/gerente/conversas",
      expect.any(Function),
      {},
      undefined,
    ]);

    post.mockImplementation((_url, validar) => validar({ id_conversa: "abc-123", resposta: "Peça abaixo do mínimo", provedor: "groq", modelo: "modelo" }));
    await perguntarGerente("abc-123", "O que precisa de reposição?");
    expect(post.mock.calls[1]).toEqual([
      "/api/v1/assistente/gerente/conversas/abc-123/mensagens",
      expect.any(Function),
      { texto: "O que precisa de reposição?" },
      { timeoutMs: 60_000 },
    ]);
  });
});
