import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const catalogo = vi.hoisted(() => ({ carregando: true }));
vi.mock("@/lib/catalogoApi", async (original) => ({
  ...(await original<object>()),
  useProdutosCatalogo: () => ({ produtos: [], carregando: catalogo.carregando, erro: null, origem: "api" }),
}));

vi.mock("@/lib/store", () => ({ useEstado: () => ({ produtos: [], carrinho: [] }) }));

import { Catalogo } from "./Catalogo";
import { LinhaVulto } from "./LinhaVulto";

const tela = (el: React.ReactNode, rota: string) =>
  renderToString(<MemoryRouter initialEntries={[rota]}>{el}</MemoryRouter>).replace(/<!-- -->/g, "");

describe("antes de os produtos carregarem", () => {
  it.each(["/loja", "/loja?marca=casa-lorenzi&categoria=calça", "/loja?marca=vulto"])("%s mostra só 'Carregando produtos...'", (rota) => {
    catalogo.carregando = true;
    const html = tela(<Catalogo />, rota);
    expect(html).toContain("Carregando produtos...");
    expect(html).not.toContain("Nada com esse nome");
    expect(html).not.toContain("0 peças");
  });

  it("linha Vulto também", () => {
    catalogo.carregando = true;
    const html = tela(<LinhaVulto />, "/vulto?categoria=calça");
    expect(html).toContain("Carregando produtos...");
    expect(html).not.toContain("0 peças");
  });

  it("depois de carregar, lista vazia volta a dizer que não achou nada", () => {
    catalogo.carregando = false;
    expect(tela(<Catalogo />, "/loja?busca=xyz")).toContain("Nada com esse nome");
  });
});
