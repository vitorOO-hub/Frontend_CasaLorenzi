import { describe, expect, it } from "vitest";
import {
  minimosAlterados,
  quantidadeValida,
  rascunhoInvalido,
  rotuloDaAcao,
  rotuloDoStatus,
  textoSemAcao,
  trajeto,
} from "./transferenciasUi";

describe("apresentação de transferências", () => {
  it("reposição sem origem é Aberta; transferência pedida é Pendente", () => {
    expect(rotuloDoStatus({ status: "solicitada", tipo: "reposicao_rede", id_loja_origem: null })).toBe("Aberta");
    expect(rotuloDoStatus({ status: "solicitada", tipo: "transferencia", id_loja_origem: "l1" })).toBe("Pendente");
    expect(rotuloDoStatus({ status: "aceita", tipo: "transferencia", id_loja_origem: "l1" })).toBe("Em trânsito");
    expect(rotuloDoStatus({ status: "recebida", tipo: "reposicao_rede", id_loja_origem: "l1" })).toBe("Recebida");
    expect(rotuloDoStatus({ status: "recusada", tipo: "transferencia", id_loja_origem: "l1" })).toBe("Recusada");
  });

  it("trajeto e botões", () => {
    expect(trajeto({ origem_nome: "Centro", destino_nome: "Barra" })).toBe("Centro → Barra");
    expect(trajeto({ origem_nome: null, destino_nome: "Barra" })).toBe("Toda a rede → Barra");
    expect(rotuloDaAcao("aceitar", { tipo: "transferencia" })).toBe("Aceitar envio");
    expect(rotuloDaAcao("aceitar", { tipo: "reposicao_rede" })).toBe("Atender");
    expect(rotuloDaAcao("receber", { tipo: "transferencia" })).toBe("Confirmar recebimento");
    expect(rotuloDaAcao("recusar", { tipo: "transferencia" })).toBe("Recusar");
  });

  it("o que dizer quando não há ação", () => {
    const base = { tipo: "transferencia" as const, id_loja_origem: "l1", responsavel: null };
    expect(textoSemAcao({ ...base, status: "solicitada" })).toBe("Aguardando a origem");
    expect(textoSemAcao({ ...base, status: "solicitada", tipo: "reposicao_rede", id_loja_origem: null })).toBe("Aguardando outra loja");
    expect(textoSemAcao({ ...base, status: "aceita" })).toBe("Aguardando o destino");
    expect(textoSemAcao({ ...base, status: "recusada", responsavel: "Ana" })).toBe("Recusada por Ana");
    expect(textoSemAcao({ ...base, status: "recebida", responsavel: "Ana" })).toBe("Atendida por Ana");
  });

  it.each([
    ["3", 3],
    [" 12 ", 12],
    ["0", null],
    ["", null],
    ["1,5", null],
    ["-2", null],
    ["100001", null],
  ])("quantidade %j vira %j", (valor, esperado) => {
    expect(quantidadeValida(valor)).toBe(esperado);
  });
});

describe("estoque mínimo", () => {
  const itens = [
    { sku: "A", minimo: 3 },
    { sku: "B", minimo: 5 },
  ];

  it("só conta o que mudou de verdade", () => {
    expect(minimosAlterados(itens, { A: "3", B: "7" })).toEqual([{ sku: "B", minimo: 7 }]);
    expect(minimosAlterados(itens, {})).toEqual([]);
  });

  it("ignora texto inválido e peça que não existe na lista", () => {
    expect(minimosAlterados(itens, { A: "x", B: "-1", C: "4" })).toEqual([]);
  });

  it("rascunho inválido bloqueia o salvamento", () => {
    expect(rascunhoInvalido({ A: "4" })).toBe(false);
    expect(rascunhoInvalido({ A: "" })).toBe(true);
    expect(rascunhoInvalido({ A: "1.5" })).toBe(true);
    expect(rascunhoInvalido({ A: "-1" })).toBe(true);
    expect(rascunhoInvalido({ A: "100001" })).toBe(true);
    expect(rascunhoInvalido({})).toBe(false);
  });
});
