import { beforeEach, describe, expect, it } from "vitest";
import { CLIENTE_DEMO_ID } from "./dados";
import { iniciarSessao, sair } from "./sessao";
import { adicionarAoCarrinho, estadoAtual } from "./store";

const cliente = (email: string) =>
  iniciarSessao({ tipo: "cliente", clienteId: CLIENTE_DEMO_ID, nome: "Cliente", email });
const peca = { sku: "CL-0407-M-ARE", skuBase: "CL-0407", nome: "Tricot", quantidade: 2, valor: 459, tamanho: "M", cor: "Areia" };

describe("a próxima pessoa do navegador não herda nada da anterior", () => {
  beforeEach(() => sair());

  it("ao sair, o carrinho é apagado", () => {
    cliente("a@exemplo.com");
    adicionarAoCarrinho(peca);
    expect(estadoAtual().carrinho).toHaveLength(1);
    sair();
    expect(estadoAtual().carrinho).toHaveLength(0);
  });

  it("outra pessoa entrando sem sair também começa com o carrinho vazio", () => {
    cliente("a@exemplo.com");
    adicionarAoCarrinho(peca);
    cliente("b@exemplo.com");
    expect(estadoAtual().carrinho).toHaveLength(0);
  });

  it("a mesma pessoa (renovação do token) mantém o carrinho", () => {
    cliente("a@exemplo.com");
    adicionarAoCarrinho(peca);
    cliente("a@exemplo.com");
    expect(estadoAtual().carrinho).toHaveLength(1);
  });
});
