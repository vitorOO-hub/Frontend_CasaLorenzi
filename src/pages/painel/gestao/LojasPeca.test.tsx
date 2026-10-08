import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validarLojas } from "@/lib/gerenciaApi";
import { validarOpcoes, validarMovimentacoes, validarSaldo } from "@/lib/estoquePainelApi";

type Consulta<T> = { dados: T | null; carregando: boolean; erro: string | null; recarregar: () => void };
const estado = vi.hoisted(() => ({ lojas: null as unknown, saldo: null as unknown, mov: null as unknown, opcoes: null as unknown }));

vi.mock("@/hooks/useDashboardGerente", () => ({ useLojasDaRede: () => estado.lojas }));
vi.mock("@/hooks/useEstoquePainel", () => ({
  useOpcoesEstoque: () => estado.opcoes,
  useSaldoEstoque: () => estado.saldo,
  useMovimentacoesEstoque: () => estado.mov,
}));

import { Peca } from "../estoque/Peca";
import { Lojas } from "./Lojas";

const consulta = <T,>(dados: T | null, extra: Partial<Consulta<T>> = {}): Consulta<T> => ({
  dados,
  carregando: false,
  erro: null,
  recarregar: () => undefined,
  ...extra,
});

const loja = (extra = {}) => ({
  id_loja: "l1",
  codigo: "LOJA-CENTRO",
  nome: "Casa Lorenzi Centro",
  cidade: "Sao Paulo",
  uf: "SP",
  endereco: "Rua das Flores, 100",
  gerente: "Gerente da Loja",
  equipe: 5,
  unidades_em_estoque: 334,
  pecas_em_alerta: 26,
  vendas_30_dias: 73951.2,
  chamados_abertos: 6,
  ...extra,
});

const opcoes = validarOpcoes({
  lojas: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
  rede: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
  categorias: [],
  situacoes: [],
  tipos: [],
  pecas: [{ id_variacao: "v1", sku: "CL-CAM-OXF-BR-M", nome: "Camisa Oxford · Branco, M" }],
  motivos_entrada: [],
  motivos_saida: [],
  escopo: { papel: "gerente_loja", id_loja: "l1", loja_nome: "Casa Lorenzi Centro", pode_escolher_loja: false, somente_minhas: false },
});

const saldoComPeca = () =>
  validarSaldo({
    resumo: { unidades: 4, pecas: 1, estoque_baixo: 1, esgotadas: 0, valor_em_estoque: 1316 },
    lojas: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
    total: 1,
    itens: [
      {
        id_variacao: "v1",
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
      },
    ],
  });

const historico = () =>
  validarMovimentacoes({
    total: 1,
    itens: [
      {
        id_movimentacao: "m1",
        data: "2026-10-07T18:23:09Z",
        id_loja: "l1",
        loja_nome: "Casa Lorenzi Centro",
        id_variacao: "v1",
        sku: "CL-CAM-OXF-BR-M",
        produto: "Camisa Oxford Bianca",
        cor: "Branco",
        tamanho: "M",
        tipo_codigo: "venda",
        tipo_nome: "Venda",
        grupo: "saida",
        quantidade: -2,
        quantidade_anterior: 6,
        quantidade_posterior: 4,
        responsavel: null,
        motivo: "Pedido SD-1",
        numero_pedido: "SD-1",
      },
    ],
  });

function renderizar(elemento: React.ReactNode, rota = "/", caminho = "/") {
  return renderToString(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path={caminho} element={elemento} />
      </Routes>
    </MemoryRouter>,
  ).replaceAll("<!-- -->", "");
}

beforeEach(() => {
  estado.lojas = consulta(validarLojas({ itens: [loja()] }));
  estado.opcoes = consulta(opcoes);
  estado.saldo = consulta(saldoComPeca());
  estado.mov = consulta(historico());
});

describe("validação das lojas", () => {
  it("aceita o cartão e recusa campo fora do formato", () => {
    expect(validarLojas({ itens: [loja({ gerente: null, endereco: null })] })[0]?.gerente).toBeNull();
    expect(() => validarLojas({ itens: [loja({ equipe: "5" })] })).toThrow();
    expect(() => validarLojas({ itens: [loja({ vendas_30_dias: null })] })).toThrow();
    expect(() => validarLojas({})).toThrow();
  });
});

describe("Gestão > Lojas", () => {
  it("mostra os números que o servidor devolveu", () => {
    const html = renderizar(<Lojas />);
    expect(html).toContain("Casa Lorenzi Centro");
    expect(html).toContain("Sao Paulo, SP");
    expect(html).toContain("Gerente da Loja · 5 no time");
    expect(html).toContain("334");
    expect(html).toContain("26");
    expect(html).toContain("R$");
    expect(html).toContain("Os números da sua unidade.");
  });

  it("rede com várias lojas e loja sem gerente", () => {
    estado.lojas = consulta(validarLojas({ itens: [loja(), loja({ id_loja: "l2", nome: "Barra", gerente: null })] }));
    const html = renderizar(<Lojas />);
    expect(html).toContain("As casas da rede lado a lado.");
    expect(html).toContain("Sem gerente");
  });

  it("carregando e erro", () => {
    estado.lojas = consulta(null, { carregando: true });
    expect(renderizar(<Lojas />)).toContain("Carregando as lojas");
    estado.lojas = consulta(null, { erro: "Sem conexão com o servidor." });
    expect(renderizar(<Lojas />)).toContain("Sem conexão com o servidor.");
  });
});

describe("detalhe da peça", () => {
  const abrir = () => renderizar(<Peca />, "/painel/estoque/peca/CL-CAM-OXF-BR-M", "/painel/estoque/peca/:sku");

  it("mostra saldo por loja e histórico do servidor", () => {
    const html = abrir();
    expect(html).toContain("Camisa Oxford Bianca");
    expect(html).toContain("Branco · M");
    expect(html).toContain("Estoque baixo");
    expect(html).toContain("unidades em Casa Lorenzi Centro");
    expect(html).toContain("mín. 5");
    expect(html).toContain("Venda");
    expect(html).toContain("Sistema");
    expect(html).toContain("Pedido SD-1");
  });

  it("peça que a loja não tem mostra aviso, não uma peça de exemplo", () => {
    estado.saldo = consulta(validarSaldo({ ...saldoComPeca(), itens: [], total: 0 }));
    expect(abrir()).toContain("Peça não encontrada");
  });
});

describe("nada disto usa dados de exemplo", () => {
  it.each(["src/pages/painel/gestao/Lojas.tsx", "src/pages/painel/estoque/Peca.tsx", "src/layouts/PainelLayout.tsx"])(
    "%s não lê o estoque simulado nem o elenco de exemplo",
    (arquivo) => {
      const fonte = readFileSync(new URL(`../../../../${arquivo}`, import.meta.url), "utf-8");
      expect(fonte).not.toMatch(/useEstado|@\/lib\/store|produtosIniciais|@\/lib\/acoes|equipe\[|equipe,/);
    },
  );
});
