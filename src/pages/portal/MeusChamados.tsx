import { Link } from "react-router-dom";
import { cn } from "@/components/ui";
import { botaoLoja } from "@/components/vitrine";
import { dataBR } from "@/lib/dados";
import { useClienteId } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

const situacao = { Aberto: "Aguardando a casa", "Em andamento": "Em conversa", Resolvido: "Resolvido" } as const;

export function MeusChamados() {
  const { chamados } = useEstado();
  const clienteId = useClienteId();
  const meus = chamados.filter((c) => c.clienteId === clienteId);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-lg font-display text-xl">Trocas, ajustes, entregas ou uma dúvida sobre tecido — quem responde é gente da loja, em até um dia útil.</p>
        <Link to="/conta/atendimento/novo" className={botaoLoja()}>
          Escrever para a casa
        </Link>
      </div>

      <ul>
        {meus.map((c) => (
          <li key={c.id}>
            <Link to={`/conta/atendimento/${c.id}`} className="alinhavo flex flex-wrap items-center gap-4 py-5 hover:bg-pergaminho/60">
              <div className="flex-1">
                <p className="font-display text-[22px] leading-tight">{c.assunto}</p>
                <p className="mt-1 text-sm text-suave">
                  {c.protocolo} · {c.motivo} · desde {dataBR(c.abertoEm)} · {c.mensagens.length}{" "}
                  {c.mensagens.length === 1 ? "mensagem" : "mensagens"}
                </p>
              </div>
              <span className={cn("text-sm", c.status === "Resolvido" ? "text-suave" : "text-caramelo")}>{situacao[c.status]}</span>
            </Link>
          </li>
        ))}
        {meus.length === 0 ? <li className="py-10 font-display text-xl text-suave">Nenhuma conversa ainda.</li> : null}
      </ul>
    </div>
  );
}
