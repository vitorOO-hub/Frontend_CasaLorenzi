import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Consulta } from "@/hooks/useChamados";
import {
  validarAuditoria,
  validarCatalogo,
  validarIntegracoes,
  type Auditoria as DadosAuditoria,
  type Catalogo,
  type Integracoes as DadosIntegracoes,
} from "@/lib/gestaoApi";

const estado = vi.hoisted(() => ({ catalogo: null as unknown, auditoria: null as unknown, integracoes: null as unknown }));
vi.mock("@/hooks/useGestao", () => ({
  useCatalogo: () => estado.catalogo,
  useAuditoria: () => estado.auditoria,
  useIntegracoes: () => estado.integracoes,
}));

import { Auditoria } from "./Auditoria";
import { CatalogoAdmin } from "./CatalogoAdmin";
import { Integracoes } from "./Integracoes";

const consulta = <T,>(dados: T | null, extra: Partial<Consulta<T>> = {}): Consulta<T> => ({
  dados,
  carregando: false,
  erro: null,
  recarregar: () => undefined,
  ...extra,
});

const catalogo = (): Catalogo =>
  validarCatalogo({
    total: 2,
    itens: [
      { id_produto: "p1", nome: "Blazer Modena", categoria: "Alfaiataria", preco: 1290, skus: ["CL-BLA-G", "CL-BLA-M"], variacoes: 2, estoque_rede: 53 },
      { id_produto: "p2", nome: "Cinto Siena", categoria: null, preco: 279.9, skus: ["CL-CIN-U"], variacoes: 1, estoque_rede: 0 },
    ],
  });

const auditoria = (): DadosAuditoria =>
  validarAuditoria({
    total: 120,
    itens: [{ id_auditoria: "a1", data: "2026-10-08T12:00:00Z", autor: "Cecília Lorenzi", acao: "Aprovou ajuste manual", detalhe: "CL-0001 · 3 un." }],
  });

const integracoes = (): DadosIntegracoes =>
  validarIntegracoes({
    lotes: [
      { codigo: "IMP-2026-014", origem: "Vulto", recebido_em: "2026-09-03T10:00:00Z", registros: 3, pendentes: 2, situacao: "pendente_mapeamento" },
      { codigo: "IMP-2026-012", origem: "Vulto", recebido_em: "2026-08-20T10:00:00Z", registros: 2, pendentes: 0, situacao: "com_erro" },
    ],
    registros: [
      { id_registro: "r1", lote: "IMP-2026-014", descricao_externa: "CAMISA LINHO RAVENA", codigo_externo: "VLT-77120", sku_mapeado: null },
      { id_registro: "r2", lote: "IMP-2026-013", descricao_externa: "CINTO SIENA", codigo_externo: "VLT-76004", sku_mapeado: "CL-CIN-U" },
    ],
    skus: [{ id_variacao: "v1", sku: "CL-CAM-G", nome: "Camisa · Branco, G" }],
  });

const html = (tela: React.ReactElement) => renderToString(<MemoryRouter>{tela}</MemoryRouter>).replaceAll("<!-- -->", "");

describe("gestão do admin vinda da API", () => {
  beforeEach(() => {
    estado.catalogo = consulta(catalogo());
    estado.auditoria = consulta(auditoria());
    estado.integracoes = consulta(integracoes());
  });

  it("catálogo mostra peça, preço, variações e estoque da rede", () => {
    const tela = html(<CatalogoAdmin />);
    expect(tela).toContain("Blazer Modena");
    expect(tela).toContain("CL-BLA-G");
    expect(tela).toContain("+1 variações");
    expect(tela).toContain("53");
    expect(tela).toContain("Nova peça");
  });

  it("auditoria mostra quem fez o quê e avisa quando há mais registros", () => {
    const tela = html(<Auditoria />);
    expect(tela).toContain("Cecília Lorenzi");
    expect(tela).toContain("Aprovou ajuste manual");
    expect(tela).toContain("Mostrando os 1 mais recentes de 120");
  });

  it("integrações: lote com erro, registro a mapear e registro já mapeado", () => {
    const tela = html(<Integracoes />);
    expect(tela).toContain("IMP-2026-014");
    expect(tela).toContain("Pendente de mapeamento");
    expect(tela).toContain("Com erro");
    expect(tela).toContain("Confirmar"); // r1 ainda sem SKU
    expect(tela).toContain("Mapeado"); // r2 já mapeado
    expect(tela).toContain("CL-CAM-G · Camisa");
  });

  it("erro da API aparece e nenhuma tela inventa dados", () => {
    estado.catalogo = consulta<Catalogo>(null, { erro: "Falha no catálogo." });
    estado.auditoria = consulta<DadosAuditoria>(null, { erro: "Falha na auditoria." });
    estado.integracoes = consulta<DadosIntegracoes>(null, { erro: "Falha nas integrações." });
    const tela = html(<CatalogoAdmin />) + html(<Auditoria />) + html(<Integracoes />);
    expect(tela).toContain("Falha no catálogo.");
    expect(tela).toContain("Falha na auditoria.");
    expect(tela).toContain("Falha nas integrações.");
    expect(tela).not.toContain("Blazer Modena");
    expect(tela).not.toContain("IMP-2026-014");
  });

  it("respostas fora do combinado são recusadas", () => {
    expect(() => validarCatalogo({ total: 1, itens: [{ id_produto: 1 }] })).toThrow(/campo inválido/);
    expect(() => validarIntegracoes({ lotes: [{ codigo: "x", origem: "y", recebido_em: "z", registros: 1, pendentes: 0, situacao: "outra" }], registros: [], skus: [] })).toThrow(/campo inválido/);
  });
});
