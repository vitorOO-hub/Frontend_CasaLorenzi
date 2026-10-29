import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./api", () => ({ api: { get, post } }));

import {
  criarConversaAdmin,
  listarConversasAdmin,
  obterConversaAdmin,
  perguntarAdmin,
  validarConversaAdmin,
  validarMensagemAdmin,
} from "./assistenteAdminApi";

const conversa = {
  id_conversa: "admin-123",
  titulo: "Resumo da rede",
  criada_em: "2026-10-28T12:00:00Z",
  atualizada_em: "2026-10-28T12:01:00Z",
};

describe("assistente do admin: API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("valida conversa administrativa e aceita título nulo", () => {
    expect(validarConversaAdmin({ ...conversa, titulo: null }).titulo).toBeNull();
  });

  it("valida mensagem do histórico e aceita modelo nulo", () => {
    expect(validarMensagemAdmin({ autor: "assistente", texto: "Tudo certo", criada_em: conversa.criada_em }).modelo).toBeNull();
    expect(() => validarMensagemAdmin({ autor: "assistente", texto: "Tudo certo" })).toThrow();
  });

  it("usa a lista direta de conversas do endpoint administrativo", async () => {
    get.mockImplementation((_url, validar) => validar([conversa]));
    await listarConversasAdmin();
    expect(get.mock.calls[0]?.[0]).toBe("/api/v1/assistente/conversas");
    expect(get.mock.results[0]?.value).toEqual([validarConversaAdmin(conversa)]);
  });

  it("carrega o histórico pelo recurso da conversa", async () => {
    get.mockImplementation((_url, validar) => validar({ ...conversa, mensagens: [{ autor: "usuario", texto: "Oi", criada_em: conversa.criada_em }] }));
    await obterConversaAdmin("admin/123");
    expect(get.mock.calls[0]?.[0]).toBe("/api/v1/assistente/conversas/admin%2F123");
    expect(get.mock.results[0]?.value.mensagens[0]?.texto).toBe("Oi");
  });

  it("cria conversa vazia e envia pergunta com timeout ampliado", async () => {
    post.mockImplementation((_url, validar) => validar(conversa));
    await criarConversaAdmin();
    expect(post.mock.calls[0]).toEqual(["/api/v1/assistente/conversas", expect.any(Function), {}, undefined]);

    post.mockImplementation((_url, validar) => validar({ id_conversa: conversa.id_conversa, resposta: "Resumo confirmado", provedor: "groq", modelo: "modelo" }));
    await perguntarAdmin(conversa.id_conversa, "Como estão as lojas?");
    expect(post.mock.calls[1]).toEqual([
      "/api/v1/assistente/conversas/admin-123/mensagens",
      expect.any(Function),
      { texto: "Como estão as lojas?" },
      { timeoutMs: 60_000 },
    ]);
  });
});
