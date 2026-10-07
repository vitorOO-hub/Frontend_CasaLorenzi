import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hooks de dados e sessão trocados por dados fixos: aqui se testa só a renderização e a privacidade.
const estado = vi.hoisted(() => ({
  papel: "atendente" as "atendente" | "gerente_loja",
  modo: "dados" as "dados" | "vazio" | "carregando" | "erro",
}));

vi.mock("@/hooks/useClientes", () => {
  const cliente = (n: number, gestao: boolean) => ({
    id_cliente: `6f1c3a52-6a4e-4c8e-9a39-0f1f2b6f2f1${n}`,
    nome: `Cliente ${n}`,
    email: `cliente${n}@exemplo.com`,
    telefone: n === 1 ? null : "11 99999-0000",
    cidade: n === 1 ? null : "Sao Paulo, SP",
    cliente_desde: "2025-01-10T00:00:00Z",
    total_chamados: 3,
    chamados_em_aberto: n === 1 ? 2 : 0,
    compras: gestao ? 4 : null,
    total_gasto: gestao ? 1234.5 : null,
  });
  const ficha = (gestao: boolean) => ({
    cliente: { ...cliente(1, gestao) },
    resumo: {
      chamados: 3,
      chamados_em_aberto: 1,
      compras: gestao ? 2 : null,
      total_gasto: gestao ? 300 : null,
      ticket_medio: gestao ? 150 : null,
    },
    chamados: [
      {
        id_atendimento: "a-1",
        protocolo: "AT-2026-0001",
        assunto: "Costura soltando",
        categoria: { codigo: "entrega", nome: "Entrega" },
        status: { codigo: "aberto", nome: "Aberto" },
        aberto_em: "2026-10-05T10:00:00Z",
      },
    ],
    compras: gestao
      ? [{ id_pedido: "p-1", numero_pedido: "PD-1", criado_em: "2026-09-01T00:00:00Z", loja_nome: "Centro", valor_total: 100, status: { codigo: "pago", nome: "Pago" } }]
      : null,
  });
  const resposta = <T,>(valor: T) => {
    if (estado.modo === "carregando") return { dados: null, carregando: true, erro: null, recarregar: () => undefined };
    if (estado.modo === "erro") return { dados: null, carregando: false, erro: "Sem conexão com o servidor.", recarregar: () => undefined };
    return { dados: estado.modo === "vazio" ? null : valor, carregando: false, erro: null, recarregar: () => undefined };
  };
  return {
    useAtraso: <T,>(v: T) => v,
    useListaClientes: () => {
      const gestao = estado.papel === "gerente_loja";
      return estado.modo === "vazio"
        ? { dados: { total: 0, itens: [] }, carregando: false, erro: null, recarregar: () => undefined }
        : resposta({ total: 2, itens: [cliente(1, gestao), cliente(2, gestao)] });
    },
    useFichaCliente: () => resposta(ficha(estado.papel === "gerente_loja")),
  };
});

vi.mock("@/hooks/useChamados", () => ({
  useOpcoesChamados: () => ({
    dados: { status: [], canais: [], categorias: [], prioridades: [], lojas: [{ id_loja: "l-1", nome: "Centro" }, { id_loja: "l-2", nome: "Barra" }] },
    carregando: false,
    erro: null,
    recarregar: () => undefined,
  }),
}));

vi.mock("@/lib/sessao", () => ({
  usePapel: () => estado.papel,
  podeAprovar: (papel: string) => papel === "gerente_loja" || papel === "admin",
}));

import { Cliente } from "./Cliente";
import { Clientes } from "./Clientes";

let erros: unknown[][] = [];
beforeEach(() => {
  erros = [];
  estado.papel = "atendente";
  estado.modo = "dados";
  vi.spyOn(console, "error").mockImplementation((...args) => {
    erros.push(args);
  });
});
afterEach(() => vi.restoreAllMocks());

const ID = "6f1c3a52-6a4e-4c8e-9a39-0f1f2b6f2f11";
// O React separa textos vizinhos com <!-- -->; tirar isso deixa as buscas por texto previsíveis.
const tela = (elemento: React.ReactNode, rota = "/painel/atendimento/clientes", caminho = "/painel/atendimento/clientes") =>
  renderToString(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path={caminho} element={elemento} />
      </Routes>
    </MemoryRouter>,
  ).replace(/<!-- -->/g, "");
const ficha = (id = ID) => tela(<Cliente />, `/painel/atendimento/clientes/${id}`, "/painel/atendimento/clientes/:id");

describe("lista de clientes", () => {
  it("renderiza as seções, a busca e as linhas, sem erro do React", () => {
    const html = tela(<Clientes />);
    for (const t of ["Todos", "Com chamado em aberto", "Meus clientes", "Cliente 1", "cliente1@exemplo.com"]) expect(html).toContain(t);
    expect(html).toContain("(2 em aberto)");
    expect(html).toContain("Barra"); // o admin pode filtrar por loja quando há mais de uma
    expect(erros).toEqual([]);
  });

  it("atendente não vê as colunas de compras nem valores", () => {
    const html = tela(<Clientes />);
    expect(html).not.toContain("Total gasto");
    expect(html).not.toContain("R$");
  });

  it("gerente vê compras e total gasto", () => {
    estado.papel = "gerente_loja";
    const html = tela(<Clientes />);
    expect(html).toContain("Total gasto");
    expect(html).toContain("R$");
  });

  it.each(["vazio", "carregando", "erro"] as const)("estado %s não quebra", (modo) => {
    estado.modo = modo;
    expect(() => tela(<Clientes />)).not.toThrow();
    expect(erros).toEqual([]);
  });
});

describe("ficha do cliente", () => {
  it("atendente vê contato e chamados, sem compras, total gasto ou ticket médio", () => {
    const html = ficha();
    expect(html).toContain("Cliente 1");
    expect(html).toContain("AT-2026-0001");
    for (const proibido of ["Total gasto", "Ticket médio", "Compras", "PD-1", "R$"]) expect(html).not.toContain(proibido);
    expect(erros).toEqual([]);
  });

  it("gerente vê as compras e os valores", () => {
    estado.papel = "gerente_loja";
    const html = ficha();
    for (const t of ["Total gasto", "Ticket médio", "PD-1", "R$"]) expect(html).toContain(t);
    expect(erros).toEqual([]);
  });

  it("id que não é UUID mostra aviso sem chamar a API", () => {
    expect(ficha("c1")).toContain("Cliente não encontrado");
  });

  it.each(["vazio", "carregando", "erro"] as const)("estado %s não quebra", (modo) => {
    estado.modo = modo;
    expect(() => ficha()).not.toThrow();
    expect(erros).toEqual([]);
  });
});
