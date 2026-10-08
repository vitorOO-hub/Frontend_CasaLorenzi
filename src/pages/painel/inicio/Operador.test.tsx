import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ajustes, Movimentacoes, OpcoesEstoque, Saldo } from "@/lib/estoquePainelApi";
import type { Transferencias } from "@/lib/transferenciasApi";

const estado = vi.hoisted(() => ({
  opcoes: null as unknown,
  saldo: null as unknown,
  movimentosAtuais: null as unknown,
  movimentosAnteriores: null as unknown,
  transferenciasAcao: null as unknown,
  transferenciasAndamento: null as unknown,
  chamadaMovimentacoes: 0,
}));

vi.mock("@/hooks/useEstoquePainel", () => ({
  useOpcoesEstoque: () => estado.opcoes,
  useSaldoEstoque: () => estado.saldo,
  useMovimentacoesEstoque: vi.fn(() => (estado.chamadaMovimentacoes++ % 2 === 0 ? estado.movimentosAtuais : estado.movimentosAnteriores)),
  useTransferencias: vi.fn((filtros: { situacao: string }) =>
    filtros.situacao === "acao" ? estado.transferenciasAcao : estado.transferenciasAndamento,
  ),
  useAjustesEstoque: () => consulta<Ajustes>({ total: 0, pendentes: 0, itens: [] }),
  useAjustesPendentes: () => 0,
  useTransferenciasAguardando: () => 0,
}));

vi.mock("@/lib/sessao", async (original) => ({
  ...(await original<typeof import("@/lib/sessao")>()),
  useNomeUsuario: () => "Vinicius Prado",
}));

import { DashboardOperador } from "./Operador";

function consulta<T>(dados: T | null, extra: Partial<{ carregando: boolean; erro: string | null }> = {}) {
  return { dados, carregando: false, erro: null, recarregar: () => undefined, ...extra };
}

const opcoes = (): OpcoesEstoque => ({
  lojas: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
  rede: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
  categorias: ["Acessórios", "Camisas"],
  situacoes: [],
  tipos: [],
  pecas: [],
  motivos_entrada: [],
  motivos_saida: [],
  escopo: { papel: "operador_estoque", id_loja: "l1", loja_nome: "Casa Lorenzi Centro", pode_escolher_loja: false, somente_minhas: true },
});

const saldo = (): Saldo => ({
  resumo: { unidades: 11, pecas: 2, estoque_baixo: 1, esgotadas: 0, valor_em_estoque: 2510 },
  lojas: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
  total: 2,
  itens: [
    {
      id_variacao: "v1",
      sku: "CL-CAM-OXF-BR-M",
      produto: "Camisa Oxford Bianca",
      cor: "Branco",
      tamanho: "M",
      categoria: "Camisas",
      preco: 390,
      total: 3,
      minimo_total: 5,
      situacao: "baixo",
      por_loja: [{ id_loja: "l1", quantidade: 3, minimo: 5 }],
    },
    {
      id_variacao: "v2",
      sku: "CL-CIN-PT-95",
      produto: "Cinto Couro Siena",
      cor: "Preto",
      tamanho: "95",
      categoria: "Acessórios",
      preco: 220,
      total: 8,
      minimo_total: 4,
      situacao: "ok",
      por_loja: [{ id_loja: "l1", quantidade: 8, minimo: 4 }],
    },
  ],
});

const movimentos = (entrada: number, saida: number): Movimentacoes => ({
  total: 2,
  itens: [
    {
      id_movimentacao: "m1",
      data: "2026-10-06T10:00:00Z",
      id_loja: "l1",
      loja_nome: "Casa Lorenzi Centro",
      id_variacao: "v1",
      sku: "CL-CAM-OXF-BR-M",
      produto: "Camisa Oxford Bianca",
      cor: "Branco",
      tamanho: "M",
      tipo_codigo: "entrada",
      tipo_nome: "Entrada",
      grupo: "entrada",
      quantidade: entrada,
      quantidade_anterior: 0,
      quantidade_posterior: entrada,
      responsavel: "Vinicius Prado",
      motivo: "Reposição",
      numero_pedido: null,
    },
    {
      id_movimentacao: "m2",
      data: "2026-10-06T11:00:00Z",
      id_loja: "l1",
      loja_nome: "Casa Lorenzi Centro",
      id_variacao: "v2",
      sku: "CL-CIN-PT-95",
      produto: "Cinto Couro Siena",
      cor: "Preto",
      tamanho: "95",
      tipo_codigo: "saida",
      tipo_nome: "Saída",
      grupo: "saida",
      quantidade: -saida,
      quantidade_anterior: 10,
      quantidade_posterior: 10 - saida,
      responsavel: "Vinicius Prado",
      motivo: "Venda",
      numero_pedido: "PD-0001",
    },
  ],
});

const transferencias = (aguardando: number, quantidadeAceita = 0): Transferencias => ({
  total: quantidadeAceita ? 1 : 0,
  aguardando_voce: aguardando,
  itens: quantidadeAceita
    ? [
        {
          id_transferencia: "t1",
          tipo: "transferencia",
          status: "aceita",
          solicitada_em: "2026-10-06T09:00:00Z",
          aceita_em: "2026-10-06T10:00:00Z",
          recebida_em: null,
          id_loja_origem: "l2",
          origem_nome: "Casa Lorenzi Barra",
          id_loja_destino: "l1",
          destino_nome: "Casa Lorenzi Centro",
          sku: "CL-CAM-OXF-BR-M",
          produto: "Camisa Oxford Bianca",
          cor: "Branco",
          tamanho: "M",
          quantidade: quantidadeAceita,
          observacao: null,
          motivo_recusa: null,
          solicitante: "Vinicius Prado",
          responsavel: "Marina Toledo",
          acoes: ["receber"],
        },
      ]
    : [],
});

function pagina() {
  const html = renderToString(
    <MemoryRouter initialEntries={["/painel"]}>
      <DashboardOperador />
    </MemoryRouter>,
  );
  return html.replaceAll("<!-- -->", "");
}

beforeEach(() => {
  estado.opcoes = consulta(opcoes());
  estado.saldo = consulta(saldo());
  estado.movimentosAtuais = consulta(movimentos(5, 2));
  estado.movimentosAnteriores = consulta(movimentos(2, 1));
  estado.transferenciasAcao = consulta(transferencias(2));
  estado.transferenciasAndamento = consulta(transferencias(0, 4));
  estado.chamadaMovimentacoes = 0;
});

describe("início do operador de estoque", () => {
  it("usa dados das rotas de estoque em vez do estado simulado", () => {
    const html = pagina();

    expect(html).toContain("Estoque · Casa Lorenzi Centro");
    expect(html).toContain("transferências e reposições aguardando você");
    expect(html).toContain("Peças que entraram");
    expect(html).toContain("Peças que saíram");
    expect(html).toContain("Abaixo do mínimo");
    expect(html).toContain("A caminho da loja");
    expect(html).toContain("Camisa Oxford Bianca");
    expect(html).toContain("Cinto Couro Siena");
    expect(html).toContain("Registrar entrada / saída");
    expect(html).toContain("Ajuste de inventário");
  });

  it("não importa o store do protótipo", () => {
    const fonte = readFileSync(new URL("./Operador.tsx", import.meta.url), "utf-8");
    expect(fonte).not.toContain("@/lib/store");
    expect(fonte).not.toContain("useEstado");
    expect(fonte).toContain("@/hooks/useEstoquePainel");
  });

  it("respeita o limite aceito pela rota de movimentações", () => {
    const fonte = readFileSync(new URL("./Operador.tsx", import.meta.url), "utf-8");
    expect(fonte).toContain("const LIMITE_MOVIMENTACOES = 100");
  });
});
