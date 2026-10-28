import { afterEach, describe, expect, it, vi } from "vitest";
import { validarConversaAssistente, validarRespostaAssistente } from "./assistenteClienteApi";
import {
  CABECALHO_PASSAGEM,
  atendimentoEncerrado,
  esquecerConversa,
  guardarConversa,
  lerConversaGuardada,
  mensagensDaEquipeNoPainel,
  respostasDaEquipe,
} from "./assistenteConversa";

describe("assistente do cliente: respostas da API", () => {
  it("valida a resposta com as peças oferecidas e o chamado", () => {
    const r = validarRespostaAssistente({
      id_conversa: "c1",
      status: "com_atendente",
      resposta: "Aqui está o blazer.",
      sem_resposta: false,
      carrinho_alterado: false,
      id_atendimento: "a1",
      modelo: "nao deveria passar",
      ofertas: [
        {
          id_variacao: "v1",
          sku: "CL-BLZ-AZ-M",
          produto: "blazer alfaiataria",
          cor: "azul marinho",
          tamanho: "M",
          preco: "899.00",
          imagem_url: "/img/blazer.jpg",
          imagem_alt: null,
          tecido: "lã fria",
          quantidade: 1,
          estoque: 3,
        },
      ],
    });
    expect(r).toEqual({
      id_conversa: "c1",
      status: "com_atendente",
      resposta: "Aqui está o blazer.",
      sem_resposta: false,
      id_atendimento: "a1",
      ofertas: [
        {
          id_variacao: "v1",
          sku: "CL-BLZ-AZ-M",
          produto: "blazer alfaiataria",
          cor: "azul marinho",
          tamanho: "M",
          preco: 899,
          imagem_url: "/img/blazer.jpg",
          imagem_alt: null,
          tecido: "lã fria",
          quantidade: 1,
          variacoes: [{ id_variacao: "v1", sku: "CL-BLZ-AZ-M", cor: "azul marinho", tamanho: "M", preco: 899 }],
        },
      ],
    });
  });

  it("opção de pedido vago traz as variações para escolher no cartão", () => {
    const [opcao] = validarRespostaAssistente({
      id_conversa: "c1",
      status: "ativa",
      resposta: "Separei algumas opções.",
      sem_resposta: false,
      id_atendimento: null,
      ofertas: [
        {
          id_variacao: "v1", sku: "BLZ-AZ-M", produto: "blazer azul", cor: "azul", tamanho: "M", preco: "899.00",
          imagem_url: null, imagem_alt: null, tecido: null, quantidade: 1,
          variacoes: [
            { id_variacao: "v1", sku: "BLZ-AZ-M", cor: "azul", tamanho: "M", preco: "899.00" },
            { id_variacao: "v2", sku: "BLZ-AZ-G", cor: "azul", tamanho: "G", preco: 899 },
          ],
        },
      ],
    }).ofertas;
    expect(opcao.variacoes.map((v) => v.tamanho)).toEqual(["M", "G"]);
    expect(opcao.variacoes[0].preco).toBe(899);
  });

  it("backend anterior sem ofertas continua valendo; oferta incompleta é recusada", () => {
    const base = { id_conversa: "c1", status: "ativa", resposta: "x", sem_resposta: false, id_atendimento: null };
    expect(validarRespostaAssistente(base).ofertas).toEqual([]);
    expect(() => validarRespostaAssistente({ ...base, ofertas: [{ sku: "X" }] })).toThrow();
  });

  it("recusa status ou autor fora do combinado", () => {
    const base = { id_conversa: "c1", resposta: "x", sem_resposta: false, id_atendimento: null };
    expect(() => validarRespostaAssistente({ ...base, status: "encerrada" })).toThrow();
    expect(() =>
      validarConversaAssistente({
        id_conversa: "c1",
        status: "ativa",
        id_atendimento: null,
        criada_em: "2026-10-27T10:00:00Z",
        mensagens: [{ autor: "ferramenta", texto: "{}", criada_em: "2026-10-27T10:00:00Z" }],
      }),
    ).toThrow();
  });

  it("valida a conversa retomada", () => {
    const c = validarConversaAssistente({
      id_conversa: "c1",
      status: "ativa",
      id_atendimento: null,
      criada_em: "2026-10-27T10:00:00Z",
      mensagens: [
        { autor: "usuario", texto: "oi", criada_em: "2026-10-27T10:00:00Z" },
        { autor: "assistente", texto: "Olá!", criada_em: "2026-10-27T10:00:01Z" },
      ],
    });
    expect(c.mensagens.map((m) => m.autor)).toEqual(["usuario", "assistente"]);
  });
});

describe("assistente do cliente: conversa guardada na aba", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("guarda por cliente e esquece", () => {
    const dados = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, v),
      removeItem: (k: string) => void dados.delete(k),
    });
    guardarConversa("cliente-a", "conversa-1");
    expect(lerConversaGuardada("cliente-a")).toBe("conversa-1");
    expect(lerConversaGuardada("cliente-b")).toBeNull();
    esquecerConversa("cliente-a");
    expect(lerConversaGuardada("cliente-a")).toBeNull();
  });

  it("sem armazenamento (aba anônima, bloqueado) não quebra", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    });
    expect(() => guardarConversa("c", "x")).not.toThrow();
    expect(lerConversaGuardada("c")).toBeNull();
    expect(() => esquecerConversa("c")).not.toThrow();
  });
});

describe("assistente do cliente: chat com a equipe no mesmo painel", () => {
  const mensagem = (autor: "cliente" | "atendente", texto: string) => ({ autor, texto });

  it("esconde a transcrição que a equipe recebeu (o cliente já vê a conversa acima)", () => {
    const doChamado = [
      mensagem("cliente", `${CABECALHO_PASSAGEM}\nMotivo: x\n\nConversa com o assistente:\nCliente: oi`),
      mensagem("atendente", "Oi! Já vi o resumo."),
    ];
    expect(mensagensDaEquipeNoPainel(doChamado)).toEqual([doChamado[1]]);
  });

  it("chamado comum (sem transcrição) aparece inteiro", () => {
    const doChamado = [mensagem("cliente", "Meu zíper quebrou."), mensagem("atendente", "Vamos trocar.")];
    expect(mensagensDaEquipeNoPainel(doChamado)).toEqual(doChamado);
  });

  it("conta só as respostas da equipe e reconhece atendimento encerrado", () => {
    expect(respostasDaEquipe([mensagem("cliente", "a"), mensagem("atendente", "b"), mensagem("atendente", "c")])).toBe(2);
    expect(atendimentoEncerrado("resolvido")).toBe(true);
    expect(atendimentoEncerrado("em_andamento")).toBe(false);
  });
});
