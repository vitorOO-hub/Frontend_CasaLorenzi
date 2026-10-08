import { describe, expect, it } from "vitest";
import {
  ROTULO_AJUSTE,
  TOM_AJUSTE,
  diferencaDoAjuste,
  inteiroDoCampo,
  saldoAposAjuste,
  saldoDepois,
  saldoNaLoja,
  ROTULO_SITUACAO,
  TOM_SITUACAO,
  destaqueDaQuantidade,
  detalheDaPeca,
  faixaDaPagina,
  observacaoDaMovimentacao,
  responsavelDaMovimentacao,
} from "./estoquePainelUi";

describe("apresentação do estoque", () => {
  it("cada situação tem rótulo e cor próprios", () => {
    expect(ROTULO_SITUACAO).toEqual({ ok: "OK", baixo: "Estoque baixo", esgotado: "Esgotado" });
    expect(TOM_SITUACAO).toEqual({ ok: "ok", baixo: "alerta", esgotado: "perigo" });
  });

  it("destaca esgotada em vermelho e no mínimo em âmbar", () => {
    expect(destaqueDaQuantidade(0, 3)).toBe("perigo");
    expect(destaqueDaQuantidade(3, 3)).toBe("alerta");
    expect(destaqueDaQuantidade(2, 3)).toBe("alerta");
    expect(destaqueDaQuantidade(4, 3)).toBeNull();
    expect(destaqueDaQuantidade(0, 0)).toBe("perigo");
  });

  it("descreve a peça com cor e tamanho", () => {
    expect(detalheDaPeca({ cor: "Branco", tamanho: "M" })).toBe("Branco · M");
  });

  it("observação junta motivo e pedido sem repetir o número", () => {
    expect(observacaoDaMovimentacao({ motivo: "Fornecedor", numero_pedido: null })).toBe("Fornecedor");
    expect(observacaoDaMovimentacao({ motivo: null, numero_pedido: "SD-1" })).toBe("Pedido SD-1");
    expect(observacaoDaMovimentacao({ motivo: "Pedido SD-1", numero_pedido: "SD-1" })).toBe("Pedido SD-1");
    expect(observacaoDaMovimentacao({ motivo: "Cancelado", numero_pedido: "SD-2" })).toBe("Cancelado · Pedido SD-2");
    expect(observacaoDaMovimentacao({ motivo: null, numero_pedido: null })).toBe("—");
  });

  it("movimentação automática aparece como Sistema", () => {
    expect(responsavelDaMovimentacao({ responsavel: null })).toBe("Sistema");
    expect(responsavelDaMovimentacao({ responsavel: "Ana" })).toBe("Ana");
  });

  it("faixa da paginação", () => {
    expect(faixaDaPagina(0, 25, 1840)).toBe("1–25 de 1.840");
    expect(faixaDaPagina(73, 25, 1840)).toBe("1.826–1.840 de 1.840");
    expect(faixaDaPagina(0, 25, 0)).toBe("0 de 0");
  });
});

describe("registrar entrada, saída e ajuste", () => {
  it("saldo depois: entrada soma, saída tira, e saída demais fica negativa", () => {
    expect(saldoDepois("entrada", 5, 3)).toBe(8);
    expect(saldoDepois("saida", 5, 3)).toBe(2);
    expect(saldoDepois("saida", 5, 6)).toBe(-1);
  });

  it("diferença do ajuste é a contagem menos o saldo", () => {
    expect(diferencaDoAjuste(2, 5)).toBe(-3);
    expect(diferencaDoAjuste(9, 5)).toBe(4);
    expect(diferencaDoAjuste(5, 5)).toBe(0);
    expect(saldoAposAjuste({ saldo_atual: 5, quantidade: -3 })).toBe(2);
  });

  it.each([
    ["3", 3],
    [" 12 ", 12],
    ["0", 0],
    ["", null],
    ["1,5", null],
    ["1.5", null],
    ["-2", null],
    ["abc", null],
    ["1e3", null],
    ["100001", null],
  ])("campo de quantidade %j vira %j", (valor, esperado) => {
    expect(inteiroDoCampo(valor)).toBe(esperado);
  });

  it("o mínimo do campo vale (quantidade de movimento começa em 1)", () => {
    expect(inteiroDoCampo("0", 1)).toBeNull();
    expect(inteiroDoCampo("1", 1)).toBe(1);
  });

  it("lê o saldo da peça na loja certa, vindo do servidor", () => {
    const saldo = {
      resumo: { unidades: 0, pecas: 0, produtos: 0, estoque_baixo: 0, esgotadas: 0, valor_em_estoque: 0 },
      lojas: [],
      total: 1,
      itens: [
        {
          id_variacao: "v",
          sku: "CL-X",
          produto: "Camisa",
          cor: "Branco",
          tamanho: "M",
          categoria: null,
          preco: 1,
          total: 12,
          minimo_total: 4,
          situacao: "ok" as const,
          por_loja: [
            { id_loja: "l1", quantidade: 5, minimo: 2 },
            { id_loja: "l2", quantidade: 7, minimo: 2 },
          ],
        },
      ],
    };
    expect(saldoNaLoja(saldo, "CL-X", "l2")).toBe(7);
    expect(saldoNaLoja(saldo, "CL-X", null)).toBe(12);
    expect(saldoNaLoja(saldo, "CL-X", "l9")).toBe(0);
    expect(saldoNaLoja(saldo, "OUTRA", "l1")).toBe(0);
    expect(saldoNaLoja(null, "CL-X", "l1")).toBeNull();
  });

  it("rótulos e cores do status do ajuste", () => {
    expect(ROTULO_AJUSTE).toEqual({ pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Recusado" });
    expect(TOM_AJUSTE).toEqual({ pendente: "alerta", aprovado: "ok", rejeitado: "perigo" });
  });
});
