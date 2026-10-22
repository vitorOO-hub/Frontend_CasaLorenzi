import { describe, expect, it } from "vitest";
import { daMarca, ehVulto, rotuloTipo, textoDoAviso, validarVultoMais } from "./vultoMais";

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

describe("Vulto+ na ficha do painel", () => {
  it("valida a resposta da equipe; desconto nulo para o atendente", async () => {
    const { validarVultoMaisDaFicha } = await import("./clientesApi");
    const r = validarVultoMaisDaFicha({
      saldo: 2000,
      categoria: "prata",
      creditos_no_ano: 2500,
      proxima_categoria: "ouro",
      faltam_para_proxima: 2500,
      loja_cadastro: "vulto pinheiros",
      extrato: [{ ocorrido_em: "2026-10-12T15:00:00-03:00", tipo: "credito", pontos: 2500, descricao: "compra" }],
      resgates: [
        { resgatado_em: "2026-10-13T15:00:00-03:00", pontos: 500, desconto: "25.00", loja_nome: "vulto pinheiros", atendente: "camila duarte", observacao: null },
        { resgatado_em: "2026-10-14T15:00:00-03:00", pontos: 300, desconto: null, loja_nome: null, atendente: null, observacao: null },
      ],
    });
    expect(r.resgates[0].desconto).toBe(25);
    expect(r.resgates[1].desconto).toBeNull();
    expect(r.loja_cadastro).toBe("vulto pinheiros");
  });
});

describe("aviso de vencimento", () => {
  it("sem os campos (backend antigo) não há nada a vencer", () => {
    const r = validarVultoMais({ saldo: 0, categoria: "bronze", creditos_no_ano: 0, extrato: [] });
    expect([r.pontos_a_vencer, r.proximos_vencimentos]).toEqual([0, []]);
    expect(textoDoAviso(r)).toBeNull();
  });

  it("um lote: diz a data", () => {
    const r = validarVultoMais({
      saldo: 1200,
      categoria: "bronze",
      creditos_no_ano: 0,
      extrato: [],
      pontos_a_vencer: 1200,
      proximos_vencimentos: [{ vence_em: "2026-11-05T15:00:00Z", pontos: 1200 }],
    });
    expect(textoDoAviso(r)).toBe("1.200 pontos vencem nos próximos 30 dias (em 05/11)");
  });

  it("vários lotes: soma e diz o primeiro", () => {
    const aviso = {
      pontos_a_vencer: 300,
      proximos_vencimentos: [
        { vence_em: "2026-11-01T12:00:00Z", pontos: 100 },
        { vence_em: "2026-11-15T12:00:00Z", pontos: 200 },
      ],
    };
    expect(textoDoAviso(aviso)).toBe("300 pontos vencem nos próximos 30 dias (o primeiro lote em 01/11)");
  });

  it("recusa lote malformado", () => {
    expect(() =>
      validarVultoMais({ saldo: 0, categoria: "bronze", creditos_no_ano: 0, extrato: [], proximos_vencimentos: [{ pontos: 1 }] }),
    ).toThrow();
  });
});
