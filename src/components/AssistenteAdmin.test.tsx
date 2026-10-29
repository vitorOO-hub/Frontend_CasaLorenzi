import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistenteAdmin } from "./AssistenteAdmin";

describe("assistente do admin", () => {
  it("começa fechado e mostra o controle para abrir", () => {
    const html = renderToString(<AssistenteAdmin />);
    expect(html).toContain("Abrir assistente do admin");
    expect(html).not.toContain("Pergunte ao assistente");
  });
});
