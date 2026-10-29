import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api/http", () => ({ api }));

import { criarAgendamentoCliente, itensElegiveisParaAjuste } from "./agendamentosClienteApi";
import { validarPedidoCliente } from "./comprasClienteApi";

function pedido(status: string, id: string) {
  return validarPedidoCliente({
    id_pedido: id,
    numero_pedido: `PD-${id}`,
    id_loja: "loja-1",
    loja: "Casa Centro",
    status_codigo: status,
    status,
    valor_total: "100.00",
    criado_em: "2026-10-29T12:00:00Z",
    itens: [{
      id_item_pedido: `item-${id}`,
      id_variacao: `variacao-${id}`,
      sku: `SKU-${id}`,
      produto: "Calça de linho",
      cor: "Preto",
      tamanho: "M",
      quantidade: 1,
      preco_unitario: "100.00",
      valor_total: "100.00",
    }],
    pagamento: null,
  });
}

describe("peças elegíveis para ajuste", () => {
  it("mostra somente itens de pedidos entregues, com o id real do item", () => {
    expect(itensElegiveisParaAjuste([
      pedido("pago", "pago"),
      pedido("entregue", "entregue"),
      pedido("cancelado", "cancelado"),
    ])).toEqual([{
      id: "item-entregue",
      pedido: "PD-entregue",
      sku: "SKU-entregue",
      nome: "Calça de linho",
      detalhe: "Preto · M",
    }]);
  });

  it("envia o id do item comprado ao criar o agendamento", async () => {
    api.post.mockResolvedValueOnce({
      id_atendimento: "atendimento-1",
      protocolo: "AT-001",
      assunto: "Ajuste",
      categoria: { codigo: "ajuste", nome: "Ajuste" },
      status: { codigo: "aberto", nome: "Aberto" },
      id_pedido: "pedido-entregue",
      numero_pedido: "PD-entregue",
      id_loja: "loja-1",
      loja_nome: "Casa Centro",
      aberto_em: "2026-10-29T12:00:00Z",
      atualizado_em: "2026-10-29T12:00:00Z",
      ultima_mensagem_em: null,
      pecas: [],
      anexos: [],
    });
    const agendamento = await criarAgendamentoCliente({
      tipo: "ajuste",
      id_item_pedido: "item-entregue",
      id_loja: "loja-1",
      data: "2026-10-30",
      horario: "14:00",
      nome: "Cliente",
      telefone: "11999999999",
    });

    expect(agendamento.id_atendimento).toBe("atendimento-1");
    expect(api.post).toHaveBeenCalledWith("/cliente/agendamentos", expect.objectContaining({
      tipo: "ajuste",
      id_item_pedido: "item-entregue",
    }));
  });
});
