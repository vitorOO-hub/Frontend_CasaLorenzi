import { afterEach, describe, expect, it, vi } from "vitest";
import { config } from "@/api/config";
import { definirFonteToken } from "@/api/http";
import { listarEstoqueCatalogo, produtoCatalogoDeLinha } from "./catalogoApi";

const detalhesObrigatorios = {
  imagem_url: "/img/produtos/CL-0101.jpg",
  imagem_alt: "Camisa de Linho Ravena",
  imagem_vestida_url: null,
  tipo: "Camisas de linho",
  tecido: "em linho lavado",
  tecelagem: "Linho irlandês",
  costurado_em: "Bom Retiro, SP",
  nota: "Gola italiana que fica em pé.",
  cores: [{ nome: "Branco giz", hex: "#f4f1ea" }],
};

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
      ...detalhesObrigatorios,
      variacao_produto: [
        { id_variacao: "variacao-p", sku: "CL-0101-P-BR", cor: "Branco", tamanho: "P", preco_venda: "399.90", ativa: true },
        { id_variacao: "variacao-m", sku: "CL-0101-M-BR", cor: "Branco", tamanho: "M", preco_venda: "409.90", ativa: true },
        { id_variacao: "variacao-g", sku: "CL-0101-G-AZ", cor: "Azul", tamanho: "G", preco_venda: "419.90", ativa: false },
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
      imagemUrl: "/img/produtos/CL-0101.jpg",
      tipo: "Camisas de linho",
      tecido: "em linho lavado",
    });
    expect(produto?.variacoes).toEqual([
      { idVariacao: "variacao-p", sku: "CL-0101-P-BR", cor: "Branco", tamanho: "P", preco: 399.9 },
      { idVariacao: "variacao-m", sku: "CL-0101-M-BR", cor: "Branco", tamanho: "M", preco: 409.9 },
    ]);
  });

  it("descarta produto sem imagem, detalhes completos ou variação ativa", () => {
    const produto = produtoCatalogoDeLinha({
      id_produto: "produto-sem-variacao",
      nome: "Peça Piloto",
      marca: null,
      categoria: null,
      descricao: null,
      preco_base: "120.00",
      ativo: true,
      ...detalhesObrigatorios,
      variacao_produto: [],
    });

    expect(produto).toBeNull();
  });
});

describe("estoque do catálogo", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("é pedido sem token, para a loja carregar também para visitantes", async () => {
    config.apiUrl = "http://api.teste";
    definirFonteToken({ obter: async () => "token-da-equipe", renovar: async () => "token-novo" });
    const buscar = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([{ id_variacao: "v1", sku: "CL-1", id_loja: "l1", loja: "Barra", quantidade: 2 }]), { status: 200 }),
    );
    vi.stubGlobal("fetch", buscar);

    const linhas = await listarEstoqueCatalogo();

    expect(linhas).toEqual([{ id_variacao: "v1", sku: "CL-1", id_loja: "l1", loja: "Barra", quantidade: 2 }]);
    const [url, init] = buscar.mock.calls[0]!;
    expect(url).toBe("http://api.teste/api/v1/cliente/catalogo/estoque");
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
