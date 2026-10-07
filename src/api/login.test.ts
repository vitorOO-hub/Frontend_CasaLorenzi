import { describe, expect, it } from "vitest";
import { erroDoLogin } from "./auth";

describe("erro do login", () => {
  it("senha errada e conta inexistente dizem a mesma coisa", () => {
    for (const code of ["invalid_credentials", "user_not_found", "email_not_confirmed"]) {
      expect(erroDoLogin({ code, status: 400 })).toMatchObject({
        codigo: "nao_autenticado",
        message: "E-mail ou senha incorretos.",
      });
    }
  });

  it("login por e-mail desligado no projeto não é culpa da senha", () => {
    const erro = erroDoLogin({ code: "email_provider_disabled", status: 422, message: "Email logins are disabled" });
    expect(erro.codigo).toBe("configuracao");
    expect(erro.message).toContain("desligado");
    expect(erro.message).not.toMatch(/senha incorretos/);
  });

  it("limite de tentativas vira aviso de espera", () => {
    expect(erroDoLogin({ status: 429, code: "over_request_rate_limit" }).codigo).toBe("limite");
  });

  it("Supabase fora do ar vira erro de servidor, não de credencial", () => {
    expect(erroDoLogin({ status: 503 }).codigo).toBe("servidor");
    expect(erroDoLogin({ code: "unexpected_failure", status: 500 }).codigo).toBe("servidor");
  });

  it("código desconhecido não é tratado como senha errada", () => {
    expect(erroDoLogin({ code: "algo_novo", status: 400 }).codigo).toBe("servidor");
  });

  it("sem objeto de erro (sessão ausente) é credencial inválida", () => {
    expect(erroDoLogin(null).codigo).toBe("nao_autenticado");
  });
});
