import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./api", () => ({ api }));

import { buscarFicha, ehUuid, listarClientes, validarFicha, validarItemCliente, validarListaClientes } from "./clientesApi";

const op = (codigo: string, nome = codigo) => ({ codigo, nome });

const item = () => ({
  id_cliente: "6f1c3a52-6a4e-4c8e-9a39-0f1f2b6f2f10",
  nome: "Helena",
  email: "helena@exemplo.com",
  telefone: null,
  cidade: null,
  cliente_desde: "2025-01-10T00:00:00Z",
  total_chamados: 2,
  chamados_em_aberto: 1,
  compras: null,
  total_gasto: null,
});

const ficha = () => ({
  cliente: {
    id_cliente: item().id_cliente,
    nome: "Helena",
    email: "helena@exemplo.com",
    telefone: "11 99999-0000",
    cidade: "Sao Paulo, SP",
    cliente_desde: "2025-01-10T00:00:00Z",
  },
  resumo: { chamados: 2, chamados_em_aberto: 1, compras: null, total_gasto: null, ticket_medio: null },
  chamados: [
    { id_atendimento: "a-1", protocolo: "AT-2026-0001", assunto: "Costura", categoria: op("entrega", "Entrega"), status: op("aberto", "Aberto"), aberto_em: "2026-10-05T10:00:00Z" },
  ],
  compras: null,
});

beforeEach(() => vi.clearAllMocks());

describe("validação das respostas de clientes", () => {
  it("item do atendente: compras e valores nulos continuam nulos", () => {
    const v = validarItemCliente(item());
    expect(v.compras).toBeNull();
    expect(v.total_gasto).toBeNull();
  });

  it("item da gestão: o valor decimal vem como texto e vira número", () => {
    const v = validarItemCliente({ ...item(), compras: 3, total_gasto: "1250.50" });
    expect(v.compras).toBe(3);
    expect(v.total_gasto).toBeCloseTo(1250.5);
  });

  it("recusa valor que não é número", () => {
    expect(() => validarItemCliente({ ...item(), total_gasto: "abc" })).toThrow();
    expect(() => validarItemCliente({ ...item(), total_chamados: "2" })).toThrow();
  });

  it("descarta campo que não deveria vir, como o documento", () => {
    const v = validarItemCliente({ ...item(), documento: "123.456.789-00" });
    expect(v).not.toHaveProperty("documento");
  });

  it("lista", () => {
    const l = validarListaClientes({ total: 1, itens: [item()] });
    expect(l.total).toBe(1);
    expect(l.itens[0]!.nome).toBe("Helena");
    expect(() => validarListaClientes({ total: 1 })).toThrow();
  });

  it("ficha do atendente não tem compras", () => {
    const f = validarFicha(ficha());
    expect(f.compras).toBeNull();
    expect(f.resumo.compras).toBeNull();
    expect(f.chamados[0]!.protocolo).toBe("AT-2026-0001");
  });

  it("ficha da gestão converte os decimais", () => {
    const f = validarFicha({
      ...ficha(),
      resumo: { chamados: 2, chamados_em_aberto: 1, compras: 2, total_gasto: "300.00", ticket_medio: "150.00" },
      compras: [
        { id_pedido: "p-1", numero_pedido: "PD-1", criado_em: "2026-09-01T00:00:00Z", loja_nome: "Centro", valor_total: "100.00", status: op("pago", "Pago") },
      ],
    });
    expect(f.resumo.ticket_medio).toBe(150);
    expect(f.compras![0]!.valor_total).toBe(100);
  });

  it("recusa ficha incompleta", () => {
    const { resumo: _, ...semResumo } = ficha();
    expect(() => validarFicha(semResumo)).toThrow();
    expect(() => validarFicha(null)).toThrow();
  });
});

describe("id do cliente", () => {
  it("só UUID vai para a API", () => {
    expect(ehUuid("6f1c3a52-6a4e-4c8e-9a39-0f1f2b6f2f10")).toBe(true);
    for (const ruim of ["", "c1", "../admin", "6f1c3a52", "<script>", undefined]) expect(ehUuid(ruim as string)).toBe(false);
  });
});

describe("chamadas", () => {
  it("lista: manda busca aparada, seção e paginação; deixa de fora o vazio", () => {
    listarClientes({ busca: "  helena ", secao: "meus", idLoja: undefined, limit: 20, offset: 40 });
    const [caminho, validar, parametros] = api.get.mock.calls[0]!;
    expect(caminho).toBe("/api/v1/painel/clientes");
    expect(validar).toBe(validarListaClientes);
    expect(parametros).toEqual({ busca: "helena", secao: "meus", id_loja: undefined, limit: 20, offset: 40 });
  });

  it("busca só com espaços não é enviada", () => {
    listarClientes({ busca: "   ", secao: "todos", limit: 20, offset: 0 });
    expect(api.get.mock.calls[0]![2].busca).toBeUndefined();
  });

  it("ficha usa GET no caminho do cliente", () => {
    buscarFicha("6f1c3a52-6a4e-4c8e-9a39-0f1f2b6f2f10");
    expect(api.get.mock.calls[0]![0]).toBe("/api/v1/painel/clientes/6f1c3a52-6a4e-4c8e-9a39-0f1f2b6f2f10");
    expect(api.post).not.toHaveBeenCalled();
  });
});
