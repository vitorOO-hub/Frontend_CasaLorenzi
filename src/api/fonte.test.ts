import { describe, expect, it } from "vitest";
import { escolherFonte } from "./config";

const completo = { apiUrl: "https://api.exemplo.com", supabaseUrl: "https://x.supabase.co", supabaseAnonKey: "anon" };

describe("fonte de dados", () => {
  it("com API e Supabase configurados o padrão é a API, não os dados de exemplo", () => {
    expect(escolherFonte(completo)).toBe("api");
    expect(escolherFonte({ ...completo, fonte: "" })).toBe("api");
  });

  it("simulado só quando pedido de propósito ou quando falta configuração", () => {
    expect(escolherFonte({ ...completo, fonte: "simulado" })).toBe("simulado");
    expect(escolherFonte({})).toBe("simulado");
    expect(escolherFonte({ apiUrl: completo.apiUrl })).toBe("simulado");
  });

  it("api explícita vale mesmo faltando algo (o app avisa o que falta)", () => {
    expect(escolherFonte({ fonte: "api" })).toBe("api");
  });
});
