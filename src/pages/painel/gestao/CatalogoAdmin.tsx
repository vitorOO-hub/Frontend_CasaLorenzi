import { useState } from "react";
import {
  AvisoErro,
  Botao,
  Campo,
  Card,
  Filtros,
  LinhaVazia,
  Modal,
  Tabela,
  Titulo,
  inputClasses,
  td,
  th,
} from "@/components/ui";
import { FotoProduto } from "@/components/vitrine";
import { useCatalogo } from "@/hooks/useGestao";
import { useAtraso } from "@/hooks/useEstoquePainel";
import { moeda } from "@/lib/dados";
import { criarPeca, editarPeca, excluirPeca, type PecaDoCatalogo } from "@/lib/gestaoApi";
import { useAcao } from "@/lib/useAcao";

type Form = { sku: string; nome: string; categoria: string; preco: string };
const vazio: Form = { sku: "", nome: "", categoria: "Camisaria", preco: "" };

/** Catálogo da rede vindo do banco: peças, preço e estoque somado das lojas. */
export function CatalogoAdmin() {
  const [busca, setBusca] = useState("");
  const catalogo = useCatalogo(useAtraso(busca.trim()));
  const { executar, ocupado, erro, limparErro } = useAcao();
  const [form, setForm] = useState<Form | null>(null);
  const [editando, setEditando] = useState<PecaDoCatalogo | null>(null);
  const [excluir, setExcluir] = useState<PecaDoCatalogo | null>(null);
  const itens = catalogo.dados?.itens ?? [];
  const alterar = (campo: keyof Form, valor: string) => setForm((f) => (f ? { ...f, [campo]: valor } : f));

  return (
    <div>
      <Titulo
        titulo="Catálogo"
        descricao="Peças e preços vendidos em toda a rede e na loja online."
        acao={
          <Botao
            onClick={() => {
              limparErro();
              setEditando(null);
              setForm({ ...vazio });
            }}
          >
            Nova peça
          </Botao>
        }
      />
      <Filtros>
        <Campo label="Buscar" className="flex-1">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            maxLength={80}
            placeholder="Nome, SKU ou categoria"
            className={inputClasses}
          />
        </Campo>
      </Filtros>
      <AvisoErro erro={catalogo.erro} className="mb-4" />

      <Card>
        <div aria-busy={catalogo.carregando} className={catalogo.carregando && !catalogo.dados ? "opacity-60" : undefined}>
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Peça</th>
                <th className={th}>Categoria</th>
                <th className={th}>Preço</th>
                <th className={th}>Estoque na rede</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {itens.map((p) => (
                <tr key={p.id_produto}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <FotoProduto sku={p.skus[0] ?? p.nome} alt="" className="h-10 w-8 shrink-0" />
                      <div>
                        <p className="font-medium">{p.nome}</p>
                        <p className="font-mono text-[11px] text-suave">
                          {p.skus[0] ?? "—"}
                          {p.variacoes > 1 ? ` · +${p.variacoes - 1} variações` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>{p.categoria ?? "—"}</td>
                  <td className={`${td} tabular-nums`}>{moeda(p.preco)}</td>
                  <td className={`${td} tabular-nums`}>{p.estoque_rede}</td>
                  <td className={`${td} text-right`}>
                    <div className="inline-flex gap-1">
                      <Botao
                        pequeno
                        variante="fantasma"
                        onClick={() => {
                          limparErro();
                          setEditando(p);
                          setForm({ sku: p.skus[0] ?? "", nome: p.nome, categoria: p.categoria ?? "", preco: String(p.preco) });
                        }}
                      >
                        Editar
                      </Botao>
                      <Botao pequeno variante="fantasma" className="hover:text-perigo" onClick={() => { limparErro(); setExcluir(p); }}>
                        Excluir
                      </Botao>
                    </div>
                  </td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <LinhaVazia colunas={5} texto={catalogo.carregando ? "Carregando o catálogo…" : "Nenhuma peça encontrada."} />
              ) : null}
            </tbody>
          </Tabela>
        </div>
      </Card>

      <Modal aberto={!!form} titulo={editando ? "Editar peça" : "Nova peça"} onFechar={() => { limparErro(); setForm(null); }}>
        {form ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const preco = Number(form.preco);
              void executar("salvar", async () => {
                if (editando) await editarPeca(editando.id_produto, { nome: form.nome, categoria: form.categoria, preco });
                else await criarPeca({ sku: form.sku, nome: form.nome, categoria: form.categoria, preco });
                catalogo.recarregar();
              }).then((ok) => ok && setForm(null));
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <Campo label="SKU">
                <input value={form.sku} onChange={(e) => alterar("sku", e.target.value)} readOnly={!!editando} required maxLength={60} placeholder="CL-0916" className={inputClasses} />
              </Campo>
              <Campo label="Preço (R$)">
                <input type="number" min={0} step="0.01" required value={form.preco} onChange={(e) => alterar("preco", e.target.value)} className={inputClasses} />
              </Campo>
            </div>
            <Campo label="Nome">
              <input value={form.nome} onChange={(e) => alterar("nome", e.target.value)} required maxLength={160} className={inputClasses} />
            </Campo>
            <Campo label="Categoria">
              <input value={form.categoria} onChange={(e) => alterar("categoria", e.target.value)} required maxLength={120} className={inputClasses} />
            </Campo>
            {editando && editando.variacoes > 1 ? (
              <p className="text-xs text-suave">O preço vale para todas as {editando.variacoes} variações da peça.</p>
            ) : null}
            <AvisoErro erro={erro} />
            <div className="flex justify-end gap-2 pt-2">
              <Botao variante="secundario" onClick={() => setForm(null)}>
                Cancelar
              </Botao>
              <Botao type="submit" disabled={ocupado !== null}>
                {ocupado ? "Salvando…" : "Salvar"}
              </Botao>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal aberto={!!excluir} titulo="Excluir peça" onFechar={() => { limparErro(); setExcluir(null); }}>
        <p className="text-sm leading-relaxed text-suave">
          A peça <strong className="text-tinta">{excluir?.nome}</strong> sai do catálogo de toda a rede e da loja online. A
          ação fica registrada na auditoria. Peças com estoque ou em pedidos não podem ser excluídas.
        </p>
        <AvisoErro erro={erro} className="mt-4" />
        <div className="mt-6 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setExcluir(null)}>
            Cancelar
          </Botao>
          <Botao
            variante="perigo"
            disabled={ocupado !== null}
            onClick={() => {
              const peca = excluir!;
              void executar("excluir", async () => {
                await excluirPeca(peca.id_produto);
                catalogo.recarregar();
              }).then((ok) => ok && setExcluir(null));
            }}
          >
            {ocupado ? "Excluindo…" : "Excluir"}
          </Botao>
        </div>
      </Modal>
    </div>
  );
}
