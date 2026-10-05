import { Paperclip } from "lucide-react";
import { useState } from "react";
import type { Chamado } from "@/lib/dados";
import { Botao, cn, inputClasses } from "./ui";

/** Conversa de um chamado — usada pelo cliente e pelo atendimento. */
export function Conversa({
  chamado,
  lado,
  onEnviar,
  acoesExtras,
}: {
  chamado: Chamado;
  lado: "cliente" | "atendente";
  onEnviar: (texto: string) => void;
  acoesExtras?: React.ReactNode;
}) {
  const [texto, setTexto] = useState("");

  return (
    <div className="flex flex-col rounded-sm border border-linha bg-papel">
      <div className="space-y-4 p-5">
        {chamado.mensagens.map((m, i) => {
          const minha = m.autor === lado;
          return (
            <div key={m.id} className={cn("flex", minha && "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-sm px-4 py-3",
                  minha ? "bg-marinho text-white" : "bg-areia/70",
                )}
              >
                <p className={cn("text-[11px] font-semibold", minha ? "text-white/60" : "text-suave")}>
                  {m.nome} · {m.data}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed">{m.texto}</p>
                {i === 0 && chamado.anexos?.length ? (
                  <ul className="mt-3 space-y-1">
                    {chamado.anexos.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-xs opacity-75">
                        <Paperclip className="h-3 w-3" /> {a.nome}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {chamado.status === "Resolvido" && lado === "cliente" ? (
        <p className="border-t border-linha p-5 text-center text-sm text-suave">
          Este chamado foi encerrado. Precisa de algo mais? Abra um novo chamado.
        </p>
      ) : (
        <form
          className="border-t border-linha p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!texto.trim()) return;
            onEnviar(texto);
            setTexto("");
          }}
        >
          <textarea
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={lado === "cliente" ? "Escreva uma mensagem…" : "Responder ao cliente…"}
            className={inputClasses}
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {acoesExtras}
            <Botao type="submit" disabled={!texto.trim()}>
              Enviar
            </Botao>
          </div>
        </form>
      )}
    </div>
  );
}
