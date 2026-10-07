import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Os hooks de dados e a sessão são trocados por dados fixos: aqui se testa só a renderização.
const dados = vi.hoisted(() => {
  const op = (codigo: string, nome = codigo) => ({ codigo, nome });
  const item = (n: number, extra: Record<string, unknown> = {}) => ({
    id_atendimento: `00000000-0000-0000-0000-00000000000${n}`,
    protocolo: `AT-2026-000${n}`,
    assunto: `Assunto ${n}`,
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
    ...extra,
  });
  const consulta = <T,>(valor: T) => ({ dados: valor, carregando: false, erro: null, recarregar: () => undefined });
  return { op, item, consulta };
});

const hooks = vi.hoisted(() => ({
  modo: "gestor" as "gestor" | "vazio" | "carregando" | "erro",
}));

vi.mock("@/hooks/useChamados", () => {
  const { op, item, consulta } = dados;
  const vazio = hooks;
  const detalhe = {
    ...item(1),
    cliente: { id_cliente: "c-1", nome: "Helena", email: "h@x.com", telefone: null, cidade: null, cliente_desde: "2025-01-10T00:00:00Z" },
    pedido: { id_pedido: "p-1", numero_pedido: "PD-1", status: "Pago" },
    pecas: [{ nome: "Blusa", sku: "SKU-1", cor: "azul", tamanho: "M" }],
    anexos: [{ id_anexo: "x-1", nome: "foto.jpg", caminho: "x/foto.jpg", criado_em: "2026-10-05T10:01:00Z" }],
    outros_chamados: [{ id_atendimento: "a-2", protocolo: "AT-2026-0002", assunto: "Troca", status: op("resolvido", "Resolvido") }],
    compras_recentes: [{ id_pedido: "p-1", numero_pedido: "PD-1", criado_em: "2026-09-01T00:00:00Z", valor_total: 199.9 }],
  };
  const mensagens = [
    { id_mensagem: "m-1", autor: "cliente", nome: "Helena", texto: "Oi", enviada_em: "2026-10-05T10:00:00Z" },
    { id_mensagem: "m-2", autor: "atendente", nome: "Rafael", texto: "Ola", enviada_em: "2026-10-05T10:05:00Z" },
  ];
  const resposta = <T,>(valor: T, vazioValor: T | null) => {
    if (vazio.modo === "carregando") return { dados: null, carregando: true, erro: null, recarregar: () => undefined };
    if (vazio.modo === "erro") return { dados: null, carregando: false, erro: "Sem conexão com o servidor.", recarregar: () => undefined };
    return consulta(vazio.modo === "vazio" ? vazioValor : valor);
  };
  return {
    useListaChamados: () =>
      resposta({ total: 2, itens: [item(1), item(2, { sou_responsavel: true, id_usuario_responsavel: "u", responsavel_nome: "Rafael", status: op("em_andamento", "Em andamento"), prioridade: op("urgente", "Urgente") })] }, { total: 0, itens: [] }),
    useResumoChamados: () => resposta({ sem_resposta: 1, em_andamento: 2, prioridade_alta: 3, resolvidos: 4, na_fila: 5, meus: 6 }, null),
    useOpcoesChamados: () =>
      resposta(
        {
          status: [op("aberto", "Aberto")],
          canais: [op("whatsapp", "WhatsApp"), op("site", "Site")],
          categorias: [op("entrega", "Entrega"), op("pedido", "Pedido")],
          prioridades: [op("alta", "Alta")],
          lojas: [{ id_loja: "l-1", nome: "Centro" }, { id_loja: "l-2", nome: "Barra" }],
        },
        null,
      ),
    useChamado: () => ({ detalhe: resposta(detalhe, null), conversa: resposta(mensagens, []), recarregar: () => undefined }),
    useChamadosSemResposta: () => 3,
  };
});

vi.mock("@/lib/sessao", () => ({
  usePapel: () => "gerente_loja",
  useSessao: () => ({ tipo: "interno", papel: "gerente_loja", nome: "Marina", email: "m@x.com" }),
  podeAprovar: (papel: string) => papel === "gerente_loja" || papel === "admin",
}));

import { Chamado } from "./Chamado";
import { Chamados } from "./Chamados";

let erros: unknown[][] = [];

beforeEach(() => {
  erros = [];
  hooks.modo = "gestor";
  vi.spyOn(console, "error").mockImplementation((...args) => {
    erros.push(args);
  });
});
afterEach(() => vi.restoreAllMocks());

const tela = (elemento: React.ReactNode, rota = "/painel/atendimento", caminho = "/painel/atendimento") =>
  renderToString(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path={caminho} element={elemento} />
      </Routes>
    </MemoryRouter>,
  );

describe("fila de chamados", () => {
  it("renderiza com dados, sem erro nem aviso do React", () => {
    const html = tela(<Chamados />);
    expect(html).toContain("Assunto 1");
    expect(html).toContain("AT-2026-0001");
    expect(html).toContain("Fila (5)");
    expect(html).toContain("Meus chamados (6)");
    expect(erros).toEqual([]);
  });

  it("mostra o seletor de loja para quem tem mais de uma", () => {
    expect(tela(<Chamados />)).toContain("Barra");
    expect(erros).toEqual([]);
  });

  it.each(["vazio", "carregando", "erro"] as const)("estado %s não quebra", (modo) => {
    hooks.modo = modo;
    expect(() => tela(<Chamados />)).not.toThrow();
    expect(erros).toEqual([]);
  });
});

describe("tela do chamado", () => {
  const abrir = () => tela(<Chamado />, "/painel/atendimento/chamado/a-1", "/painel/atendimento/chamado/:id");

  it("renderiza conversa, cliente, detalhes, compras e outros chamados", () => {
    const html = abrir();
    expect(html).toContain("Assunto 1");
    expect(html).toContain("Rafael");
    expect(html).toContain("R$");
    expect(html).toContain("Assumir chamado");
    expect(html).toContain("foto.jpg");
    expect(erros).toEqual([]);
  });

  it.each(["vazio", "carregando", "erro"] as const)("estado %s não quebra", (modo) => {
    hooks.modo = modo;
    expect(() => abrir()).not.toThrow();
    expect(erros).toEqual([]);
  });
});
