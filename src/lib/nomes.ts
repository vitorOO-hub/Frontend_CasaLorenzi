/**
 * Nome de peça para a vitrine: o banco guarda tudo em minúsculas (padronização da migração);
 * a loja mostra com maiúscula em cada palavra, como as lojas de moda fazem ("Bermuda Cargo
 * Utilitária"). Preposições ficam minúsculas, menos na primeira palavra.
 */

const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "em", "com", "a", "o", "para"]);

export function nomeDeVitrine(nome: string | null | undefined): string {
  return (nome ?? "")
    .trim()
    .split(/\s+/)
    .map((palavra, i) => {
      const p = palavra.toLocaleLowerCase("pt-BR");
      if (i > 0 && MINUSCULAS.has(p)) return p;
      // Mantém siglas e palavras que já vêm com maiúsculas no meio ("T-Shirt", "PP").
      if (palavra !== p && palavra !== palavra.charAt(0) + p.slice(1)) return palavra;
      return p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1);
    })
    .join(" ");
}
