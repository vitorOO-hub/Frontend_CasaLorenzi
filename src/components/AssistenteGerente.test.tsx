import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistenteGerente } from "./AssistenteGerente";

describe("assistente do gerente", () => {
  it("começa fechado e mostra o controle para abrir", () => {
    const html = renderToString(<AssistenteGerente />);
    expect(html).toContain("Abrir assistente do gerente");
    expect(html).not.toContain("Pergunte ao assistente");
  });
});
