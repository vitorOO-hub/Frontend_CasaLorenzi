import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { nomeDaCategoria, validarBeneficios } from "@/lib/beneficiosLorenziMais";
import { freteDe } from "./Sacola";

const beneficio = (codigo: string, titulo: string) => ({ codigo, titulo, descricao: `${titulo}: detalhe` });
const BLACK = [beneficio("frete_sempre", "Frete grátis em qualquer compra"), beneficio("acesso_antecipado", "Acesso antecipado às coleções"), beneficio("ajuste_cortesia", "Serviço de ajuste como cortesia")];

const resposta = vi.hoisted(() => ({ atual: null as unknown }));
vi.mock("@/lib/vultoMais", async (original) => ({
  ...(await original<object>()),
  obterVultoMais: () => Promise.resolve(resposta.atual),
}));
vi.mock("@/api/config", async (original) => ({ ...(await original<object>()), usandoApi: () => true }));

describe("benefícios do Lorenzi+", () => {
  it("validador aceita a resposta nova e a antiga (sem benefícios)", () => {
    expect(validarBeneficios({ beneficios: BLACK, proximos_beneficios: [], frete_gratis_a_partir: "0" })).toEqual({
      beneficios: BLACK,
      proximos_beneficios: [],
      frete_gratis_a_partir: 0,
    });
    expect(validarBeneficios({})).toEqual({ beneficios: [], proximos_beneficios: [], frete_gratis_a_partir: null });
    expect(() => validarBeneficios({ beneficios: [{ codigo: "x" }] })).toThrow();
  });

  it("nome das categorias, com a Black", () => {
    expect(["bronze", "prata", "ouro", "black"].map(nomeDaCategoria)).toEqual(["Bronze", "Prata", "Ouro", "Black"]);
  });

  it("frete pela categoria: loja a partir de R$ 1.000, prata R$ 600, ouro e black sempre grátis", () => {
    expect([freteDe(700), freteDe(700, 600), freteDe(500, 600), freteDe(10, 0)]).toEqual([49, 0, 49, 0]);
  });
});

describe("aba Lorenzi+ mostra os benefícios", () => {
  const base = { saldo: 0, creditos_no_ano: 0, faltam_para_proxima: null, extrato: [], pontos_a_vencer: 0, proximos_vencimentos: [], frete_gratis_a_partir: null };
  const tela = async (dados: object) => {
    const { Beneficios } = await import("./VultoMaisConta");
    return renderToString(
      <MemoryRouter>
        <Beneficios dados={{ ...base, ...dados } as never} />
      </MemoryRouter>,
    ).replace(/<!-- -->/g, "");
  };

  it("cliente Black vê os três benefícios", async () => {
    const html = await tela({ categoria: "black", proxima_categoria: null, beneficios: BLACK, proximos_beneficios: [] });
    for (const t of ["Seus benefícios · Black", "Frete grátis em qualquer compra", "Acesso antecipado às coleções", "Serviço de ajuste como cortesia"]) expect(html).toContain(t);
    expect(html).not.toContain("Na categoria");
  });

  it("cliente Bronze vê que os benefícios começam na Prata e o que ganha nela", async () => {
    const html = await tela({
      categoria: "bronze",
      proxima_categoria: "prata",
      beneficios: [],
      proximos_beneficios: [beneficio("frete_600", "Frete grátis acima de R$ 600")],
    });
    for (const t of ["Seus benefícios · Bronze", "Os benefícios começam na categoria Prata.", "Na categoria Prata", "Frete grátis acima de R$ 600"]) expect(html).toContain(t);
  });

  it("cliente Ouro vê só o que a Black acrescenta", async () => {
    const ouro = BLACK.slice(0, 2);
    const html = await tela({ categoria: "ouro", proxima_categoria: "black", beneficios: ouro, proximos_beneficios: BLACK });
    expect(html).toContain("Na categoria Black");
    expect(html.split("Frete grátis em qualquer compra: detalhe").length - 1).toBe(1); // não repete o que já tem
    expect(html).toContain("Serviço de ajuste como cortesia");
  });
});
