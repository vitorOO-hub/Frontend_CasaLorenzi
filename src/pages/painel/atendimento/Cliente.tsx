import { Link, useParams } from "react-router-dom";
import { AvisoErro, Badge, Card, CardTitulo, LinhaVazia, Metrica, Tabela, Voltar, td, th } from "@/components/ui";
import { SinalMais } from "@/components/marca";
import { useFichaCliente, useVultoMaisDaFicha } from "@/hooks/useClientes";
import { ehUuid, type VultoMaisDaFicha } from "@/lib/clientesApi";
import { tomStatusPedido } from "@/lib/clientesUi";
import { dataBRdoIso, moedaBR, tomStatus } from "@/lib/chamadosUi";
import { pontos as fmtPontos, rotuloTipo } from "@/lib/vultoMais";

/** Ficha do cliente: contato, chamados do escopo e, só para gerente e admin, compras e valores. */
export function Cliente() {
  const { id } = useParams();
  const { dados: ficha, erro } = useFichaCliente(id);
  const { dados: vultoMais, erro: erroVultoMais } = useVultoMaisDaFicha(id);

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

        <CartaoVultoMais dados={vultoMais} erro={erroVultoMais} />

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
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tom={tomStatus(c.status.codigo)}>{c.status.nome}</Badge>
                      {/* Importado do histórico da Vulto: fica fora da fila até chegar mensagem nova. */}
                      {c.historico_vulto ? <Badge>Histórico Vulto</Badge> : null}
                    </span>
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

/** Vulto+ na ficha: saldo, categoria, extrato e resgates. Valor dos resgates só para gestão. */
function CartaoVultoMais({ dados, erro }: { dados: VultoMaisDaFicha | null; erro: string | null }) {
  if (erro) {
    return (
      <Card>
        <CardTitulo titulo="Vulto+" />
        <AvisoErro erro={erro} className="m-5" />
      </Card>
    );
  }
  if (!dados) {
    return (
      <Card>
        <CardTitulo titulo="Vulto+" />
        <p className="px-5 py-8 text-sm text-suave">Carregando os pontos…</p>
      </Card>
    );
  }
  const vemValor = dados.resgates.some((r) => r.desconto !== null);
  return (
    <Card>
      <CardTitulo
        titulo="Vulto+"
        acao={
          <span className="flex items-center gap-1 text-xs text-suave">
            programa de pontos
            <SinalMais className="text-[13px]" />
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-4 px-5 py-4 lg:grid-cols-3">
        <Metrica rotulo="Saldo" valor={`${fmtPontos(dados.saldo)} pts`} />
        <Metrica
          rotulo="Categoria"
          valor={dados.categoria}
          nota={
            dados.proxima_categoria && dados.faltam_para_proxima
              ? `faltam ${fmtPontos(dados.faltam_para_proxima)} para ${dados.proxima_categoria}`
              : "categoria mais alta"
          }
        />
        <Metrica rotulo="Loja de cadastro" valor={dados.loja_cadastro ?? "—"} />
      </div>
      <Tabela>
        <thead>
          <tr>
            <th className={th}>Data</th>
            <th className={th}>Movimento</th>
            <th className={th}>Pontos</th>
          </tr>
        </thead>
        <tbody>
          {dados.extrato.map((m, i) => (
            <tr key={`${m.ocorrido_em}-${i}`}>
              <td className={td}>{dataBRdoIso(m.ocorrido_em)}</td>
              <td className={td}>
                {rotuloTipo(m.tipo)}
                <span className="block text-[11px] text-suave">{m.descricao}</span>
              </td>
              <td className={`${td} tabular-nums ${m.pontos < 0 ? "text-perigo" : ""}`}>
                {m.pontos > 0 ? "+" : ""}
                {fmtPontos(m.pontos)}
              </td>
            </tr>
          ))}
          {dados.extrato.length === 0 ? <LinhaVazia colunas={3} texto="Sem movimentações de pontos." /> : null}
        </tbody>
      </Tabela>
      {dados.resgates.length ? (
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Resgate</th>
              <th className={th}>Pontos</th>
              {vemValor ? <th className={th}>Desconto</th> : null}
              <th className={th}>Loja · atendente</th>
            </tr>
          </thead>
          <tbody>
            {dados.resgates.map((r, i) => (
              <tr key={`${r.resgatado_em}-${i}`}>
                <td className={td}>{dataBRdoIso(r.resgatado_em)}</td>
                <td className={`${td} tabular-nums`}>{fmtPontos(r.pontos)}</td>
                {vemValor ? <td className={`${td} tabular-nums`}>{r.desconto === null ? "—" : moedaBR(r.desconto)}</td> : null}
                <td className={td}>{[r.loja_nome, r.atendente].filter(Boolean).join(" · ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      ) : null}
    </Card>
  );
}
