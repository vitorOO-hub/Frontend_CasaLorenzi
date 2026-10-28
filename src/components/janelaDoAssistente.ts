/**
 * A janela dos assistentes de IA (vendedor e cliente): limites na tela, alças de redimensionar,
 * arraste e a caixa lembrada no navegador. Fica fora dos componentes para os dois usarem o mesmo
 * comportamento (e para a recarga rápida do Vite funcionar nos arquivos de componente).
 */

/** Distância mínima entre a janela e a borda da tela. */
export const MARGEM = 8;
export const LARGURA_MINIMA = 360;
export const ALTURA_MINIMA = 380;
/** Abaixo dessa largura o histórico abre por cima da conversa, em vez de ao lado. */
export const LARGURA_COM_LATERAL = 640;
/** Centro da bolinha, medido a partir do canto inferior direito da tela (bottom-6 right-6, 56px). */
export const CENTRO_DA_BOLINHA = 52;

export const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export const telaGrande = () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;
export const semAnimacao = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Posição e tamanho da janela depois que a pessoa arrasta ou redimensiona (null = canto padrão). */
export type Caixa = { x: number; y: number; largura: number; altura: number };
export type Borda = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/** Alças invisíveis nas bordas e cantos para aumentar ou diminuir a janela. */
export const ALCAS: [Borda, string][] = [
  ["n", "inset-x-4 top-0 h-1.5 cursor-ns-resize"],
  ["s", "inset-x-4 bottom-0 h-1.5 cursor-ns-resize"],
  ["w", "inset-y-4 left-0 w-1.5 cursor-ew-resize"],
  ["e", "inset-y-4 right-0 w-1.5 cursor-ew-resize"],
  ["nw", "left-0 top-0 h-4 w-4 cursor-nwse-resize"],
  ["se", "bottom-0 right-0 h-4 w-4 cursor-nwse-resize"],
  ["ne", "right-0 top-0 h-4 w-4 cursor-nesw-resize"],
  ["sw", "bottom-0 left-0 h-4 w-4 cursor-nesw-resize"],
];

export const entre = (valor: number, minimo: number, maximo: number) => Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));

/** Mantém a janela inteira dentro da tela (encolhe se a tela ficou menor que ela). */
export function limitar({ x, y, largura, altura }: Caixa): Caixa {
  const l = entre(largura, LARGURA_MINIMA, window.innerWidth - 2 * MARGEM);
  const a = entre(altura, ALTURA_MINIMA, window.innerHeight - 2 * MARGEM);
  return {
    x: entre(x, MARGEM, window.innerWidth - l - MARGEM),
    y: entre(y, MARGEM, window.innerHeight - a - MARGEM),
    largura: l,
    altura: a,
  };
}

/** Lê e grava a caixa da janela no navegador, numa chave por assistente. */
export function guardaDaCaixa(chave: string) {
  return {
    ler(): Caixa | null {
      try {
        const c = JSON.parse(localStorage.getItem(chave) ?? "null") as Caixa | null;
        return c && [c.x, c.y, c.largura, c.altura].every(Number.isFinite) ? limitar(c) : null;
      } catch {
        return null;
      }
    },
    salvar(caixa: Caixa | null) {
      try {
        if (caixa) localStorage.setItem(chave, JSON.stringify(caixa));
        else localStorage.removeItem(chave);
      } catch {
        // Sem armazenamento (aba anônima): a janela só não lembra o tamanho.
      }
    },
  };
}

/** Segue o ponteiro até soltar o botão. */
export function acompanharPonteiro(mover: (e: globalThis.PointerEvent) => void, aoSoltar: () => void) {
  const soltar = () => {
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
    aoSoltar();
  };
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
}
