import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("./api", () => ({ api }));

import {
  aceitarTransferencia,
  definirMinimos,
  listarMinimos,
  listarTransferencias,
  pedirReposicaoRede,
  pedirTransferencia,
  receberTransferencia,
  recusarTransferencia,
  validarMinimos,
  validarTransferencia,
  validarTransferencias,
} from "./transferenciasApi";

export const transferenciaDeExemplo = (extra = {}) => ({
  id_transferencia: "t1",
  tipo: "transferencia",
  status: "solicitada",
  solicitada_em: "2026-10-07T12:00:00Z",
  aceita_em: null,
  recebida_em: null,
  id_loja_origem: "l1",
  origem_nome: "Centro",
  id_loja_destino: "l2",
  destino_nome: "Barra",
  sku: "CL-BLA-MA-M",
  produto: "Blazer Estruturado Modena",
  cor: "Marinho",
  tamanho: "M",
  quantidade: 2,
  observacao: null,
  motivo_recusa: null,
  solicitante: "Rafael",
  responsavel: null,
  acoes: ["aceitar", "recusar"],
  ...extra,
});

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
  api.put.mockReset();
});

describe("validação de transferências", () => {
  it("aceita a lista com o contador e as ações", () => {
    const l = validarTransferencias({ total: 1, aguardando_voce: 1, itens: [transferenciaDeExemplo()] });
    expect(l.aguardando_voce).toBe(1);
    expect(l.itens[0]?.acoes).toEqual(["aceitar", "recusar"]);
  });

  it("aceita reposição aberta, sem origem", () => {
    const t = validarTransferencia(
      transferenciaDeExemplo({ tipo: "reposicao_rede", id_loja_origem: null, origem_nome: null }),
    );
    expect(t.id_loja_origem).toBeNull();
  });

  it.each([
    ["tipo desconhecido", { tipo: "venda" }],
    ["status desconhecido", { status: "cancelada" }],
    ["ação desconhecida", { acoes: ["apagar"] }],
    ["quantidade em texto", { quantidade: "2" }],
    ["destino ausente", { destino_nome: undefined }],
    ["ações fora de lista", { acoes: "aceitar" }],
  ])("recusa transferência com %s", (_n, extra) => {
    expect(() => validarTransferencia(transferenciaDeExemplo(extra))).toThrow();
  });

  it("valida o estoque mínimo", () => {
    const m = validarMinimos({
      id_loja: "l1",
      loja_nome: "Centro",
      total: 1,
      itens: [{ id_variacao: "v", sku: "S", produto: "P", cor: "c", tamanho: "t", saldo: 4, minimo: 2 }],
    });
    expect(m.itens[0]?.minimo).toBe(2);
    expect(() => validarMinimos({ id_loja: "l1", loja_nome: "C", total: 1, itens: [{ sku: "S" }] })).toThrow();
  });
});

describe("chamadas de transferências e mínimos", () => {
  it("lista pela rota privada com situação e tipo", () => {
    listarTransferencias({ situacao: "acao", tipo: "reposicao_rede", limit: 50, offset: 0 });
    expect(api.get).toHaveBeenCalledWith(
      "/api/v1/painel/estoque/transferencias",
      validarTransferencias,
      { situacao: "acao", tipo: "reposicao_rede", id_loja: undefined, limit: 50, offset: 0 },
      undefined,
    );
  });

  it("o pedido manda só a origem, a peça e a quantidade (o destino é o login)", () => {
    pedirTransferencia({ sku: "S", quantidade: 2, idLojaOrigem: "l1" });
    const corpo = api.post.mock.calls[0]![2];
    expect(api.post.mock.calls[0]![0]).toBe("/api/v1/painel/estoque/transferencias");
    expect(corpo).toEqual({ sku: "S", quantidade: 2, id_loja_origem: "l1", observacao: undefined, id_loja: undefined });
    pedirReposicaoRede({ sku: "S", quantidade: 1 });
    expect(api.post.mock.calls[1]![0]).toBe("/api/v1/painel/estoque/transferencias/reposicoes");
  });

  it("aceitar, recusar e receber usam a rota da transferência", () => {
    aceitarTransferencia("t1");
    recusarTransferencia("t2", "Sem peça");
    receberTransferencia("t3");
    expect(api.post.mock.calls.map((c) => c[0])).toEqual([
      "/api/v1/painel/estoque/transferencias/t1/aceitar",
      "/api/v1/painel/estoque/transferencias/t2/recusar",
      "/api/v1/painel/estoque/transferencias/t3/receber",
    ]);
    expect(api.post.mock.calls[1]![2]).toEqual({ motivo: "Sem peça", id_loja: undefined });
  });

  it("o admin diz por qual loja atende a reposição", () => {
    aceitarTransferencia("t1", "l9");
    expect(api.post.mock.calls[0]![2]).toEqual({ id_loja: "l9" });
  });

  it("mínimos: lista e grava tudo de uma vez pelo PUT", () => {
    listarMinimos({ idLoja: "l1" });
    expect(api.get).toHaveBeenCalledWith(
      "/api/v1/painel/estoque/minimos",
      validarMinimos,
      { id_loja: "l1", busca: undefined, limit: 200 },
      undefined,
    );
    definirMinimos([{ sku: "S", minimo: 4 }], "l1");
    const [caminho, , corpo] = api.put.mock.calls[0]!;
    expect(caminho).toBe("/api/v1/painel/estoque/minimos");
    expect(corpo).toEqual({ itens: [{ sku: "S", minimo: 4 }], id_loja: "l1" });
  });
});
