import { Link, useParams } from "react-router-dom";
import { AvisoErro, Badge, Card, CardTitulo, LinhaVazia, Metrica, Tabela, Voltar, td, th } from "@/components/ui";
import { useFichaCliente } from "@/hooks/useClientes";
import { ehUuid } from "@/lib/clientesApi";
import { tomStatusPedido } from "@/lib/clientesUi";
import { dataBRdoIso, moedaBR, tomStatus } from "@/lib/chamadosUi";

/** Ficha do cliente: contato, chamados do escopo e, só para gerente e admin, compras e valores. */
export function Cliente() {
  const { id } = useParams();
  const { dados: ficha, erro } = useFichaCliente(id);

  if (!ehUuid(id) || !ficha) {
    return (
      <div>
        <Voltar to="/painel/atendimento/clientes">Clientes</Voltar>
        {!ehUuid(id) ? (
          <AvisoErro erro="Cliente não encontrado." className="mt-6" />
        ) : erro ? (
          <AvisoErro erro={erro} className="mt-6" />
        ) : (
          <p className="py-16 text-center text-sm text-suave">Carregando a ficha…</p>
        )}
      </div>
    );
  }

  const { cliente, resumo, chamados, compras } = ficha;
  // O servidor manda compras e valores nulos para o atendente: a tela só mostra o que veio.
  const vemCompras = compras !== null && resumo.compras !== null;

  return (
    <div>
      <Voltar to="/painel/atendimento/clientes">Clientes</Voltar>
      <h1 className="text-4xl font-light">{cliente.nome}</h1>
      <p className="mb-6 mt-1 text-sm text-suave">
        {[cliente.email, cliente.telefone, cliente.cidade].filter(Boolean).join(" · ")} · cliente desde{" "}
        {dataBRdoIso(cliente.cliente_desde)}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {vemCompras ? (
          <>
            <Metrica rotulo="Compras" valor={resumo.compras ?? 0} />
            <Metrica rotulo="Total gasto" valor={moedaBR(resumo.total_gasto ?? 0)} />
            <Metrica rotulo="Ticket médio" valor={moedaBR(resumo.ticket_medio ?? 0)} />
          </>
        ) : null}
        <Metrica rotulo="Chamados" valor={resumo.chamados} nota={`${resumo.chamados_em_aberto} em aberto`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {vemCompras ? (
          <Card>
            <CardTitulo titulo="Compras" />
            <Tabela>
              <thead>
                <tr>
                  <th className={th}>Pedido</th>
                  <th className={th}>Data</th>
                  <th className={th}>Loja</th>
                  <th className={th}>Valor</th>
                  <th className={th}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {(compras ?? []).map((p) => (
                  <tr key={p.id_pedido}>
                    <td className={`${td} font-mono text-xs`}>{p.numero_pedido}</td>
                    <td className={td}>{dataBRdoIso(p.criado_em)}</td>
                    <td className={td}>{p.loja_nome}</td>
                    <td className={`${td} tabular-nums`}>{moedaBR(p.valor_total)}</td>
                    <td className={td}>
                      <Badge tom={tomStatusPedido(p.status.codigo)}>{p.status.nome}</Badge>
                    </td>
                  </tr>
                ))}
                {(compras ?? []).length === 0 ? <LinhaVazia colunas={5} texto="Sem compras." /> : null}
              </tbody>
            </Tabela>
          </Card>
        ) : null}

        <Card>
          <CardTitulo titulo="Chamados" />
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Assunto</th>
                <th className={th}>Motivo</th>
                <th className={th}>Abertura</th>
                <th className={th}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {chamados.map((c) => (
                <tr key={c.id_atendimento}>
                  <td className={td}>
                    <Link to={`/painel/atendimento/chamado/${c.id_atendimento}`} className="font-medium hover:text-marinho">
                      {c.assunto}
                    </Link>
                    <span className="block font-mono text-[11px] text-suave">{c.protocolo}</span>
                  </td>
                  <td className={td}>{c.categoria.nome}</td>
                  <td className={td}>{dataBRdoIso(c.aberto_em)}</td>
                  <td className={td}>
                    <Badge tom={tomStatus(c.status.codigo)}>{c.status.nome}</Badge>
                  </td>
                </tr>
              ))}
              {chamados.length === 0 ? <LinhaVazia colunas={4} texto="Nenhum chamado." /> : null}
            </tbody>
          </Tabela>
        </Card>
      </div>
    </div>
  );
}
