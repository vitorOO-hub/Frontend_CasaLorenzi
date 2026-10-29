import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistenteAdmin, TextoDaRespostaAdmin } from "./AssistenteAdmin";

describe("assistente do admin", () => {
  it("começa fechado e mostra o controle para abrir", () => {
    const html = renderToString(<AssistenteAdmin />);
    expect(html).toContain("Abrir assistente do admin");
    expect(html).not.toContain("Pergunte ao assistente");
  });

  it("renderiza dados tabulares sem os separadores crus do Markdown", () => {
    const html = renderToString(<TextoDaRespostaAdmin texto={"| Indicador | Valor | Fonte |\n|---|---|---|\n| Pedidos | 115 | `consultar_vendas` |"} />);

    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("Consulta");
    expect(html).toContain("Vendas");
    expect(html).not.toContain("consultar_vendas");
    expect(html).not.toContain("|---|");
  });
});
