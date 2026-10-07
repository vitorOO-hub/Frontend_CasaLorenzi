import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./api", () => ({ api }));

import {
  buscarDashboardGerente,
  buscarPendencias,
  buscarReposicao,
  validarDashboardGerente,
  validarPendencias,
  validarReposicao,
} from "./gerenciaApi";

const resumo = (extra = {}) => ({
  faturamento: 1200.5,
  pedidos: 4,
  pecas: 6,
  ticket_medio: 300.12,
  faturamento_online: 400,
  pedidos_online: 2,
  participacao_online: 0.3332,
  ...extra,
});

export const dashboardDeExemplo = () => ({
  periodo: { inicio: "2026-09-08", fim: "2026-10-07" },
  periodo_anterior: { inicio: "2026-08-09", fim: "2026-09-07" },
  atual: resumo(),
  anterior: resumo({ pedidos: 0, faturamento: 0, ticket_medio: 0 }),
  serie_diaria: [{ data: "2026-09-08", faturamento: 100, pedidos: 1, pecas: 2 }],
  movimento_semana: [{ dia_semana: 0, pedidos: 3, dias: 4, pedidos_por_dia: 0.75 }],
  pecas_mais_vendidas: [
    { id_produto: "p-1", nome: "Camisa Oxford", categoria: "Camisas", unidades: 5, faturamento: 1645 },
  ],
  opcoes: {
    lojas: [{ id_loja: "l-1", nome: "Centro" }],
    canais: [{ codigo: "loja", nome: "Loja" }],
    categorias: ["Camisas", "Calças"],
  },
  escopo: { papel: "gerente_loja", id_loja: "l-1", loja_nome: "Centro", pode_escolher_loja: false },
});

const reposicao = () => ({
  total: 2,
  itens: [
    {
      id_variacao: "v-1",
      sku: "CL-CAM-OXF-BR-M",
      produto: "Camisa Oxford",
      cor: "Branco",
      tamanho: "M",
      categoria: "Camisas",
      saldo: 0,
      minimo: 5,
      giro_diario: 0.8,
      dias_cobertura: null,
      situacao: "esgotada",
    },
    {
      id_variacao: "v-2",
      sku: "CL-BLA-MA-P",
      produto: "Blazer",
      cor: "Marinho",
      tamanho: "P",
      categoria: null,
      saldo: 3,
      minimo: 2,
      giro_diario: null,
      dias_cobertura: null,
      situacao: "cobertura_curta",
    },
  ],
});

beforeEach(() => {
  api.get.mockReset();
});

describe("validação do início do gerente", () => {
  it("aceita o dashboard e mantém só o combinado", () => {
    const d = validarDashboardGerente({ ...dashboardDeExemplo(), cpf: "000.000.000-00" });
    expect(d.atual.faturamento).toBe(1200.5);
    expect(d.pecas_mais_vendidas[0]?.nome).toBe("Camisa Oxford");
    expect(d.escopo.loja_nome).toBe("Centro");
    expect(d.opcoes.categorias).toEqual(["Camisas", "Calças"]);
    expect("cpf" in d).toBe(false);
  });

  it("aceita escopo do admin, sem loja", () => {
    const d = validarDashboardGerente({
      ...dashboardDeExemplo(),
      escopo: { papel: "admin", id_loja: null, loja_nome: null, pode_escolher_loja: true },
    });
    expect(d.escopo.pode_escolher_loja).toBe(true);
    expect(d.escopo.id_loja).toBeNull();
  });

  it.each([
    ["atual", { ...resumo(), pedidos: "4" }],
    ["serie_diaria", [{ data: "2026-09-08", faturamento: "100", pedidos: 1, pecas: 2 }]],
    ["movimento_semana", [{ dia_semana: "0" }]],
    ["pecas_mais_vendidas", [{ id_produto: "p", nome: 5 }]],
    ["opcoes", { lojas: [], canais: [], categorias: [1] }],
    ["escopo", null],
  ])("recusa %s fora do formato", (campo, valor) => {
    expect(() => validarDashboardGerente({ ...dashboardDeExemplo(), [campo]: valor })).toThrow();
  });

  it("aceita a reposição com giro e cobertura nulos", () => {
    const r = validarReposicao(reposicao());
    expect(r.itens[0]?.situacao).toBe("esgotada");
    expect(r.itens[1]?.giro_diario).toBeNull();
    expect(r.total).toBe(2);
  });

  it("recusa situação desconhecida e saldo em texto", () => {
    const base = reposicao();
    expect(() =>
      validarReposicao({ ...base, itens: [{ ...base.itens[0], situacao: "quebrada" }] }),
    ).toThrow();
    expect(() => validarReposicao({ ...base, itens: [{ ...base.itens[0], saldo: "0" }] })).toThrow();
  });

  it("valida as pendências", () => {
    const p = { ajustes_para_aprovar: 1, transferencias_aguardando: 2, chamados_sem_resposta: 3, total: 6 };
    expect(validarPendencias(p)).toEqual(p);
    expect(() => validarPendencias({ ...p, total: null })).toThrow();
    expect(() => validarPendencias(null)).toThrow();
  });
});

describe("chamadas do início do gerente", () => {
  it("manda período e filtros ao dashboard, sem inventar parâmetros", () => {
    buscarDashboardGerente({ inicio: "2026-09-01", fim: "2026-09-30", categoria: "Camisas", canal: "online" });
    expect(api.get).toHaveBeenCalledWith(
      "/api/v1/painel/gerencia/dashboard",
      validarDashboardGerente,
      { inicio: "2026-09-01", fim: "2026-09-30", id_loja: undefined, categoria: "Camisas", canal: "online" },
      undefined,
    );
  });

  it("usa as rotas privadas da gerência", () => {
    buscarReposicao({ categoria: "Camisas", limite: 6 });
    expect(api.get).toHaveBeenLastCalledWith(
      "/api/v1/painel/gerencia/reposicao",
      validarReposicao,
      { id_loja: undefined, categoria: "Camisas", limit: 6 },
      undefined,
    );
    buscarPendencias();
    expect(api.get).toHaveBeenLastCalledWith(
      "/api/v1/painel/gerencia/pendencias",
      validarPendencias,
      { id_loja: undefined },
      undefined,
    );
  });
});
