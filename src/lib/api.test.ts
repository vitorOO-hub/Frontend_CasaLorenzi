import { describe, expect, it, vi } from "vitest";
import { ErroApi } from "@/api/erros";
import { criarClienteApi } from "./api";

const json = (corpo: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(corpo), { status: 200, headers: { "Content-Type": "application/json" }, ...init });

function montar(
  respostas: (Response | Error)[],
  opcoes: { token?: string | null; renovado?: string | null } = {},
) {
  const buscar = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    const proxima = respostas.shift();
    if (!proxima) throw new Error("sem resposta combinada");
    if (proxima instanceof Error) throw proxima;
    return proxima;
  });
  const renovarToken = vi.fn(async () => (opcoes.renovado === undefined ? "token-novo" : opcoes.renovado));
  const cliente = criarClienteApi({
    baseUrl: "http://127.0.0.1:8000/",
    obterToken: async () => (opcoes.token === undefined ? "token-velho" : opcoes.token),
    renovarToken,
    buscar: buscar as unknown as typeof fetch,
  });
  return { cliente, buscar, renovarToken };
}

const aceita = (dados: unknown) => dados as { ok: boolean };

describe("cliente da API", () => {
  it("envia o token no cabeçalho e monta a consulta sem valores vazios", async () => {
    const { cliente, buscar } = montar([json({ ok: true })]);
    const dados = await cliente.get("/dashboard/atendimento", aceita, {
      inicio: "2026-10-01",
      canal: "",
      id_loja: undefined,
      limit: 20,
    });
    expect(dados.ok).toBe(true);
    const [url, init] = buscar.mock.calls[0]!;
    expect(String(url)).toBe("http://127.0.0.1:8000/dashboard/atendimento?inicio=2026-10-01&limit=20");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer token-velho");
  });

  it("sem token nem chama o servidor", async () => {
    const { cliente, buscar } = montar([], { token: null });
    await expect(cliente.get("/x", aceita)).rejects.toMatchObject({ status: 401 });
    expect(buscar).not.toHaveBeenCalled();
  });

  it("em 401 renova o token uma vez e repete a chamada", async () => {
    const { cliente, buscar, renovarToken } = montar([json({}, { status: 401 }), json({ ok: true })]);
    await expect(cliente.get("/x", aceita)).resolves.toEqual({ ok: true });
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect((buscar.mock.calls[1]![1]?.headers as Record<string, string>).Authorization).toBe("Bearer token-novo");
  });

  it("se a renovação falha, a sessão acabou (401)", async () => {
    const { cliente } = montar([json({}, { status: 401 })], { renovado: null });
    await expect(cliente.get("/x", aceita)).rejects.toMatchObject({ status: 401 });
  });

  it("401 de novo depois de renovar não entra em laço", async () => {
    const { cliente, buscar, renovarToken } = montar([json({}, { status: 401 }), json({}, { status: 401 })]);
    await expect(cliente.get("/x", aceita)).rejects.toMatchObject({ status: 401 });
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it("403 vira mensagem de permissão", async () => {
    const { cliente } = montar([json({ detail: "x" }, { status: 403 })]);
    await expect(cliente.get("/x", aceita)).rejects.toMatchObject({
      status: 403,
      message: "Você não tem permissão para ver estes dados.",
    });
  });

  it("429 vira o código de limite da interface", async () => {
    const { cliente } = montar([json({}, { status: 429 })]);
    const erro = await cliente.get("/x", aceita).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({ status: 429, codigo: "limite" });
  });

  it("422 mostra o motivo que o servidor explicou", async () => {
    const { cliente } = montar([json({ detail: "Periodo longo demais" }, { status: 422 })]);
    await expect(cliente.get("/x", aceita)).rejects.toMatchObject({ message: "Periodo longo demais" });
  });

  it("5xx não vaza detalhe do servidor", async () => {
    const { cliente } = montar([json({ detail: "psycopg: senha do banco" }, { status: 500 })]);
    const erro = (await cliente.get("/x", aceita).catch((e: unknown) => e)) as Error;
    expect(erro.message).not.toContain("psycopg");
  });

  it("falha de rede vira erro amigável", async () => {
    const { cliente } = montar([new TypeError("Failed to fetch")]);
    await expect(cliente.get("/x", aceita)).rejects.toMatchObject({ status: 0 });
  });

  it("resposta fora do formato é recusada antes de chegar à tela", async () => {
    const { cliente } = montar([json({ qualquer: "coisa" })]);
    await expect(
      cliente.get("/x", (d) => {
        if (!(d as { ok?: boolean }).ok) throw new Error("formato");
        return d;
      }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("corpo que não é JSON também vira erro de formato", async () => {
    const { cliente } = montar([new Response("<html>", { status: 200 })]);
    await expect(cliente.get("/x", aceita)).rejects.toMatchObject({ status: 502 });
  });

  it("cancelar a consulta não vira mensagem de erro", async () => {
    const controle = new AbortController();
    const buscar = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, rejeitar) => {
          init?.signal?.addEventListener("abort", () => rejeitar(new DOMException("abortado", "AbortError")));
        }),
    );
    const cliente = criarClienteApi({
      baseUrl: "http://localhost:8000",
      obterToken: async () => "t",
      renovarToken: async () => "t",
      buscar: buscar as unknown as typeof fetch,
    });
    const chamada = cliente.get("/x", aceita, undefined, { sinal: controle.signal });
    await vi.waitFor(() => expect(buscar).toHaveBeenCalled());
    controle.abort();
    const erro = await chamada.catch((e: unknown) => e);
    expect(erro).not.toBeInstanceOf(ErroApi);
  });

  it("estoura o tempo limite com mensagem própria", async () => {
    vi.useFakeTimers();
    try {
      const buscar = vi.fn(
        (_url: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, rejeitar) => {
            init?.signal?.addEventListener("abort", () => rejeitar(new DOMException("t", "AbortError")));
          }),
      );
      const cliente = criarClienteApi({
        baseUrl: "http://localhost:8000",
        obterToken: async () => "t",
        renovarToken: async () => "t",
        buscar: buscar as unknown as typeof fetch,
      });
      const chamada = cliente.get("/x", aceita, undefined, { timeoutMs: 1000 }).catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(1001);
      expect(await chamada).toMatchObject({ status: 0, message: "O servidor demorou demais para responder." });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("endereço da API", () => {
  const criar = (baseUrl: string) =>
    criarClienteApi({ baseUrl, obterToken: async () => null, renovarToken: async () => null });

  it("aceita HTTP só no ambiente local", () => {
    expect(() => criar("http://localhost:8000")).not.toThrow();
    expect(() => criar("http://127.0.0.1:8000")).not.toThrow();
    expect(() => criar("https://api.casalorenzi.com.br")).not.toThrow();
  });

  it("recusa HTTP em endereço público", () => {
    expect(() => criar("http://api.casalorenzi.com.br")).toThrow(/HTTPS/);
  });
});
