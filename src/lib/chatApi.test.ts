import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./api", () => ({ api }));

import {
  abrirSessaoChat,
  enviarMensagemChat,
  listarConversas,
  marcarConversaLida,
  mensagensDoChat,
  resumoDasConversas,
  validarItemConversa,
  validarLido,
  validarListaConversas,
  validarMensagensChat,
  validarResumoConversas,
  validarSessao,
} from "./chatApi";

const op = (codigo: string, nome = codigo) => ({ codigo, nome });
const ID = "11111111-1111-4111-8111-111111111111";

const conversa = () => ({
  id_atendimento: ID,
  protocolo: "AT-2026-0001",
  assunto: "Costura",
  cliente_nome: "Helena",
  canal: op("whatsapp", "WhatsApp"),
  prioridade: op("alta", "Alta"),
  status: op("aberto", "Aberto"),
  id_loja: null,
  loja_nome: null,
  aberto_em: "2026-10-07T10:00:00-03:00",
  id_usuario_responsavel: null,
  responsavel_nome: null,
  sou_responsavel: false,
  nao_lidas: 2,
  aguardando_resposta: true,
  ultima_mensagem: { texto: "oi", enviada_em: "2026-10-07T10:05:00-03:00", autor: "cliente" },
});

const sessao = () => ({
  id_atendimento: ID,
  topico: `chamado:${ID}`,
  canal_privado: true,
  filtro_mensagens: `id_atendimento=eq.${ID}`,
  eu: { id_usuario: "u-1", nome: "Ana", papel: "atendente" },
  status: op("aberto", "Aberto"),
  id_usuario_responsavel: null,
  responsavel_nome: null,
  sou_responsavel: false,
  pode_responder: true,
  motivo_bloqueio: null,
  ultimo_id_mensagem: "m-1",
  nao_lidas: 1,
});

const mensagem = () => ({
  id_mensagem: "m-1",
  autor: "cliente",
  nome: "Helena",
  texto: "oi",
  enviada_em: "2026-10-07T10:05:00-03:00",
});

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
});

describe("validação do chat", () => {
  it("aceita a conversa da caixa e descarta campo extra", () => {
    const c = validarItemConversa({ ...conversa(), cpf: "000" });
    expect(c.nao_lidas).toBe(2);
    expect(c.ultima_mensagem?.autor).toBe("cliente");
    expect("cpf" in c).toBe(false);
  });

  it("aceita conversa sem mensagens", () => {
    expect(validarItemConversa({ ...conversa(), ultima_mensagem: null }).ultima_mensagem).toBeNull();
  });

  it.each([
    ["nao_lidas", "2"],
    ["aguardando_resposta", "sim"],
    ["canal", null],
    ["ultima_mensagem", { texto: "x", enviada_em: "d", autor: "robo" }],
  ])("recusa %s fora do formato", (campo, valor) => {
    expect(() => validarItemConversa({ ...conversa(), [campo]: valor })).toThrow();
  });

  it("valida lista e resumo", () => {
    expect(validarListaConversas({ total: 1, itens: [conversa()] }).itens).toHaveLength(1);
    expect(() => validarListaConversas({ total: 1, itens: [{}] })).toThrow();
    const resumo = { fila: 1, minhas: 2, com_nao_lidas: 3, nao_lidas: 4, aguardando_resposta: 5 };
    expect(validarResumoConversas(resumo)).toEqual(resumo);
    expect(() => validarResumoConversas({ ...resumo, fila: "1" })).toThrow();
  });

  it("aceita a sessão do chat", () => {
    const s = validarSessao(sessao());
    expect(s.topico).toBe(`chamado:${ID}`);
    expect(s.pode_responder).toBe(true);
    expect(s.eu.nome).toBe("Ana");
  });

  it.each(["chamado:abc", `sala:${ID}`, `chamado:${ID}:extra`, `CHAMADO:${ID}`, ""])(
    "recusa tópico fora do combinado: %s",
    (topico) => {
      expect(() => validarSessao({ ...sessao(), topico })).toThrow();
    },
  );

  it("recusa sessão sem o bloco 'eu' ou com tipo errado", () => {
    expect(() => validarSessao({ ...sessao(), eu: null })).toThrow();
    expect(() => validarSessao({ ...sessao(), pode_responder: "true" })).toThrow();
  });

  it("valida as mensagens com cursor e o contador de lido", () => {
    const r = validarMensagensChat({ mensagens: [mensagem()], ultimo_id_mensagem: "m-1" });
    expect(r.mensagens[0]?.texto).toBe("oi");
    expect(validarMensagensChat({ mensagens: [], ultimo_id_mensagem: null }).ultimo_id_mensagem).toBeNull();
    expect(() => validarMensagensChat({ mensagens: [{ ...mensagem(), autor: "bot" }], ultimo_id_mensagem: null })).toThrow();
    expect(validarLido({ nao_lidas: 0 })).toBe(0);
    expect(() => validarLido({})).toThrow();
  });
});

describe("chamadas do chat", () => {
  it("lista com seção, só não lidas e paginação", () => {
    listarConversas({ secao: "minhas", apenasNaoLidas: true, limit: 20, offset: 40 });
    expect(api.get).toHaveBeenCalledWith(
      "/api/v1/painel/chat/conversas",
      validarListaConversas,
      { secao: "minhas", apenas_nao_lidas: "true", id_loja: undefined, limit: 20, offset: 40 },
      undefined,
    );
  });

  it("não manda apenas_nao_lidas quando o filtro está desligado", () => {
    listarConversas({ secao: "todas", apenasNaoLidas: false, limit: 20, offset: 0 });
    expect(api.get.mock.calls[0]![2]).toMatchObject({ apenas_nao_lidas: undefined });
  });

  it("usa as rotas privadas do painel", () => {
    resumoDasConversas("loja-1");
    expect(api.get).toHaveBeenLastCalledWith(
      "/api/v1/painel/chat/conversas/resumo",
      validarResumoConversas,
      { id_loja: "loja-1" },
      undefined,
    );
    abrirSessaoChat(ID);
    expect(api.get).toHaveBeenLastCalledWith(`/api/v1/painel/chat/conversas/${ID}/sessao`, validarSessao, undefined, undefined);
    mensagensDoChat(ID, "m-9");
    expect(api.get).toHaveBeenLastCalledWith(
      `/api/v1/painel/chat/conversas/${ID}/mensagens`,
      validarMensagensChat,
      { apos: "m-9" },
      undefined,
    );
    mensagensDoChat(ID);
    expect(api.get.mock.calls.at(-1)![2]).toEqual({ apos: undefined });
  });

  it("envia só o texto: quem manda é decidido pelo servidor", () => {
    enviarMensagemChat(ID, "olá");
    const [caminho, , corpo] = api.post.mock.calls[0]!;
    expect(caminho).toBe(`/api/v1/painel/chat/conversas/${ID}/mensagens`);
    expect(corpo).toEqual({ texto: "olá" });
    marcarConversaLida(ID);
    expect(api.post.mock.calls[1]![0]).toBe(`/api/v1/painel/chat/conversas/${ID}/lido`);
  });
});
