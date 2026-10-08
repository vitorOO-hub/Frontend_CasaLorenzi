import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Consulta } from "@/hooks/useChamados";
import type { DadosRede } from "@/hooks/useDashboardRede";
import { validarPendencias } from "@/lib/gerenciaApi";
import { validarDashboardRede } from "@/lib/redeApi";

const estado = vi.hoisted(() => ({ atual: null as unknown }));
vi.mock("@/hooks/useDashboardRede", () => ({ useDashboardRede: () => estado.atual }));
vi.mock("@/lib/sessao", async (original) => ({
  ...(await original<typeof import("@/lib/sessao")>()),
  useNomeUsuario: () => "Cecília Lorenzi",
}));

import { DashboardAdmin } from "./Admin";

const resumo = (extra = {}) => ({
  faturamento: 50000,
  pedidos: 100,
  pecas: 180,
  ticket_medio: 500,
  faturamento_online: 10000,
  pedidos_online: 20,
  participacao_online: 0.2,
  ...extra,
});

const serieDe = (valor: number) => [{ data: "2026-10-05", faturamento: valor, pedidos: 1, pecas: 1 }];
const motivos = (a: number, b: number) => [
  { codigo: "entrega", nome: "Entrega", total: a },
  { codigo: "pagamento", nome: "Pagamento", total: b },
];

const unidade = (id: string, nome: string, faturamento: number) => ({
  id_loja: id,
  codigo: id.toUpperCase(),
  nome,
  cidade: "São Paulo",
  faturamento,
  faturamento_anterior: 20000,
  pedidos: 10,
  ticket_medio: 500,
  participacao_online: 0.1,
  unidades_em_estoque: 300,
  pecas_esgotadas: 2,
  chamados_abertos: 4,
  resposta_media_horas: 1.5,
});

function rede(extra = {}) {
  return validarDashboardRede({
    periodo: { inicio: "2026-09-08", fim: "2026-10-07" },
    periodo_anterior: { inicio: "2026-08-09", fim: "2026-09-07" },
    atual: resumo(),
    anterior: resumo({ faturamento: 40000 }),
    grupos: [
      {
        id: "rede",
        nome: "Rede",
        id_loja: null,
        serie_diaria: serieDe(900),
        categorias: [{ categoria: "Camisas", faturamento: 30000 }],
        motivos: motivos(4, 2),
      },
    ],
    pecas_mais_vendidas: [{ id_produto: "p1", nome: "Camisa Oxford Bianca", categoria: "Camisas", unidades: 12, faturamento: 3948 }],
    atendimento: {
      atual: { total: 9, resolvidos: 6, taxa_resolucao: 0.6667, resposta_media_horas: 1.5 },
      anterior: { total: 7, resolvidos: 4, taxa_resolucao: 0.5714, resposta_media_horas: 2 },
      abertos_agora: 3,
    },
    estoque: { unidades: 1234, pecas: 80, pecas_esgotadas: 5 },
    unidades: [unidade("l1", "Casa Lorenzi Centro", 30000), unidade("l2", "Casa Lorenzi Barra", 20000)],
    opcoes: {
      lojas: [
        { id_loja: "l1", nome: "Casa Lorenzi Centro" },
        { id_loja: "l2", nome: "Casa Lorenzi Barra" },
      ],
      canais: [{ codigo: "loja", nome: "Loja" }],
      categorias: ["Camisas"],
    },
    ...extra,
  });
}

const consulta = (extra: Partial<Consulta<DadosRede>> = {}): Consulta<DadosRede> => ({
  dados: {
    rede: rede(),
    pendencias: validarPendencias({ ajustes_para_aprovar: 2, transferencias_aguardando: 0, chamados_sem_resposta: 5, total: 7 }),
  },
  carregando: false,
  erro: null,
  recarregar: () => undefined,
  ...extra,
});

const html = () =>
  renderToString(
    <MemoryRouter>
      <DashboardAdmin />
    </MemoryRouter>,
  ).replace(/<!-- -->/g, "");

describe("início do admin", () => {
  beforeEach(() => {
    estado.atual = consulta();
  });

  it("mostra os números e a tabela que vieram da API", () => {
    const tela = html();
    expect(tela).toContain("Casa Lorenzi Centro");
    expect(tela).toContain("Casa Lorenzi Barra");
    expect(tela).toContain("1.234"); // unidades em estoque
    expect(tela).toContain("de 80 no catálogo");
    expect(tela).toContain("Camisa Oxford Bianca");
    expect(tela).toContain("ajustes para aprovar");
    expect(tela).not.toContain("Marina");
  });

  it("falha da API aparece com 'Tentar de novo' e não inventa números", () => {
    estado.atual = consulta({ dados: null, erro: "Não foi possível carregar os dados." });
    const tela = html();
    expect(tela).toContain("Não foi possível carregar os dados.");
    expect(tela).toContain("Tentar de novo");
    expect(tela).not.toContain("Casa Lorenzi Centro");
  });

  it("resposta fora do combinado é recusada em vez de renderizada", () => {
    expect(() => validarDashboardRede({ ...rede(), unidades: [{ id_loja: 1 }] })).toThrow(/campo inválido/);
  });
});
