import { describe, expect, it } from "vitest";
import { detalheDe, fotoEstudio, skuEditorial, tipoDe } from "./loja";

describe("conteúdo editorial da loja", () => {
  it("associa SKU do banco ao packshot editorial existente", () => {
    expect(skuEditorial("CL-CAM-LIN-BR-P")).toBe("CL-0101");
    expect(fotoEstudio("CL-CAM-LIN-BR-P")).toBe("/img/produtos/CL-0101.jpg");
    expect(tipoDe("CL-CAM-LIN-BR-P")).toBe("Camisas de linho");
    expect(detalheDe("CL-CAM-LIN-BR-P").tecido).toContain("linho");
  });

  it("usa uma imagem segura para SKU ainda sem equivalência", () => {
    expect(tipoDe("produto-sem-imagem")).toBe("Outros");
    expect(fotoEstudio("produto-sem-imagem")).toBe("/img/produtos/CL-0101.jpg");
  });
});
