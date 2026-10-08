import { describe, expect, it } from "vitest";
import type { ItemReposicao } from "./gerenciaApi";
import { DIAS_DA_SEMANA, descricaoDaPeca, pedidosPorDiaDaSemana, pendenciasDoGerente, selosDaReposicao } from "./gerenciaUi";

const item = (extra: Partial<ItemReposicao> = {}): ItemReposicao => ({
  id_variacao: "v",
  sku: "CL-CAM-OXF-BR-M",
  produto: "Camisa Oxford",
  cor: "Branco",
  tamanho: "M",
  categoria: "Camisas",
  saldo: 4,
  minimo: 3,
  giro_diario: 1,
  dias_cobertura: 4,
  situacao: "cobertura_curta",
  ...extra,
});

describe("movimento por dia da semana", () => {
  it("ordena de domingo a sábado e zera o dia sem registro", () => {
    const valores = pedidosPorDiaDaSemana([
      { dia_semana: 6, pedidos: 9, dias: 3, pedidos_por_dia: 3 },
      { dia_semana: 0, pedidos: 3, dias: 4, pedidos_por_dia: 0.75 },
    ]);
    expect(valores).toEqual([0.75, 0, 0, 0, 0, 0, 3]);
    expect(valores).toHaveLength(DIAS_DA_SEMANA.length);
    expect(pedidosPorDiaDaSemana([])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("selo da reposição", () => {
  it("esgotada é perigo, venha o que vier", () => {
    expect(selosDaReposicao(item({ saldo: 0, situacao: "esgotada", dias_cobertura: null }))).toEqual({
      texto: "Esgotada",
      tom: "perigo",
    });
    expect(selosDaReposicao(item({ saldo: 0, situacao: "abaixo_do_minimo" })).texto).toBe("Esgotada");
  });

  it("cobertura curta mostra dias e alerta abaixo de uma semana", () => {
    expect(selosDaReposicao(item({ dias_cobertura: 4.4 }))).toEqual({ texto: "~4 dias", tom: "alerta" });
    expect(selosDaReposicao(item({ dias_cobertura: 12.6 }))).toEqual({ texto: "~13 dias", tom: "neutro" });
    expect(selosDaReposicao(item({ dias_cobertura: 0.2 })).texto).toBe("~1 dia");
  });

  it("sem giro, diferencia estar no mínimo de não ter venda", () => {
    expect(selosDaReposicao(item({ dias_cobertura: null, situacao: "abaixo_do_minimo" }))).toEqual({
      texto: "No mínimo",
      tom: "alerta",
    });
    expect(selosDaReposicao(item({ dias_cobertura: null, situacao: "cobertura_curta" })).texto).toBe("Sem giro");
  });

  it("descreve a peça com cor e tamanho", () => {
    expect(descricaoDaPeca(item())).toBe("Camisa Oxford · Branco, M");
  });
});

describe("pendências do topo", () => {
  it("cada uma leva à tela que resolve, na mesma ordem de sempre", () => {
    const itens = pendenciasDoGerente({ ajustes_para_aprovar: 2, transferencias_aguardando: 0, chamados_sem_resposta: 5 });
    expect(itens.map((i) => [i.valor, i.to])).toEqual([
      [0, "/painel/estoque/transferencias"],
      [5, "/painel/atendimento"],
    ]);
  });
});
