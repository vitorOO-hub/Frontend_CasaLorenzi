import { blocosDaResposta } from "@/lib/assistenteFormatacao";
import { trechosDe } from "@/lib/assistenteVendedorApi";

export function TextoRespostaAssistente({ texto }: { texto: string }) {
  const blocos = blocosDaResposta(texto);
  return (
    <div className="space-y-1.5">
      {blocos.map((bloco, i) => {
        if (bloco.tipo === "tabela") {
          return (
            <div key={i} className="my-3 max-w-full overflow-x-auto rounded-md border border-linha">
              <table className="w-full min-w-[360px] border-collapse text-left text-xs">
                <thead className="bg-areia/70 text-[10px] uppercase tracking-wider text-suave">
                  <tr>{bloco.cabecalho.map((titulo, j) => <th key={j} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{titulo.toLocaleLowerCase("pt-BR") === "fonte" ? "Consulta" : titulo}</th>)}</tr>
                </thead>
                <tbody>
                  {bloco.linhas.map((linha, j) => <tr key={j} className="border-t border-linha">
                    {linha.map((celula, k) => <td key={k} className="whitespace-nowrap px-3 py-2 text-tinta">
                      {trechosDe(celula).map((trecho, n) => trecho.negrito ? <strong key={n}>{trecho.texto}</strong> : <span key={n}>{trecho.texto}</span>)}
                    </td>)}
                  </tr>)}
                </tbody>
              </table>
            </div>
          );
        }
        const conteudo = bloco.trechos.map((t, j) => (t.negrito ? <strong key={j}>{t.texto}</strong> : <span key={j}>{t.texto}</span>));
        return bloco.tipo === "item" ? <p key={i} className="flex gap-2"><span aria-hidden className="text-dourado">•</span><span>{conteudo}</span></p> : <p key={i}>{conteudo}</p>;
      })}
    </div>
  );
}
