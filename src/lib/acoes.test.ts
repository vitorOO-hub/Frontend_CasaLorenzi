import { describe, expect, it } from "vitest";
import { ErroApi, type CodigoErro } from "@/api/erros";
import * as acoes from "./acoes";
import { CLIENTE_DEMO_ID } from "./dados";
import { equipe, iniciarSessao, sair, type Papel } from "./sessao";
import { adicionarAoCarrinho, estadoAtual } from "./store";

// As sessões vêm do Supabase em produção; nos testes entram direto, já com o papel que o token traria.
const como = (papel: Papel) =>
  iniciarSessao({ tipo: "interno", papel, nome: equipe[papel].nome, email: `${papel}@teste.local` });
const comoCliente = () =>
  iniciarSessao({ tipo: "cliente", clienteId: CLIENTE_DEMO_ID, nome: "Cliente de teste", email: "cliente@teste.local" });
const saldo = (sku: string, lojaId: string) =>
  estadoAtual().produtos.find((p) => p.sku === sku)!.saldos.find((s) => s.lojaId === lojaId)!.quantidade;

/** Executa a ação e devolve o código do erro (ou "ok"). */
async function resultado(acao: () => Promise<unknown>): Promise<CodigoErro | "ok"> {
  try {
    await acao();
    return "ok";
  } catch (e) {
    if (e instanceof ErroApi) return e.codigo;
    throw e;
  }
}

describe("cada papel só faz o que pode", () => {
  it("sem login, nenhuma ação interna passa", async () => {
    sair();
    expect(await resultado(() => acoes.aprovarAjuste("aj1"))).toBe("nao_autenticado");
  });

  it("operador não aprova ajuste; atendente não mexe em estoque", async () => {
    como("operador_estoque");
    expect(await resultado(() => acoes.aprovarAjuste("aj1"))).toBe("sem_permissao");
    como("atendente");
    expect(await resultado(() => acoes.movimentar({ sku: "CL-0101", lojaId: "l1", tipo: "Entrada", quantidade: 1 }))).toBe("sem_permissao");
  });

  it("catálogo e usuários são só do admin", async () => {
    como("gerente_loja");
    expect(await resultado(() => acoes.criarProduto({ sku: "CL-9999", nome: "Teste", categoria: "Camisaria", preco: 100 }))).toBe("sem_permissao");
    expect(await resultado(() => acoes.alterarUsuario("u1", { papel: "admin" }))).toBe("sem_permissao");
  });
});

describe("escopo de loja", () => {
  it("operador de uma loja não mexe na outra", async () => {
    como("operador_estoque"); // Ibirapuera (l1)
    expect(await resultado(() => acoes.movimentar({ sku: "CL-0101", lojaId: "l2", tipo: "Entrada", quantidade: 1 }))).toBe("sem_permissao");
  });

  it("gerente não decide ajuste de outra unidade; admin decide", async () => {
    como("gerente_loja"); // l1; aj2 é da Barra (l2)
    expect(await resultado(() => acoes.aprovarAjuste("aj2"))).toBe("sem_permissao");
    como("admin");
    expect(await resultado(() => acoes.recusarAjuste("aj2", "Contagem refeita, sem divergência"))).toBe("ok");
  });
});

describe("estado atual e concorrência", () => {
  it("o mesmo ajuste aprovado duas vezes: a segunda dá 409", async () => {
    como("gerente_loja");
    const antes = saldo("CL-0713", "l1");
    const [a, b] = await Promise.all([resultado(() => acoes.aprovarAjuste("aj1")), resultado(() => acoes.aprovarAjuste("aj1"))]);
    expect([a, b].sort()).toEqual(["conflito", "ok"]);
    expect(saldo("CL-0713", "l1")).toBe(antes - 1);
  });

  it("recusa de ajuste exige motivo", async () => {
    como("operador_estoque");
    await acoes.solicitarAjuste({ sku: "CL-0101", lojaId: "l1", quantidadeProposta: 0, motivo: "Peças avariadas na vitrine" });
    const id = estadoAtual().ajustes[0]!.id;
    como("gerente_loja");
    expect(await resultado(() => acoes.recusarAjuste(id, ""))).toBe("validacao");
  });

  it("saída maior que o saldo é recusada sem mudar nada", async () => {
    como("operador_estoque");
    const antes = saldo("CL-0101", "l1");
    expect(await resultado(() => acoes.movimentar({ sku: "CL-0101", lojaId: "l1", tipo: "Saída", quantidade: antes + 1 }))).toBe("conflito");
    expect(saldo("CL-0101", "l1")).toBe(antes);
  });

  it("chamado já assumido por outro atendente dá 409", async () => {
    como("atendente");
    expect(await resultado(() => acoes.assumirChamado("ch1"))).toBe("ok");
    como("admin");
    expect(await resultado(() => acoes.assumirChamado("ch1"))).toBe("conflito");
  });

  it("peça com estoque não pode ser excluída", async () => {
    como("admin");
    expect(await resultado(() => acoes.excluirProduto("CL-0101"))).toBe("conflito");
  });
});

describe("cliente", () => {
  it("não abre chamado sobre pedido de outra pessoa", async () => {
    comoCliente(); // c1; PD-10415 é de c2
    expect(await resultado(() => acoes.abrirChamado({ assunto: "Troca", motivo: "Troca", descricao: "Quero trocar o tamanho", pedidoId: "PD-10415" }))).toBe("nao_encontrado");
  });

  it("a mesma chave de idempotência não compra duas vezes e a compra debita a loja", async () => {
    comoCliente();
    adicionarAoCarrinho({ sku: "CL-0407-M-ARE", skuBase: "CL-0407", nome: "Tricot", quantidade: 2, valor: 459, tamanho: "M", cor: "Areia" });
    const antes = saldo("CL-0407", "l1");
    const pedidos = estadoAtual().pedidos.length;
    const [p1, p2] = await Promise.all([acoes.fecharPedido({ lojaId: "l1", frete: 0 }, "chave-1"), acoes.fecharPedido({ lojaId: "l1", frete: 0 }, "chave-1")]);
    expect(p1.id).toBe(p2.id);
    expect(estadoAtual().pedidos.length).toBe(pedidos + 1);
    expect(saldo("CL-0407", "l1")).toBe(antes - 2);
  });
});
