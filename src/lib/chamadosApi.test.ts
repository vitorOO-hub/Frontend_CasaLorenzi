import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./api", () => ({ api }));

import {
  assumirChamado,
  buscarChamado,
  buscarMensagens,
  buscarOpcoes,
  buscarResumo,
  enviarMensagem,
  listarChamados,
  resolverChamado,
  validarDetalhe,
  validarItem,
  validarLista,
  validarMensagem,
  validarOpcoes,
  validarResumo,
} from "./chamadosApi";

const op = (codigo: string, nome = codigo) => ({ codigo, nome });

const item = () => ({
  id_atendimento: "a-1",
  protocolo: "AT-2026-0001",
  assunto: "Costura soltando",
  cliente_nome: "Helena",
  categoria: op("entrega", "Entrega"),
  canal: op("whatsapp", "WhatsApp"),
  prioridade: op("alta", "Alta"),
  status: op("aberto", "Aberto"),
  id_loja: "l-1",
  loja_nome: "Centro",
  aberto_em: "2026-10-05T10:00:00-03:00",
  id_usuario_responsavel: null,
  responsavel_nome: null,
  sou_responsavel: false,
});

const detalhe = () => ({
  ...item(),
  cliente: {
    id_cliente: "c-1",
    nome: "Helena",
    email: "helena@exemplo.com",
    telefone: null,
    cidade: "Sao Paulo, SP",
    cliente_desde: "2025-01-10T00:00:00Z",
  },
  pedido: { id_pedido: "p-1", numero_pedido: "PD-1", status: "Pago" },
  pecas: [{ nome: "Blusa", sku: "SKU-1", cor: "azul", tamanho: "M" }],
  anexos: [{ id_anexo: "x-1", nome: "foto.jpg", caminho: "x/foto.jpg", criado_em: "2026-10-05T10:01:00Z" }],
  outros_chamados: [{ id_atendimento: "a-2", protocolo: "AT-2026-0002", assunto: "Troca", status: op("resolvido", "Resolvido") }],
  compras_recentes: null,
});

beforeEach(() => vi.clearAllMocks());

describe("validação das respostas", () => {
  it("lista de chamados", () => {
    const l = validarLista({ total: 1, itens: [item()] });
    expect(l.total).toBe(1);
    expect(l.itens[0]!.prioridade.codigo).toBe("alta");
    expect(l.itens[0]!.sou_responsavel).toBe(false);
  });

  it("recusa item incompleto, tipo errado e resposta que não é objeto", () => {
    const { protocolo: _, ...semProtocolo } = item();
    expect(() => validarItem(semProtocolo)).toThrow();
    expect(() => validarItem({ ...item(), sou_responsavel: "sim" })).toThrow();
    expect(() => validarLista(null)).toThrow();
    expect(() => validarLista({ total: "1", itens: [] })).toThrow();
  });

  it("descarta campo que o servidor não deveria mandar", () => {
    const v = validarItem({ ...item(), email: "vazou@x.com", documento: "123" });
    expect(v).not.toHaveProperty("email");
    expect(v).not.toHaveProperty("documento");
  });

  it("detalhe sem compras (atendente) mantém nulo, e não lista vazia", () => {
    expect(validarDetalhe(detalhe()).compras_recentes).toBeNull();
  });

  it("compras da gestão: o valor decimal vem como texto e vira número", () => {
    const d = validarDetalhe({
      ...detalhe(),
      compras_recentes: [{ id_pedido: "p-1", numero_pedido: "PD-1", criado_em: "2026-09-01T00:00:00Z", valor_total: "199.90" }],
    });
    expect(d.compras_recentes![0]!.valor_total).toBeCloseTo(199.9);
    expect(() =>
      validarDetalhe({ ...detalhe(), compras_recentes: [{ id_pedido: "p", numero_pedido: "n", criado_em: "d", valor_total: "abc" }] }),
    ).toThrow();
  });

  it("detalhe sem pedido", () => {
    expect(validarDetalhe({ ...detalhe(), pedido: null }).pedido).toBeNull();
  });

  it("mensagem só aceita autor cliente ou atendente", () => {
    const base = { id_mensagem: "m-1", nome: "Rafael", texto: "Ola", enviada_em: "2026-10-05T10:00:00Z" };
    expect(validarMensagem({ ...base, autor: "atendente" }).autor).toBe("atendente");
    expect(() => validarMensagem({ ...base, autor: "admin" })).toThrow();
  });

  it("opções e resumo", () => {
    const o = validarOpcoes({
      status: [op("aberto")],
      canais: [op("site")],
      categorias: [op("pedido")],
      prioridades: [op("alta")],
      lojas: [{ id_loja: "l-1", nome: "Centro" }],
    });
    expect(o.lojas[0]!.nome).toBe("Centro");
    const r = validarResumo({ sem_resposta: 1, em_andamento: 2, prioridade_alta: 3, resolvidos: 4, na_fila: 5, meus: 6 });
    expect(r.meus).toBe(6);
    expect(() => validarResumo({ sem_resposta: 1 })).toThrow();
  });
});

describe("chamadas à API", () => {
  const BASE = "/api/v1/painel/atendimentos";

  it("lista: manda os filtros com os nomes do backend e deixa de fora os vazios", () => {
    listarChamados({ situacao: "abertos", responsavel: "eu", prioridade: "alta", canal: "whatsapp", idLoja: "l-1", limit: 20, offset: 40 });
    const [caminho, validar, parametros] = api.get.mock.calls[0]!;
    expect(caminho).toBe(BASE);
    expect(validar).toBe(validarLista);
    expect(parametros).toMatchObject({
      situacao: "abertos", responsavel: "eu", prioridade: "alta", canal: "whatsapp", id_loja: "l-1", limit: 20, offset: 40,
    });
    expect(parametros.categoria).toBeUndefined();
  });

  it("leituras usam GET nos caminhos combinados", () => {
    buscarOpcoes();
    buscarResumo("l-9");
    buscarChamado("a-1");
    buscarMensagens("a-1");
    expect(api.get.mock.calls.map((c) => c[0])).toEqual([
      `${BASE}/opcoes`,
      `${BASE}/resumo`,
      `${BASE}/a-1`,
      `${BASE}/a-1/mensagens`,
    ]);
    expect(api.get.mock.calls[1]![2]).toEqual({ id_loja: "l-9" });
  });

  it("escritas usam POST, e a mensagem leva só o texto (o remetente é o token)", () => {
    enviarMensagem("a-1", "Ola");
    assumirChamado("a-1");
    resolverChamado("a-1");
    expect(api.post.mock.calls.map((c) => c[0])).toEqual([`${BASE}/a-1/mensagens`, `${BASE}/a-1/assumir`, `${BASE}/a-1/resolver`]);
    expect(api.post.mock.calls[0]![2]).toEqual({ texto: "Ola" });
    expect(api.post.mock.calls[1]![2]).toBeUndefined();
  });
});
