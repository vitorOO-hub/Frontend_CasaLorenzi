import { describe, expect, it } from "vitest";
import { abasDoPapel, podeAcessar, secaoDoCaminho, secoesDoPapel, telaInicial } from "./navegacao";
import type { Papel } from "./sessao";

const PAPEIS: Papel[] = ["atendente", "operador_estoque", "gerente_loja", "admin"];
const ID = "6f1c3a52-6a4e-4c8e-9a39-0f1f2b6f2f10";

/** Rotas privadas do atendimento: quem abre o quê, inclusive as telas de detalhe. */
describe("rotas privadas da área de atendimento", () => {
  const ATENDIMENTO = [
    "/painel/atendimento",
    `/painel/atendimento/chamado/${ID}`,
    "/painel/atendimento/clientes",
    `/painel/atendimento/clientes/${ID}`,
  ];

  it.each(ATENDIMENTO)("%s abre para atendente, gerente e admin", (rota) => {
    for (const papel of ["atendente", "gerente_loja", "admin"] as Papel[]) expect(podeAcessar(papel, rota)).toBe(true);
  });

  it.each(ATENDIMENTO)("%s fica fechada para o operador de estoque", (rota) => {
    expect(podeAcessar("operador_estoque", rota)).toBe(false);
  });

  it("o atendente só enxerga atendimento (nem estoque nem gestão)", () => {
    expect(podeAcessar("atendente", "/painel/estoque")).toBe(false);
    expect(podeAcessar("atendente", "/painel/gestao")).toBe(false);
    expect(secoesDoPapel("atendente").map((s) => s.id)).toEqual(["inicio", "atendimento"]);
  });

  it("as abas de atendimento do atendente são Chamados e Clientes", () => {
    const secao = secaoDoCaminho("/painel/atendimento")!;
    expect(abasDoPapel(secao, "atendente").map((a) => a.rotulo)).toEqual(["Chamados", "Clientes"]);
  });

  it("variações do caminho não furam a proteção", () => {
    for (const papel of ["operador_estoque"] as Papel[]) {
      for (const rota of ["/painel/atendimento/", "/painel/atendimento/clientes/", "/painel/atendimento/../atendimento"]) {
        expect(podeAcessar(papel, rota)).toBe(false);
      }
    }
  });

  it("caminho desconhecido nunca dá mais acesso do que o próprio /painel", () => {
    // O App redireciona caminhos desconhecidos para /painel; aqui garantimos que eles também não
    // herdam acesso de nenhuma seção restrita (atendimento, estoque, gestão).
    for (const papel of PAPEIS) {
      expect(podeAcessar(papel, "/painel/segredo")).toBe(podeAcessar(papel, "/painel"));
      expect(podeAcessar(papel, "/painel/atendimentox")).toBe(podeAcessar(papel, "/painel"));
    }
  });

  it("cada cargo é levado a uma tela que ele mesmo pode abrir", () => {
    for (const papel of PAPEIS) expect(podeAcessar(papel, telaInicial(papel))).toBe(true);
  });
});
