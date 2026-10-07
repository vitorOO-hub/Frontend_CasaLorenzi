import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessaoDoToken } from "./auth";
import { config } from "./config";
import { ErroApi, erroDaResposta } from "./erros";
import { definirFonteToken, requisitar } from "./http";
import { prioridadeInicial, statusEstoque } from "./tipos";

/** JWT de teste (sem assinatura válida: o front só lê as claims). */
const jwt = (claims: object) =>
  `x.${btoa(JSON.stringify(claims)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}.y`;

const resposta = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? "" : JSON.stringify(corpo), { status });

describe("erros da API", () => {
  it("cada status vira um código estável", () => {
    expect(erroDaResposta(401, null).codigo).toBe("nao_autenticado");
    expect(erroDaResposta(403, null).codigo).toBe("sem_permissao");
    expect(erroDaResposta(404, null).codigo).toBe("nao_encontrado");
    expect(erroDaResposta(409, null).codigo).toBe("conflito");
    expect(erroDaResposta(422, null).codigo).toBe("validacao");
    expect(erroDaResposta(429, null).codigo).toBe("limite");
  });

  it("usa a mensagem em português do backend nos erros de domínio", () => {
    const e = erroDaResposta(409, { detail: "Este ajuste já foi decidido." });
    expect(e.message).toBe("Este ajuste já foi decidido.");
  });

  it("lista os campos recusados pelo Pydantic", () => {
    const e = erroDaResposta(422, { detail: [{ loc: ["body", "motivo"], msg: "muito curto" }] });
    expect(e.campos).toEqual([{ campo: "motivo", mensagem: "muito curto" }]);
  });

  it("não mostra o texto do servidor em erro 500", () => {
    const e = erroDaResposta(500, { detail: "asyncpg.exceptions.UniqueViolationError" });
    expect(e.message).not.toContain("asyncpg");
  });
});

describe("cliente HTTP do FastAPI", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    config.apiUrl = "http://api.teste";
    vi.stubGlobal("fetch", fetchMock);
    definirFonteToken({ obter: async () => "token-velho", renovar: async () => "token-novo" });
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("chama /api/v1 com Bearer e Idempotency-Key", async () => {
    fetchMock.mockResolvedValueOnce(resposta(201, { codigo: "PD-10501" }));
    const r = await requisitar<{ codigo: string }>("POST", "/pedidos", { corpo: { itens: [] }, idempotencia: "chave-1" });
    expect(r.codigo).toBe("PD-10501");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.teste/api/v1/pedidos");
    const headers = init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-velho");
    expect(headers["Idempotency-Key"]).toBe("chave-1");
  });

  it("renova o token uma vez quando recebe 401", async () => {
    fetchMock.mockResolvedValueOnce(resposta(401)).mockResolvedValueOnce(resposta(200, { ok: true }));
    await requisitar("GET", "/dashboard");
    const segunda = fetchMock.mock.calls[1]![1]!.headers as Record<string, string>;
    expect(segunda.Authorization).toBe("Bearer token-novo");
  });

  it("transforma 409 em ErroApi de conflito", async () => {
    fetchMock.mockResolvedValueOnce(resposta(409, { detail: "Outro atendente já assumiu este chamado." }));
    const erro = await requisitar("POST", "/chamados/7/assumir").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).codigo).toBe("conflito");
    expect((erro as ErroApi).message).toBe("Outro atendente já assumiu este chamado.");
  });

  it("falha de rede vira erro de rede", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const erro = await requisitar("GET", "/dashboard").catch((e: unknown) => e);
    expect((erro as ErroApi).codigo).toBe("rede");
  });
});

describe("sessão a partir do JWT do Supabase", () => {
  it("usuário interno traz papel e loja nas claims", () => {
    const s = sessaoDoToken(jwt({ sub: "u-1", email: "m@x.com", exp: 1, papel: "gerente_loja", loja_id: 1 }));
    expect(s).toEqual({ tipo: "interno", id: "u-1", email: "m@x.com", papel: "gerente_loja", idLoja: 1 });
  });

  it("sem papel é cliente; papel desconhecido não vira acesso interno", () => {
    expect(sessaoDoToken(jwt({ sub: "c-1", exp: 1 })).tipo).toBe("cliente");
    expect(sessaoDoToken(jwt({ sub: "c-2", exp: 1, papel: "superusuario" })).tipo).toBe("cliente");
  });
});

describe("regras espelhadas do backend", () => {
  it("status do estoque é derivado do saldo e do mínimo", () => {
    expect(statusEstoque(0, 4)).toBe("Esgotado");
    expect(statusEstoque(4, 4)).toBe("Estoque baixo");
    expect(statusEstoque(5, 4)).toBe("OK");
  });

  it("prioridade inicial vem do motivo", () => {
    expect(prioridadeInicial.Defeito).toBe("Alta");
    expect(prioridadeInicial.Troca).toBe("Média");
    expect(prioridadeInicial.Entrega).toBe("Média");
    expect(prioridadeInicial.Dúvida).toBe("Baixa");
  });
});
