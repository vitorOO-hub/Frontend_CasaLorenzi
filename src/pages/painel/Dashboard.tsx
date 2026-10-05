import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, CardTitulo, LinhaVazia, Metrica, Tabela, sinal, td, th } from "@/components/ui";
import {
  dataBR,
  moeda,
  nomeCliente,
  nomeLoja,
  prioridadeChamado,
  statusProduto,
  tomChamado,
  tomPrioridade,
  totalProduto,
} from "@/lib/dados";
import { usePendencias } from "@/lib/pendencias";
import { equipe, useLojaEscopo, usePapel } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/** Lista "Para fazer agora": cada pendência leva direto à aba que resolve. */
function ParaFazer({ itens }: { itens: { texto: string; valor: number; to: string }[] }) {
  const ativos = itens.filter((i) => i.valor > 0);
  return (
    <Card>
      <CardTitulo titulo="Para fazer agora" />
      {ativos.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-suave">Tudo em dia por aqui.</p>
      ) : (
        <ul className="divide-y divide-linha">
          {ativos.map((i) => (
            <li key={i.texto}>
              <Link to={i.to} className="flex items-center gap-4 px-5 py-4 text-sm transition-colors hover:bg-areia/50">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-dourado-claro font-display text-lg text-marinho">
                  {i.valor}
                </span>
                <span className="flex-1">{i.texto}</span>
                <ArrowRight className="h-4 w-4 text-suave" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Cabecalho({ descricao }: { descricao: string }) {
  const papel = usePapel();
  return (
    <div className="mb-8">
      <p className="rotulo !text-dourado">{dataBR(new Date().toISOString().slice(0, 10))}</p>
      <h1 className="mt-1 text-4xl font-light">
        {saudacao()}, {equipe[papel].nome.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-suave">{descricao}</p>
    </div>
  );
}

export function Dashboard() {
  const papel = usePapel();
  if (papel === "atendente") return <PainelAtendente />;
  if (papel === "operador") return <PainelOperador />;
  return <PainelGestao />;
}

function PainelAtendente() {
  const { chamados } = useEstado();
  const pend = usePendencias();
  const abertos = chamados.filter((c) => c.status !== "Resolvido");
  const urgentes = abertos.filter((c) => prioridadeChamado(c) === "Alta");

  return (
    <div>
      <Cabecalho descricao="Atendimento · fila de chamados de todas as casas" />
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metrica rotulo="Sem resposta" valor={pend.chamados} nota="aguardando o primeiro retorno" to="/painel/atendimento" destaque />
        <Metrica rotulo="Em aberto" valor={abertos.length} nota={`${chamados.length} no histórico`} to="/painel/atendimento" />
        <Metrica rotulo="Prioridade alta" valor={urgentes.length} nota="casos urgentes" to="/painel/atendimento" />
      </div>
      <Card>
        <CardTitulo titulo="Próximos da fila" acao={<Link to="/painel/atendimento" className="text-xs font-semibold text-marinho">Ver fila</Link>} />
        <TabelaChamados lista={abertos.sort((a, b) => (prioridadeChamado(a) === "Alta" ? -1 : 0) - (prioridadeChamado(b) === "Alta" ? -1 : 0)).slice(0, 6)} />
      </Card>
    </div>
  );
}

function PainelOperador() {
  const { produtos } = useEstado();
  const escopo = useLojaEscopo() ?? "l1";
  const pend = usePendencias();
  const abaixo = produtos.filter((p) => {
    const s = p.saldos.find((x) => x.lojaId === escopo);
    return s && s.quantidade <= s.minimo;
  });
  const minhas = produtos
    .flatMap((p) => p.movimentacoes.map((m) => ({ ...m, nome: p.nome, sku: p.sku })))
    .filter((m) => m.lojaId === escopo && m.responsavel === equipe.operador.nome)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);

  return (
    <div>
      <Cabecalho descricao={`Estoque · ${nomeLoja(escopo)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardTitulo titulo="Peças abaixo do mínimo" acao={<Link to="/painel/estoque" className="text-xs font-semibold text-marinho">Ver saldo</Link>} />
            <ul className="divide-y divide-linha">
              {abaixo.slice(0, 6).map((p) => {
                const s = p.saldos.find((x) => x.lojaId === escopo)!;
                return (
                  <li key={p.sku}>
                    <Link to={`/painel/estoque/peca/${p.sku}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-areia/50">
                      <span className="font-medium">{p.nome}</span>
                      <span className="tabular-nums">
                        <strong className={s.quantidade === 0 ? "text-perigo" : "text-alerta"}>{s.quantidade}</strong>
                        <span className="text-xs text-suave"> / mín. {s.minimo}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {abaixo.length === 0 ? <li className="px-5 py-6 text-center text-sm text-suave">Nenhuma peça abaixo do mínimo.</li> : null}
            </ul>
          </Card>
          <Card>
            <CardTitulo titulo="Suas últimas movimentações" />
            <Tabela>
              <tbody>
                {minhas.map((m) => (
                  <tr key={m.id}>
                    <td className={td}>{dataBR(m.data)}</td>
                    <td className={`${td} font-medium`}>{m.nome}</td>
                    <td className={td}>{m.tipo}</td>
                    <td className={`${td} tabular-nums`}>{sinal(m.quantidade)}</td>
                  </tr>
                ))}
                {minhas.length === 0 ? <LinhaVazia colunas={4} texto="Você ainda não registrou movimentações." /> : null}
              </tbody>
            </Tabela>
          </Card>
        </div>
        <ParaFazer
          itens={[
            { texto: "Transferências e reposições aguardando você", valor: pend.transferencias, to: "/painel/estoque/transferencias" },
            { texto: "Peças abaixo do mínimo na loja", valor: abaixo.length, to: "/painel/estoque" },
          ]}
        />
      </div>
    </div>
  );
}

function PainelGestao() {
  const { produtos, chamados, pedidos } = useEstado();
  const papel = usePapel();
  const escopo = useLojaEscopo();
  const pend = usePendencias();
  const lojaIds = escopo ? [escopo] : undefined;
  const doEscopo = <T extends { lojaId: string }>(lista: T[]) => lista.filter((x) => !escopo || x.lojaId === escopo);

  const vendas = doEscopo(pedidos).filter((p) => p.status !== "Cancelado");
  const faturamento = vendas.reduce((s, p) => s + p.valor, 0);
  const alertas = produtos.filter((p) => statusProduto(p, lojaIds) !== "OK");
  const abertos = doEscopo(chamados).filter((c) => c.status !== "Resolvido");
  const unidades = produtos.reduce((s, p) => s + totalProduto(p, lojaIds), 0);

  // Vendas por categoria (barras horizontais simples).
  const porCategoria = Object.entries(
    vendas
      .flatMap((p) => p.itens)
      .reduce<Record<string, number>>((acc, i) => {
        const cat = produtos.find((p) => p.sku === i.sku.slice(0, 7))?.categoria ?? "Outros";
        acc[cat] = (acc[cat] ?? 0) + i.valor * i.quantidade;
        return acc;
      }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maior = porCategoria[0]?.[1] ?? 1;

  return (
    <div>
      <Cabecalho
        descricao={
          papel === "administrador"
            ? escopo
              ? `Visão consolidada · ${nomeLoja(escopo)}`
              : "Visão consolidada de todas as casas"
            : `Gestão da unidade · ${nomeLoja(escopo ?? "")}`
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metrica rotulo="Vendas no período" valor={moeda(faturamento)} nota={`${vendas.length} pedidos · ticket ${moeda(vendas.length ? faturamento / vendas.length : 0)}`} />
        <Metrica rotulo="Unidades em estoque" valor={unidades} nota={`${alertas.length} peças em alerta`} to="/painel/estoque" />
        <Metrica rotulo="Chamados em aberto" valor={abertos.length} nota={`${pend.chamados} sem resposta`} to="/painel/atendimento" />
        <Metrica rotulo="Aprovações pendentes" valor={pend.aprovacoes} nota="ajustes de inventário" to="/painel/estoque/aprovacoes" destaque={pend.aprovacoes > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardTitulo titulo="Vendas por categoria" />
            <ul className="space-y-3 p-5">
              {porCategoria.map(([cat, valor]) => (
                <li key={cat} className="grid grid-cols-[7rem_1fr_6rem] items-center gap-3 text-sm">
                  <span className="text-suave">{cat}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-areia">
                    <span className="block h-full rounded-full bg-marinho" style={{ width: `${(valor / maior) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{moeda(valor)}</span>
                </li>
              ))}
              {porCategoria.length === 0 ? <li className="text-center text-sm text-suave">Sem vendas no período.</li> : null}
            </ul>
          </Card>
          <Card>
            <CardTitulo titulo="Chamados recentes" acao={<Link to="/painel/atendimento" className="text-xs font-semibold text-marinho">Ver fila</Link>} />
            <TabelaChamados lista={[...abertos].sort((a, b) => b.abertoEm.localeCompare(a.abertoEm)).slice(0, 5)} />
          </Card>
        </div>
        <ParaFazer
          itens={[
            { texto: "Ajustes de inventário para aprovar", valor: pend.aprovacoes, to: "/painel/estoque/aprovacoes" },
            { texto: "Transferências e reposições aguardando", valor: pend.transferencias, to: "/painel/estoque/transferencias" },
            { texto: "Chamados sem resposta", valor: pend.chamados, to: "/painel/atendimento" },
            { texto: "Peças esgotadas", valor: alertas.filter((p) => statusProduto(p, lojaIds) === "Esgotado").length, to: "/painel/estoque" },
          ]}
        />
      </div>
    </div>
  );
}

function TabelaChamados({ lista }: { lista: ReturnType<typeof useEstado>["chamados"] }) {
  return (
    <Tabela>
      <thead>
        <tr>
          <th className={th}>Cliente</th>
          <th className={th}>Assunto</th>
          <th className={th}>Prioridade</th>
          <th className={th}>Situação</th>
        </tr>
      </thead>
      <tbody>
        {lista.map((c) => (
          <tr key={c.id}>
            <td className={`${td} font-medium`}>{nomeCliente(c.clienteId)}</td>
            <td className={td}>
              <Link to={`/painel/atendimento/chamado/${c.id}`} className="hover:text-marinho">
                {c.assunto}
              </Link>
            </td>
            <td className={td}>
              <Badge tom={tomPrioridade[prioridadeChamado(c)]}>{prioridadeChamado(c)}</Badge>
            </td>
            <td className={td}>
              <Badge tom={tomChamado[c.status]}>{c.status}</Badge>
            </td>
          </tr>
        ))}
        {lista.length === 0 ? <LinhaVazia colunas={4} texto="Nenhum chamado em aberto." /> : null}
      </tbody>
    </Tabela>
  );
}
