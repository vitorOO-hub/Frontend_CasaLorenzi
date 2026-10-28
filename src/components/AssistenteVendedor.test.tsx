import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistenteVendedor, TextoDaResposta } from "./AssistenteVendedor";

describe("assistente do vendedor", () => {
  it("começa fechado, só com a bolinha", () => {
    const html = renderToString(<AssistenteVendedor />);
    expect(html).toContain("Abrir assistente de vendas");
    expect(html).not.toContain("Pergunte ao assistente");
  });

  it("mostra a resposta com negrito e lista, escapando qualquer HTML", () => {
    const html = renderToString(<TextoDaResposta texto={"Vendemos **R$ 1.234,56**.\n1. Camisa\n<img src=x onerror=alert(1)>"} />);
    expect(html).toContain("<strong>R$ 1.234,56</strong>");
    expect(html).toContain("Camisa");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
