import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Botao, Card, CardTitulo, LinhaVazia, Tabela, Titulo, sinal, td, th } from "@/components/ui";
import { dataBR, nomeLoja, tomAjuste } from "@/lib/dados";
import { useLojaEscopo, useNomeUsuario } from "@/lib/sessao";
import { aprovarAjuste, recusarAjuste, useEstado } from "@/lib/store";

/** Ajustes de inventário aguardando a decisão do gerente ou do administrador. */
export function Aprovacoes() {
  const { produtos, ajustes } = useEstado();
  const escopo = useLojaEscopo();
  const usuario = useNomeUsuario();
  const doEscopo = ajustes.filter((a) => !escopo || a.lojaId === escopo);
  const pendentes = doEscopo.filter((a) => a.status === "Pendente");
  const decididos = doEscopo.filter((a) => a.status !== "Pendente");
  const produtoDe = (sku: string) => produtos.find((p) => p.sku === sku);

  return (
    <div>
      <Titulo
        titulo="Aprovações"
        descricao="Ajustes de inventário só alteram o saldo depois da sua decisão."
      />

      {pendentes.length === 0 ? (
        <Card className="mb-8 p-10 text-center">
          <Check className="mx-auto h-6 w-6 text-sucesso" />
          <p className="mt-3 text-sm text-suave">Nenhum ajuste aguardando aprovação.</p>
        </Card>
      ) : (
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {pendentes.map((a) => {
            const p = produtoDe(a.sku);
            const atual = p?.saldos.find((s) => s.lojaId === a.lojaId)?.quantidade ?? 0;
            return (
              <Card key={a.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/painel/estoque/peca/${a.sku}`} className="font-display text-xl hover:text-marinho">
                      {p?.nome ?? a.sku}
                    </Link>
                    <p className="text-xs text-suave">
                      {nomeLoja(a.lojaId)} · pedido por {a.solicitante} em {dataBR(a.data)}
                    </p>
                  </div>
                  <span className={`font-display text-3xl ${a.quantidade < 0 ? "text-perigo" : "text-sucesso"}`}>
                    {sinal(a.quantidade)}
                  </span>
                </div>
                <p className="mt-4 rounded-sm bg-areia/60 px-3 py-2 text-sm">“{a.motivo}”</p>
                <p className="mt-3 text-xs text-suave">
                  Saldo atual {atual} → depois do ajuste {Math.max(0, atual + a.quantidade)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Botao pequeno onClick={() => aprovarAjuste(a.id, usuario)}>
                    <Check className="h-3.5 w-3.5" /> Aprovar
                  </Botao>
                  <Botao pequeno variante="perigo" onClick={() => recusarAjuste(a.id, usuario)}>
                    <X className="h-3.5 w-3.5" /> Recusar
                  </Botao>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardTitulo titulo="Decisões anteriores" />
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Data</th>
              <th className={th}>Peça</th>
              <th className={th}>Loja</th>
              <th className={th}>Qtd.</th>
              <th className={th}>Motivo</th>
              <th className={th}>Solicitante</th>
              <th className={th}>Decisão</th>
            </tr>
          </thead>
          <tbody>
            {decididos.map((a) => (
              <tr key={a.id}>
                <td className={td}>{dataBR(a.data)}</td>
                <td className={`${td} font-medium`}>{produtoDe(a.sku)?.nome ?? a.sku}</td>
                <td className={td}>{nomeLoja(a.lojaId)}</td>
                <td className={`${td} tabular-nums`}>{sinal(a.quantidade)}</td>
                <td className={`${td} max-w-64 text-suave`}>{a.motivo}</td>
                <td className={`${td} text-suave`}>{a.solicitante}</td>
                <td className={td}>
                  <Badge tom={tomAjuste[a.status]}>{a.status}</Badge>
                  {a.decididoPor ? <span className="mt-1 block text-xs text-suave">por {a.decididoPor}</span> : null}
                </td>
              </tr>
            ))}
            {decididos.length === 0 ? <LinhaVazia colunas={7} texto="Nenhuma decisão registrada ainda." /> : null}
          </tbody>
        </Tabela>
      </Card>
    </div>
  );
}
