import { useState } from "react";
import { AvisoErro, Campo, Card, Filtros, LinhaVazia, Tabela, Titulo, cn, inputClasses, td, th } from "@/components/ui";
import { Paginacao } from "@/components/Paginacao";
import { useAtraso } from "@/hooks/useClientes";
import { useClientesCadastrados } from "@/hooks/useVendas";
import { dataBRdoIso } from "@/lib/chamadosUi";
import { POR_PAGINA_VENDAS } from "@/lib/vendasUi";

/** Todos os clientes cadastrados, para consulta do vendedor (o CPF aparece mascarado). */
export function ClientesCadastrados() {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);
  const termo = useAtraso(busca);
  const lista = useClientesCadastrados({ busca: termo, limit: POR_PAGINA_VENDAS, offset: pagina * POR_PAGINA_VENDAS });
  const itens = lista.dados?.itens ?? [];

  return (
    <div>
      <Titulo titulo="Clientes" descricao="Todos os clientes cadastrados. Para vender, use o CPF na aba Vendas." />

      <Filtros>
        <Campo label="Buscar" className="flex-1">
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
            maxLength={80}
            placeholder="Nome, e-mail, telefone ou CPF"
            className={inputClasses}
          />
        </Campo>
      </Filtros>

      <AvisoErro erro={lista.erro} className="mb-4" />

      <Card>
        <div aria-busy={lista.carregando} className={cn("transition-opacity", lista.carregando && "opacity-60")}>
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Cliente</th>
                <th className={th}>CPF</th>
                <th className={th}>Telefone</th>
                <th className={th}>Cidade</th>
                <th className={th}>Desde</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((c) => (
                <tr key={c.id_cliente}>
                  <td className={td}>
                    <p className="font-medium">{c.nome}</p>
                    <p className="text-xs text-suave">{c.email ?? "sem e-mail"}</p>
                  </td>
                  <td className={`${td} tabular-nums`}>{c.cpf}</td>
                  <td className={td}>{c.telefone ?? "—"}</td>
                  <td className={td}>{c.cidade ?? "—"}</td>
                  <td className={td}>{dataBRdoIso(c.cliente_desde)}</td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <LinhaVazia colunas={5} texto={lista.carregando ? "Carregando os clientes…" : "Nenhum cliente encontrado."} />
              ) : null}
            </tbody>
          </Tabela>
        </div>
        <Paginacao pagina={pagina} total={lista.dados?.total ?? 0} porPagina={POR_PAGINA_VENDAS} onMudar={setPagina} />
      </Card>
    </div>
  );
}
