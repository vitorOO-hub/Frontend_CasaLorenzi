import { describe, expect, it } from "vitest";
import { linhasDaResposta, rotuloFerramenta, trechosDe, validarConversa, validarMensagem } from "./assistenteVendedorApi";

const conversa = {
  id_conversa: "c1",
  titulo: "quanto vendemos hoje?",
  status: "ativa",
  criada_em: "2026-10-28T12:00:00Z",
  atualizada_em: "2026-10-28T12:01:00Z",
};

describe("assistente do vendedor: validação", () => {
  it("aceita a conversa e recusa status desconhecido", () => {
    expect(validarConversa(conversa).titulo).toBe("quanto vendemos hoje?");
    expect(() => validarConversa({ ...conversa, status: "apagada" })).toThrow();
  });

  it("aceita a mensagem com as ferramentas usadas e recusa autor fora do combinado", () => {
    const m = { id_mensagem: "m1", autor: "assistente", texto: "R$ 10", criada_em: "2026-10-28T12:00:00Z", ferramentas: ["vendas_do_periodo"] };
    expect(validarMensagem(m).ferramentas).toEqual(["vendas_do_periodo"]);
    expect(validarMensagem({ ...m, ferramentas: undefined }).ferramentas).toEqual([]);
    expect(() => validarMensagem({ ...m, autor: "ferramenta" })).toThrow();
  });

  it("dá nome amigável só às ferramentas conhecidas", () => {
    expect(rotuloFerramenta("consultar_pecas")).toBe("estoque da loja");
    expect(rotuloFerramenta("outra")).toBeNull();
  });
});

describe("assistente do vendedor: texto da resposta", () => {
  it("separa negrito sem gerar HTML", () => {
    expect(trechosDe("Preço: **R$ 149,90** hoje")).toEqual([
      { texto: "Preço: ", negrito: false },
      { texto: "R$ 149,90", negrito: true },
      { texto: " hoje", negrito: false },
    ]);
    expect(trechosDe("<script>x</script>")).toEqual([{ texto: "<script>x</script>", negrito: false }]);
  });

  it("não come os asteriscos da máscara de CPF", () => {
    expect(trechosDe("CPF ***.***.***-01")).toEqual([{ texto: "CPF ***.***.***-01", negrito: false }]);
    expect(trechosDe("sem CPF: ***.***.***-**")).toEqual([{ texto: "sem CPF: ***.***.***-**", negrito: false }]);
    expect(trechosDe("**Ana** ***.***.***-01")).toEqual([
      { texto: "Ana", negrito: true },
      { texto: " ***.***.***-01", negrito: false },
    ]);
  });

  it("reconhece listas e ignora linhas vazias", () => {
    const linhas = linhasDaResposta("Mais vendidas:\n\n1. Camisa\n- **Calça** (6)\n### Dica\nOfereça o cinto.");
    expect(linhas.map((l) => l.tipo)).toEqual(["paragrafo", "item", "item", "paragrafo", "paragrafo"]);
    expect(linhas[2]!.trechos[0]).toEqual({ texto: "Calça", negrito: true });
    expect(linhas[3]!.trechos[0]!.texto).toBe("Dica");
  });
});
