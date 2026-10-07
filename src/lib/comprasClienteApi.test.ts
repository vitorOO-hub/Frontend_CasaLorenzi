import { describe, expect, it } from "vitest";
import { validarLojaCliente, validarPedidoCliente } from "./comprasClienteApi";

describe("compras do cliente", () => {
  it("valida a loja vinda do backend", () => {
    expect(
      validarLojaCliente({
        id_loja: "loja-1",
        nome: "Casa Lorenzi Centro",
        cidade: "São Paulo",
        uf: "SP",
        endereco: null,
      }),
    ).toEqual({
      id_loja: "loja-1",
      nome: "Casa Lorenzi Centro",
      cidade: "São Paulo",
      uf: "SP",
      endereco: null,
    });
  });

  it("valida o pedido com itens e pagamento", () => {
    const pedido = validarPedidoCliente({
      id_pedido: "pedido-1",
      numero_pedido: "PD-20261007-ABCD1234",
      id_loja: "loja-1",
      loja: "Casa Lorenzi Centro",
      status_codigo: "pago",
      status: "Pago",
      valor_total: "198.90",
      criado_em: "2026-10-07T12:00:00+00:00",
      itens: [
        {
          id_item_pedido: "item-1",
          id_variacao: "variacao-1",
          sku: "CL-CAM-LIN-BR-P",
          produto: "Camisa Linho Essencial",
          cor: "Branco",
          tamanho: "P",
          quantidade: 1,
          preco_unitario: "149.90",
          valor_total: "149.90",
        },
      ],
      pagamento: {
        id_pagamento: "pagamento-1",
        metodo_codigo: "pix",
        metodo: "PIX",
        status_codigo: "aprovado",
        status: "Aprovado",
        valor: "198.90",
        processado_em: null,
      },
    });

    expect(pedido.numero_pedido).toBe("PD-20261007-ABCD1234");
    expect(pedido.itens[0]?.id_variacao).toBe("variacao-1");
    expect(pedido.pagamento?.metodo_codigo).toBe("pix");
  });
});
