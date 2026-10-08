import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoGerente } from "@/hooks/useDashboardGerente";
import { validarDashboardGerente, validarPendencias, validarReposicao } from "@/lib/gerenciaApi";

const estado = vi.hoisted(() => ({ atual: null as unknown }));
vi.mock("@/hooks/useDashboardGerente", () => ({ useDashboardGerente: () => estado.atual }));
// A sessão real usa um store externo sem snapshot de servidor; aqui só o nome importa.
vi.mock("@/lib/sessao", async (original) => ({
  ...(await original<typeof import("@/lib/sessao")>()),
  useNomeUsuario: () => "Marina Toledo",
}));

import { DashboardGerente } from "./Gerente";

const resumo = (extra = {}) => ({
  faturamento: 18450.9,
  pedidos: 42,
  pecas: 71,
  ticket_medio: 439.31,
  faturamento_online: 5200,
  pedidos_online: 13,
  participacao_online: 0.2818,
  ...extra,
});

const vendas = () =>
  validarDashboardGerente({
    periodo: { inicio: "2026-09-08", fim: "2026-10-07" },
    periodo_anterior: { inicio: "2026-08-09", fim: "2026-09-07" },
    atual: resumo(),
    anterior: resumo({ faturamento: 15000, pedidos: 38, ticket_medio: 394.7 }),
    serie_diaria: [
      { data: "2026-10-05", faturamento: 900, pedidos: 2, pecas: 3 },
      { data: "2026-10-06", faturamento: 0, pedidos: 0, pecas: 0 },
    ],
    movimento_semana: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dia_semana: d, pedidos: d, dias: 4, pedidos_por_dia: d / 4 })),
    pecas_mais_vendidas: [
      { id_produto: "p1", nome: "Camisa Oxford Bianca", categoria: "Camisas", unidades: 12, faturamento: 3948 },
      { id_produto: "p2", nome: "Cinto Couro Siena", categoria: "Acessórios", unidades: 9, faturamento: 2511 },
    ],
    opcoes: {
      lojas: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
      canais: [
        { codigo: "loja", nome: "Loja" },
        { codigo: "online", nome: "Online" },
      ],
      categorias: ["Acessórios", "Camisas"],
    },
    escopo: { papel: "gerente_loja", id_loja: "l1", loja_nome: "Casa Lorenzi Centro", pode_escolher_loja: false },
  });

const atendimento = () => ({
  periodo: { inicio: "2026-09-08", fim: "2026-10-07" },
  periodo_anterior: { inicio: "2026-08-09", fim: "2026-09-07" },
  atual: { total: 9, resolvidos: 6, taxa_resolucao: 0.6667, resposta_media_horas: 1.5 },
  anterior: { total: 7, resolvidos: 4, taxa_resolucao: 0.5714, resposta_media_horas: 2 },
  volume_diario: [],
  por_categoria: [
    { codigo: "entrega", nome: "Entrega", total: 4 },
    { codigo: "troca_devolucao", nome: "Troca ou devolução", total: 5 },
  ],
  resposta_por_canal: [],
  opcoes: { lojas: [], canais: [], categorias: [] },
  escopo: { papel: "gerente_loja", id_loja: "l1", pode_escolher_loja: false },
});

function dados(extra = {}) {
  return {
    vendas: vendas(),
    reposicao: validarReposicao({
      total: 9,
      itens: [
        {
          id_variacao: "v1",
          sku: "CL-CAM-OXF-BR-M",
          produto: "Camisa Oxford Bianca",
          cor: "Branco",
          tamanho: "M",
          categoria: "Camisas",
          saldo: 0,
          minimo: 5,
          giro_diario: 0.9,
          dias_cobertura: null,
          situacao: "esgotada",
        },
        {
          id_variacao: "v2",
          sku: "CL-CIN-PT-95",
          produto: "Cinto Couro Siena",
          cor: "Preto",
          tamanho: "95",
          categoria: "Acessórios",
          saldo: 4,
          minimo: 5,
          giro_diario: 0.5,
          dias_cobertura: 8,
          situacao: "abaixo_do_minimo",
        },
      ],
    }),
    pendencias: validarPendencias({
      ajustes_para_aprovar: 3,
      transferencias_aguardando: 2,
      chamados_sem_resposta: 4,
      total: 9,
    }),
    chamados: atendimento(),
    ...extra,
  };
}

function pagina(parcial: Partial<EstadoGerente>) {
  estado.atual = { dados: null, carregando: false, erro: null, recarregar: () => undefined, ...parcial };
  const html = renderToString(
    <MemoryRouter>
      <DashboardGerente />
    </MemoryRouter>,
  );
  // O React separa textos vizinhos com comentários; tirá-los deixa o texto como o usuário lê.
  return html.replaceAll("<!-- -->", "");
}

beforeEach(() => {
  estado.atual = null;
});

describe("início do gerente", () => {
  it("mostra os números vindos da API", () => {
    const html = pagina({ dados: dados() as EstadoGerente["dados"] });
    expect(html).toContain("Gestão da unidade · Casa Lorenzi Centro");
    expect(html).toContain("Faturamento");
    expect(html).toContain("42"); // pedidos
    expect(html).toContain("Camisa Oxford Bianca");
    expect(html).toContain("Cinto Couro Siena");
    expect(html).toContain("Troca ou devolução");
    expect(html).toContain("67% resolvidos");
    expect(html).toContain("28%"); // participação online
  });

  it("mostra as pendências com o número de cada uma", () => {
    const html = pagina({ dados: dados() as EstadoGerente["dados"] });
    expect(html).toContain("transferências aguardando");
    expect(html).toContain("chamados sem resposta");
    // Aprovações saíram do painel: o ajuste pendente não vira mais atalho.
    expect(html).not.toContain("ajustes para aprovar");
    expect(html).not.toContain('href="/painel/estoque/aprovacoes"');
  });

  it("some com a faixa de pendências quando não há nenhuma", () => {
    const zeradas = validarPendencias({
      ajustes_para_aprovar: 0,
      transferencias_aguardando: 0,
      chamados_sem_resposta: 0,
      total: 0,
    });
    const html = pagina({ dados: dados({ pendencias: zeradas }) as EstadoGerente["dados"] });
    expect(html).not.toContain("transferências aguardando");
  });

  it("lista a reposição com selo de esgotada e de cobertura", () => {
    const html = pagina({ dados: dados() as EstadoGerente["dados"] });
    expect(html).toContain("Camisa Oxford Bianca · Branco, M");
    expect(html).toContain("Esgotada");
    expect(html).toContain("~8 dias");
    expect(html).toContain("Mostrando 2 de 9 peças");
  });

  it("estoque confortável quando nada precisa de reposição", () => {
    const vazia = validarReposicao({ total: 0, itens: [] });
    expect(pagina({ dados: dados({ reposicao: vazia }) as EstadoGerente["dados"] })).toContain("Estoque confortável");
  });

  it("não quebra sem nenhuma venda no período", () => {
    const sem = vendas();
    const base = dados();
    const zero = { ...sem, atual: { ...sem.atual, faturamento: 0, pedidos: 0, pecas: 0, ticket_medio: 0, participacao_online: 0 }, serie_diaria: [], pecas_mais_vendidas: [] };
    const html = pagina({ dados: { ...base, vendas: zero } as EstadoGerente["dados"] });
    expect(html).toContain("Faturamento");
    expect(html).toContain("0 peças vendidas em 0 pedidos");
  });

  it("mostra carregando enquanto não há dados", () => {
    expect(pagina({ carregando: true })).toContain("Carregando os dados da unidade");
  });

  it("mostra o erro com a opção de tentar de novo", () => {
    const html = pagina({ erro: "O servidor está indisponível no momento." });
    expect(html).toContain("O servidor está indisponível no momento.");
    expect(html).toContain("Tentar de novo");
    expect(html).not.toContain("Carregando os dados da unidade");
  });

  it("filtros de categoria e canal vêm das opções da API", () => {
    const html = pagina({ dados: dados() as EstadoGerente["dados"] });
    expect(html).toContain(">Acessórios<");
    expect(html).toContain(">Online<");
  });
});
