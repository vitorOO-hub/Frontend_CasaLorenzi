import { afterEach, describe, expect, it, vi } from "vitest";

const setSession = vi.fn();
vi.mock("./supabase", () => ({ supabase: () => ({ auth: { setSession } }) }));
vi.mock("./config", () => ({ config: { apiUrl: "http://api.teste" } }));

const { entrarPorCpf } = await import("./auth");

/** JWT de cliente (sem papel) só com o payload: o front não valida assinatura. */
const token = `x.${btoa(JSON.stringify({ sub: "id-cliente", email: "cliente@teste.com" })).replace(/=+$/, "")}.y`;

function respostaDoBackend(status: number, corpo: unknown) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("login por CPF", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setSession.mockReset();
  });

  it("manda CPF e senha ao backend e guarda a sessão devolvida no Supabase", async () => {
    const fetch = respostaDoBackend(200, { access_token: token, refresh_token: "r", expires_in: 3600, token_type: "bearer" });
    setSession.mockResolvedValue({ data: { session: { access_token: token } }, error: null });
    const sessao = await entrarPorCpf("52998224725", "Senha123");
    expect(fetch).toHaveBeenCalledWith(
      "http://api.teste/api/v1/acesso/entrar-cpf",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ cpf: "52998224725", senha: "Senha123" }) }),
    );
    expect(setSession).toHaveBeenCalledWith({ access_token: token, refresh_token: "r" });
    expect(sessao).toMatchObject({ tipo: "cliente", id: "id-cliente" });
  });

  it("CPF ou senha errados viram credencial inválida, não sessão expirada", async () => {
    respostaDoBackend(401, { detail: "CPF ou senha incorretos." });
    await expect(entrarPorCpf("52998224725", "x")).rejects.toMatchObject({
      codigo: "nao_autenticado",
      message: "CPF ou senha incorretos.",
    });
    expect(setSession).not.toHaveBeenCalled();
  });

  it("limite de tentativas e servidor fora do ar mostram o que aconteceu", async () => {
    respostaDoBackend(429, { detail: "Muitas tentativas de login. Aguarde um minuto e tente de novo." });
    await expect(entrarPorCpf("52998224725", "x")).rejects.toMatchObject({ codigo: "limite" });
    respostaDoBackend(503, { detail: "O login está indisponível no momento. Tente de novo em instantes." });
    await expect(entrarPorCpf("52998224725", "x")).rejects.toMatchObject({ codigo: "servidor" });
  });

  it("sem rede vira erro de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(entrarPorCpf("52998224725", "x")).rejects.toMatchObject({ codigo: "rede" });
  });
});
