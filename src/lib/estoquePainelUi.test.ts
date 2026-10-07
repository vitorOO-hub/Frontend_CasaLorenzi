import { describe, expect, it } from "vitest";
import {
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
