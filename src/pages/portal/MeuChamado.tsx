import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { cn } from "@/components/ui";
import { botaoLoja } from "@/components/vitrine";
import * as acoes from "@/lib/acoes";
import { dataBR, nomeLoja } from "@/lib/dados";
import { useClienteId } from "@/lib/sessao";
import { useEstado } from "@/lib/store";
import { useAcao } from "@/lib/useAcao";
import { campoLoja } from "./Checkout";

export function MeuChamado() {
  const { id } = useParams();
  const { chamados } = useEstado();
  const clienteId = useClienteId();
  const [texto, setTexto] = useState("");
  const { executar, ocupado, erro } = useAcao();
  const chamado = chamados.find((c) => c.id === id && c.clienteId === clienteId);
  if (!chamado) return <Navigate to="/conta/atendimento" replace />;

  return (
    <div className="max-w-3xl">
      <Link to="/conta/atendimento" className="link-tracejado text-sm">
        Conversas com a casa
      </Link>
      <h2 className="mt-4 text-[40px] leading-tight">{chamado.assunto}</h2>
      <p className="mt-1 text-sm text-suave">
        {chamado.protocolo} · {chamado.motivo} · {nomeLoja(chamado.lojaId)} · desde {dataBR(chamado.abertoEm)}
        {chamado.pedidoId ? ` · pedido ${chamado.pedidoId}` : ""}
      </p>

      <div className="mt-8 space-y-5">
        {chamado.mensagens.map((m) => {
          const minha = m.autor === "cliente";
          return (
            <div key={m.id} className={cn("max-w-[85%]", minha && "ml-auto")}>
              <p className="mb-1 text-xs text-suave">
                {m.nome} · {m.data}
              </p>
              {minha ? (
                <p className="bg-pergaminho px-5 py-4 text-[15px] leading-relaxed">{m.texto}</p>
              ) : (
                <p className="rotate-[-0.3deg] border-l-2 border-dashed border-caramelo bg-etiqueta/60 px-5 py-4 font-display text-[19px] leading-relaxed">
                  {m.texto}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {chamado.status === "Resolvido" ? (
        <p className="alinhavo mt-10 pt-6 font-display text-lg text-suave">
          Esta conversa foi encerrada. Precisa de mais alguma coisa?{" "}
          <Link to="/conta/atendimento/novo" className="link-tracejado text-tinta">
            Escreva de novo
          </Link>
          .
        </p>
      ) : (
        <form
          className="alinhavo mt-10 pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!texto.trim()) return;
            void executar("mensagem", () => acoes.enviarMensagem(chamado.id, texto)).then((ok) => ok && setTexto(""));
          }}
        >
          <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua mensagem…" className={campoLoja} />
          {erro ? <p role="alert" className="mt-3 text-sm text-perigo">{erro}</p> : null}
          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={!texto.trim() || ocupado !== null} className={botaoLoja()}>
              {ocupado ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
