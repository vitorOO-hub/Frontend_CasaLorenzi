import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./api", () => ({ api }));

import {
  buscarMovimentacoes,
  buscarOpcoesEstoque,
  buscarSaldo,
  validarMovimentacoes,
  validarOpcoes,
  validarSaldo,
} from "./estoquePainelApi";

const ID = "11111111-1111-4111-8111-111111111111";

export const itemSaldo = (extra = {}) => ({
  id_variacao: ID,
  sku: "CL-CAM-OXF-BR-M",
  produto: "Camisa Oxford Bianca",
  cor: "Branco",
  tamanho: "M",
  categoria: "Camisas",
  preco: 329,
  total: 4,
  minimo_total: 5,
  situacao: "baixo",
  por_loja: [{ id_loja: "l1", quantidade: 4, minimo: 5 }],
  ...extra,
});

export const saldoDeExemplo = (extra = {}) => ({
  resumo: { unidades: 334, pecas: 63, estoque_baixo: 22, esgotadas: 4, valor_em_estoque: 190415.2 },
  lojas: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
  total: 1,
  itens: [itemSaldo()],
  ...extra,
});

export const movimentoDeExemplo = (extra = {}) => ({
  id_movimentacao: ID,
  data: "2026-10-07T18:23:09.276808Z",
  id_loja: "l1",
  loja_nome: "Casa Lorenzi Centro",
  id_variacao: ID,
  sku: "CL-CAM-OXF-BR-G",
  produto: "Camisa Oxford Bianca",
  cor: "Branco",
  tamanho: "G",
  tipo_codigo: "ajuste_negativo",
  tipo_nome: "Ajuste negativo",
  grupo: "ajuste",
  quantidade: -5,
  quantidade_anterior: 5,
  quantidade_posterior: 0,
  responsavel: "Gerente da Loja",
  motivo: "Inventário: peças não localizadas",
  numero_pedido: null,
  ...extra,
});

beforeEach(() => api.get.mockReset());

describe("validação do estoque do painel", () => {
  it("aceita o saldo e descarta campo extra", () => {
    const s = validarSaldo({ ...saldoDeExemplo(), cpf: "000" });
    expect(s.resumo.unidades).toBe(334);
    expect(s.itens[0]?.situacao).toBe("baixo");
    expect(s.itens[0]?.por_loja[0]?.minimo).toBe(5);
    expect("cpf" in s).toBe(false);
  });

  it.each([
    ["situação desconhecida", { itens: [itemSaldo({ situacao: "quebrado" })] }],
    ["total em texto", { itens: [itemSaldo({ total: "4" })] }],
    ["preço nulo", { itens: [itemSaldo({ preco: null })] }],
    ["resumo ausente", { resumo: null }],
    ["lojas inválidas", { lojas: [{ nome: "sem id" }] }],
    ["por_loja inválido", { itens: [itemSaldo({ por_loja: [{ id_loja: "l1" }] })] }],
  ])("recusa saldo com %s", (_nome, extra) => {
    expect(() => validarSaldo(saldoDeExemplo(extra))).toThrow();
  });

  it("aceita movimentações com responsável e pedido nulos", () => {
    const m = validarMovimentacoes({
      total: 2,
      itens: [movimentoDeExemplo(), movimentoDeExemplo({ responsavel: null, numero_pedido: "SD-1", grupo: "saida" })],
    });
    expect(m.itens[0]?.quantidade).toBe(-5);
    expect(m.itens[1]?.responsavel).toBeNull();
    expect(m.itens[1]?.numero_pedido).toBe("SD-1");
  });

  it.each([
    ["grupo desconhecido", { grupo: "outro" }],
    ["quantidade em texto", { quantidade: "-5" }],
    ["data ausente", { data: undefined }],
    ["saldo anterior nulo", { quantidade_anterior: null }],
  ])("recusa movimentação com %s", (_nome, extra) => {
    expect(() => validarMovimentacoes({ total: 1, itens: [movimentoDeExemplo(extra)] })).toThrow();
  });

  it("aceita as opções com o escopo de quem chamou", () => {
    const o = validarOpcoes({
      lojas: [{ id_loja: "l1", nome: "Centro" }],
      categorias: ["Camisas"],
      situacoes: [{ codigo: "ok", nome: "OK" }],
      tipos: [{ codigo: "entrada", nome: "Entrada" }],
      pecas: [{ id_variacao: ID, sku: "CL-X", nome: "Camisa · Branco, M" }],
      escopo: { papel: "operador_estoque", id_loja: "l1", loja_nome: "Centro", pode_escolher_loja: false, somente_minhas: true },
    });
    expect(o.escopo.somente_minhas).toBe(true);
    expect(o.pecas[0]?.sku).toBe("CL-X");
    expect(() => validarOpcoes({ ...o, escopo: null })).toThrow();
  });
});

describe("chamadas do estoque do painel", () => {
  it("manda os filtros do saldo e nada além deles", () => {
    buscarSaldo({ busca: "linho", categoria: "Camisas", situacao: "baixo", limit: 50, offset: 100 });
    expect(api.get).toHaveBeenCalledWith(
      "/api/v1/painel/estoque/saldo",
      validarSaldo,
      { busca: "linho", categoria: "Camisas", situacao: "baixo", id_loja: undefined, limit: 50, offset: 100 },
      undefined,
    );
  });

  it("manda os filtros das movimentações", () => {
    buscarMovimentacoes({ tipo: "ajuste", sku: "CL-X", de: "2026-09-01", ate: "2026-09-30", limit: 25, offset: 0 });
    expect(api.get).toHaveBeenCalledWith(
      "/api/v1/painel/estoque/movimentacoes",
      validarMovimentacoes,
      { tipo: "ajuste", sku: "CL-X", de: "2026-09-01", ate: "2026-09-30", id_loja: undefined, limit: 25, offset: 0 },
      undefined,
    );
  });

  it("busca as opções na rota privada do painel", () => {
    buscarOpcoesEstoque();
    expect(api.get).toHaveBeenCalledWith("/api/v1/painel/estoque/opcoes", validarOpcoes, { id_loja: undefined }, undefined);
  });
});
