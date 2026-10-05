import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, classesBotao } from "@/components/ui";
import { dataBR, tomChamado } from "@/lib/dados";
import { useClienteId } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

export function MeusChamados() {
  const { chamados } = useEstado();
  const clienteId = useClienteId();
  const meus = chamados.filter((c) => c.clienteId === clienteId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-light">Atendimento</h2>
          <p className="mt-1 text-sm text-suave">
            Trocas, ajustes, entregas ou dúvidas — nosso time responde em até 1 dia útil.
          </p>
        </div>
        <Link to="/conta/atendimento/novo" className={classesBotao()}>
          Abrir chamado
        </Link>
      </div>

      <ul className="divide-y divide-linha bg-papel">
        {meus.map((c) => (
          <li key={c.id}>
            <Link
              to={`/conta/atendimento/${c.id}`}
              className="flex items-center gap-4 px-6 py-5 transition-colors hover:bg-areia/40"
            >
              <div className="flex-1">
                <p className="font-medium">{c.assunto}</p>
                <p className="mt-1 text-xs text-suave">
                  {c.protocolo} · {c.motivo} · aberto em {dataBR(c.abertoEm)} ·{" "}
                  {c.mensagens.length} {c.mensagens.length === 1 ? "mensagem" : "mensagens"}
                </p>
              </div>
              <Badge tom={tomChamado[c.status]}>{c.status}</Badge>
              <ChevronRight className="h-4 w-4 text-suave" />
            </Link>
          </li>
        ))}
        {meus.length === 0 ? (
          <li className="p-10 text-center text-sm text-suave">Você ainda não abriu chamados.</li>
        ) : null}
      </ul>
    </div>
  );
}
