import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./api", () => ({ api }));

import { descartarVenda, importarVenda, listarFila, rotuloMotivo, validarFila, validarVendaPendente } from "./vendasPendentesApi";

const vendaDetalhe = () => ({
  id_venda_pendente: "v-1",
  venda_id_origem: "4512",
  estado: "pendente",
  motivos: ["sku:variacao_nao_encontrada"],
  status_origem: "concluida",
  resolvida_em: null,
  observacao_resolucao: null,
  loja: "vulto app",
  canal: "online",
  status_destino: "pago",
  vendida_em: "2025-03-10T18:00:00Z",
  vendedor: "app",
  total: "200.00",
  frete: "0.00",
  desconto: "0.00",
  total_calculado: null,
  situacao_valores: "sem_ajuste",
  cpf_final: "4725",
  sugestao_cliente: { id_cliente: "c-1", nome: "helena souza" },
  itens: [
    { sku_origem: "CAM001BM", descricao: "camisa", quantidade: 1, preco_unitario: "180.00", variacao_sugerida: { id_variacao: "x-1", sku: "CAM-001-BRA-M", nome: "Camisa · branco, M" } },
    { sku_origem: "XXX", descricao: "calça", quantidade: 1, preco_unitario: "20.00", variacao_sugerida: null },
  ],
});

beforeEach(() => vi.clearAllMocks());

describe("vendas pendentes", () => {
  it("detalhe converte os decimais e aceita peça sem sugestão", () => {
    const d = validarVendaPendente(vendaDetalhe());
    expect([d.total, d.frete, d.itens[0]!.preco_unitario]).toEqual([200, 0, 180]);
    expect(d.itens[1]!.variacao_sugerida).toBeNull();
    expect(d.sugestao_cliente?.nome).toBe("helena souza");
  });

  it("recusa estado desconhecido", () => {
    expect(() => validarVendaPendente({ ...vendaDetalhe(), estado: "talvez" })).toThrow();
  });

  it("fila antiga (sem estado e sem resumo) continua válida", () => {
    const f = validarFila({
      total: 1,
      itens: [{ id_venda_pendente: "v", venda_id_origem: "1", status_origem: null, motivos: ["cliente:x"], quantidade_itens: 1, criada_em: "2026-10-22T00:00:00Z" }],
    });
    expect([f.itens[0]!.estado, f.por_grupo]).toEqual(["pendente", []]);
  });

  it("chamadas: filtros na lista, corpo na importação e no descarte", () => {
    listarFila({ estado: "pendente", grupo: "sku", limit: 50, offset: 0 });
    expect(api.get.mock.calls[0]![0]).toBe("/api/v1/painel/gestao/vendas-pendentes");
    expect(api.get.mock.calls[0]![2]).toEqual({ estado: "pendente", grupo: "sku", limit: 50, offset: 0 });
    importarVenda("v-1", { id_cliente: "c", valor_total: 10, valor_frete: 0, itens: [{ id_variacao: "x", quantidade: 1, preco_unitario: 10 }] });
    expect(api.post.mock.calls[0]![0]).toBe("/api/v1/painel/gestao/vendas-pendentes/v-1/importar");
    descartarVenda("v-1", "teste");
    expect(api.post.mock.calls[1]![2]).toEqual({ observacao: "teste" });
  });

  it("motivo conhecido ganha texto; desconhecido vira legível", () => {
    expect(rotuloMotivo("cliente:cliente_nao_encontrado_por_cpf")).toBe("Nenhum cliente cadastrado com este CPF");
    expect(rotuloMotivo("novo:algo_estranho")).toBe("algo estranho");
  });
});
