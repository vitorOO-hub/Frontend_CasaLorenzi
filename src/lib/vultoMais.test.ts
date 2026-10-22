import { describe, expect, it } from "vitest";
import { daMarca, ehVulto, rotuloTipo, validarVultoMais } from "./vultoMais";

describe("linha Vulto no catálogo", () => {
  it("reconhece a peça pela marca, sem ligar para maiúsculas, acento ou espaços", () => {
    expect(ehVulto({ marca: "Vulto" })).toBe(true);
    expect(ehVulto({ marca: " VULTO " })).toBe(true);
    expect(ehVulto({ marca: "Casa Lorenzi" })).toBe(false);
    expect(ehVulto({ marca: null })).toBe(false);
  });

  it("filtro de marca separa Casa Lorenzi e Vulto; vazio mostra tudo", () => {
    const vulto = { marca: "Vulto" };
    const casa = { marca: "Casa Lorenzi" };
    expect([daMarca(vulto, ""), daMarca(casa, "")]).toEqual([true, true]);
    expect([daMarca(vulto, "vulto"), daMarca(casa, "vulto")]).toEqual([true, false]);
    expect([daMarca(vulto, "casa-lorenzi"), daMarca(casa, "casa-lorenzi")]).toEqual([false, true]);
  });
});

describe("Vulto+ na área do cliente", () => {
  const resposta = {
    saldo: 4280,
    categoria: "prata",
    creditos_no_ano: 3100,
    proxima_categoria: "ouro",
    faltam_para_proxima: 1900,
    extrato: [{ ocorrido_em: "2026-10-12T15:00:00-03:00", tipo: "credito", pontos: 2340, descricao: "compra" }],
    extra: "descartado",
  };

  it("valida a resposta e descarta campos que não foram combinados", () => {
    const r = validarVultoMais(resposta);
    expect(r.saldo).toBe(4280);
    expect(r.extrato[0].pontos).toBe(2340);
    expect("extra" in r).toBe(false);
  });

  it("aceita a categoria mais alta, sem próxima", () => {
    const r = validarVultoMais({ ...resposta, categoria: "ouro", proxima_categoria: null, faltam_para_proxima: null });
    expect([r.proxima_categoria, r.faltam_para_proxima]).toEqual([null, null]);
  });

  it("recusa saldo que não é número", () => {
    expect(() => validarVultoMais({ ...resposta, saldo: "4280" })).toThrow();
  });

  it("traduz o tipo do movimento", () => {
    expect(rotuloTipo("vencimento")).toBe("Vencimento");
  });
});

describe("atendimento do histórico da Vulto", () => {
  it("marca ausente (API anterior) vale falso; marca presente precisa ser booleana", async () => {
    const { booleanoOuPadrao } = await import("./validacao");
    expect(booleanoOuPadrao(undefined, "historico_vulto")).toBe(false);
    expect(booleanoOuPadrao(true, "historico_vulto")).toBe(true);
    expect(() => booleanoOuPadrao("sim", "historico_vulto")).toThrow();
  });
});
