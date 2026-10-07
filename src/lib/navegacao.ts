import {
  Building2,
  LayoutDashboard,
  MessagesSquare,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { Papel } from "./sessao";

/**
 * Mapa único da área interna: seções da barra lateral, abas de cada seção e
 * quais cargos acessam cada uma. A barra lateral, as abas e o bloqueio de
 * acesso leem daqui — para mudar uma permissão, altere só este arquivo.
 */

export type Aba = {
  to: string;
  rotulo: string;
  papeis?: Papel[]; // sem valor: herda os cargos da seção
  pendencia?: Pendencia;
};

export type Secao = {
  id: string;
  rotulo: string;
  icone: LucideIcon;
  to: string;
  papeis: Papel[];
  abas: Aba[];
};

/** Contadores exibidos como selo nas abas; a barra lateral soma os da seção. */
export type Pendencia = "aprovacoes" | "transferencias" | "chamados";

const todos: Papel[] = ["atendente", "operador_estoque", "gerente_loja", "admin"];
const gestao: Papel[] = ["gerente_loja", "admin"];

export const secoes: Secao[] = [
  {
    id: "inicio",
    rotulo: "Início",
    icone: LayoutDashboard,
    to: "/painel",
    papeis: todos,
    abas: [],
  },
  {
    id: "estoque",
    rotulo: "Estoque",
    icone: Package,
    to: "/painel/estoque",
    papeis: ["operador_estoque", "gerente_loja", "admin"],
    abas: [
      { to: "/painel/estoque", rotulo: "Saldo" },
      { to: "/painel/estoque/movimentacoes", rotulo: "Movimentações" },
      { to: "/painel/estoque/transferencias", rotulo: "Transferências", pendencia: "transferencias" },
      { to: "/painel/estoque/aprovacoes", rotulo: "Aprovações", papeis: gestao, pendencia: "aprovacoes" },
      { to: "/painel/estoque/minimos", rotulo: "Estoque mínimo", papeis: gestao },
    ],
  },
  {
    id: "atendimento",
    rotulo: "Atendimento",
    icone: MessagesSquare,
    to: "/painel/atendimento",
    papeis: ["atendente", "gerente_loja", "admin"],
    abas: [
      { to: "/painel/atendimento", rotulo: "Chamados", pendencia: "chamados" },
      { to: "/painel/atendimento/conversas", rotulo: "Conversas" },
      { to: "/painel/atendimento/clientes", rotulo: "Clientes" },
    ],
  },
  {
    id: "gestao",
    rotulo: "Gestão",
    icone: Building2,
    to: "/painel/gestao",
    papeis: gestao,
    abas: [
      { to: "/painel/gestao", rotulo: "Lojas" },
      { to: "/painel/gestao/catalogo", rotulo: "Catálogo", papeis: ["admin"] },
      { to: "/painel/gestao/usuarios", rotulo: "Usuários", papeis: ["admin"] },
      { to: "/painel/gestao/auditoria", rotulo: "Auditoria", papeis: ["admin"] },
      { to: "/painel/gestao/integracoes", rotulo: "Integrações", papeis: ["admin"] },
    ],
  },
];

const casa = (caminho: string, to: string) => caminho === to || caminho.startsWith(`${to}/`);

/** Seção da URL atual (a de prefixo mais longo). */
export function secaoDoCaminho(caminho: string): Secao | undefined {
  return [...secoes].sort((a, b) => b.to.length - a.to.length).find((s) => casa(caminho, s.to));
}

/** Aba da URL atual: telas de detalhe caem na aba-mãe pelo prefixo mais longo. */
export function abaDoCaminho(secao: Secao, caminho: string): Aba | undefined {
  return [...secao.abas].sort((a, b) => b.to.length - a.to.length).find((a) => casa(caminho, a.to));
}

export const papeisDaAba = (secao: Secao, aba: Aba) => aba.papeis ?? secao.papeis;

export const secoesDoPapel = (papel: Papel) => secoes.filter((s) => s.papeis.includes(papel));

export const abasDoPapel = (secao: Secao, papel: Papel) =>
  secao.abas.filter((a) => papeisDaAba(secao, a).includes(papel));

/** O cargo pode abrir esta URL? */
export function podeAcessar(papel: Papel, caminho: string): boolean {
  const secao = secaoDoCaminho(caminho);
  if (!secao || !secao.papeis.includes(papel)) return false;
  const aba = abaDoCaminho(secao, caminho);
  return !aba || papeisDaAba(secao, aba).includes(papel);
}

/** Primeira tela que o cargo pode abrir (destino do bloqueio). */
export const telaInicial = (papel: Papel) =>
  papel === "atendente" ? "/painel/atendimento" : "/painel";
