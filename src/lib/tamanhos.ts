/**
 * Ordem dos tamanhos, do menor para o maior: letras (PP, P, M, G, GG, XG...), depois números
 * (calçados, cintos), e o tamanho único por último. Tamanho desconhecido vai depois dos números,
 * em ordem alfabética.
 */

const LETRAS = ["PP", "P", "M", "G", "GG", "XG", "XGG", "EG", "EGG"];
const UNICO = new Set(["U", "UN", "UNICO", "ÚNICO", "TU"]);

function peso(tamanho: string): [number, number, string] {
  const t = tamanho.trim().toUpperCase();
  const letra = LETRAS.indexOf(t);
  if (letra >= 0) return [0, letra, t];
  if (/^\d+([.,]\d+)?$/.test(t)) return [1, Number(t.replace(",", ".")), t];
  if (UNICO.has(t)) return [3, 0, t];
  return [2, 0, t];
}

export function compararTamanhos(a: string, b: string): number {
  const [ga, va, ta] = peso(a);
  const [gb, vb, tb] = peso(b);
  return ga - gb || va - vb || ta.localeCompare(tb, "pt-BR");
}

export const ordenarTamanhos = (tamanhos: string[]) => [...tamanhos].sort(compararTamanhos);
