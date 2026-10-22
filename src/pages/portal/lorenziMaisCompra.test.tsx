import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { REGRAS_PADRAO } from "@/lib/regrasLorenziMais";

// Sacola com 2 peças de R$ 200 e um cliente logado com 1.050 pontos.
vi.mock("@/lib/store", () => ({
  useEstado: () => ({
    carrinho: [{ sku: "CL-1-P", skuBase: "CL-1", nome: "Camisa", cor: "branco", tamanho: "P", quantidade: 2, valor: 200, idVariacao: "v-1" }],
  }),
}));
vi.mock("@/lib/sessao", () => ({ useSessao: () => ({ tipo: "cliente" }) }));
vi.mock("@/api/config", async (original) => ({ ...(await original<object>()), usandoApi: () => true }));
vi.mock("@/hooks/useLorenziMais", () => ({
  useLorenziMais: () => ({ saldo: 1050, regras: REGRAS_PADRAO }),
}));

import { Checkout } from "./Checkout";
import { Sacola } from "./Sacola";

const tela = (el: React.ReactNode) => renderToString(<MemoryRouter>{el}</MemoryRouter>).replace(/<!-- -->/g, "");

describe("Lorenzi+ na compra", () => {
  it("sacola: quanto a compra rende e quanto dá para usar", () => {
    const html = tela(<Sacola />);
    // R$ 400 + R$ 49 de frete = R$ 449 no site, em dobro.
    expect(html).toContain("898 pontos Lorenzi+");
    expect(html).toContain("usar até 1.000 pontos");
  });

  it("checkout: oferece o resgate até o máximo e mostra quanto rende", () => {
    const html = tela(<Checkout />);
    expect(html).toContain('aria-label="Pontos Lorenzi+"');
    expect(html).toContain("saldo 1.050 pts");
    expect(html).toContain("Usar 1.000");
    expect(html).toContain("Esta compra rende 898 pontos");
  });
});
