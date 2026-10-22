import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const fila = {
  total: 1,
  itens: [
    {
      id_venda_pendente: "v-1",
      venda_id_origem: "4512",
      status_origem: "concluida",
      motivos: ["sku:variacao_nao_encontrada", "cliente:vinculo_compra_pendente"],
      quantidade_itens: 2,
      criada_em: "2026-10-22T03:00:00Z",
      estado: "pendente",
      resolvida_em: null,
    },
  ],
  por_grupo: [
    { grupo: "cliente", vendas: 4134 },
    { grupo: "sku", vendas: 591 },
  ],
};

vi.mock("@/hooks/useChamados", () => ({
  useConsulta: () => ({ dados: fila, carregando: false, erro: null, recarregar: () => undefined }),
}));

import { VendasPendentes } from "./VendasPendentes";

describe("tela de vendas pendentes", () => {
  it("lista as vendas com os motivos em português e os filtros por grupo", () => {
    const html = renderToString(
      <MemoryRouter>
        <VendasPendentes />
      </MemoryRouter>,
    ).replace(/<!-- -->/g, "");
    for (const t of ["Vendas pendentes", "#4512", "Peça (SKU) não encontrada no catálogo", "Venda sem ligação confirmada com a compra do cliente", "4.134", "591", "Importadas", "Descartadas"])
      expect(html).toContain(t);
  });
});
