import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validarOpcoes, type OpcoesEstoque } from "@/lib/estoquePainelApi";
import { validarMinimos, validarTransferencias, type Minimos, type Transferencias } from "@/lib/transferenciasApi";

type Consulta<T> = { dados: T | null; carregando: boolean; erro: string | null; recarregar: () => void };
const estado = vi.hoisted(() => ({
  opcoes: null as unknown,
  transferencias: null as unknown,
  reposicoes: null as unknown,
  minimos: null as unknown,
}));

vi.mock("@/hooks/useEstoquePainel", () => ({
  useOpcoesEstoque: () => estado.opcoes,
  // A tela pede duas listas: transferências e reposições.
  useTransferencias: (f: { tipo?: string }) => (f.tipo === "reposicao_rede" ? estado.reposicoes : estado.transferencias),
  useMinimos: () => estado.minimos,
}));

import { Minimos as TelaMinimos } from "./Minimos";
import { Transferencias as TelaTransferencias } from "./Transferencias";

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
    rede: [
      { id_loja: "l1", nome: "Casa Lorenzi Centro" },
      { id_loja: "l2", nome: "Casa Lorenzi Barra" },
    ],
    categorias: [],
    situacoes: [],
    tipos: [],
    pecas: [{ id_variacao: "v1", sku: "CL-BLA-MA-M", nome: "Blazer · Marinho, M" }],
    motivos_entrada: [],
    motivos_saida: [],
    escopo: { papel: "gerente_loja", id_loja: "l1", loja_nome: "Casa Lorenzi Centro", pode_escolher_loja: false, somente_minhas: false, ...escopo },
  });

const item = (extra = {}) => ({
  id_transferencia: "t1",
  tipo: "transferencia",
  status: "solicitada",
  solicitada_em: "2026-10-07T12:00:00Z",
  aceita_em: null,
  recebida_em: null,
  id_loja_origem: "l1",
  origem_nome: "Casa Lorenzi Centro",
  id_loja_destino: "l2",
  destino_nome: "Casa Lorenzi Barra",
  sku: "CL-BLA-MA-M",
  produto: "Blazer Estruturado Modena",
  cor: "Marinho",
  tamanho: "M",
  quantidade: 2,
  observacao: "Cliente quer em outro tamanho",
  motivo_recusa: null,
  solicitante: "Rafael Queiroz",
  responsavel: null,
  acoes: ["aceitar", "recusar"],
  ...extra,
});

const lista = (itens: object[] = []): Transferencias =>
  validarTransferencias({ total: itens.length, aguardando_voce: itens.length, itens });

const minimos = (): Minimos =>
  validarMinimos({
    id_loja: "l1",
    loja_nome: "Casa Lorenzi Centro",
    total: 2,
    itens: [
      { id_variacao: "v1", sku: "CL-BLA-MA-M", produto: "Blazer Estruturado Modena", cor: "Marinho", tamanho: "M", saldo: 2, minimo: 2 },
      { id_variacao: "v2", sku: "CL-CIN-CA-100", produto: "Cinto Couro Siena", cor: "Caramelo", tamanho: "100", saldo: 0, minimo: 5 },
    ],
  });

function render(Tela: typeof TelaTransferencias) {
  const html = renderToString(
    <MemoryRouter>
      <Tela />
    </MemoryRouter>,
  );
  return html.replaceAll("<!-- -->", "");
}

beforeEach(() => {
  estado.opcoes = consulta(opcoes());
  estado.transferencias = consulta(lista([item()]));
  estado.reposicoes = consulta(lista([]));
  estado.minimos = consulta(minimos());
});

describe("Transferências", () => {
  it("mostra o que o servidor devolveu, com as ações que ele permitiu", () => {
    const html = render(TelaTransferencias);
    expect(html).toContain("Blazer Estruturado Modena");
    expect(html).toContain("Marinho · M");
    expect(html).toContain("Casa Lorenzi Centro");
    expect(html).toContain("Casa Lorenzi Barra");
    expect(html).toContain("Rafael Queiroz");
    expect(html).toContain("Aceitar envio");
    expect(html).toContain("Recusar");
    expect(html).toContain("Pendente");
  });

  it("sem ação permitida mostra quem está esperando, e não oferece botão", () => {
    estado.transferencias = consulta(lista([item({ acoes: [] })]));
    const html = render(TelaTransferencias);
    expect(html).toContain("Aguardando a origem");
    expect(html).not.toContain("Aceitar envio");
  });

  it("em trânsito o destino confirma o recebimento", () => {
    estado.transferencias = consulta(lista([item({ status: "aceita", acoes: ["receber"] })]));
    const html = render(TelaTransferencias);
    expect(html).toContain("Em trânsito");
    expect(html).toContain("Confirmar recebimento");
  });

  it("reposição aberta aparece em Pedidos de reposição com Atender", () => {
    estado.transferencias = consulta(lista([]));
    estado.reposicoes = consulta(lista([item({ tipo: "reposicao_rede", id_loja_origem: null, origem_nome: null })]));
    const html = render(TelaTransferencias);
    expect(html).toContain("Aberta");
    expect(html).toContain("Toda a rede");
    expect(html).toContain("Atender");
  });

  it("mostra o motivo da recusa", () => {
    estado.transferencias = consulta(lista([item({ status: "recusada", acoes: [], motivo_recusa: "Sem peça para mandar" })]));
    expect(render(TelaTransferencias)).toContain("Recusa: Sem peça para mandar");
  });

  it("estado vazio, carregando e erro", () => {
    estado.transferencias = consulta(lista([]));
    expect(render(TelaTransferencias)).toContain("Nada aguardando você.");
    estado.transferencias = consulta(null, { carregando: true });
    expect(render(TelaTransferencias)).toContain("Carregando as transferências");
    estado.transferencias = consulta(null, { erro: "Sem conexão com o servidor." });
    expect(render(TelaTransferencias)).toContain("Sem conexão com o servidor.");
  });

  it("botões de pedir ficam desativados até as opções chegarem", () => {
    estado.opcoes = consulta(null, { carregando: true });
    expect(render(TelaTransferencias)).toMatch(/<button[^>]*disabled=""[^>]*>Nova transferência/);
  });
});

describe("Estoque mínimo", () => {
  it("lista as peças da loja com saldo e mínimo vindos do servidor", () => {
    const html = render(TelaMinimos);
    expect(html).toContain("Blazer Estruturado Modena");
    expect(html).toContain("CL-CIN-CA-100");
    expect(html).toContain("Casa Lorenzi Centro");
    expect(html).toContain("Abaixo do mínimo");
    expect(html).toContain("Esgotado");
  });

  it("sem alteração o botão de salvar está desativado", () => {
    expect(render(TelaMinimos)).toMatch(/<button[^>]*disabled=""[^>]*>Salvar/);
  });

  it("admin escolhe a unidade", () => {
    estado.opcoes = consulta(opcoes({ papel: "admin", id_loja: null, loja_nome: null, pode_escolher_loja: true }));
    expect(render(TelaMinimos)).toContain(`role="combobox"`);
  });

  it("vazio e erro", () => {
    estado.minimos = consulta(null, { carregando: true });
    expect(render(TelaMinimos)).toContain("Carregando o estoque");
    estado.minimos = consulta(null, { erro: "Sua sessão expirou. Entre novamente." });
    expect(render(TelaMinimos)).toContain("Sua sessão expirou.");
  });
});

describe("as duas telas não usam dados de exemplo", () => {
  it.each(["Transferencias.tsx", "Minimos.tsx"])("%s não importa o estoque simulado", (arquivo) => {
    const fonte = readFileSync(new URL(`./${arquivo}`, import.meta.url), "utf-8");
    expect(fonte).not.toMatch(/useEstado|@\/lib\/store|produtosIniciais|from "@\/lib\/dados"|@\/lib\/acoes/);
    expect(fonte).toContain("@/hooks/useEstoquePainel");
  });

  it("a contagem de pendências do menu vem do servidor", () => {
    const fonte = readFileSync(new URL("../../../lib/pendencias.ts", import.meta.url), "utf-8");
    expect(fonte).not.toMatch(/useEstado|store/);
  });
});
