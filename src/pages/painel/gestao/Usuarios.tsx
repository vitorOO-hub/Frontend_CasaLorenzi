import { useState } from "react";
import { AvisoErro, Badge, Botao, Campo, Card, Modal, Select, Tabela, Titulo, inputClasses, td, th } from "@/components/ui";
import * as acoes from "@/lib/acoes";
import { lojas, nomeLoja, rotuloPapelUsuario, type PapelUsuario, type Usuario } from "@/lib/dados";
import { useEstado } from "@/lib/store";
import { useAcao } from "@/lib/useAcao";

const papeis = Object.keys(rotuloPapelUsuario) as PapelUsuario[];
const opcoesPapel = papeis.map((p) => ({ value: p, label: rotuloPapelUsuario[p] }));
// Só o admin enxerga a rede inteira; os outros cargos sempre têm uma unidade.
const opcoesLoja = () => lojas.map((l) => ({ value: l.id, label: l.nome }));

export function Usuarios() {
  const { usuarios } = useEstado();
  const { executar, ocupado, erro, limparErro } = useAcao();
  const alterar = (u: Usuario, dados: Partial<Pick<Usuario, "papel" | "lojaId" | "ativo">>) =>
    void executar(u.id, () => acoes.alterarUsuario(u.id, dados));
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", papel: "operador_estoque" as PapelUsuario, lojaId: lojas[0]!.id });

  return (
    <div>
      <Titulo
        titulo="Usuários"
        descricao="Time interno, cargo e unidade de cada pessoa. Mudanças de cargo valem quando a pessoa entrar de novo."
        acao={<Botao onClick={() => { limparErro(); setNovo(true); }}>Cadastrar usuário</Botao>}
      />
      <AvisoErro erro={novo ? null : erro} onFechar={limparErro} className="mb-6" />

      <Card>
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Pessoa</th>
              <th className={th}>Cargo</th>
              <th className={th}>Unidade</th>
              <th className={th}>Acesso</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className={u.ativo ? "" : "opacity-50"}>
                <td className={td}>
                  <p className="font-medium">{u.nome}</p>
                  <p className="text-xs text-suave">{u.email}</p>
                </td>
                <td className={td}>
                  <Select
                    aria-label={`Cargo de ${u.nome}`}
                    value={u.papel}
                    onChange={(e) => {
                      const papel = e.target.value as PapelUsuario;
                      alterar(u, { papel, lojaId: papel === "admin" ? null : (u.lojaId ?? lojas[0]!.id) });
                    }}
                    disabled={ocupado === u.id}
                    className="w-48"
                    opcoes={opcoesPapel}
                  />
                </td>
                <td className={td}>
                  {u.papel === "admin" ? (
                    <span className="text-sm text-suave">Rede inteira</span>
                  ) : (
                    <Select
                      aria-label={`Unidade de ${u.nome}`}
                      value={u.lojaId ?? ""}
                      onChange={(e) => alterar(u, { lojaId: e.target.value })}
                      disabled={ocupado === u.id}
                      className="w-48"
                      opcoes={opcoesLoja()}
                    />
                  )}
                </td>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <Badge tom={u.ativo ? "ok" : "neutro"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                    <Botao pequeno variante="fantasma" disabled={ocupado === u.id} onClick={() => alterar(u, { ativo: !u.ativo })}>
                      {u.ativo ? "Desativar" : "Reativar"}
                    </Botao>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Card>

      <Modal aberto={novo} titulo="Cadastrar usuário" onFechar={() => setNovo(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void executar("novo", () => acoes.criarUsuario({ ...form, lojaId: form.papel === "admin" ? null : form.lojaId })).then((ok) => {
              if (!ok) return;
              setForm({ ...form, nome: "", email: "" });
              setNovo(false);
            });
          }}
        >
          <Campo label="Nome">
            <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputClasses} />
          </Campo>
          <Campo label="E-mail corporativo">
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@casalorenzi.com.br" className={inputClasses} />
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Cargo">
              <Select value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value as PapelUsuario })} opcoes={opcoesPapel} />
            </Campo>
            {form.papel !== "admin" ? (
              <Campo label="Unidade">
                <Select value={form.lojaId} onChange={(e) => setForm({ ...form, lojaId: e.target.value })} opcoes={lojas.map((l) => ({ value: l.id, label: nomeLoja(l.id) }))} />
              </Campo>
            ) : null}
          </div>
          <AvisoErro erro={erro} />
          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="secundario" onClick={() => setNovo(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={ocupado !== null}>
              {ocupado ? "Cadastrando…" : "Cadastrar"}
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
