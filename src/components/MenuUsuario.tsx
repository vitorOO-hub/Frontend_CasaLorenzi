import { LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./ui";

const iniciaisDe = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function MenuUsuario({
  nome,
  detalhe,
  email,
  onSair,
  itens,
  compacto = false,
}: {
  nome: string;
  detalhe: string;
  email?: string;
  onSair: () => void;
  itens?: ReactNode;
  compacto?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Menu da conta"
        className={cn(
          "flex items-center gap-2 rounded-full text-xs font-medium text-suave transition-colors hover:text-marinho",
          !compacto && "border border-linha bg-papel py-1 pl-1 pr-3 hover:border-marinho",
        )}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-marinho font-display text-[12px] text-white">
          {iniciaisDe(nome) || <UserRound className="h-3.5 w-3.5" />}
        </span>
        {compacto ? null : <span className="hidden max-w-36 truncate sm:block">{nome}</span>}
      </button>

      {aberto ? (
        <div
          role="menu"
          onClick={() => setAberto(false)}
          className="absolute right-0 z-50 mt-2 w-64 rounded-sm border border-linha bg-papel shadow-suave"
        >
          <div className="border-b border-linha px-4 py-3">
            <p className="font-display text-lg leading-tight">{nome}</p>
            <p className="mt-0.5 text-xs text-suave">{detalhe}</p>
            {email ? <p className="text-xs text-suave/70">{email}</p> : null}
          </div>
          {itens}
          <button
            type="button"
            onClick={onSair}
            className="flex w-full items-center gap-2 border-t border-linha px-4 py-3 text-left text-sm text-perigo transition-colors hover:bg-areia/60"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} /> Sair da conta
          </button>
        </div>
      ) : null}
    </div>
  );
}
