import { useState } from "react";
import { AvisoErro, Campo, Card, Filtros, LinhaVazia, Tabela, Titulo, inputClasses, td, th } from "@/components/ui";
import { useAtraso } from "@/hooks/useEstoquePainel";
import { useAuditoria } from "@/hooks/useGestao";

const dataHora = (iso: string) => {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
};

/** Quem aprovou, editou ou alterou o quê, vindo do banco (os mais recentes primeiro). */
export function Auditoria() {
  const [busca, setBusca] = useState("");
  const consulta = useAuditoria(useAtraso(busca.trim()));
  const itens = consulta.dados?.itens ?? [];
  const total = consulta.dados?.total ?? 0;

  return (
    <div>
      <Titulo titulo="Auditoria" descricao="Quem aprovou, editou ou alterou o quê, em toda a rede." />
      <Filtros>
        <Campo label="Buscar" className="flex-1">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            maxLength={80}
            placeholder="Pessoa, ação ou detalhe"
            className={inputClasses}
          />
        </Campo>
      </Filtros>
      <AvisoErro erro={consulta.erro} className="mb-4" />
      <Card>
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Data</th>
              <th className={th}>Pessoa</th>
              <th className={th}>Ação</th>
              <th className={th}>Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((a) => (
              <tr key={a.id_auditoria}>
                <td className={`${td} whitespace-nowrap`}>{dataHora(a.data)}</td>
                <td className={`${td} font-medium`}>{a.autor}</td>
                <td className={td}>{a.acao}</td>
                <td className={`${td} text-suave`}>{a.detalhe}</td>
              </tr>
            ))}
            {itens.length === 0 ? (
              <LinhaVazia colunas={4} texto={consulta.carregando ? "Carregando os registros…" : "Nenhum registro encontrado."} />
            ) : null}
          </tbody>
        </Tabela>
        {total > itens.length ? (
          <p className="border-t border-linha px-5 py-2 text-xs text-suave">
            Mostrando os {itens.length} mais recentes de {total}. Use a busca para achar um registro mais antigo.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
