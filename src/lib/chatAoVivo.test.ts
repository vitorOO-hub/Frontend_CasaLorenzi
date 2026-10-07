import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApi } from "@/api/erros";
import type { MensagemChamado } from "./chamadosApi";
import {
  abrirChatAoVivo,
  assinarMudancasDaCaixa,
  CONFERENCIA_MS,
  lerDigitando,
  mesclarMensagens,
  nomesPresentes,
  type CanalRealtime,
  type ClienteRealtime,
  type DependenciasChat,
  type EstadoChat,
} from "./chatAoVivo";
import type { SessaoChat } from "./chatApi";

const ID = "11111111-1111-4111-8111-111111111111";
const EU = "22222222-2222-4222-8222-222222222222";

const msg = (n: number, autor: "cliente" | "atendente" = "cliente"): MensagemChamado => ({
  id_mensagem: `m-${n}`,
  autor,
  nome: autor === "cliente" ? "Helena" : "Ana",
  texto: `texto ${n}`,
  enviada_em: `2026-10-07T10:0${n}:00-03:00`,
});

const sessao = (extra: Partial<SessaoChat> = {}): SessaoChat => ({
  id_atendimento: ID,
  topico: `chamado:${ID}`,
  canal_privado: true,
  filtro_mensagens: `id_atendimento=eq.${ID}`,
  eu: { id_usuario: EU, nome: "Ana", papel: "atendente" },
  status: { codigo: "aberto", nome: "Aberto" },
  id_usuario_responsavel: null,
  responsavel_nome: null,
  sou_responsavel: false,
  pode_responder: true,
  motivo_bloqueio: null,
  ultimo_id_mensagem: "m-1",
  nao_lidas: 0,
  ...extra,
});

type Handler = { tipo: string; filtro: Record<string, unknown>; cb: (p: unknown) => void };

class CanalFalso implements CanalRealtime {
  handlers: Handler[] = [];
  avisoDeStatus: ((s: string) => void) | undefined;
  enviados: Record<string, unknown>[] = [];
  rastreados: Record<string, unknown>[] = [];
  presenca: Record<string, unknown[]> = {};
  nome: string;
  opcoes?: Record<string, unknown>;
  constructor(nome: string, opcoes?: Record<string, unknown>) {
    this.nome = nome;
    this.opcoes = opcoes;
  }
  on(tipo: string, filtro: Record<string, unknown>, cb: (p: unknown) => void) {
    this.handlers.push({ tipo, filtro, cb });
    return this;
  }
  subscribe(cb?: (s: string) => void) {
    this.avisoDeStatus = cb;
    return this;
  }
  send(m: Record<string, unknown>) {
    this.enviados.push(m);
  }
  track(p: Record<string, unknown>) {
    this.rastreados.push(p);
  }
  presenceState() {
    return this.presenca;
  }
  disparar(tipo: string, evento: string, payload: unknown = {}) {
    for (const h of this.handlers) {
      if (h.tipo === tipo && (h.filtro.event === evento || h.filtro.event === "*")) h.cb(payload);
    }
  }
}

function criarRealtime() {
  const canais: CanalFalso[] = [];
  const removidos: CanalFalso[] = [];
  const cliente: ClienteRealtime = {
    channel: (nome, opcoes) => {
      const c = new CanalFalso(nome, opcoes);
      canais.push(c);
      return c;
    },
    removeChannel: (c) => removidos.push(c as CanalFalso),
  };
  return {
    cliente,
    canais,
    removidos,
    banco: () => canais.find((c) => c.nome.startsWith("chat-banco"))!,
    privado: () => canais.find((c) => c.nome.startsWith("chamado:"))!,
  };
}

async function ciclo(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms);
}

function montar(extra: Partial<DependenciasChat> = {}, s = sessao(), inicial = [msg(1)]) {
  const rt = criarRealtime();
  const api = {
    abrirSessao: vi.fn().mockResolvedValue(s),
    mensagens: vi.fn().mockResolvedValue({ mensagens: inicial, ultimo_id_mensagem: inicial.at(-1)?.id_mensagem ?? null }),
    enviar: vi.fn(),
    marcarLido: vi.fn().mockResolvedValue(0),
  };
  const estados: EstadoChat[] = [];
  const chat = abrirChatAoVivo({ api, realtime: () => rt.cliente, ...extra }, ID, (e) => estados.push(e));
  return { chat, rt, api, estados, ultimo: () => estados.at(-1)! };
}

function montarComFalha(erro: ErroApi, extra: Partial<DependenciasChat> = {}) {
  const rt = criarRealtime();
  const estados: EstadoChat[] = [];
  abrirChatAoVivo(
    {
      api: {
        abrirSessao: vi.fn().mockRejectedValue(erro),
        mensagens: vi.fn(),
        enviar: vi.fn(),
        marcarLido: vi.fn(),
      },
      realtime: () => rt.cliente,
      ...extra,
    },
    ID,
    (e) => estados.push(e),
  );
  return { rt, estados };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("funções puras", () => {
  it("mesclar não repete mensagem e mantém a ordem", () => {
    const base = [msg(1), msg(2)];
    expect(mesclarMensagens(base, [msg(2), msg(3)]).map((m) => m.id_mensagem)).toEqual(["m-1", "m-2", "m-3"]);
    expect(mesclarMensagens(base, [msg(1)])).toBe(base);
    expect(mesclarMensagens(base, [])).toBe(base);
    expect(mesclarMensagens([], [msg(4), msg(4)])).toHaveLength(1);
  });

  it("lê o payload de digitando e recusa o que não segue o combinado", () => {
    expect(lerDigitando({ payload: { id_usuario: "u1", nome: " Bia " } })).toEqual({ id_usuario: "u1", nome: "Bia" });
    expect(lerDigitando({ id_usuario: "u1", nome: "Bia" })).toEqual({ id_usuario: "u1", nome: "Bia" });
    expect(lerDigitando({ payload: { id_usuario: 1, nome: "Bia" } })).toBeNull();
    expect(lerDigitando({ payload: { id_usuario: "u1", nome: "  " } })).toBeNull();
    expect(lerDigitando(null)).toBeNull();
    expect(lerDigitando("texto")).toBeNull();
    expect(lerDigitando({ payload: { id_usuario: "u1", nome: "x".repeat(500) } })?.nome).toHaveLength(80);
  });

  it("presentes ignora eu, repetidos e entradas fora do formato", () => {
    const estado = {
      a: [{ id_usuario: EU, nome: "Ana" }],
      b: [
        { id_usuario: "u2", nome: "Caio" },
        { id_usuario: "u2", nome: "Caio" },
      ],
      c: [{ id_usuario: "u3" }, null, { nome: "sem id" }],
    };
    expect(nomesPresentes(estado, EU)).toEqual(["Caio"]);
  });
});

describe("abrirChatAoVivo", () => {
  it("abre a sessão, carrega as mensagens e liga os dois canais", async () => {
    const { rt, api, ultimo } = montar();
    await ciclo();
    expect(api.abrirSessao).toHaveBeenCalledWith(ID);
    expect(ultimo().mensagens.map((m) => m.id_mensagem)).toEqual(["m-1"]);
    expect(ultimo().carregando).toBe(false);

    const filtro = rt.banco().handlers[0]!.filtro;
    expect(filtro).toMatchObject({ table: "mensagem", event: "INSERT", filter: `id_atendimento=eq.${ID}` });
    expect(rt.privado().nome).toBe(`chamado:${ID}`);
    expect(rt.privado().opcoes).toMatchObject({
      config: { private: true, broadcast: { self: false }, presence: { key: EU } },
    });
  });

  it("entrega o token ao Realtime antes de abrir os canais", async () => {
    const ordem: string[] = [];
    const { rt } = montar({
      autenticarRealtime: () => {
        ordem.push("token");
        return Promise.resolve();
      },
    });
    const original = rt.cliente.channel;
    rt.cliente.channel = (n, o) => {
      ordem.push("canal");
      return original(n, o);
    };
    await ciclo();
    expect(ordem.slice(0, 2)).toEqual(["token", "canal"]);
  });

  it("fica ao vivo quando o canal conecta e busca o que chegou enquanto estava fora", async () => {
    const { rt, api, ultimo } = montar();
    await ciclo();
    api.mensagens.mockResolvedValueOnce({ mensagens: [msg(2)], ultimo_id_mensagem: "m-2" });
    rt.banco().avisoDeStatus!("SUBSCRIBED");
    await ciclo();
    expect(ultimo().conexao).toBe("ao_vivo");
    expect(api.mensagens).toHaveBeenLastCalledWith(ID, "m-1");
    expect(ultimo().mensagens.map((m) => m.id_mensagem)).toEqual(["m-1", "m-2"]);
  });

  it("marca como reconectando quando o canal cai", async () => {
    const { rt, ultimo } = montar();
    await ciclo();
    rt.banco().avisoDeStatus!("SUBSCRIBED");
    rt.banco().avisoDeStatus!("CHANNEL_ERROR");
    expect(ultimo().conexao).toBe("reconectando");
  });

  it("mensagem nova do cliente chega pelo evento, usa o cursor e marca como lida", async () => {
    const { rt, api, ultimo } = montar();
    await ciclo();
    api.mensagens.mockResolvedValueOnce({ mensagens: [msg(2)], ultimo_id_mensagem: "m-2" });
    rt.banco().disparar("postgres_changes", "INSERT", { new: { texto: "ignorado" } });
    await ciclo();
    expect(api.mensagens).toHaveBeenLastCalledWith(ID, "m-1");
    expect(ultimo().mensagens.at(-1)?.texto).toBe("texto 2");
    expect(api.marcarLido).toHaveBeenCalledWith(ID);
  });

  it("não marca como lida com a aba escondida", async () => {
    const { rt, api } = montar({ visivel: () => false });
    await ciclo();
    api.mensagens.mockResolvedValueOnce({ mensagens: [msg(2)], ultimo_id_mensagem: "m-2" });
    rt.banco().disparar("postgres_changes", "INSERT");
    await ciclo();
    expect(api.marcarLido).not.toHaveBeenCalled();
  });

  it("ao abrir com não lidas, marca como lida", async () => {
    const { api } = montar({}, sessao({ nao_lidas: 3 }));
    await ciclo();
    expect(api.marcarLido).toHaveBeenCalledTimes(1);
  });

  it("eventos seguidos não disparam buscas em paralelo e nada se perde", async () => {
    const { rt, api, ultimo } = montar();
    await ciclo();
    let liberar!: (v: unknown) => void;
    api.mensagens.mockReturnValueOnce(new Promise((r) => (liberar = r)));
    api.mensagens.mockResolvedValueOnce({ mensagens: [msg(3)], ultimo_id_mensagem: "m-3" });
    rt.banco().disparar("postgres_changes", "INSERT");
    rt.banco().disparar("postgres_changes", "INSERT");
    rt.banco().disparar("postgres_changes", "INSERT");
    expect(api.mensagens).toHaveBeenCalledTimes(2); // 1 da abertura + 1 em andamento
    liberar({ mensagens: [msg(2)], ultimo_id_mensagem: "m-2" });
    await ciclo();
    expect(api.mensagens).toHaveBeenCalledTimes(3); // uma repetição, não três
    expect(ultimo().mensagens.map((m) => m.id_mensagem)).toEqual(["m-1", "m-2", "m-3"]);
  });

  it("cursor que sumiu (404) relê a conversa do começo", async () => {
    const { rt, api, ultimo } = montar();
    await ciclo();
    api.mensagens.mockRejectedValueOnce(new ErroApi("nao_encontrado", "Mensagem de referencia nao encontrada", 404));
    api.mensagens.mockResolvedValueOnce({ mensagens: [msg(1), msg(2)], ultimo_id_mensagem: "m-2" });
    rt.banco().disparar("postgres_changes", "INSERT");
    await ciclo();
    expect(api.mensagens).toHaveBeenLastCalledWith(ID, null);
    expect(ultimo().mensagens.map((m) => m.id_mensagem)).toEqual(["m-1", "m-2"]);
    expect(ultimo().erro).toBeNull();
  });

  it("enviar mostra a mensagem na hora e o eco do Realtime não duplica", async () => {
    const { chat, rt, api, ultimo } = montar();
    await ciclo();
    api.enviar.mockResolvedValueOnce(msg(2, "atendente"));
    api.mensagens.mockResolvedValue({ mensagens: [msg(2, "atendente")], ultimo_id_mensagem: "m-2" });
    await chat.enviar("olá");
    await ciclo();
    expect(api.enviar).toHaveBeenCalledWith(ID, "olá");
    expect(ultimo().mensagens.map((m) => m.id_mensagem)).toEqual(["m-1", "m-2"]);
    rt.banco().disparar("postgres_changes", "INSERT");
    await ciclo();
    expect(ultimo().mensagens).toHaveLength(2);
    expect(api.abrirSessao).toHaveBeenCalledTimes(2); // responder pode assumir o chamado
  });

  it("erro no envio sobe para a tela mostrar", async () => {
    const { chat, api } = montar();
    await ciclo();
    api.enviar.mockRejectedValueOnce(new ErroApi("conflito", "Ana ja assumiu este chamado", 409));
    await expect(chat.enviar("oi")).rejects.toThrow("Ana ja assumiu");
  });

  it("mudança no chamado (assumido, encerrado) relê a sessão", async () => {
    const { rt, api, ultimo } = montar();
    await ciclo();
    api.abrirSessao.mockResolvedValueOnce(
      sessao({ status: { codigo: "resolvido", nome: "Resolvido" }, pode_responder: false }),
    );
    rt.banco().disparar("postgres_changes", "UPDATE");
    await ciclo();
    expect(ultimo().sessao?.status.codigo).toBe("resolvido");
    expect(ultimo().sessao?.pode_responder).toBe(false);
  });

  it("sessão expirada (401) avisa e mostra o erro", async () => {
    const aoSessaoExpirar = vi.fn();
    const { rt, estados } = montarComFalha(new ErroApi("nao_autenticado", undefined, 401), { aoSessaoExpirar });
    await ciclo();
    expect(aoSessaoExpirar).toHaveBeenCalledTimes(1);
    expect(estados.at(-1)).toMatchObject({ carregando: false, erro: expect.stringContaining("sessão") });
    expect(rt.canais).toHaveLength(0);
  });

  it("conversa sem acesso (404) mostra o erro e não abre canal", async () => {
    const { rt, estados } = montarComFalha(new ErroApi("nao_encontrado", "Chamado nao encontrado", 404));
    await ciclo();
    expect(estados.at(-1)?.erro).toBe("Chamado nao encontrado");
    expect(rt.canais).toHaveLength(0);
  });
});

describe("digitando e presença", () => {
  it("mostra quem está digitando e apaga depois de 4 s", async () => {
    const { rt, ultimo } = montar();
    await ciclo();
    rt.privado().disparar("broadcast", "digitando", { payload: { id_usuario: "u9", nome: "Caio" } });
    expect(ultimo().digitando).toEqual(["Caio"]);
    await ciclo(3_000);
    expect(ultimo().digitando).toEqual(["Caio"]);
    await ciclo(1_200);
    expect(ultimo().digitando).toEqual([]);
  });

  it("renovar o aviso estende o tempo; duas pessoas aparecem juntas", async () => {
    const { rt, ultimo } = montar();
    await ciclo();
    const caio = { payload: { id_usuario: "u9", nome: "Caio" } };
    rt.privado().disparar("broadcast", "digitando", caio);
    await ciclo(3_000);
    rt.privado().disparar("broadcast", "digitando", caio);
    rt.privado().disparar("broadcast", "digitando", { payload: { id_usuario: "u8", nome: "Bia" } });
    await ciclo(3_000);
    expect(ultimo().digitando).toEqual(["Caio", "Bia"]);
    await ciclo(2_000);
    expect(ultimo().digitando).toEqual([]);
  });

  it("ignora o próprio aviso e payload inválido", async () => {
    const { rt, ultimo } = montar();
    await ciclo();
    rt.privado().disparar("broadcast", "digitando", { payload: { id_usuario: EU, nome: "Ana" } });
    rt.privado().disparar("broadcast", "digitando", { payload: { nome: "sem id" } });
    expect(ultimo().digitando).toEqual([]);
  });

  it("avisar digitando manda no máximo um broadcast a cada 2 s", async () => {
    const { chat, rt } = montar();
    await ciclo();
    chat.avisarDigitando();
    chat.avisarDigitando();
    chat.avisarDigitando();
    expect(rt.privado().enviados).toHaveLength(1);
    expect(rt.privado().enviados[0]).toEqual({
      type: "broadcast",
      event: "digitando",
      payload: { id_usuario: EU, nome: "Ana" },
    });
    await ciclo(2_100);
    chat.avisarDigitando();
    expect(rt.privado().enviados).toHaveLength(2);
  });

  it("anuncia a presença ao entrar e lista quem mais está na conversa", async () => {
    const { rt, ultimo } = montar();
    await ciclo();
    rt.privado().avisoDeStatus!("SUBSCRIBED");
    expect(rt.privado().rastreados[0]).toEqual({ id_usuario: EU, nome: "Ana", papel: "atendente" });
    rt.privado().presenca = {
      [EU]: [{ id_usuario: EU, nome: "Ana" }],
      u7: [{ id_usuario: "u7", nome: "Dani" }],
    };
    rt.privado().disparar("presence", "sync");
    expect(ultimo().presentes).toEqual(["Dani"]);
  });
});

describe("conferência e encerramento", () => {
  it("sem Realtime a conferência periódica busca as mensagens", async () => {
    const { api, ultimo } = montar();
    await ciclo();
    api.mensagens.mockResolvedValueOnce({ mensagens: [msg(2)], ultimo_id_mensagem: "m-2" });
    await ciclo(CONFERENCIA_MS);
    expect(ultimo().mensagens).toHaveLength(2);
  });

  it("ao vivo, a conferência roda só a cada duas voltas", async () => {
    const { rt, api } = montar();
    await ciclo();
    rt.banco().avisoDeStatus!("SUBSCRIBED");
    await ciclo();
    const antes = api.mensagens.mock.calls.length;
    await ciclo(CONFERENCIA_MS);
    expect(api.mensagens.mock.calls.length).toBe(antes);
    await ciclo(CONFERENCIA_MS);
    expect(api.mensagens.mock.calls.length).toBe(antes + 1);
  });

  it("fechar remove os canais e para tudo", async () => {
    const { chat, rt, api, estados } = montar();
    await ciclo();
    chat.fechar();
    expect(rt.removidos).toEqual(expect.arrayContaining([rt.banco(), rt.privado()]));
    const chamadas = api.mensagens.mock.calls.length;
    const emitidos = estados.length;
    await ciclo(CONFERENCIA_MS * 3);
    rt.banco().disparar("postgres_changes", "INSERT");
    expect(api.mensagens.mock.calls.length).toBe(chamadas);
    expect(estados.length).toBe(emitidos);
  });

  it("fechar antes de a sessão chegar não abre canal nenhum", async () => {
    const { chat, rt } = montar();
    chat.fechar();
    await ciclo();
    expect(rt.canais).toHaveLength(0);
  });
});

describe("assinarMudancasDaCaixa", () => {
  it("junta vários eventos seguidos em um aviso só", async () => {
    const rt = criarRealtime();
    const aviso = vi.fn();
    assinarMudancasDaCaixa(rt.cliente, aviso, 500);
    const canal = rt.canais[0]!;
    expect(canal.handlers.map((h) => h.filtro)).toEqual([
      { event: "INSERT", schema: "public", table: "mensagem" },
      { event: "*", schema: "public", table: "atendimento" },
    ]);
    canal.disparar("postgres_changes", "INSERT");
    canal.disparar("postgres_changes", "UPDATE");
    canal.disparar("postgres_changes", "INSERT");
    expect(aviso).not.toHaveBeenCalled();
    await ciclo(500);
    expect(aviso).toHaveBeenCalledTimes(1);
    canal.disparar("postgres_changes", "INSERT");
    await ciclo(500);
    expect(aviso).toHaveBeenCalledTimes(2);
  });

  it("desligar cancela o aviso pendente e remove o canal", async () => {
    const rt = criarRealtime();
    const aviso = vi.fn();
    const desligar = assinarMudancasDaCaixa(rt.cliente, aviso, 500);
    rt.canais[0]!.disparar("postgres_changes", "INSERT");
    desligar();
    await ciclo(1_000);
    expect(aviso).not.toHaveBeenCalled();
    expect(rt.removidos).toEqual([rt.canais[0]]);
  });
});
