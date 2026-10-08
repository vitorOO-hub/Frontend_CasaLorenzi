import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Consulta } from "@/hooks/useChamados";
import { validarEquipe, type Equipe } from "@/lib/gestaoApi";

const estado = vi.hoisted(() => ({ atual: null as unknown }));
vi.mock("@/hooks/useEquipe", () => ({ useEquipe: () => estado.atual }));

import { Usuarios } from "./Usuarios";

const equipe = () =>
  validarEquipe({
    total: 2,
    itens: [
      { id_usuario: "u1", nome: "Rafael Nunes", email: "rafael@casa.com", cargo: "atendente", id_loja: "l1", loja_nome: "Casa Centro", ativo: true, com_acesso: true, criado_em: "2026-10-01T10:00:00Z" },
      { id_usuario: "u2", nome: "Cecília Lorenzi", email: "cecilia@casa.com", cargo: "admin", id_loja: null, loja_nome: null, ativo: false, com_acesso: false, criado_em: "2026-10-01T10:00:00Z" },
    ],
    opcoes: {
      cargos: [
        { codigo: "atendente", nome: "Atendente" },
        { codigo: "admin", nome: "Diretor" },
      ],
      lojas: [{ id_loja: "l1", nome: "Casa Centro" }],
    },
  });

const consulta = (extra: Partial<Consulta<Equipe>> = {}): Consulta<Equipe> => ({
  dados: equipe(),
  carregando: false,
  erro: null,
  recarregar: () => undefined,
  ...extra,
});

const html = () =>
  renderToString(
    <MemoryRouter>
      <Usuarios />
    </MemoryRouter>,
  ).replaceAll("<!-- -->", "");

describe("Usuários do admin", () => {
  beforeEach(() => {
    estado.atual = consulta();
  });

  it("lista o time que a API devolveu, com cargo, unidade e acesso", () => {
    const tela = html();
    expect(tela).toContain("Rafael Nunes");
    expect(tela).toContain("rafael@casa.com");
    expect(tela).toContain("Rede inteira"); // admin não tem unidade
    expect(tela).toContain("Inativo");
    expect(tela).toContain("Ainda sem login");
    expect(tela).not.toContain("Cadastrar usuário");
  });

  it("erro da API aparece e não inventa pessoas", () => {
    estado.atual = consulta({ dados: null, erro: "Não foi possível carregar os dados." });
    const tela = html();
    expect(tela).toContain("Não foi possível carregar os dados.");
    expect(tela).not.toContain("Rafael Nunes");
  });

  it("resposta fora do combinado é recusada", () => {
    expect(() => validarEquipe({ total: 1, itens: [{ id_usuario: 1 }], opcoes: { cargos: [], lojas: [] } })).toThrow(/campo inválido/);
  });
});
