import { describe, expect, it } from "vitest";
import { validarCarrinhoCliente } from "./carrinhoClienteApi";

describe("carrinho do cliente", () => {
  it("valida carrinho com itens vindos do backend", () => {
    const carrinho = validarCarrinhoCliente({
      subtotal: "299.80",
      itens: [
        {
          id_carrinho: "carrinho-1",
          id_variacao: "variacao-1",
          sku: "CL-CAM-LIN-BR-P",
          produto: "Camisa Linho Essencial",
          imagem_url: "/img/produtos/CL-0101.jpg",
          imagem_alt: "Camisa Linho Essencial",
          tecido: "em linho lavado",
          cor: "Branco",
          tamanho: "P",
          quantidade: 2,
          preco_unitario: "149.90",
          valor_total: "299.80",
        },
      ],
    });

    expect(carrinho.subtotal).toBe("299.80");
    expect(carrinho.itens[0]?.id_variacao).toBe("variacao-1");
    expect(carrinho.itens[0]?.imagem_url).toBe("/img/produtos/CL-0101.jpg");
  });
});
