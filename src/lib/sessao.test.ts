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

const perfil = vi.hoisted(() => ({ nome: "Ana Souza" as string | null, tipo: null as string | null, falhar: false }));
vi.mock("@/api/supabase", () => ({
  supabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (perfil.falhar) throw new Error("rls");
            const embutido = perfil.tipo ? { tipo_usuario: { codigo: perfil.tipo } } : {};
            return { data: perfil.nome ? { nome: perfil.nome, ...embutido } : null };
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
  perfil.tipo = null;
  perfil.falhar = false;
  sair();
  auth.sairDaConta.mockClear();
});

describe("login pelo Supabase", () => {
  it("equipe entra com o papel e a loja que vieram do token", async () => {
    auth.entrar.mockResolvedValue(interno("gerente_loja"));
    const r = await entrar("gerente@casalorenzi.com.br", "senha");
    expect(r).toMatchObject({ ok: true, sessao: { tipo: "interno", papel: "gerente_loja", lojaId: "loja-1", nome: "Ana Souza" } });
    expect(sessaoAtual()).toMatchObject({ papel: "gerente_loja" });
  });

  it("cliente entra pela aba de cliente", async () => {
    auth.entrar.mockResolvedValue(cliente);
    const r = await entrar("cliente@casalorenzi.com.br", "senha");
    expect(r).toMatchObject({ ok: true, sessao: { tipo: "cliente", email: "cliente@casalorenzi.com.br" } });
  });

  it("senha errada não cria sessão e não diz qual campo falhou", async () => {
    auth.entrar.mockRejectedValue(new ErroApi("nao_autenticado"));
    const r = await entrar("x@y.com", "errada");
    expect(r).toEqual({ ok: false, motivo: "credenciais" });
    expect(sessaoAtual()).toBeNull();
  });

  it("falha de rede ou de configuração vira 'indisponível', não 'senha inválida'", async () => {
    auth.entrar.mockRejectedValue(new ErroApi("rede"));
    expect(await entrar("x@y.com", "s")).toMatchObject({ ok: false, motivo: "indisponivel" });
    auth.entrar.mockRejectedValue(new ErroApi("configuracao"));
    expect(await entrar("x@y.com", "s")).toMatchObject({ ok: false, motivo: "indisponivel" });
  });

  it("a mesma tela serve cliente e equipe: o tipo da conta decide o resultado", async () => {
    auth.entrar.mockResolvedValue(cliente);
    expect(await entrar("c@y.com", "s")).toMatchObject({ ok: true, sessao: { tipo: "cliente" } });
    sair();
    auth.entrar.mockResolvedValue(interno("atendente"));
    expect(await entrar("e@y.com", "s")).toMatchObject({ ok: true, sessao: { tipo: "interno", papel: "atendente" } });
  });

  it("sem linha legível em usuario, o nome vem do e-mail", async () => {
    auth.entrar.mockResolvedValue(interno("atendente"));
    perfil.nome = null;
    const r = await entrar("e@y.com", "s");
    expect(r).toMatchObject({ ok: true, sessao: { nome: "gerente" } });
  });

  it("falha ao ler o perfil (RLS) não derruba o login", async () => {
    auth.entrar.mockResolvedValue(interno("atendente"));
    perfil.falhar = true;
    const r = await entrar("e@y.com", "s");
    expect(r.ok).toBe(true);
  });

  it("sair limpa a sessão local e encerra a do Supabase", async () => {
    auth.entrar.mockResolvedValue(interno("admin", null));
    await entrar("a@y.com", "s");
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
    const r = await entrar("x@y.com", "s");
    expect(r).toMatchObject({ ok: false, motivo: "indisponivel" });
    expect(r.ok === false && r.detalhe).toContain("desligado");
  });
});

describe("conta da equipe sem cargo no token", () => {
  it("é recusada com a causa, em vez de cair na loja como cliente", async () => {
    auth.entrar.mockResolvedValue(cliente); // o token veio sem papel
    perfil.tipo = "gerente_loja"; // mas o cadastro diz que é da equipe
    const r = await entrar("g@y.com", "s");
    expect(r).toMatchObject({ ok: false, motivo: "sem_cargo" });
    expect(r.ok === false && r.detalhe).toContain("cargo");
    expect(auth.sairDaConta).toHaveBeenCalled();
    expect(sessaoAtual()).toBeNull();
  });

  it("cliente de verdade continua entrando normalmente", async () => {
    auth.entrar.mockResolvedValue(cliente);
    perfil.tipo = "cliente";
    expect(await entrar("c@y.com", "s")).toMatchObject({ ok: true, sessao: { tipo: "cliente" } });
  });

  it("cliente sem linha de cadastro também entra", async () => {
    auth.entrar.mockResolvedValue(cliente);
    perfil.nome = null;
    expect(await entrar("c@y.com", "s")).toMatchObject({ ok: true, sessao: { tipo: "cliente" } });
  });
});
