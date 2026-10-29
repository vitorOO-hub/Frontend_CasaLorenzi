import { describe, expect, it } from "vitest";
import { blocosDaRespostaAdmin } from "./assistenteAdminFormatacao";

describe("formatação das respostas do admin", () => {
  it("converte uma tabela Markdown e humaniza a fonte da consulta", () => {
    const blocos = blocosDaRespostaAdmin([
      "**Vendas da rede – 30 dias**",
      "| Indicador | Valor | Fonte |",
      "|----------|------|------|",
      "| Faturamento total | **R$ 80049,00** | `consultar_vendas` |",
      "| Pedidos | 115 | `consultar_vendas` |",
    ].join("\n"));

    expect(blocos).toEqual([
      { tipo: "paragrafo", trechos: [{ texto: "Vendas da rede – 30 dias", negrito: true }] },
      {
        tipo: "tabela",
        cabecalho: ["Indicador", "Valor", "Fonte"],
        linhas: [
          ["Faturamento total", "**R$ 80049,00**", "Vendas"],
          ["Pedidos", "115", "Vendas"],
        ],
      },
    ]);
  });

  it("mantém parágrafos e listas fora das tabelas", () => {
    expect(blocosDaRespostaAdmin("Resumo da rede\n- **Loja Centro** está em atenção.")).toEqual([
      { tipo: "paragrafo", trechos: [{ texto: "Resumo da rede", negrito: false }] },
      { tipo: "item", trechos: [{ texto: "Loja Centro", negrito: true }, { texto: " está em atenção.", negrito: false }] },
    ]);
  });
});
