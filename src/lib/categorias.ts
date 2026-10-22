/**
 * Categorias das peças sem duplicar: "calca", "calça" e "Calça" são a mesma. O banco guarda em
 * minúsculas (padronização da migração) e o catálogo antigo tem maiúsculas; a tela compara pela
 * chave sem acento e mostra a forma acentuada, com a primeira letra maiúscula.
 */

export const chaveDaCategoria = (categoria: string | null | undefined) =>
  (categoria ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export const mesmaCategoria = (a: string | null | undefined, b: string | null | undefined) => chaveDaCategoria(a) === chaveDaCategoria(b);

const comAcento = (s: string) => s.normalize("NFD") !== s;
const maiuscula = (s: string) => s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);

/** Uma entrada por categoria: `valor` vai na URL, `rotulo` aparece na tela. */
export function categoriasUnicas(categorias: (string | null | undefined)[]): { valor: string; rotulo: string }[] {
  const porChave = new Map<string, string>();
  for (const c of categorias) {
    const limpa = (c ?? "").trim();
    const chave = chaveDaCategoria(limpa);
    if (!chave) continue;
    const atual = porChave.get(chave);
    // Fica a forma acentuada, quando houver.
    if (atual === undefined || (!comAcento(atual) && comAcento(limpa))) porChave.set(chave, limpa);
  }
  return Array.from(porChave.values())
    .map((c) => ({ valor: c.toLocaleLowerCase("pt-BR"), rotulo: maiuscula(c.toLocaleLowerCase("pt-BR")) }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

export const rotuloDaCategoria = (categoria: string | null | undefined) => {
  const c = (categoria ?? "").trim().toLocaleLowerCase("pt-BR");
  return c ? maiuscula(c) : "";
};
