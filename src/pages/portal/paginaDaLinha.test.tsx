import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const peca = (sku: string, nome: string, marca: string, categoria: string, preco: number) => ({
  sku,
  nome,
  marca,
  categoria,
  preco,
  saldos: [{ lojaId: "l", quantidade: 3 }],
  movimentacoes: [],
  semFoto: marca === "vulto",
  cores: [{ nome: "areia", hex: "#ccc" }],
});

const produtos = [
  peca("CL-1", "blazer alfaiataria areia", "casa lorenzi", "alfaiataria", 890),
  peca("CL-2", "calça pantalona linho", "casa lorenzi", "calça", 420),
  peca("VLT-1", "bermuda cargo utilitária", "vulto", "bermuda", 120),
  peca("VLT-2", "calca jeans reta", "vulto", "calca", 260),
];

vi.mock("@/lib/catalogoApi", async (original) => ({
  ...(await original<object>()),
  useProdutosCatalogo: () => ({ produtos, carregando: false, erro: null, origem: "api" }),
}));
vi.mock("@/lib/store", () => ({ useEstado: () => ({ produtos: [], carrinho: [] }) }));

import { Catalogo } from "./Catalogo";
import { LinhaVulto } from "./LinhaVulto";

const tela = (el: React.ReactNode, rota: string) =>
  renderToString(<MemoryRouter initialEntries={[rota]}>{el}</MemoryRouter>).replace(/<!-- -->/g, "");

describe("páginas das linhas: o mesmo modelo para as duas marcas", () => {
  it.each([
    ["Linha Lorenzi", <Catalogo key="c" />, "/loja?marca=casa-lorenzi", "Alfaiataria", "Bermuda", "Lorenzi"],
    ["Vulto", <LinhaVulto key="v" />, "/vulto", "Bermuda", "Alfaiataria", "Vulto"],
  ])("%s: cabeçalho, abas da própria linha, filtros e contagem", (titulo, el, rota, temCategoria, naoTem, selo) => {
    const html = tela(el, rota);
    for (const t of [titulo, "Casa Lorenzi+", "Toda a linha", temCategoria, "Tamanho", "Faixa de preço", "Disponibilidade", "Ordem", "2 produtos", selo])
      expect(html).toContain(t);
    expect(html).not.toContain(`>${naoTem}<`);
    // Sem os botões de marca nem a frase longa do catálogo antigo.
    expect(html).not.toContain("Todas com a barra e as mangas");
  });

  it("nome com maiúsculas e parcela embaixo do preço", () => {
    const html = tela(<LinhaVulto />, "/vulto");
    expect(html).toContain("Bermuda Cargo Utilitária");
    expect(html).toContain("ou 10x de R$");
  });

  it("categoria pela URL, ignorando acento", () => {
    const html = tela(<LinhaVulto />, "/vulto?categoria=cal%C3%A7a");
    expect(html).toContain("Calca Jeans Reta");
    expect(html).not.toContain("Bermuda Cargo Utilitária");
    expect(html).toContain("1 produto");
  });

  it("filtro sem resultado mostra o vazio com limpar filtros", () => {
    const html = tela(<Catalogo />, "/loja?marca=casa-lorenzi&preco_min=5000");
    expect(html).toContain("Nenhum produto com esses filtros");
    expect(html).toContain("Limpar filtros");
  });

  it("/loja sem marca continua no catálogo geral", () => {
    expect(tela(<Catalogo />, "/loja")).not.toContain("Toda a linha");
  });
});
