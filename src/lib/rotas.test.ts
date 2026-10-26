import { describe, expect, it } from "vitest";
import { abasDoPapel, podeAcessar, secaoDoCaminho, secoesDoPapel, telaInicial } from "./navegacao";
import type { Papel } from "./sessao";

const PAPEIS: Papel[] = ["atendente", "operador_estoque", "vendedor", "gerente_loja", "admin"];
const ID = "6f1c3a52-6a4e-4c8e-9a39-0f1f2b6f2f10";

/** Rotas privadas do atendimento: quem abre o quê, inclusive as telas de detalhe. */
describe("rotas privadas da área de atendimento", () => {
  const ATENDIMENTO = [
    "/painel/atendimento",
    `/painel/atendimento/chamado/${ID}`,
    "/painel/atendimento/clientes",
    `/painel/atendimento/clientes/${ID}`,
  ];

  it.each(ATENDIMENTO)("%s abre para atendente e gerente", (rota) => {
    for (const papel of ["atendente", "gerente_loja"] as Papel[]) expect(podeAcessar(papel, rota)).toBe(true);
  });

  // O admin é o dono da rede: acompanha os números, mas não opera o atendimento.
  it.each(ATENDIMENTO)("%s fica fechada para o operador de estoque e o admin", (rota) => {
    for (const papel of ["operador_estoque", "vendedor", "admin"] as Papel[]) expect(podeAcessar(papel, rota)).toBe(false);
  });

  it("o atendente só enxerga atendimento (nem estoque nem gestão)", () => {
    expect(podeAcessar("atendente", "/painel/estoque")).toBe(false);
    expect(podeAcessar("atendente", "/painel/gestao")).toBe(false);
    expect(secoesDoPapel("atendente").map((s) => s.id)).toEqual(["inicio", "atendimento"]);
  });

  it("as abas de atendimento do atendente são Chamados, Conversas e Clientes", () => {
    const secao = secaoDoCaminho("/painel/atendimento")!;
    expect(abasDoPapel(secao, "atendente").map((a) => a.rotulo)).toEqual(["Chamados", "Conversas", "Clientes"]);
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

/** O vendedor consulta o saldo, vende e vê os clientes; não movimenta estoque nem atende. */
describe("rotas do vendedor", () => {
  it("vê Estoque, Vendas e Clientes, e mais nada", () => {
    expect(secoesDoPapel("vendedor").map((s) => s.id)).toEqual(["estoque", "vendas", "clientes"]);
  });

  it("no estoque só tem o Saldo: sem Movimentações, Transferências nem Aprovações", () => {
    const secao = secaoDoCaminho("/painel/estoque")!;
    expect(abasDoPapel(secao, "vendedor").map((a) => a.rotulo)).toEqual(["Saldo"]);
    for (const rota of ["/painel/estoque/movimentacoes", "/painel/estoque/transferencias", "/painel/estoque/aprovacoes"]) {
      expect(podeAcessar("vendedor", rota)).toBe(false);
    }
    expect(podeAcessar("vendedor", "/painel/estoque")).toBe(true);
  });

  it("abre Vendas e Clientes", () => {
    expect(podeAcessar("vendedor", "/painel/vendas")).toBe(true);
    expect(podeAcessar("vendedor", "/painel/clientes")).toBe(true);
  });

  it("não abre atendimento, início nem gestão", () => {
    for (const rota of ["/painel", "/painel/atendimento", "/painel/atendimento/conversas", "/painel/atendimento/clientes", "/painel/gestao", "/painel/gestao/usuarios"]) {
      expect(podeAcessar("vendedor", rota)).toBe(false);
    }
  });

  it("começa em Vendas", () => {
    expect(telaInicial("vendedor")).toBe("/painel/vendas");
  });

  it("só o vendedor abre Vendas e Clientes do vendedor", () => {
    for (const papel of ["atendente", "operador_estoque", "gerente_loja", "admin"] as Papel[]) {
      expect(podeAcessar(papel, "/painel/vendas")).toBe(false);
      expect(podeAcessar(papel, "/painel/clientes")).toBe(false);
    }
  });
});

describe("gestão da equipe", () => {
  it("admin e gerente acessam a equipe; os demais cargos não", () => {
    expect(podeAcessar("admin", "/painel/gestao/usuarios")).toBe(true);
    expect(podeAcessar("gerente_loja", "/painel/gestao/usuarios")).toBe(true);
    for (const papel of ["atendente", "operador_estoque", "vendedor"] as Papel[]) {
      expect(podeAcessar(papel, "/painel/gestao/usuarios")).toBe(false);
    }
  });
});
