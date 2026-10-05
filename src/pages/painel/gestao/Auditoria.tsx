import { useState } from "react";
import { Campo, Card, Filtros, LinhaVazia, Tabela, Titulo, inputClasses, td, th } from "@/components/ui";
import { dataBR } from "@/lib/dados";
import { useEstado } from "@/lib/store";

export function Auditoria() {
  const { auditoria } = useEstado();
  const [busca, setBusca] = useState("");
  const filtrados = auditoria.filter((a) => `${a.autor} ${a.acao} ${a.detalhe}`.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      <Titulo titulo="Auditoria" descricao="Quem aprovou, editou ou alterou o quê, em toda a rede." />
      <Filtros>
        <Campo label="Buscar" className="flex-1">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pessoa, ação ou detalhe" className={inputClasses} />
        </Campo>
      </Filtros>
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
            {filtrados.map((a) => (
              <tr key={a.id}>
                <td className={td}>{dataBR(a.data)}</td>
                <td className={`${td} font-medium`}>{a.autor}</td>
                <td className={td}>{a.acao}</td>
                <td className={`${td} text-suave`}>{a.detalhe}</td>
              </tr>
            ))}
            {filtrados.length === 0 ? <LinhaVazia colunas={4} texto="Nenhum registro encontrado." /> : null}
          </tbody>
        </Tabela>
      </Card>
    </div>
  );
}
