import { describe, expect, it } from "vitest";
import { decodificarClaims, lojaDoToken, papelDoToken } from "./claims";

// JWT usa UTF-8: o btoa puro só entende Latin-1, então os bytes são montados à mão.
const base64url = (objeto: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(objeto))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const token = (claims: unknown) => `${base64url({ alg: "ES256" })}.${base64url(claims)}.assinatura`;

describe("claims do token", () => {
  it("lê papel e loja do payload", () => {
    const claims = decodificarClaims(token({ papel: "gerente_loja", loja_id: "abc" }))!;
    expect(papelDoToken(claims.papel)).toBe("gerente");
    expect(lojaDoToken(claims)).toBe("abc");
  });

  it("traduz os papéis do banco para os cargos da interface", () => {
    expect(papelDoToken("atendente")).toBe("atendente");
    expect(papelDoToken("operador_estoque")).toBe("operador");
    expect(papelDoToken("gerente_loja")).toBe("gerente");
    expect(papelDoToken("admin")).toBe("administrador");
  });

  it("papel ausente, desconhecido ou perigoso não vira cargo", () => {
    expect(papelDoToken(undefined)).toBeNull();
    expect(papelDoToken("superadmin")).toBeNull();
    expect(papelDoToken("__proto__")).toBeNull();
    expect(papelDoToken("constructor")).toBeNull();
    expect(papelDoToken(42)).toBeNull();
  });

  it("admin e cliente não têm loja", () => {
    expect(lojaDoToken({ papel: "admin" })).toBeUndefined();
    expect(lojaDoToken({ loja_id: "" })).toBeUndefined();
  });

  it("aceita acentos no payload", () => {
    expect(decodificarClaims(token({ nome: "Cecília" }))).toEqual({ nome: "Cecília" });
  });

  it.each(["", "abc", "a.b", "a.b.c.d", "a.@@@.c", `a.${base64url([1, 2])}.c`, `a.${base64url("texto")}.c`])(
    "token malformado (%s) devolve null",
    (ruim) => {
      expect(decodificarClaims(ruim)).toBeNull();
    },
  );
});
