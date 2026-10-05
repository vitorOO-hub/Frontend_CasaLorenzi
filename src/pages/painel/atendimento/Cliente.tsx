import { Link, Navigate, useParams } from "react-router-dom";
import { Badge, Card, CardTitulo, LinhaVazia, Metrica, Tabela, Voltar, td, th } from "@/components/ui";
import { clientes, dataBR, moeda, nomeLoja, tomChamado, tomPedido } from "@/lib/dados";
import { podeAprovar, usePapel } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

export function Cliente() {
  const { id } = useParams();
  const { chamados, pedidos } = useEstado();
  const gestor = podeAprovar(usePapel());
  const cliente = clientes.find((c) => c.id === id);
  if (!cliente) return <Navigate to="/painel/atendimento/clientes" replace />;

  const compras = pedidos.filter((p) => p.clienteId === cliente.id);
  const validas = compras.filter((p) => p.status !== "Cancelado");
  const seus = chamados.filter((c) => c.clienteId === cliente.id);
  const total = validas.reduce((s, p) => s + p.valor, 0);

  return (
    <div>
      <Voltar to="/painel/atendimento/clientes">Clientes</Voltar>
      <h1 className="text-4xl font-light">{cliente.nome}</h1>
      <p className="mb-6 mt-1 text-sm text-suave">
        {cliente.email} · {cliente.telefone} · {cliente.cidade} · cliente desde {dataBR(cliente.desde)}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {gestor ? (
          <>
            <Metrica rotulo="Compras" valor={validas.length} />
            <Metrica rotulo="Total gasto" valor={moeda(total)} />
            <Metrica rotulo="Ticket médio" valor={moeda(validas.length ? total / validas.length : 0)} />
          </>
        ) : null}
        <Metrica rotulo="Chamados" valor={seus.length} nota={`${seus.filter((c) => c.status !== "Resolvido").length} em aberto`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {gestor ? (
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
                {compras.map((p) => (
                  <tr key={p.id}>
                    <td className={`${td} font-mono text-xs`}>{p.id}</td>
                    <td className={td}>{dataBR(p.data)}</td>
                    <td className={td}>{nomeLoja(p.lojaId)}</td>
                    <td className={`${td} tabular-nums`}>{moeda(p.valor)}</td>
                    <td className={td}>
                      <Badge tom={tomPedido[p.status]}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
                {compras.length === 0 ? <LinhaVazia colunas={5} texto="Sem compras." /> : null}
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
              {seus.map((c) => (
                <tr key={c.id}>
                  <td className={td}>
                    <Link to={`/painel/atendimento/chamado/${c.id}`} className="font-medium hover:text-marinho">
                      {c.assunto}
                    </Link>
                    <span className="block font-mono text-[11px] text-suave">{c.protocolo}</span>
                  </td>
                  <td className={td}>{c.motivo}</td>
                  <td className={td}>{dataBR(c.abertoEm)}</td>
                  <td className={td}>
                    <Badge tom={tomChamado[c.status]}>{c.status}</Badge>
                  </td>
                </tr>
              ))}
              {seus.length === 0 ? <LinhaVazia colunas={4} texto="Nenhum chamado." /> : null}
            </tbody>
          </Tabela>
        </Card>
      </div>
    </div>
  );
}
