import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  AvisoErro,
  Badge,
  Botao,
  Campo,
  Card,
  Modal,
  Select,
  Tabela,
  Titulo,
  inputClasses,
  td,
  th,
} from "@/components/ui";
import { useEquipe } from "@/hooks/useEquipe";
import { usePapel, useSessao } from "@/lib/sessao";
import { criarUsuario, mudarUsuario, ROTULO_CARGO, type Cargo, type MudancaDeUsuario, type UsuarioDaEquipe } from "@/lib/gestaoApi";
import { useAcao } from "@/lib/useAcao";
import { opcoesDeLojas } from "@/lib/lojasAgrupadas";

type Formulario = { nome: string; email: string; cargo: Cargo; idLoja: string };

/** Equipe: o gerente enxerga sua unidade; o administrador enxerga e administra a rede. */
export function Usuarios() {
  const equipe = useEquipe();
  const papel = usePapel();
  const sessao = useSessao();
  const admin = papel === "admin";
  const { executar, ocupado, erro, limparErro } = useAcao();
  const opcoes = equipe.dados?.opcoes;
  const itens = equipe.dados?.itens ?? [];
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const alterar = (u: UsuarioDaEquipe, mudanca: MudancaDeUsuario) =>
    void executar(u.id_usuario, async () => {
      await mudarUsuario(u.id_usuario, mudanca);
      equipe.recarregar();
    });

  function abrirFormulario() {
    limparErro();
    setErroFormulario(null);
    setSucesso(null);
    setFormulario({ nome: "", email: "", cargo: "atendente", idLoja: opcoes?.lojas[0]?.id_loja ?? "" });
  }

  function convidar(ev: FormEvent) {
    ev.preventDefault();
    if (!formulario) return;
    if (admin && formulario.cargo !== "admin" && !formulario.idLoja) {
      setErroFormulario("Selecione a unidade do funcionário.");
      return;
    }
    setErroFormulario(null);
    let emailConvidado = formulario.email.trim().toLowerCase();
    void executar("novo-funcionario", async () => {
      const criado = await criarUsuario({
        nome: formulario.nome.trim(),
        email: emailConvidado,
        cargo: formulario.cargo,
        id_loja: admin ? (formulario.cargo === "admin" ? null : formulario.idLoja || null) : null,
      });
      emailConvidado = criado.email;
      equipe.recarregar();
    }).then((ok) => {
      if (!ok) return;
      setFormulario(null);
      setSucesso(`Convite enviado para ${emailConvidado}.`);
    });
  }

  return (
    <div>
      <Titulo
        titulo="Equipe"
        descricao={admin ? "Pessoas, cargos e unidades da rede." : "Pessoas e acessos da sua unidade."}
        acao={
          <Botao onClick={abrirFormulario} disabled={!opcoes?.cargos.length}>
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            Convidar funcionário
          </Botao>
        }
      />
      {sucesso ? (
        <p role="status" className="mb-4 border border-sucesso/30 bg-sucesso/10 px-4 py-3 text-sm text-tinta">
          {sucesso} A pessoa receberá um link para definir a senha.
        </p>
      ) : null}
      <AvisoErro erro={erro ?? equipe.erro} onFechar={erro ? limparErro : undefined} className="mb-6" />

      <Card>
        <div aria-busy={equipe.carregando} className={equipe.carregando && !equipe.dados ? "opacity-60" : undefined}>
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
              {itens.map((u) => (
                <tr key={u.id_usuario} className={u.ativo ? "" : "opacity-50"}>
                  <td className={td}>
                    <p className="font-medium">{u.nome}</p>
                    <p className="text-xs text-suave">{u.email}</p>
                  </td>
                  <td className={td}>
                    {admin ? (
                      <Select
                        aria-label={`Cargo de ${u.nome}`}
                        value={u.cargo}
                        onChange={(e) => {
                          const cargo = e.target.value as Cargo;
                          const idLoja = cargo === "admin" ? undefined : (u.id_loja ?? opcoes?.lojas[0]?.id_loja);
                          alterar(u, { cargo, idLoja });
                        }}
                        disabled={ocupado === u.id_usuario || !opcoes}
                        className="w-48"
                        opcoes={(opcoes?.cargos ?? []).map((c) => ({ value: c.codigo, label: c.nome }))}
                      />
                    ) : (
                      <span className="text-sm">{ROTULO_CARGO[u.cargo as Cargo] ?? u.cargo}</span>
                    )}
                  </td>
                  <td className={td}>
                    {u.cargo === "admin" ? (
                      <span className="text-sm text-suave">Rede inteira</span>
                    ) : !admin ? (
                      <span className="text-sm">{u.loja_nome ?? "—"}</span>
                    ) : (
                      <Select
                        aria-label={`Unidade de ${u.nome}`}
                        value={u.id_loja ?? ""}
                        onChange={(e) => alterar(u, { idLoja: e.target.value })}
                        disabled={ocupado === u.id_usuario || !opcoes || !admin}
                        className="w-48"
                        opcoes={opcoesDeLojas(opcoes?.lojas ?? [])}
                      />
                    )}
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <Badge tom={u.ativo ? "ok" : "neutro"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                      {!u.com_acesso ? <span className="text-xs text-suave">Ainda sem login</span> : null}
                      {admin ? (
                        <Botao
                          pequeno
                          variante="fantasma"
                          disabled={ocupado === u.id_usuario}
                          onClick={() => alterar(u, { ativo: !u.ativo })}
                        >
                          {u.ativo ? "Desativar" : "Reativar"}
                        </Botao>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-suave">
                    {equipe.carregando ? "Carregando a equipe…" : "Nenhuma pessoa nesta equipe."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </Tabela>
        </div>
      </Card>

      <Modal aberto={formulario !== null} titulo="Convidar funcionário" onFechar={() => setFormulario(null)}>
        {formulario ? (
          <form className="space-y-4" onSubmit={convidar}>
            <Campo label="Nome">
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={160}
                value={formulario.nome}
                onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                className={inputClasses}
              />
            </Campo>
            <Campo label="E-mail" ajuda="O convite será enviado para este endereço.">
              <input
                type="email"
                autoComplete="email"
                required
                value={formulario.email}
                onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
                className={inputClasses}
              />
            </Campo>
            <Campo label="Cargo">
              <Select
                aria-label="Cargo do funcionário"
                value={formulario.cargo}
                onChange={(e) => setFormulario({ ...formulario, cargo: e.target.value as Cargo })}
                opcoes={(opcoes?.cargos ?? []).map((c) => ({ value: c.codigo, label: ROTULO_CARGO[c.codigo as Cargo] ?? c.nome }))}
              />
            </Campo>
            {admin && formulario.cargo !== "admin" ? (
              <Campo label="Unidade">
                <Select
                  aria-label="Unidade do funcionário"
                  value={formulario.idLoja}
                  onChange={(e) => {
                    setErroFormulario(null);
                    setFormulario({ ...formulario, idLoja: e.target.value });
                  }}
                  opcoes={opcoesDeLojas(opcoes?.lojas ?? [], "Selecione uma unidade")}
                />
              </Campo>
            ) : admin ? (
              <p className="text-xs leading-relaxed text-suave">Administradores acessam a rede inteira e não têm uma unidade vinculada.</p>
            ) : (
              <p className="text-xs leading-relaxed text-suave">
                O funcionário ficará vinculado à sua unidade{sessao?.tipo === "interno" && sessao.lojaNome ? ` (${sessao.lojaNome})` : ""}.
              </p>
            )}
            {erroFormulario ? <p role="alert" className="text-sm text-perigo">{erroFormulario}</p> : null}
            <AvisoErro erro={erro} />
            <div className="flex justify-end gap-2 pt-2">
              <Botao variante="secundario" onClick={() => setFormulario(null)}>Cancelar</Botao>
              <Botao type="submit" disabled={ocupado !== null}>
                {ocupado === "novo-funcionario" ? "Enviando convite…" : "Enviar convite"}
              </Botao>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
