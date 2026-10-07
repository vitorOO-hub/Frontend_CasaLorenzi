import { describe, expect, it } from "vitest";
import { SITUACOES, chamadoFinalizado, moedaBR, prioridadeUrgente, tomPrioridade, tomStatus } from "./chamadosUi";

describe("apresentação dos chamados", () => {
  it("urgente e alta têm o mesmo alerta, média é atenção, baixa é neutra", () => {
    expect(tomPrioridade("urgente")).toBe("perigo");
    expect(tomPrioridade("alta")).toBe("perigo");
    expect(tomPrioridade("media")).toBe("alerta");
    expect(tomPrioridade("baixa")).toBe("neutro");
    expect(prioridadeUrgente("urgente")).toBe(true);
    expect(prioridadeUrgente("media")).toBe(false);
  });

  it("os 6 status do banco se agrupam em 3 cores", () => {
    expect(tomStatus("aberto")).toBe("perigo");
    expect(tomStatus("em_andamento")).toBe("alerta");
    expect(tomStatus("aguardando_cliente")).toBe("alerta");
    expect(tomStatus("resolvido")).toBe("ok");
    expect(tomStatus("encerrado")).toBe("ok");
    expect(tomStatus("cancelado")).toBe("neutro");
  });

  it("resolvido, encerrado e cancelado são finais", () => {
    for (const s of ["resolvido", "encerrado", "cancelado"]) expect(chamadoFinalizado(s)).toBe(true);
    for (const s of ["aberto", "em_andamento", "aguardando_cliente"]) expect(chamadoFinalizado(s)).toBe(false);
  });

  it("os valores do seletor de situação são exatamente os que a API aceita", () => {
    expect(SITUACOES.map((s) => s.value)).toEqual(["abertos", "aberto", "em_andamento", "resolvido", "todos"]);
  });

  it("formata dinheiro em reais", () => {
    expect(moedaBR(199.9).replace(/\s/g, " ")).toBe("R$ 199,90");
  });
});
