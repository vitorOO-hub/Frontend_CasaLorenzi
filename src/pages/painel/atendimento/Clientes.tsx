import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Campo, Filtros, LinhaVazia, Tabela, Titulo, inputClasses, linhaClicavel, td, th } from "@/components/ui";
import { clientes, dataBR, moeda } from "@/lib/dados";
import { podeAprovar, useLojaEscopo, usePapel } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

export function Clientes() {
  const { chamados, pedidos } = useEstado();
  const escopo = useLojaEscopo();
  const papel = usePapel();
  const gestor = podeAprovar(papel);
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const pedidosEscopo = pedidos.filter((p) => !escopo || p.lojaId === escopo);
  const chamadosEscopo = chamados.filter((c) => !escopo || c.lojaId === escopo);
  const visiveis = clientes
    .filter(
      (c) =>
        !escopo ||
        pedidosEscopo.some((p) => p.clienteId === c.id) ||
        chamadosEscopo.some((x) => x.clienteId === c.id),
    )
    .filter((c) => !busca || `${c.nome} ${c.email} ${c.telefone}`.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      <Titulo
        titulo="Clientes"
        descricao={
          escopo
            ? "Clientes com compras ou chamados na sua unidade."
            : "Uma ficha por pessoa, independentemente da loja onde comprou."
        }
      />
      <Filtros>
        <Campo label="Buscar" className="flex-1">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, e-mail ou telefone" className={inputClasses} />
        </Campo>
      </Filtros>
      <Card>
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Cliente</th>
              <th className={th}>Telefone</th>
              <th className={th}>Cidade</th>
              {gestor ? <th className={th}>Compras</th> : null}
              {gestor ? <th className={th}>Total gasto</th> : null}
              <th className={th}>Chamados</th>
              <th className={th}>Desde</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => {
              const compras = pedidosEscopo.filter((p) => p.clienteId === c.id && p.status !== "Cancelado");
              const abertos = chamadosEscopo.filter((x) => x.clienteId === c.id && x.status !== "Resolvido").length;
              return (
                <tr key={c.id} onClick={() => navigate(`/painel/atendimento/clientes/${c.id}`)} className={linhaClicavel}>
                  <td className={td}>
                    <p className="font-medium">{c.nome}</p>
                    <p className="text-xs text-suave">{c.email}</p>
                  </td>
                  <td className={td}>{c.telefone}</td>
                  <td className={td}>{c.cidade}</td>
                  {gestor ? <td className={`${td} tabular-nums`}>{compras.length}</td> : null}
                  {gestor ? <td className={`${td} tabular-nums`}>{moeda(compras.reduce((s, p) => s + p.valor, 0))}</td> : null}
                  <td className={td}>
                    {chamadosEscopo.filter((x) => x.clienteId === c.id).length}
                    {abertos ? <span className="ml-1 text-xs text-perigo">({abertos} em aberto)</span> : null}
                  </td>
                  <td className={td}>{dataBR(c.desde)}</td>
                </tr>
              );
            })}
            {visiveis.length === 0 ? <LinhaVazia colunas={7} texto="Nenhum cliente encontrado." /> : null}
          </tbody>
        </Tabela>
      </Card>
    </div>
  );
}
