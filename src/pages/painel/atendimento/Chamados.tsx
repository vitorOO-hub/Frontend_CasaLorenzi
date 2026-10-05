import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Campo,
  Card,
  Filtros,
  LinhaVazia,
  Metrica,
  Select,
  Tabela,
  Titulo,
  cn,
  linhaClicavel,
  td,
  th,
} from "@/components/ui";
import { dataBR, nomeCliente, nomeLoja, prioridadeChamado, tomChamado, tomPrioridade } from "@/lib/dados";
import { useLojaEscopo, useLojasVisiveis } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

const ordemPrioridade = { Alta: 0, Média: 1, Baixa: 2 } as const;
const opcoes = (lista: string[], todos = "Todos") => [{ value: "", label: todos }, ...lista.map((v) => ({ value: v, label: v }))];

export function Chamados() {
  const { chamados } = useEstado();
  const lojas = useLojasVisiveis();
  const escopo = useLojaEscopo();
  const navigate = useNavigate();
  const [status, setStatus] = useState("abertos");
  const [loja, setLoja] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [canal, setCanal] = useState("");

  const noEscopo = chamados.filter((c) => !escopo || c.lojaId === escopo);
  const filtrados = noEscopo
    .filter((c) =>
      status === "abertos" ? c.status !== "Resolvido" : !status || c.status === status,
    )
    .filter((c) => (!loja || c.lojaId === loja) && (!prioridade || prioridadeChamado(c) === prioridade) && (!canal || c.canal === canal))
    .sort((a, b) => ordemPrioridade[prioridadeChamado(a)] - ordemPrioridade[prioridadeChamado(b)] || b.abertoEm.localeCompare(a.abertoEm));

  const abertos = noEscopo.filter((c) => c.status !== "Resolvido");

  return (
    <div>
      <Titulo titulo="Chamados" descricao="Fila unificada de todos os canais, ordenada por prioridade." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metrica rotulo="Sem resposta" valor={noEscopo.filter((c) => c.status === "Aberto").length} nota="aguardando o primeiro retorno" destaque />
        <Metrica rotulo="Em andamento" valor={noEscopo.filter((c) => c.status === "Em andamento").length} />
        <Metrica rotulo="Prioridade alta" valor={abertos.filter((c) => prioridadeChamado(c) === "Alta").length} nota="abertos com urgência" />
        <Metrica rotulo="Resolvidos" valor={noEscopo.filter((c) => c.status === "Resolvido").length} nota="no histórico" />
      </div>

      <Filtros>
        <Campo label="Situação" className="flex-1">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            opcoes={[
              { value: "abertos", label: "Em aberto" },
              { value: "Aberto", label: "Sem resposta" },
              { value: "Em andamento", label: "Em andamento" },
              { value: "Resolvido", label: "Resolvidos" },
              { value: "", label: "Todos" },
            ]}
          />
        </Campo>
        {lojas.length > 1 ? (
          <Campo label="Loja" className="flex-1">
            <Select value={loja} onChange={(e) => setLoja(e.target.value)} opcoes={[{ value: "", label: "Todas" }, ...lojas.map((l) => ({ value: l.id, label: l.nome }))]} />
          </Campo>
        ) : null}
        <Campo label="Prioridade" className="flex-1">
          <Select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} opcoes={opcoes(["Alta", "Média", "Baixa"], "Todas")} />
        </Campo>
        <Campo label="Canal" className="flex-1">
          <Select value={canal} onChange={(e) => setCanal(e.target.value)} opcoes={opcoes(["Portal", "WhatsApp", "E-mail", "Loja"])} />
        </Campo>
      </Filtros>

      <Card>
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Prioridade</th>
              <th className={th}>Cliente / assunto</th>
              <th className={th}>Motivo</th>
              <th className={th}>Canal</th>
              <th className={th}>Loja</th>
              <th className={th}>Abertura</th>
              <th className={th}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => {
              const pr = prioridadeChamado(c);
              return (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/painel/atendimento/chamado/${c.id}`)}
                  className={cn(linhaClicavel, pr === "Alta" && c.status !== "Resolvido" && "shadow-[inset_3px_0_0] shadow-perigo")}
                >
                  <td className={td}>
                    <Badge tom={tomPrioridade[pr]}>{pr}</Badge>
                  </td>
                  <td className={td}>
                    <p className="font-medium">{nomeCliente(c.clienteId)}</p>
                    <p className="text-xs text-suave">
                      {c.assunto} · <span className="font-mono">{c.protocolo}</span>
                    </p>
                  </td>
                  <td className={td}>{c.motivo}</td>
                  <td className={td}>{c.canal}</td>
                  <td className={td}>{nomeLoja(c.lojaId)}</td>
                  <td className={td}>{dataBR(c.abertoEm)}</td>
                  <td className={td}>
                    <Badge tom={tomChamado[c.status]}>{c.status}</Badge>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 ? <LinhaVazia colunas={7} texto="Nenhum chamado com esses filtros." /> : null}
          </tbody>
        </Tabela>
      </Card>
    </div>
  );
}
