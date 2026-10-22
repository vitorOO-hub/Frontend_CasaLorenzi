import { Botao } from "./ui";

/** Rodapé de listas paginadas: "21–40 de 130", Anterior e Próxima. Some quando cabe numa página. */
export function Paginacao({
  pagina,
  total,
  porPagina,
  onMudar,
}: {
  pagina: number;
  total: number;
  porPagina: number;
  onMudar: (pagina: number) => void;
}) {
  if (total <= porPagina) return null;
  return (
    <div className="flex items-center justify-between border-t border-linha px-5 py-3 text-sm text-suave">
      <span>
        {pagina * porPagina + 1}–{Math.min((pagina + 1) * porPagina, total)} de {total}
      </span>
      <div className="flex gap-2">
        <Botao variante="secundario" disabled={pagina === 0} onClick={() => onMudar(pagina - 1)}>
          Anterior
        </Botao>
        <Botao variante="secundario" disabled={(pagina + 1) * porPagina >= total} onClick={() => onMudar(pagina + 1)}>
          Próxima
        </Botao>
      </div>
    </div>
  );
}
