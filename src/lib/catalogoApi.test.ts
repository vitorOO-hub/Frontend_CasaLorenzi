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
      colecao: "verão 26",
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
      colecao: "verão 26",
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
      colecao: null,
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
    config.apiUrl = "https://api.teste";
    definirFonteToken({ obter: async () => "token-da-equipe", renovar: async () => "token-novo" });
    const buscar = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([{ id_variacao: "v1", sku: "CL-1", id_loja: "l1", loja: "Barra", quantidade: 2 }]), { status: 200 }),
    );
    vi.stubGlobal("fetch", buscar);

    const linhas = await listarEstoqueCatalogo();

    expect(linhas).toEqual([{ id_variacao: "v1", sku: "CL-1", id_loja: "l1", loja: "Barra", quantidade: 2 }]);
    const [url, init] = buscar.mock.calls[0]!;
    expect(url).toBe("https://api.teste/api/v1/cliente/catalogo/estoque");
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

describe("busca compartilhada do catálogo", () => {
  it("quem pede junto recebe a mesma busca; depois que termina, a próxima busca de novo", async () => {
    const { carregarCatalogoCompartilhado } = await import("./catalogoApi");
    let chamadas = 0;
    const buscar = () => {
      chamadas += 1;
      return Promise.resolve([]);
    };
    const [a, b] = [carregarCatalogoCompartilhado(buscar), carregarCatalogoCompartilhado(buscar)];
    expect(a).toBe(b);
    await a;
    expect(chamadas).toBe(1);
    await carregarCatalogoCompartilhado(buscar);
    expect(chamadas).toBe(2);
  });
});

describe("peças Vulto sem foto no catálogo", () => {
  const vulto = {
    id_produto: "p-vulto",
    nome: "cinto nylon",
    marca: "vulto",
    categoria: "acessório",
    colecao: "atemporais",
    preco_base: 139.9,
    ativo: true,
    imagem_url: null,
    imagem_alt: null,
    imagem_vestida_url: null,
    tipo: null,
    tecido: null,
    tecelagem: null,
    costurado_em: null,
    nota: null,
    cores: ["cinza mescla"],
    variacao_produto: [
      { id_variacao: "v1", sku: "VLT-ACE-001-CIN-U", cor: "cinza mescla", tamanho: "U", preco_venda: 139.9, ativa: true },
    ],
  };

  it("entram marcadas sem foto, sem tecido ou origem inventados, com a amostra da cor", async () => {
    const { produtoCatalogoDeLinha } = await import("./catalogoApi");
    const p = produtoCatalogoDeLinha(vulto)!;
    expect(p.semFoto).toBe(true);
    expect([p.imagemUrl, p.tecido, p.tecelagem, p.costuradoEm]).toEqual([undefined, undefined, undefined, undefined]);
    expect(p.cores).toEqual([{ nome: "cinza mescla", hex: "#9a9a9a" }]);
  });

  it("mostra a foto real da Vulto mesmo quando a ficha editorial ainda está incompleta", async () => {
    const { produtoCatalogoDeLinha } = await import("./catalogoApi");
    const p = produtoCatalogoDeLinha({
      ...vulto,
      imagem_url: "https://projeto.supabase.co/storage/v1/object/public/catalogo-produtos/p-vulto/foto.webp",
      imagem_alt: "Cinto nylon cinza",
    })!;
    expect(p.semFoto).toBe(true);
    expect(p.imagemUrl).toContain("catalogo-produtos/p-vulto/foto.webp");
    expect(p.imagemAlt).toBe("Cinto nylon cinza");
    expect(p.tecido).toBeUndefined();
  });

  it("peça Casa Lorenzi sem foto continua de fora", async () => {
    const { produtoCatalogoDeLinha } = await import("./catalogoApi");
    expect(produtoCatalogoDeLinha({ ...vulto, marca: "casa lorenzi" })).toBeNull();
  });
});
