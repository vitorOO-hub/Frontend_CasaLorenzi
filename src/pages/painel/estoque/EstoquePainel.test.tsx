import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  validarAjustes,
  validarMovimentacoes,
  validarOpcoes,
  validarSaldo,
  type Ajustes,
  type Movimentacoes,
  type OpcoesEstoque,
  type Saldo,
} from "@/lib/estoquePainelApi";

type Consulta<T> = { dados: T | null; carregando: boolean; erro: string | null; recarregar: () => void };
const estado = vi.hoisted(() => ({
  opcoes: null as unknown,
  saldo: null as unknown,
  movimentacoes: null as unknown,
  ajustes: null as unknown,
  pendentes: null as unknown,
}));

vi.mock("@/hooks/useEstoquePainel", () => ({
  useOpcoesEstoque: () => estado.opcoes,
  useSaldoEstoque: () => estado.saldo,
  useMovimentacoesEstoque: () => estado.movimentacoes,
  // Aprovações pede "pendente" e "decididos"; o cartão do operador pede sem filtro.
  useAjustesEstoque: (filtros: { situacao?: string }) =>
    filtros.situacao === "pendente" ? estado.pendentes : estado.ajustes,
  useAtraso: <T,>(valor: T) => valor,
}));

import { ModalAjusteEstoque, ModalMovimentoEstoque } from "@/components/estoqueRegistro";
import { Aprovacoes } from "./Aprovacoes";
import { Movimentacoes as TelaMovimentacoes } from "./Movimentacoes";
import { Saldo as TelaSaldo } from "./Saldo";

const consulta = <T,>(dados: T | null, extra: Partial<Consulta<T>> = {}): Consulta<T> => ({
  dados,
  carregando: false,
  erro: null,
  recarregar: () => undefined,
  ...extra,
});

const opcoes = (escopo = {}): OpcoesEstoque =>
  validarOpcoes({
    lojas: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
    rede: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
    categorias: ["Camisas", "Calças"],
    situacoes: [
      { codigo: "ok", nome: "OK" },
      { codigo: "baixo", nome: "Estoque baixo" },
      { codigo: "esgotado", nome: "Esgotado" },
    ],
    tipos: [
      { codigo: "entrada", nome: "Entrada" },
      { codigo: "saida", nome: "Saída" },
    ],
    pecas: [{ id_variacao: "v1", sku: "CL-CAM-OXF-BR-M", nome: "Camisa Oxford Bianca · Branco, M" }],
    motivos_entrada: ["Recebimento de fornecedor", "Devolução de cliente"],
    motivos_saida: ["Venda em loja", "Avaria"],
    escopo: {
      papel: "gerente_loja",
      id_loja: "l1",
      loja_nome: "Casa Lorenzi Centro",
      pode_escolher_loja: false,
      somente_minhas: false,
      ...escopo,
    },
  });

const item = (extra = {}) => ({
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
  ...extra,
});

const saldo = (extra = {}): Saldo =>
  validarSaldo({
    resumo: { unidades: 334, pecas: 63, estoque_baixo: 22, esgotadas: 4, valor_em_estoque: 190415.2 },
    lojas: [{ id_loja: "l1", nome: "Casa Lorenzi Centro" }],
    total: 2,
    itens: [
      item(),
      item({ id_variacao: "v2", sku: "CL-CIN-CA-100", produto: "Cinto Couro Siena", cor: "Caramelo", tamanho: "100", total: 0, situacao: "esgotado", por_loja: [{ id_loja: "l1", quantidade: 0, minimo: 5 }] }),
    ],
    ...extra,
  });

const movimento = (extra = {}) => ({
  id_movimentacao: "m1",
  data: "2026-10-07T18:23:09Z",
  id_loja: "l1",
  loja_nome: "Casa Lorenzi Centro",
  id_variacao: "v1",
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

const historico = (itens = [movimento()], total = itens.length): Movimentacoes =>
  validarMovimentacoes({ total, itens });

const ajuste = (extra = {}) => ({
  id_ajuste: "aj1",
  id_loja: "l1",
  loja_nome: "Casa Lorenzi Centro",
  id_variacao: "v1",
  sku: "CL-CAM-OXF-BR-M",
  produto: "Camisa Oxford Bianca",
  cor: "Branco",
  tamanho: "M",
  quantidade: -3,
  saldo_atual: 5,
  motivo: "Peças danificadas no transporte",
  status: "pendente",
  motivo_recusa: null,
  solicitante: "Operador de Estoque",
  decisor: null,
  solicitado_em: "2026-10-07T12:00:00Z",
  decidido_em: null,
  ...extra,
});

const ajustes = (itens = [ajuste()], pendentes = itens.filter((a) => a.status === "pendente").length): Ajustes =>
  validarAjustes({ total: itens.length, pendentes, itens });

function render(tela: "saldo" | "movimentacoes" | "aprovacoes") {
  const Tela = { saldo: TelaSaldo, movimentacoes: TelaMovimentacoes, aprovacoes: Aprovacoes }[tela];
  const html = renderToString(
    <MemoryRouter>
      <Tela />
    </MemoryRouter>,
  );
  return html.replaceAll("<!-- -->", "");
}

beforeEach(() => {
  estado.opcoes = consulta(opcoes());
  estado.saldo = consulta(saldo());
  estado.movimentacoes = consulta(historico());
  estado.ajustes = consulta(ajustes([]));
  estado.pendentes = consulta(ajustes());
});

describe("Saldo de estoque", () => {
  it("mostra o resumo e as peças exatamente como a API devolveu", () => {
    const html = render("saldo");
    expect(html).toContain("334"); // unidades
    expect(html).toContain("63 peças em estoque");
    expect(html).toContain("R$"); // valor em estoque
    expect(html).toContain("Camisa Oxford Bianca");
    expect(html).toContain("Branco · M");
    expect(html).toContain("CL-CAM-OXF-BR-M");
    expect(html).toContain("Cinto Couro Siena");
    expect(html).toContain("Estoque baixo");
    expect(html).toContain("Esgotado");
    expect(html).toContain("Peças disponíveis em Casa Lorenzi Centro");
  });

  it("não mostra peça que a API não mandou", () => {
    estado.saldo = consulta(saldo({ itens: [item()], total: 1 }));
    const html = render("saldo");
    expect(html).not.toContain("Cinto Couro Siena");
    expect(html).not.toContain("Blazer Estruturado Modena"); // peça do protótipo, sem registro no banco
  });

  it("rede: uma coluna por loja e o total", () => {
    const duas = [
      { id_loja: "l1", nome: "Casa Lorenzi Centro" },
      { id_loja: "l2", nome: "Casa Lorenzi Barra" },
    ];
    estado.saldo = consulta(
      saldo({ lojas: duas, itens: [item({ total: 9, por_loja: [{ id_loja: "l1", quantidade: 4, minimo: 5 }, { id_loja: "l2", quantidade: 5, minimo: 2 }] })], total: 1 }),
    );
    const html = render("saldo");
    expect(html).toContain("Casa Lorenzi Barra");
    expect(html).toContain(">Total<");
    expect(html).toContain("Saldo por unidade da rede");
  });

  it("filtros vêm das opções do servidor", () => {
    const html = render("saldo");
    expect(html).toContain(">Calças<");
    expect(html).toContain(">Estoque baixo<");
  });

  it("estado vazio, carregando e erro", () => {
    estado.saldo = consulta(saldo({ itens: [], total: 0 }));
    expect(render("saldo")).toContain("Nenhuma peça com esses filtros.");
    estado.saldo = consulta(null, { carregando: true });
    expect(render("saldo")).toContain("Carregando o estoque");
    estado.saldo = consulta(null, { erro: "O servidor está indisponível no momento." });
    expect(render("saldo")).toContain("O servidor está indisponível no momento.");
  });

  it("pagina quando há mais de 50 peças", () => {
    estado.saldo = consulta(saldo({ total: 130 }));
    const html = render("saldo");
    expect(html).toContain("1–50 de 130");
    expect(html).toContain("Próxima");
  });
});

describe("Movimentações", () => {
  it("mostra cada lançamento do banco com quantidade, saldo, responsável e motivo", () => {
    const html = render("movimentacoes");
    expect(html).toContain("Ajuste negativo");
    expect(html).toContain("-5");
    expect(html).toContain("5 → 0");
    expect(html).toContain("Gerente da Loja");
    expect(html).toContain("Inventário: peças não localizadas");
    expect(html).toContain("Branco · G");
    expect(html).toContain("Histórico completo de Casa Lorenzi Centro, de todos os operadores.");
  });

  it("venda automática aparece como Sistema, com o número do pedido", () => {
    estado.movimentacoes = consulta(
      historico([movimento({ tipo_codigo: "venda", tipo_nome: "Venda", grupo: "saida", quantidade: -2, responsavel: null, motivo: null, numero_pedido: "SD-20261007-00012" })]),
    );
    const html = render("movimentacoes");
    expect(html).toContain("Sistema");
    expect(html).toContain("Pedido SD-20261007-00012");
  });

  it("operador vê que o histórico é só o que ele registrou", () => {
    estado.opcoes = consulta(opcoes({ papel: "operador_estoque", somente_minhas: true }));
    expect(render("movimentacoes")).toContain("que você registrou em Casa Lorenzi Centro");
  });

  it("admin vê a coluna e o filtro de loja", () => {
    estado.opcoes = consulta(opcoes({ papel: "admin", id_loja: null, loja_nome: null, pode_escolher_loja: true }));
    const html = render("movimentacoes");
    expect(html).toContain("Histórico completo da rede.");
    expect(html).toContain("<th");
    expect(html).toContain(">Loja<");
  });

  it("os botões de registro estão ativos quando as opções já chegaram", () => {
    const html = render("movimentacoes");
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Registrar entrada \/ saída/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Ajuste de inventário/);
    estado.opcoes = consulta(null, { carregando: true });
    expect(render("movimentacoes")).toMatch(/<button[^>]*disabled=""[^>]*>Registrar entrada \/ saída/);
  });

  it("operador acompanha os próprios pedidos de ajuste, com a recusa", () => {
    estado.opcoes = consulta(opcoes({ papel: "operador_estoque", somente_minhas: true }));
    estado.ajustes = consulta(
      ajustes([
        ajuste(),
        ajuste({ id_ajuste: "aj2", status: "rejeitado", motivo_recusa: "Contagem não bate com a nota" }),
      ]),
    );
    const html = render("movimentacoes");
    expect(html).toContain("Seus pedidos de ajuste");
    expect(html).toContain("Pendente");
    expect(html).toContain("Recusado");
    expect(html).toContain("Recusa: Contagem não bate com a nota");
    expect(html).toContain("saldo 5 → 2 se aprovado");
  });

  it("gerente não vê o cartão de pedidos de ajuste (ele decide em Aprovações)", () => {
    estado.ajustes = consulta(ajustes());
    expect(render("movimentacoes")).not.toContain("Seus pedidos de ajuste");
  });

  it("estado vazio, erro e paginação", () => {
    estado.movimentacoes = consulta(historico([], 0));
    expect(render("movimentacoes")).toContain("Nenhuma movimentação com esses filtros.");
    estado.movimentacoes = consulta(null, { erro: "Sua sessão expirou. Entre novamente." });
    expect(render("movimentacoes")).toContain("Sua sessão expirou.");
    estado.movimentacoes = consulta(historico([movimento()], 1840));
    expect(render("movimentacoes")).toContain("1–25 de 1.840");
  });
});

describe("as duas telas não usam dados de exemplo", () => {
  it.each(["Saldo.tsx", "Movimentacoes.tsx", "Aprovacoes.tsx"])("%s não importa o estoque simulado", (arquivo) => {
    const fonte = readFileSync(new URL(`./${arquivo}`, import.meta.url), "utf-8");
    expect(fonte).not.toMatch(/useEstado|@\/lib\/store|produtosIniciais|from "@\/lib\/dados"/);
    expect(fonte).toContain("@/hooks/useEstoquePainel");
  });

  it("o hook consulta só as rotas privadas do painel", () => {
    const fonte = readFileSync(new URL("../../../lib/estoquePainelApi.ts", import.meta.url), "utf-8");
    expect(fonte).toContain('"/api/v1/painel/estoque"');
    expect(fonte).not.toMatch(/produtosIniciais|useEstado/);
  });
});

describe("Aprovações", () => {
  it("mostra cada ajuste pendente do servidor com a conta do saldo", () => {
    const html = render("aprovacoes");
    expect(html).toContain("Camisa Oxford Bianca");
    expect(html).toContain("Branco · M");
    expect(html).toContain("pedido por Operador de Estoque");
    expect(html).toContain("Peças danificadas no transporte");
    expect(html).toContain("Saldo atual 5 → depois do ajuste 2");
    expect(html).toMatch(/<button[^>]*>.*Aprovar/);
    expect(html).toContain("Recusar");
  });

  it("ajuste que não cabe mais no saldo não pode ser aprovado", () => {
    estado.pendentes = consulta(ajustes([ajuste({ quantidade: -9 })]));
    const html = render("aprovacoes");
    expect(html).toContain("Saldo atual 5 → depois do ajuste -4");
    expect(html).toContain("não cabe mais");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Aprovar/);
  });

  it("sem pendentes mostra o aviso", () => {
    estado.pendentes = consulta(ajustes([]));
    expect(render("aprovacoes")).toContain("Nenhum ajuste aguardando aprovação.");
  });

  it("decisões anteriores trazem quem decidiu e o motivo da recusa", () => {
    estado.ajustes = consulta(
      ajustes([
        ajuste({ id_ajuste: "d1", status: "aprovado", decisor: "Gerente da Loja", decidido_em: "2026-10-06T10:00:00Z" }),
        ajuste({ id_ajuste: "d2", status: "rejeitado", decisor: "Gerente da Loja", motivo_recusa: "Não bate", decidido_em: "2026-10-06T11:00:00Z" }),
      ]),
    );
    const html = render("aprovacoes");
    expect(html).toContain("Aprovado");
    expect(html).toContain("Recusado");
    expect(html).toContain("por Gerente da Loja");
    expect(html).toContain("Recusa: Não bate");
  });

  it("carregando e erro", () => {
    estado.pendentes = consulta(null, { carregando: true });
    expect(render("aprovacoes")).toContain("Carregando os ajustes");
    estado.pendentes = consulta(null, { erro: "Sem conexão com o servidor." });
    expect(render("aprovacoes")).toContain("Sem conexão com o servidor.");
  });
});

describe("janelas de registro", () => {
  const texto = (html: string) => html.replace(/<[^>]+>/g, "");
  const modal = (Modal: typeof ModalMovimentoEstoque, extra = {}) =>
    renderToString(<Modal aberto opcoes={opcoes()} onFechar={() => undefined} onSucesso={() => undefined} {...extra} />).replaceAll(
      "<!-- -->",
      "",
    );

  it("entrada: mostra o saldo lido do servidor e o saldo depois", () => {
    const html = modal(ModalMovimentoEstoque, { skuInicial: "CL-CAM-OXF-BR-M" });
    expect(html).toContain("Registrar entrada ou saída");
    expect(texto(html)).toContain("Saldo em Casa Lorenzi Centro: 4 → 5");
    expect(html).toContain("Recebimento de fornecedor");
    expect(html).toContain("CL-CAM-OXF-BR-M · Camisa Oxford Bianca · Branco, M");
  });

  it("a loja do gerente é fixa; o admin escolhe", () => {
    expect(modal(ModalMovimentoEstoque)).toMatch(/<input[^>]*readOnly[^>]*value="Casa Lorenzi Centro"|value="Casa Lorenzi Centro"[^>]*readOnly/);
    const admin = opcoes({ papel: "admin", id_loja: null, loja_nome: null, pode_escolher_loja: true });
    const html = renderToString(
      <ModalMovimentoEstoque aberto opcoes={admin} onFechar={() => undefined} onSucesso={() => undefined} />,
    );
    expect(html).toContain(`role="combobox"`);
  });

  it("enquanto o saldo não chegou, o botão de registrar fica desativado", () => {
    estado.saldo = consulta(null, { carregando: true });
    const html = modal(ModalMovimentoEstoque);
    expect(html).toContain("Consultando o saldo");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Registrar/);
  });

  it("ajuste: parte do saldo do sistema e mostra a diferença", () => {
    const html = modal(ModalAjusteEstoque, { skuInicial: "CL-CAM-OXF-BR-M" });
    expect(html).toContain("Solicitar ajuste de inventário");
    expect(texto(html)).toContain("Saldo no sistema: 4 · diferença: 0");
    expect(html).toContain("A contagem é igual ao saldo");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Enviar para aprovação/);
  });
});
