import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./api", () => ({ api }));

import {
  buscarClientePorCpf,
  lancarVenda,
  listarClientesCadastrados,
  listarVendas,
  pecasDaLoja,
  validarDetalheVenda,
  validarListaClientes,
  validarListaVendas,
  validarOpcoes,
  validarPecas,
} from "./vendasApi";

const venda = () => ({
  id_pedido: "p1",
  numero_pedido: "PD-20261022-AAAA1111",
  criado_em: "2026-10-22T12:00:00",
  canal_venda: "loja",
  loja: "Casa Lorenzi Centro",
  cliente: "Ana",
  vendedor: "Vendedor Teste",
  status_codigo: "entregue",
  status: "Entregue",
  pecas: 3,
  valor_total: "3870.00",
});

beforeEach(() => vi.clearAllMocks());

describe("vendas do vendedor: formato das respostas", () => {
  it("aceita a lista de vendas e converte o dinheiro em texto", () => {
    const r = validarListaVendas({ total: 1, itens: [venda()] });
    expect(r.itens[0]!.valor_total).toBe(3870);
    expect(() => validarListaVendas({ total: 1, itens: [{ ...venda(), pecas: "x" }] })).toThrow();
  });

  it("aceita o detalhe com as peças", () => {
    const d = validarDetalheVenda({
      ...venda(),
      cliente_cpf: "***.***.***-25",
      metodo_pagamento: "PIX",
      observacao: null,
      itens_da_venda: [{ sku: "S", produto: "Camisa", cor: "Branco", tamanho: "M", quantidade: 3, preco_unitario: "1290.00", valor_total: "3870.00" }],
    });
    expect(d.itens_da_venda[0]!.preco_unitario).toBe(1290);
    expect(() => validarDetalheVenda({ ...venda(), itens_da_venda: [] })).toThrow();
  });

  it("aceita clientes, peças e opções", () => {
    expect(validarListaClientes({ total: 0, itens: [] })).toEqual({ total: 0, itens: [] });
    const c = { id_cliente: "c1", nome: "Ana", cpf: "***.***.***-25", email: null, telefone: null, cidade: null, cliente_desde: "2026-01-01T00:00:00" };
    expect(validarListaClientes({ total: 1, itens: [c] }).itens[0]!.email).toBeNull();
    expect(validarPecas([{ id_variacao: "v", sku: "S", produto: "P", cor: null, tamanho: null, preco_venda: "10.50", disponivel: 4 }])[0]!.preco_venda).toBe(10.5);
    expect(validarOpcoes({ metodos: [{ codigo: "pix", nome: "PIX" }], loja: null }).metodos[0]!.codigo).toBe("pix");
    expect(() => validarPecas({})).toThrow();
  });
});

describe("vendas do vendedor: chamadas", () => {
  it("lista com busca e paginação", async () => {
    api.get.mockResolvedValue({});
    await listarVendas({ busca: "  ana ", limit: 20, offset: 40 });
    expect(api.get).toHaveBeenCalledWith("/api/v1/painel/vendas", expect.any(Function), { busca: "ana", limit: 20, offset: 40 }, undefined);
    await listarClientesCadastrados({ busca: "", limit: 20, offset: 0 });
    expect(api.get.mock.calls[1]![2]).toEqual({ busca: undefined, limit: 20, offset: 0 });
  });

  it("busca peças pela loja do token (a loja não vai na requisição)", async () => {
    api.get.mockResolvedValue([]);
    await pecasDaLoja(" camisa ");
    expect(api.get).toHaveBeenCalledWith("/api/v1/painel/vendas/pecas", expect.any(Function), { busca: "camisa", limit: 20 }, undefined);
  });

  it("acha o cliente com o CPF só em dígitos, no corpo", async () => {
    api.post.mockResolvedValue({});
    await buscarClientePorCpf("529.982.247-25");
    expect(api.post).toHaveBeenCalledWith("/api/v1/painel/vendas/clientes/buscar", expect.any(Function), { cpf: "52998224725" }, undefined);
  });

  it("lança a venda com a chave de idempotência e sem loja nem vendedor", async () => {
    api.post.mockResolvedValue({});
    await lancarVenda({ cpf: "529.982.247-25", metodo_pagamento: "pix", itens: [{ id_variacao: "v", quantidade: 2 }] }, "chave-1");
    expect(api.post).toHaveBeenCalledWith(
      "/api/v1/painel/vendas",
      expect.any(Function),
      { cpf: "52998224725", metodo_pagamento: "pix", itens: [{ id_variacao: "v", quantidade: 2 }] },
      { idempotencia: "chave-1" },
    );
  });
});
