import { useState } from "react";
import {
  Botao,
  Campo,
  Card,
  Filtros,
  Modal,
  Tabela,
  Titulo,
  inputClasses,
  td,
  th,
} from "@/components/ui";
import { FotoProduto } from "@/components/vitrine";
import { moeda, totalProduto } from "@/lib/dados";
import { useNomeUsuario } from "@/lib/sessao";
import { criarProduto, editarProduto, excluirProduto, useEstado } from "@/lib/store";

type Form = { sku: string; nome: string; categoria: string; preco: string };
const vazio: Form = { sku: "", nome: "", categoria: "Camisaria", preco: "" };

export function CatalogoAdmin() {
  const { produtos } = useEstado();
  const autor = useNomeUsuario();
  const [form, setForm] = useState<Form | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const lista = produtos.filter((p) => !busca || `${p.nome} ${p.sku} ${p.categoria}`.toLowerCase().includes(busca.toLowerCase()));
  const alterar = (campo: keyof Form, valor: string) => setForm((f) => (f ? { ...f, [campo]: valor } : f));

  return (
    <div>
      <Titulo
        titulo="Catálogo"
        descricao="Peças e preços vendidos em toda a rede e na loja online."
        acao={
          <Botao
            onClick={() => {
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
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, SKU ou categoria" className={inputClasses} />
        </Campo>
      </Filtros>

      <Card>
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
            {lista.map((p) => (
              <tr key={p.sku}>
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
                <td className={`${td} tabular-nums`}>{moeda(p.preco)}</td>
                <td className={`${td} tabular-nums`}>{totalProduto(p)}</td>
                <td className={`${td} text-right`}>
                  <div className="inline-flex gap-1">
                    <Botao
                      pequeno
                      variante="fantasma"
                      onClick={() => {
                        setEditando(p.sku);
                        setForm({ sku: p.sku, nome: p.nome, categoria: p.categoria, preco: String(p.preco) });
                      }}
                    >
                      Editar
                    </Botao>
                    <Botao pequeno variante="fantasma" className="hover:text-perigo" onClick={() => setExcluir(p.sku)}>
                      Excluir
                    </Botao>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Card>

      <Modal aberto={!!form} titulo={editando ? "Editar peça" : "Nova peça"} onFechar={() => setForm(null)}>
        {form ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const preco = Number(form.preco) || 0;
              if (editando) editarProduto(editando, { nome: form.nome, categoria: form.categoria, preco }, autor);
              else criarProduto({ sku: form.sku.trim().toUpperCase(), nome: form.nome, categoria: form.categoria, preco, autor });
              setForm(null);
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <Campo label="SKU">
                <input value={form.sku} onChange={(e) => alterar("sku", e.target.value)} readOnly={!!editando} required placeholder="CL-0916" className={inputClasses} />
              </Campo>
              <Campo label="Preço (R$)">
                <input type="number" min={0} required value={form.preco} onChange={(e) => alterar("preco", e.target.value)} className={inputClasses} />
              </Campo>
            </div>
            <Campo label="Nome">
              <input value={form.nome} onChange={(e) => alterar("nome", e.target.value)} required className={inputClasses} />
            </Campo>
            <Campo label="Categoria">
              <input value={form.categoria} onChange={(e) => alterar("categoria", e.target.value)} required className={inputClasses} />
            </Campo>
            <div className="flex justify-end gap-2 pt-2">
              <Botao variante="secundario" onClick={() => setForm(null)}>
                Cancelar
              </Botao>
              <Botao type="submit">Salvar</Botao>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal aberto={!!excluir} titulo="Excluir peça" onFechar={() => setExcluir(null)}>
        <p className="text-sm leading-relaxed text-suave">
          A peça <strong className="text-tinta">{excluir}</strong> sai do catálogo de toda a rede e da
          loja online. A ação fica registrada na auditoria.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setExcluir(null)}>
            Cancelar
          </Botao>
          <Botao
            variante="perigo"
            onClick={() => {
              if (excluir) excluirProduto(excluir, autor);
              setExcluir(null);
            }}
          >
            Excluir
          </Botao>
        </div>
      </Modal>
    </div>
  );
}
