import { useState } from "react";
import { Link } from "react-router-dom";
import { ModalAjuste, ModalMovimento } from "@/components/estoque";
import {
  Badge,
  Botao,
  Campo,
  Card,
  CardTitulo,
  Filtros,
  LinhaVazia,
  Select,
  Tabela,
  Titulo,
  inputClasses,
  sinal,
  td,
  th,
} from "@/components/ui";
import { dataBR, nomeLoja, tomAjuste } from "@/lib/dados";
import { equipe, podeAprovar, useLojaEscopo, useNomeUsuario, usePapel } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

/** Movimentações = registrar entrada/saída + ajuste de inventário + histórico (antes 3 telas). */
export function Movimentacoes() {
  const { produtos, ajustes } = useEstado();
  const papel = usePapel();
  const usuario = useNomeUsuario();
  const escopo = useLojaEscopo();
  const [modal, setModal] = useState<"movimento" | "ajuste" | null>(null);
  const [tipo, setTipo] = useState("");
  const [produto, setProduto] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const somenteMinhas = papel === "operador_estoque";
  const movimentos = produtos
    .flatMap((p) => p.movimentacoes.map((m) => ({ ...m, sku: p.sku, nomeProduto: p.nome })))
    .filter((m) => !escopo || m.lojaId === escopo)
    .filter((m) => !somenteMinhas || m.responsavel === equipe.operador_estoque.nome)
    .filter((m) => !tipo || m.tipo === tipo)
    .filter((m) => !produto || m.sku === produto)
    .filter((m) => (!de || m.data >= de) && (!ate || m.data <= ate))
    .sort((a, b) => b.data.localeCompare(a.data));

  // Quem não aprova acompanha aqui o andamento dos ajustes que pediu.
  const meusAjustes = podeAprovar(papel)
    ? []
    : ajustes.filter((a) => a.solicitante === usuario || (escopo && a.lojaId === escopo));
  const nomeDe = (sku: string) => produtos.find((p) => p.sku === sku)?.nome ?? sku;

  return (
    <div>
      <Titulo
        titulo="Movimentações"
        descricao={
          somenteMinhas
            ? `Entradas, saídas e ajustes que você registrou em ${nomeLoja(escopo ?? "")}.`
            : escopo
              ? `Histórico completo de ${nomeLoja(escopo)}, de todos os operadores.`
              : "Histórico completo da rede."
        }
        acao={
          <>
            <Botao variante="secundario" onClick={() => setModal("ajuste")}>
              Ajuste de inventário
            </Botao>
            <Botao onClick={() => setModal("movimento")}>Registrar entrada / saída</Botao>
          </>
        }
      />

      {meusAjustes.length ? (
        <Card className="mb-6">
          <CardTitulo titulo="Seus pedidos de ajuste" acao={<span className="text-xs text-suave">Aprovação do gerente da unidade</span>} />
          <ul className="divide-y divide-linha text-sm">
            {meusAjustes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span>
                  {dataBR(a.data)} · <strong className="font-medium">{nomeDe(a.sku)}</strong> · {sinal(a.quantidade)} ·{" "}
                  <span className="text-suave">{a.motivo}</span>
                </span>
                <Badge tom={tomAjuste[a.status]}>{a.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Filtros>
        <Campo label="Tipo" className="flex-1">
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            opcoes={["", "Entrada", "Saída", "Ajuste", "Transferência"].map((t) => ({ value: t, label: t || "Todos" }))}
          />
        </Campo>
        <Campo label="Peça" className="flex-[2]">
          <Select
            value={produto}
            onChange={(e) => setProduto(e.target.value)}
            opcoes={[{ value: "", label: "Todas" }, ...produtos.map((p) => ({ value: p.sku, label: p.nome }))]}
          />
        </Campo>
        <Campo label="De" className="flex-1">
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={inputClasses} />
        </Campo>
        <Campo label="Até" className="flex-1">
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={inputClasses} />
        </Campo>
      </Filtros>

      <Card>
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Data</th>
              <th className={th}>Peça</th>
              <th className={th}>Tipo</th>
              <th className={th}>Qtd.</th>
              {!escopo ? <th className={th}>Loja</th> : null}
              <th className={th}>Responsável</th>
              <th className={th}>Observação</th>
            </tr>
          </thead>
          <tbody>
            {movimentos.map((m) => (
              <tr key={`${m.sku}-${m.id}`}>
                <td className={td}>{dataBR(m.data)}</td>
                <td className={td}>
                  <Link to={`/painel/estoque/peca/${m.sku}`} className="font-medium hover:text-marinho">
                    {m.nomeProduto}
                  </Link>
                </td>
                <td className={td}>{m.tipo}</td>
                <td className={`${td} tabular-nums ${m.quantidade < 0 ? "text-perigo" : "text-sucesso"}`}>{sinal(m.quantidade)}</td>
                {!escopo ? <td className={td}>{nomeLoja(m.lojaId)}</td> : null}
                <td className={`${td} text-suave`}>{m.responsavel}</td>
                <td className={`${td} text-suave`}>{m.observacao ?? "—"}</td>
              </tr>
            ))}
            {movimentos.length === 0 ? <LinhaVazia colunas={7} texto="Nenhuma movimentação com esses filtros." /> : null}
          </tbody>
        </Tabela>
      </Card>

      {modal === "movimento" ? <ModalMovimento aberto onFechar={() => setModal(null)} /> : null}
      {modal === "ajuste" ? <ModalAjuste aberto onFechar={() => setModal(null)} /> : null}
    </div>
  );
}
