import { describe, expect, it } from "vitest";
import { produtoCatalogoDeLinha } from "./catalogoApi";

describe("catálogo do Supabase", () => {
  it("transforma produto e variações no formato usado pela vitrine", () => {
    const produto = produtoCatalogoDeLinha({
      id_produto: "produto-1",
      nome: "Camisa de Linho Ravena",
      marca: "Casa Lorenzi",
      categoria: "Camisaria",
      descricao: "Linho lavado",
      preco_base: "389.90",
      ativo: true,
      variacao_produto: [
        { id_variacao: "variacao-p", sku: "CL-0101-P-BR", cor: "Branco", tamanho: "P", preco_venda: "399.90", ativo: true },
        { id_variacao: "variacao-m", sku: "CL-0101-M-BR", cor: "Branco", tamanho: "M", preco_venda: "409.90", ativo: true },
        { id_variacao: "variacao-g", sku: "CL-0101-G-AZ", cor: "Azul", tamanho: "G", preco_venda: "419.90", ativo: false },
      ],
    });

    expect(produto).toMatchObject({
      sku: "CL-0101-P-BR",
      nome: "Camisa de Linho Ravena",
      categoria: "Camisaria",
      preco: 399.9,
      descricao: "Linho lavado",
      saldos: [],
      movimentacoes: [],
    });
    expect(produto.variacoes).toEqual([
      { idVariacao: "variacao-p", sku: "CL-0101-P-BR", cor: "Branco", tamanho: "P", preco: 399.9 },
      { idVariacao: "variacao-m", sku: "CL-0101-M-BR", cor: "Branco", tamanho: "M", preco: 409.9 },
    ]);
  });

  it("mantém produto sem variação navegável pelo id", () => {
    const produto = produtoCatalogoDeLinha({
      id_produto: "produto-sem-variacao",
      nome: "Peça Piloto",
      marca: null,
      categoria: null,
      descricao: null,
      preco_base: "120.00",
      ativo: true,
      variacao_produto: [],
    });

    expect(produto.sku).toBe("produto-sem-variacao");
    expect(produto.categoria).toBe("Catálogo");
    expect(produto.preco).toBe(120);
  });
});
