import { describe, expect, it } from "vitest";
import { destinoAposLogin, voltarSeguro } from "./destino";
import type { Sessao } from "./sessao";

const interno = (papel: Extract<Sessao, { tipo: "interno" }>["papel"]): Sessao => ({
  tipo: "interno",
  papel,
  nome: "Equipe",
  email: "e@casalorenzi.com.br",
});
const cliente: Sessao = { tipo: "cliente", clienteId: "c1", nome: "Cliente", email: "c@x.com" };

describe("voltar seguro", () => {
  it.each(["/conta/pedidos", "/painel/estoque?aba=saldo", "/loja/CL-0101"])("aceita %s", (rota) => {
    expect(voltarSeguro(rota)).toBe(rota);
  });

  it.each([
    "https://site-falso.com",
    "//site-falso.com",
    "/\\site-falso.com",
    "javascript:alert(1)",
    "/javascript:alert(1)",
    "/ com espaço",
    "/entrar",
    "/entrar?voltar=%2Fcheckout",
    "painel",
    "",
    null,
  ])("recusa %s", (rota) => {
    expect(voltarSeguro(rota)).toBeNull();
  });
});

describe("destino depois do login", () => {
  it("cada cargo cai na própria tela inicial", () => {
    expect(destinoAposLogin(interno("atendente"), null)).toBe("/painel/atendimento");
    expect(destinoAposLogin(interno("operador_estoque"), null)).toBe("/painel");
    expect(destinoAposLogin(interno("gerente_loja"), null)).toBe("/painel");
    expect(destinoAposLogin(interno("admin"), null)).toBe("/painel");
  });

  it("cliente volta para a loja, sem ir para a conta nem para o painel", () => {
    expect(destinoAposLogin(cliente, null)).toBe("/");
  });

  it("cliente volta para a página da loja onde estava, agora logado", () => {
    expect(destinoAposLogin(cliente, "/loja/CL-0101")).toBe("/loja/CL-0101");
    expect(destinoAposLogin(cliente, "/loja?categoria=Camisaria")).toBe("/loja?categoria=Camisaria");
  });

  it("login que veio do próprio login não prende a pessoa na tela", () => {
    expect(destinoAposLogin(cliente, "/entrar")).toBe("/");
    expect(destinoAposLogin(interno("admin"), "/entrar")).toBe("/painel");
  });

  it("volta para onde a pessoa estava, se o cargo pode abrir", () => {
    expect(destinoAposLogin(interno("operador_estoque"), "/painel/estoque/movimentacoes")).toBe(
      "/painel/estoque/movimentacoes",
    );
    expect(destinoAposLogin(cliente, "/checkout")).toBe("/checkout");
  });

  it("não volta para tela que o cargo não pode abrir", () => {
    expect(destinoAposLogin(interno("operador_estoque"), "/painel/gestao/usuarios")).toBe("/painel");
    expect(destinoAposLogin(interno("atendente"), "/painel/estoque")).toBe("/painel/atendimento");
  });

  it("cliente nunca é mandado para a área interna", () => {
    expect(destinoAposLogin(cliente, "/painel/estoque")).toBe("/");
    expect(destinoAposLogin(cliente, "/painel")).toBe("/");
  });

  it("equipe que estava na loja vai para o painel, não para a vitrine", () => {
    expect(destinoAposLogin(interno("admin"), "/checkout")).toBe("/painel");
  });

  it("endereço de outro site é ignorado", () => {
    expect(destinoAposLogin(cliente, "https://site-falso.com")).toBe("/");
    expect(destinoAposLogin(interno("admin"), "//site-falso.com")).toBe("/painel");
  });
});
