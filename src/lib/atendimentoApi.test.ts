import { describe, expect, it } from "vitest";
import { validarDashboard, validarFila } from "./atendimentoApi";

const resumo = { total: 4, resolvidos: 1, taxa_resolucao: 0.25, resposta_media_horas: 1.25 };

const dashboard = () => ({
  periodo: { inicio: "2026-10-01", fim: "2026-10-07" },
  periodo_anterior: { inicio: "2026-09-24", fim: "2026-09-30" },
  atual: resumo,
  anterior: { ...resumo, resposta_media_horas: null },
  volume_diario: [{ data: "2026-10-01", total: 2 }],
  por_categoria: [{ codigo: "pedido", nome: "Pedido", total: 2 }],
  resposta_por_canal: [{ codigo: "email", nome: "E-mail", total: 1, resposta_media_horas: null }],
  opcoes: {
    lojas: [{ id_loja: "l-1", nome: "Ibirapuera" }],
    canais: [{ codigo: "email", nome: "E-mail" }],
    categorias: [{ codigo: "pedido", nome: "Pedido" }],
  },
  escopo: { papel: "admin", id_loja: null, pode_escolher_loja: true },
});

const item = () => ({
  id_atendimento: "a-1",
  assunto: "Defeito na costura",
  cliente_nome: "Helena",
  canal_codigo: "whatsapp",
  canal: "WhatsApp",
  categoria_codigo: "pedido",
  categoria: "Pedido",
  prioridade_codigo: "alta",
  prioridade: "Alta",
  status_codigo: "aberto",
  status: "Aberto",
  aberto_em: "2026-10-02T23:30:00-03:00",
  id_loja: null,
  loja_nome: null,
  sem_resposta: true,
});

describe("validação das respostas do dashboard", () => {
  it("aceita o formato combinado com o backend", () => {
    const d = validarDashboard(dashboard());
    expect(d.atual.total).toBe(4);
    expect(d.anterior.resposta_media_horas).toBeNull();
    expect(d.escopo.pode_escolher_loja).toBe(true);
    expect(d.opcoes.lojas[0]!.nome).toBe("Ibirapuera");
  });

  it.each([
    ["resposta que não é objeto", null],
    ["lista no lugar do objeto", []],
    ["texto", "ok"],
  ])("recusa %s", (_nome, valor) => {
    expect(() => validarDashboard(valor)).toThrow();
  });

  it("recusa número em formato de texto e campos ausentes", () => {
    const ruim = dashboard();
    (ruim.atual as unknown as Record<string, unknown>).total = "4";
    expect(() => validarDashboard(ruim)).toThrow();
    const semOpcoes = { ...dashboard(), opcoes: undefined };
    expect(() => validarDashboard(semOpcoes)).toThrow();
  });

  it("recusa NaN e Infinity", () => {
    const ruim = dashboard();
    ruim.atual.taxa_resolucao = Number.NaN;
    expect(() => validarDashboard(ruim)).toThrow();
  });
});

describe("validação da fila", () => {
  it("aceita itens completos", () => {
    const fila = validarFila({ total_aberto: 1, sem_resposta: 1, urgentes: 1, itens: [item()] });
    expect(fila.itens[0]!.assunto).toBe("Defeito na costura");
    expect(fila.itens[0]!.sem_resposta).toBe(true);
  });

  it("não deixa passar campos extras do servidor para a tela", () => {
    const comExtra = { ...item(), email: "vazou@exemplo.com", telefone: "1199999" };
    const fila = validarFila({ total_aberto: 1, sem_resposta: 0, urgentes: 0, itens: [comExtra] });
    expect(fila.itens[0]).not.toHaveProperty("email");
    expect(fila.itens[0]).not.toHaveProperty("telefone");
  });

  it("recusa item incompleto", () => {
    const { assunto: _, ...semAssunto } = item();
    expect(() => validarFila({ total_aberto: 1, sem_resposta: 0, urgentes: 0, itens: [semAssunto] })).toThrow();
  });

  it("fila vazia é válida", () => {
    expect(validarFila({ total_aberto: 0, sem_resposta: 0, urgentes: 0, itens: [] }).itens).toEqual([]);
  });
});
