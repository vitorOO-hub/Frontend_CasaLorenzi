import { Type, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "./ui";

/**
 * Ferramenta temporária para escolher a tipografia da loja.
 * Troca as variáveis de fonte do .loja na hora; remover quando a fonte for decidida.
 */
type OpcaoFonte = { id: string; nome: string; nota: string; titulo: string; texto: string };

export const OPCOES_FONTE: OpcaoFonte[] = [
  { id: "fraunces", nome: "Fraunces + Jost", nota: "Serifa com desenho próprio (atual)", titulo: '"Fraunces", Georgia, serif', texto: '"Jost", sans-serif' },
  { id: "instrument", nome: "Instrument Serif + Inter Tight", nota: "Estreita e editorial, de revista", titulo: '"Instrument Serif", Georgia, serif', texto: '"Inter Tight", sans-serif' },
  { id: "gloock", nome: "Gloock + Archivo", nota: "Alto contraste, cortes afiados", titulo: '"Gloock", Georgia, serif', texto: '"Archivo", sans-serif' },
  { id: "young", nome: "Young Serif + Hanken Grotesk", nota: "Robusta, ar de casa antiga", titulo: '"Young Serif", Georgia, serif', texto: '"Hanken Grotesk", sans-serif' },
  { id: "tenor", nome: "Tenor Sans + Archivo Narrow", nota: "Na linha da Optima (Fear of God)", titulo: '"Tenor Sans", sans-serif', texto: '"Archivo Narrow", sans-serif' },
  { id: "caslon", nome: "Libre Caslon + Instrument Sans", nota: "Clássico inglês, alfaiataria", titulo: '"Libre Caslon Display", Georgia, serif', texto: '"Instrument Sans", sans-serif' },
  { id: "dmserif", nome: "DM Serif Display + DM Sans", nota: "Encorpada e moderna", titulo: '"DM Serif Display", Georgia, serif', texto: '"DM Sans", sans-serif' },
  { id: "bricolage", nome: "Bricolage Grotesque", nota: "Só sem serifa, com personalidade", titulo: '"Bricolage Grotesque", sans-serif', texto: '"Bricolage Grotesque", sans-serif' },
];

const CHAVE = "casa-lorenzi:fonte";

function aplicar(opcao: OpcaoFonte) {
  document.querySelectorAll<HTMLElement>(".loja").forEach((el) => {
    el.style.setProperty("--font-display", opcao.titulo);
    el.style.setProperty("--font-sans", opcao.texto);
  });
}

export function SeletorFontes() {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState(() => {
    try {
      return localStorage.getItem(CHAVE) ?? "fraunces";
    } catch {
      return "fraunces";
    }
  });

  // Reaplica a cada render da loja (o menu lateral também é um .loja).
  useEffect(() => {
    const opcao = OPCOES_FONTE.find((o) => o.id === atual) ?? OPCOES_FONTE[0]!;
    aplicar(opcao);
    const observador = new MutationObserver(() => aplicar(opcao));
    observador.observe(document.body, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, [atual]);

  function escolher(id: string) {
    setAtual(id);
    try {
      localStorage.setItem(CHAVE, id);
    } catch {
      // sem storage: vale só nesta visita
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] font-sans text-tinta">
      {aberto ? (
        <div className="w-[320px] border border-linha bg-creme shadow-[0_18px_40px_#1a1f2b2e]">
          <div className="flex items-center justify-between border-b border-linha px-4 py-3">
            <b className="text-sm font-medium">Testar fontes</b>
            <button onClick={() => setAberto(false)} aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {OPCOES_FONTE.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => escolher(o.id)}
                  className={cn("w-full border-b border-linha/70 px-4 py-3 text-left hover:bg-pergaminho", atual === o.id && "bg-pergaminho shadow-[inset_3px_0_0_#8a5f36]")}
                >
                  <span className="block text-[21px] leading-tight" style={{ fontFamily: o.titulo }}>
                    Casa Lorenzi
                  </span>
                  <span className="mt-0.5 block text-xs text-suave" style={{ fontFamily: o.texto }}>
                    {o.nome} · {o.nota}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button
          onClick={() => setAberto(true)}
          className="flex items-center gap-2 bg-tinta px-4 py-3 text-sm text-creme shadow-[0_10px_24px_#1a1f2b40] hover:bg-marinho"
        >
          <Type className="h-4 w-4" /> Testar fontes
        </button>
      )}
    </div>
  );
}
