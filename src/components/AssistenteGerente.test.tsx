import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistenteGerente } from "./AssistenteGerente";
import { TextoRespostaAssistente } from "./TextoRespostaAssistente";

describe("assistente do gerente", () => {
  it("começa fechado e mostra o controle para abrir", () => {
    const html = renderToString(<AssistenteGerente />);
    expect(html).toContain("Abrir assistente do gerente");
    expect(html).not.toContain("Pergunte ao assistente");
  });

  it("renderiza tabelas Markdown e humaniza as consultas nas respostas", () => {
    const html = renderToString(<TextoRespostaAssistente texto={"| SKU | Produto | Consulta |\n|---|---|---|\n| CL-CAM-LIN-AZ-M | **Camisa linho essencial** | `consultar_estoque` |"} />);

    expect(html).toContain("<table");
    expect(html).toContain("Estoque");
    expect(html).toContain("Camisa linho essencial");
    expect(html).not.toContain("consultar_estoque");
    expect(html).not.toContain("|---|");
  });
});
