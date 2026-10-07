import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./api", () => ({ api }));

import {
  aprovarAjusteEstoque,
  buscarMovimentacoes,
  buscarOpcoesEstoque,
  buscarSaldo,
  listarAjustes,
  recusarAjusteEstoque,
  registrarMovimentacao,
  solicitarAjusteEstoque,
  validarAjuste,
  validarAjustes,
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

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
});

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
      rede: [{ id_loja: "l1", nome: "Centro" }, { id_loja: "l2", nome: "Barra" }],
      categorias: ["Camisas"],
      situacoes: [{ codigo: "ok", nome: "OK" }],
      tipos: [{ codigo: "entrada", nome: "Entrada" }],
      pecas: [{ id_variacao: ID, sku: "CL-X", nome: "Camisa · Branco, M" }],
      motivos_entrada: ["Recebimento de fornecedor"],
      motivos_saida: ["Avaria", "Venda em loja"],
      escopo: { papel: "operador_estoque", id_loja: "l1", loja_nome: "Centro", pode_escolher_loja: false, somente_minhas: true },
    });
    expect(o.escopo.somente_minhas).toBe(true);
    expect(o.pecas[0]?.sku).toBe("CL-X");
    expect(o.rede.map((l) => l.nome)).toEqual(["Centro", "Barra"]);
    expect(o.motivos_saida).toEqual(["Avaria", "Venda em loja"]);
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

export const ajusteDeExemplo = (extra = {}) => ({
  id_ajuste: ID,
  id_loja: "l1",
  loja_nome: "Casa Lorenzi Centro",
  id_variacao: ID,
  sku: "CL-CAM-OXF-BR-M",
  produto: "Camisa Oxford Bianca",
  cor: "Branco",
  tamanho: "M",
  quantidade: -3,
  saldo_atual: 5,
  motivo: "Peças danificadas",
  status: "pendente",
  motivo_recusa: null,
  solicitante: "Operador de Estoque",
  decisor: null,
  solicitado_em: "2026-10-07T12:00:00Z",
  decidido_em: null,
  ...extra,
});

describe("ajustes de inventário", () => {
  it("aceita pendente, aprovado e recusado com o motivo da recusa", () => {
    expect(validarAjuste(ajusteDeExemplo()).status).toBe("pendente");
    const recusado = validarAjuste(
      ajusteDeExemplo({ status: "rejeitado", motivo_recusa: "Não bate", decisor: "Gerente", decidido_em: "2026-10-07T13:00:00Z" }),
    );
    expect(recusado.motivo_recusa).toBe("Não bate");
    expect(recusado.decisor).toBe("Gerente");
  });

  it.each([
    ["status desconhecido", { status: "cancelado" }],
    ["quantidade em texto", { quantidade: "-3" }],
    ["saldo ausente", { saldo_atual: null }],
    ["solicitante ausente", { solicitante: undefined }],
  ])("recusa ajuste com %s", (_nome, extra) => {
    expect(() => validarAjuste(ajusteDeExemplo(extra))).toThrow();
  });

  it("valida a lista com o contador de pendentes", () => {
    const l = validarAjustes({ total: 1, pendentes: 4, itens: [ajusteDeExemplo()] });
    expect(l.pendentes).toBe(4);
    expect(() => validarAjustes({ total: 1, itens: [] })).toThrow();
  });

  it("lista pela rota privada, com a situação escolhida", () => {
    listarAjustes({ situacao: "decididos", limit: 15, offset: 30 });
    expect(api.get).toHaveBeenCalledWith(
      "/api/v1/painel/estoque/ajustes",
      validarAjustes,
      { situacao: "decididos", id_loja: undefined, limit: 15, offset: 30 },
      undefined,
    );
  });
});

describe("escrita no estoque", () => {
  it("registra a movimentação mandando só o que o servidor aceita", () => {
    registrarMovimentacao({ sku: "CL-X", tipo: "saida", quantidade: 2, motivo: "Avaria" });
    const [caminho, , corpo] = api.post.mock.calls[0]!;
    expect(caminho).toBe("/api/v1/painel/estoque/movimentacoes");
    expect(corpo).toEqual({ sku: "CL-X", tipo: "saida", quantidade: 2, motivo: "Avaria", id_loja: undefined });
    expect(Object.keys(corpo)).not.toEqual(expect.arrayContaining(["id_usuario", "responsavel", "saldo"]));
  });

  it("o admin informa a loja", () => {
    registrarMovimentacao({ sku: "CL-X", tipo: "entrada", quantidade: 1, motivo: "Recebimento", idLoja: "l2" });
    expect(api.post.mock.calls[0]![2]).toMatchObject({ id_loja: "l2" });
  });

  it("pede o ajuste com a quantidade contada, não com o saldo novo", () => {
    solicitarAjusteEstoque({ sku: "CL-X", quantidadeContada: 4, motivo: "Contagem" });
    const [caminho, validador, corpo] = api.post.mock.calls[0]!;
    expect(caminho).toBe("/api/v1/painel/estoque/ajustes");
    expect(validador).toBe(validarAjuste);
    expect(corpo).toEqual({ sku: "CL-X", quantidade_contada: 4, motivo: "Contagem", id_loja: undefined });
  });

  it("aprova e recusa pela rota do ajuste", () => {
    aprovarAjusteEstoque("a-1");
    recusarAjusteEstoque("a-2", "Não bate");
    expect(api.post.mock.calls[0]![0]).toBe("/api/v1/painel/estoque/ajustes/a-1/aprovar");
    expect(api.post.mock.calls[1]![0]).toBe("/api/v1/painel/estoque/ajustes/a-2/recusar");
    expect(api.post.mock.calls[1]![2]).toEqual({ motivo: "Não bate" });
  });
});
