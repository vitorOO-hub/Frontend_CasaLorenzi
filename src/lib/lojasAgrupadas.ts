import type { OpcaoSelect } from "@/components/ui";

/**
 * Lojas agrupadas por marca nos filtros do painel. O banco guarda os nomes em minúsculas
 * ("casa lorenzi barra"); aqui eles ganham maiúsculas e um grupo. O E-commerce Casa Lorenzi é o
 * único canal online e vende as duas marcas; "vulto app" e "vulto e-commerce" só têm vendas de antes
 * da fusão.
 */

export type GrupoDeLoja = "Casa Lorenzi" | "Vulto" | "Online · as duas marcas" | "Centro de distribuição" | "Vulto · canais antigos" | "Outras";

const ORDEM: GrupoDeLoja[] = ["Casa Lorenzi", "Vulto", "Online · as duas marcas", "Centro de distribuição", "Vulto · canais antigos", "Outras"];

const normalizar = (nome: string) =>
  nome.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

export function grupoDaLoja(nome: string): GrupoDeLoja {
  const n = normalizar(nome);
  if (n.includes("e-commerce casa lorenzi") || n === "e-commerce" || n === "ecommerce casa lorenzi") return "Online · as duas marcas";
  if (n === "vulto app" || n === "vulto e-commerce" || n === "vulto ecommerce") return "Vulto · canais antigos";
  if (n.startsWith("casa lorenzi")) return "Casa Lorenzi";
  if (n.startsWith("vulto")) return "Vulto";
  if (n.startsWith("cd ") || n === "cd" || n.startsWith("centro de distribuicao")) return "Centro de distribuição";
  return "Outras";
}

const SIGLAS: Record<string, string> = { cd: "CD", "e-commerce": "E-commerce", app: "App" };

/** "casa lorenzi barra" → "Casa Lorenzi Barra"; nomes que já têm maiúsculas ficam como estão. */
export function nomeDaLoja(nome: string): string {
  if (nome !== nome.toLowerCase()) return nome;
  return nome
    .split(" ")
    .map((p) => SIGLAS[p] ?? (p.length <= 2 && ["de", "da", "do"].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** Lojas em ordem de grupo e de nome, cada uma com o grupo para o seletor. */
export function agruparLojas<T extends { id_loja: string; nome: string }>(lojas: T[]): (T & { grupo: GrupoDeLoja; rotulo: string })[] {
  return lojas
    .map((l) => ({ ...l, grupo: grupoDaLoja(l.nome), rotulo: nomeDaLoja(l.nome) }))
    .sort((a, b) => ORDEM.indexOf(a.grupo) - ORDEM.indexOf(b.grupo) || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

/** Opções do <Select> com os grupos; `todas` acrescenta a opção vazia no topo. */
export function opcoesDeLojas(lojas: { id_loja: string; nome: string }[], todas?: string): OpcaoSelect[] {
  const opcoes: OpcaoSelect[] = agruparLojas(lojas).map((l) => ({ value: l.id_loja, label: l.rotulo, grupo: l.grupo }));
  return todas ? [{ value: "", label: todas }, ...opcoes] : opcoes;
}
