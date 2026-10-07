import { Paperclip } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Botao, cn, inputClasses } from "./ui";

export type MensagemConversa = { id: string; autor: "cliente" | "atendente"; nome: string; data: string; texto: string };
export type AnexoConversa = { id: string; nome: string };

/** Conversa de um chamado: o mesmo componente serve ao cliente e ao atendimento. */
export function Conversa({
  mensagens,
  anexos = [],
  encerrado,
  lado,
  onEnviar,
  acoesExtras,
  bloqueioAviso,
}: {
  mensagens: MensagemConversa[];
  /** Mostrados junto da primeira mensagem (os arquivos que o cliente mandou ao abrir o chamado). */
  anexos?: AnexoConversa[];
  encerrado: boolean;
  lado: "cliente" | "atendente";
  onEnviar: (texto: string) => Promise<boolean>;
  acoesExtras?: ReactNode;
  /** Se informado, substitui o formulário (ex.: chamado resolvido que o cliente não pode reabrir). */
  bloqueioAviso?: string;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  return (
    <div className="flex flex-col rounded-sm border border-linha bg-papel">
      <div className="space-y-4 p-5">
        {mensagens.map((m, i) => {
          const minha = m.autor === lado;
          return (
            <div key={m.id} className={cn("flex", minha && "justify-end")}>
              <div className={cn("max-w-[85%] rounded-sm px-4 py-3", minha ? "bg-marinho text-white" : "bg-areia/70")}>
                <p className={cn("text-[11px] font-semibold", minha ? "text-white/60" : "text-suave")}>
                  {m.nome} · {m.data}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{m.texto}</p>
                {i === 0 && anexos.length ? (
                  <ul className="mt-3 space-y-1">
                    {anexos.map((a) => (
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
        {mensagens.length === 0 ? <p className="py-6 text-center text-sm text-suave">Nenhuma mensagem ainda.</p> : null}
      </div>

      {bloqueioAviso || (encerrado && lado === "cliente") ? (
        <p className="border-t border-linha p-5 text-center text-sm text-suave">
          {bloqueioAviso ?? "Este chamado foi encerrado. Precisa de algo mais? Abra um novo chamado."}
        </p>
      ) : (
        <form
          className="border-t border-linha p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!texto.trim()) return;
            setEnviando(true);
            void onEnviar(texto).then((ok) => {
              setEnviando(false);
              if (ok) setTexto("");
            });
          }}
        >
          <textarea
            rows={3}
            maxLength={4000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={lado === "cliente" ? "Escreva uma mensagem…" : "Responder ao cliente…"}
            className={inputClasses}
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {acoesExtras}
            <Botao type="submit" disabled={!texto.trim() || enviando}>
              {enviando ? "Enviando…" : "Enviar"}
            </Botao>
          </div>
        </form>
      )}
    </div>
  );
}
