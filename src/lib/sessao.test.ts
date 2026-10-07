import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApi } from "@/api/erros";

// O Supabase é substituído por dublês: aqui se testa o que a tela faz com a resposta dele.
const auth = vi.hoisted(() => ({
  entrar: vi.fn(),
  sairDaConta: vi.fn(async () => undefined),
  sessaoAtual: vi.fn(),
  ouvirSessao: vi.fn(() => () => undefined),
}));
vi.mock("@/api/auth", () => auth);
vi.mock("@/api/config", () => ({ config: { supabaseUrl: "https://x.supabase.co", supabaseAnonKey: "chave-publica" } }));

const perfil = vi.hoisted(() => ({ nome: "Ana Souza" as string | null, falhar: false }));
vi.mock("@/api/supabase", () => ({
  supabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (perfil.falhar) throw new Error("rls");
            return { data: perfil.nome ? { nome: perfil.nome } : null };
          },
        }),
      }),
    }),
  }),
}));

import { entrar, sair, sessaoAtual, sincronizarSessao } from "./sessao";

const interno = (papel: string, idLoja: string | null = "loja-1") => ({
  tipo: "interno" as const,
  id: "u-1",
  email: "gerente@casalorenzi.com.br",
  papel,
  idLoja,
});
const cliente = { tipo: "cliente" as const, id: "u-2", email: "cliente@casalorenzi.com.br" };

beforeEach(() => {
  vi.clearAllMocks();
  perfil.nome = "Ana Souza";
  perfil.falhar = false;
  sair();
  auth.sairDaConta.mockClear();
});

describe("login pelo Supabase", () => {
  it("equipe entra com o papel e a loja que vieram do token", async () => {
    auth.entrar.mockResolvedValue(interno("gerente_loja"));
    const r = await entrar("gerente@casalorenzi.com.br", "senha", "interno");
    expect(r).toMatchObject({ ok: true, sessao: { tipo: "interno", papel: "gerente_loja", lojaId: "loja-1", nome: "Ana Souza" } });
    expect(sessaoAtual()).toMatchObject({ papel: "gerente_loja" });
  });

  it("cliente entra pela aba de cliente", async () => {
    auth.entrar.mockResolvedValue(cliente);
    const r = await entrar("cliente@casalorenzi.com.br", "senha", "cliente");
    expect(r).toMatchObject({ ok: true, sessao: { tipo: "cliente", email: "cliente@casalorenzi.com.br" } });
  });

  it("senha errada não cria sessão e não diz qual campo falhou", async () => {
    auth.entrar.mockRejectedValue(new ErroApi("nao_autenticado"));
    const r = await entrar("x@y.com", "errada", "interno");
    expect(r).toEqual({ ok: false, motivo: "credenciais" });
    expect(sessaoAtual()).toBeNull();
  });

  it("falha de rede ou de configuração vira 'indisponível', não 'senha inválida'", async () => {
    auth.entrar.mockRejectedValue(new ErroApi("rede"));
    expect(await entrar("x@y.com", "s", "interno")).toEqual({ ok: false, motivo: "indisponivel" });
    auth.entrar.mockRejectedValue(new ErroApi("configuracao"));
    expect(await entrar("x@y.com", "s", "interno")).toEqual({ ok: false, motivo: "indisponivel" });
  });

  it("conta de cliente na aba da equipe é recusada e a sessão do Supabase é encerrada", async () => {
    auth.entrar.mockResolvedValue(cliente);
    expect(await entrar("c@y.com", "s", "interno")).toEqual({ ok: false, motivo: "lado_errado" });
    expect(auth.sairDaConta).toHaveBeenCalledTimes(1);
    expect(sessaoAtual()).toBeNull();
  });

  it("conta da equipe na aba de cliente também é recusada", async () => {
    auth.entrar.mockResolvedValue(interno("atendente"));
    expect(await entrar("e@y.com", "s", "cliente")).toEqual({ ok: false, motivo: "lado_errado" });
    expect(sessaoAtual()).toBeNull();
  });

  it("sem linha legível em usuario, o nome vem do e-mail", async () => {
    auth.entrar.mockResolvedValue(interno("atendente"));
    perfil.nome = null;
    const r = await entrar("e@y.com", "s", "interno");
    expect(r).toMatchObject({ ok: true, sessao: { nome: "gerente" } });
  });

  it("falha ao ler o perfil (RLS) não derruba o login", async () => {
    auth.entrar.mockResolvedValue(interno("atendente"));
    perfil.falhar = true;
    const r = await entrar("e@y.com", "s", "interno");
    expect(r.ok).toBe(true);
  });

  it("sair limpa a sessão local e encerra a do Supabase", async () => {
    auth.entrar.mockResolvedValue(interno("admin", null));
    await entrar("a@y.com", "s", "interno");
    sair();
    expect(sessaoAtual()).toBeNull();
    expect(auth.sairDaConta).toHaveBeenCalled();
  });
});

describe("sessão ao abrir a página", () => {
  it("lê o papel do token do Supabase, sem guardar sessão própria no navegador", async () => {
    // Nada de papel em sessionStorage/localStorage para editar: o papel vem sempre do token.
    const gravar = vi.fn();
    vi.stubGlobal("sessionStorage", { setItem: gravar, getItem: () => null, removeItem: gravar });
    vi.stubGlobal("localStorage", { setItem: gravar, getItem: () => null, removeItem: gravar });
    auth.sessaoAtual.mockResolvedValue(interno("atendente"));
    await sincronizarSessao();
    expect(sessaoAtual()).toMatchObject({ papel: "atendente" });
    expect(gravar).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("motivo da falha no login", () => {
  it("login por e-mail desligado mostra o motivo real, não 'senha inválida'", async () => {
    auth.entrar.mockRejectedValue(new ErroApi("configuracao", "O login por e-mail e senha está desligado neste projeto do Supabase."));
    const r = await entrar("x@y.com", "s", "interno");
    expect(r).toMatchObject({ ok: false, motivo: "indisponivel" });
    expect(r.ok === false && r.detalhe).toContain("desligado");
  });
});
