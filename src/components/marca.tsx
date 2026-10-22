import { cn } from "./ui";

/**
 * O "+" da Casa Lorenzi+: o elemento que une a casa e a Vulto. Sobre fundo claro vai dentro de um
 * quadrado preto (o neon não tem contraste no creme); sobre fundo escuro, o + direto em neon.
 */
export function SinalMais({ claro = false, className }: { claro?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center text-vulto-neon",
        claro ? "bg-transparent" : "bg-vulto-preto",
        "h-[0.56em] w-[0.56em]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className={claro ? "h-full w-full" : "h-[58%] w-[58%]"} fill="currentColor">
        <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" />
      </svg>
    </span>
  );
}

/** Selo das peças da linha Vulto, no canto da foto. */
export function SeloVulto({ className }: { className?: string }) {
  return (
    <span className={cn("bg-vulto-preto px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.16em] text-vulto-neon", className)}>
      Vulto
    </span>
  );
}
