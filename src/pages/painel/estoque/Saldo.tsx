import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Campo,
  Card,
  Filtros,
  LinhaVazia,
  Metrica,
  Select,
  Tabela,
  Titulo,
  cn,
  inputClasses,
  linhaClicavel,
  td,
  th,
} from "@/components/ui";
import { FotoProduto } from "@/components/vitrine";
import { moeda, statusProduto, tomEstoque, totalProduto } from "@/lib/dados";
import { useLojasVisiveis } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

export function Saldo() {
  const { produtos } = useEstado();
  const lojas = useLojasVisiveis();
  const lojaIds = lojas.map((l) => l.id);
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");

  const categorias = useMemo(() => Array.from(new Set(produtos.map((p) => p.categoria))).sort(), [produtos]);
  const filtrados = produtos.filter(
    (p) =>
      (!busca || `${p.nome} ${p.sku}`.toLowerCase().includes(busca.toLowerCase())) &&
      (!categoria || p.categoria === categoria) &&
      (!status || statusProduto(p, lojaIds) === status),
  );

  const contar = (s: string) => produtos.filter((p) => statusProduto(p, lojaIds) === s).length;
  const unidades = produtos.reduce((s, p) => s + totalProduto(p, lojaIds), 0);

  return (
    <div>
      <Titulo
        titulo="Saldo de estoque"
        descricao={
          lojas.length === 1
            ? `Peças disponíveis em ${lojas[0]!.nome}. Clique numa peça para ver detalhes.`
            : "Saldo por unidade da rede. Clique numa peça para ver detalhes."
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metrica rotulo="Unidades em estoque" valor={unidades} nota={`${produtos.length} peças no catálogo`} />
        <Metrica rotulo="Estoque baixo" valor={contar("Estoque baixo")} nota="no mínimo ou abaixo" />
        <Metrica rotulo="Esgotadas" valor={contar("Esgotado")} nota="sem nenhuma unidade" destaque={contar("Esgotado") > 0} />
        <Metrica
          rotulo="Valor em estoque"
          valor={moeda(produtos.reduce((s, p) => s + p.preco * totalProduto(p, lojaIds), 0))}
          nota="a preço de venda"
        />
      </div>

      <Filtros>
        <Campo className="flex-1" label="Buscar">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou SKU" className={inputClasses} />
        </Campo>
        <Campo className="flex-1" label="Categoria">
          <Select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            opcoes={[{ value: "", label: "Todas" }, ...categorias.map((c) => ({ value: c, label: c }))]}
          />
        </Campo>
        <Campo className="flex-1" label="Situação">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            opcoes={[
              { value: "", label: "Todas" },
              { value: "OK", label: "OK" },
              { value: "Estoque baixo", label: "Estoque baixo" },
              { value: "Esgotado", label: "Esgotado" },
            ]}
          />
        </Campo>
      </Filtros>

      <Card>
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Peça</th>
              <th className={th}>Categoria</th>
              <th className={th}>Preço</th>
              {lojas.length > 1 ? lojas.map((l) => <th key={l.id} className={cn(th, "text-right")}>{l.nome}</th>) : null}
              <th className={cn(th, "text-right")}>{lojas.length > 1 ? "Total" : "Saldo"}</th>
              <th className={th}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => {
              const st = statusProduto(p, lojaIds);
              return (
                <tr key={p.sku} onClick={() => navigate(`/painel/estoque/peca/${p.sku}`)} className={linhaClicavel}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <FotoProduto sku={p.sku} alt="" className="h-10 w-8 shrink-0" />
                      <div>
                        <p className="font-medium">{p.nome}</p>
                        <p className="font-mono text-[11px] text-suave">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>{p.categoria}</td>
                  <td className={td}>{moeda(p.preco)}</td>
                  {lojas.length > 1
                    ? lojas.map((l) => {
                        const s = p.saldos.find((x) => x.lojaId === l.id);
                        const baixo = s && s.quantidade <= s.minimo;
                        return (
                          <td key={l.id} className={cn(td, "text-right tabular-nums", baixo && "font-semibold text-alerta", s?.quantidade === 0 && "font-semibold text-perigo")}>
                            {s?.quantidade ?? 0}
                          </td>
                        );
                      })
                    : null}
                  <td className={cn(td, "text-right font-semibold tabular-nums")}>{totalProduto(p, lojaIds)}</td>
                  <td className={td}>
                    <Badge tom={tomEstoque[st]}>{st}</Badge>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 ? <LinhaVazia colunas={5 + lojas.length} texto="Nenhuma peça com esses filtros." /> : null}
          </tbody>
        </Tabela>
      </Card>
    </div>
  );
}
