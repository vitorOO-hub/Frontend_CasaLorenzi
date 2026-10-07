import { describe, expect, it } from "vitest";
import { addDias, baldes, intervalos, resumoVendas, variacao, type Venda } from "./analise";
import { dataBR, moeda, produtosIniciais, skuVariacao, statusProduto, totalProduto } from "./dados";
import { abaDoCaminho, podeAcessar, secaoDoCaminho, secoesDoPapel, telaInicial } from "./navegacao";

const produto = (sku: string) => produtosIniciais.find((p) => p.sku === sku)!;

describe("permissões da área interna", () => {
  it("cada cargo vê só as seções da barra lateral que lhe cabem", () => {
    const ids = (papel: Parameters<typeof secoesDoPapel>[0]) => secoesDoPapel(papel).map((s) => s.id);
    expect(ids("atendente")).toEqual(["inicio", "atendimento"]);
    expect(ids("operador_estoque")).toEqual(["inicio", "estoque"]);
    expect(ids("gerente_loja")).toEqual(["inicio", "estoque", "atendimento", "gestao"]);
    expect(ids("admin")).toEqual(["inicio", "estoque", "gestao"]);
  });

  it("aprovações e estoque mínimo ficam restritos à gestão", () => {
    expect(podeAcessar("operador_estoque", "/painel/estoque")).toBe(true);
    expect(podeAcessar("operador_estoque", "/painel/estoque/aprovacoes")).toBe(false);
    expect(podeAcessar("operador_estoque", "/painel/estoque/minimos")).toBe(false);
    expect(podeAcessar("gerente_loja", "/painel/estoque/aprovacoes")).toBe(true);
  });

  it("catálogo, usuários e auditoria são exclusivos do administrador", () => {
    for (const tela of ["catalogo", "usuarios", "auditoria", "integracoes"]) {
      expect(podeAcessar("gerente_loja", `/painel/gestao/${tela}`)).toBe(false);
      expect(podeAcessar("admin", `/painel/gestao/${tela}`)).toBe(true);
    }
    expect(podeAcessar("gerente_loja", "/painel/gestao")).toBe(true);
  });

  it("o admin (dono) não opera atendimento nem transferências", () => {
    expect(podeAcessar("admin", "/painel/atendimento")).toBe(false);
    expect(podeAcessar("admin", "/painel/atendimento/chamado/c1")).toBe(false);
    expect(podeAcessar("admin", "/painel/estoque/transferencias")).toBe(false);
    expect(podeAcessar("admin", "/painel/estoque")).toBe(true);
    expect(podeAcessar("gerente_loja", "/painel/estoque/transferencias")).toBe(true);
  });

  it("atendente não abre o estoque e começa pelos chamados", () => {
    expect(podeAcessar("atendente", "/painel/estoque")).toBe(false);
    expect(telaInicial("atendente")).toBe("/painel/atendimento");
    expect(telaInicial("operador_estoque")).toBe("/painel");
  });

  it("a caixa de conversas é só da equipe de atendimento", () => {
    for (const papel of ["atendente", "gerente_loja"] as const) {
      expect(podeAcessar(papel, "/painel/atendimento/conversas")).toBe(true);
    }
    expect(podeAcessar("operador_estoque", "/painel/atendimento/conversas")).toBe(false);
    expect(podeAcessar("admin", "/painel/atendimento/conversas")).toBe(false);
    // A conversa aberta é a tela do chamado, na aba-mãe "Chamados".
    const secao = secaoDoCaminho("/painel/atendimento/chamado/c1")!;
    expect(abaDoCaminho(secao, "/painel/atendimento/chamado/c1")?.rotulo).toBe("Chamados");
  });

  it("telas de detalhe herdam a seção e a aba da tela-mãe", () => {
    const secao = secaoDoCaminho("/painel/atendimento/clientes/c1")!;
    expect(secao.id).toBe("atendimento");
    expect(abaDoCaminho(secao, "/painel/atendimento/clientes/c1")?.rotulo).toBe("Clientes");
    expect(secaoDoCaminho("/loja")).toBeUndefined();
  });
});

describe("estoque", () => {
  it("soma o saldo de todas as lojas ou só das escolhidas", () => {
    expect(totalProduto(produto("CL-0101"))).toBe(29);
    expect(totalProduto(produto("CL-0101"), ["l1"])).toBe(14);
  });

  it("classifica a peça como OK, estoque baixo ou esgotada", () => {
    expect(statusProduto(produto("CL-0101"))).toBe("OK");
    expect(statusProduto(produto("CL-0204"))).toBe("Estoque baixo");
    expect(statusProduto(produto("CL-0102"))).toBe("Esgotado");
    // Com filtro de unidade, só conta o saldo daquela loja.
    expect(statusProduto(produto("CL-0204"), ["l3"])).toBe("Esgotado");
  });

  it("monta o SKU da variação com tamanho e cor", () => {
    expect(skuVariacao("CL-0101", "M", "Areia")).toBe("CL-0101-M-ARE");
  });
});

describe("formatação", () => {
  it("formata reais sem centavos e datas no padrão brasileiro", () => {
    expect(moeda(1290)).toMatch(/^R\$\s1\.290$/);
    expect(dataBR("2026-10-06")).toBe("06/10/2026");
    expect(dataBR("2026-10-06 14:30")).toBe("06/10/2026");
  });
});

describe("análise dos dashboards", () => {
  it("soma dias atravessando meses e anos", () => {
    expect(addDias("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("compara com o período anterior do mesmo tamanho", () => {
    const { atual, anterior } = intervalos(7);
    expect(addDias(atual.inicio, 6)).toBe(atual.fim);
    expect(addDias(anterior.fim, 1)).toBe(atual.inicio);
    expect(addDias(anterior.inicio, 6)).toBe(anterior.fim);
  });

  it("calcula a variação percentual e evita divisão por zero", () => {
    expect(variacao(150, 100)).toBe(0.5);
    expect(variacao(50, 100)).toBe(-0.5);
    expect(variacao(10, 0)).toBeNull();
  });

  it("resume faturamento, ticket médio, peças e participação online", () => {
    const vendas: Venda[] = [
      { data: "2026-10-01", lojaId: "l1", canal: "Loja", itens: [{ sku: "a", categoria: "x", quantidade: 2, valor: 100 }] },
      { data: "2026-10-02", lojaId: "l2", canal: "Online", itens: [{ sku: "b", categoria: "x", quantidade: 1, valor: 200 }] },
    ];
    expect(resumoVendas(vendas)).toEqual({ faturamento: 400, pedidos: 2, ticket: 200, pecas: 3, online: 0.5 });
    expect(resumoVendas([])).toEqual({ faturamento: 0, pedidos: 0, ticket: 0, pecas: 0, online: 0 });
  });

  it("divide o período em blocos contínuos que cobrem todos os dias", () => {
    for (const periodo of [7, 30, 90, 365] as const) {
      const bs = baldes(periodo);
      const { inicio, fim } = intervalos(periodo).atual;
      expect(bs[0]!.inicio).toBe(inicio);
      expect(bs.at(-1)!.fim).toBe(fim);
      bs.slice(1).forEach((b, i) => expect(b.inicio).toBe(addDias(bs[i]!.fim, 1)));
    }
    expect(baldes(7)).toHaveLength(7);
  });
});
