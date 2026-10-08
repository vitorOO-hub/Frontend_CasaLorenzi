import { AvisoErro, Badge, Botao, Card, Select, Tabela, Titulo, td, th } from "@/components/ui";
import { useEquipe } from "@/hooks/useEquipe";
import { mudarUsuario, type Cargo, type MudancaDeUsuario, type UsuarioDaEquipe } from "@/lib/gestaoApi";
import { useAcao } from "@/lib/useAcao";

/** Time interno vindo do banco: cargo, unidade e acesso de cada pessoa (só o admin chega aqui). */
export function Usuarios() {
  const equipe = useEquipe();
  const { executar, ocupado, erro, limparErro } = useAcao();
  const opcoes = equipe.dados?.opcoes;
  const itens = equipe.dados?.itens ?? [];

  const alterar = (u: UsuarioDaEquipe, mudanca: MudancaDeUsuario) =>
    void executar(u.id_usuario, async () => {
      await mudarUsuario(u.id_usuario, mudanca);
      equipe.recarregar();
    });

  return (
    <div>
      <Titulo
        titulo="Usuários"
        descricao="Time interno, cargo e unidade de cada pessoa. Mudanças de cargo valem quando a pessoa entrar de novo."
      />
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
                    <Select
                      aria-label={`Cargo de ${u.nome}`}
                      value={u.cargo}
                      onChange={(e) => {
                        const cargo = e.target.value as Cargo;
                        // Cargo de unidade sempre leva uma loja; sem uma, entra a primeira da lista.
                        const idLoja = cargo === "admin" ? undefined : (u.id_loja ?? opcoes?.lojas[0]?.id_loja);
                        alterar(u, { cargo, idLoja });
                      }}
                      disabled={ocupado === u.id_usuario || !opcoes}
                      className="w-48"
                      opcoes={(opcoes?.cargos ?? []).map((c) => ({ value: c.codigo, label: c.nome }))}
                    />
                  </td>
                  <td className={td}>
                    {u.cargo === "admin" ? (
                      <span className="text-sm text-suave">Rede inteira</span>
                    ) : (
                      <Select
                        aria-label={`Unidade de ${u.nome}`}
                        value={u.id_loja ?? ""}
                        onChange={(e) => alterar(u, { idLoja: e.target.value })}
                        disabled={ocupado === u.id_usuario || !opcoes}
                        className="w-48"
                        opcoes={(opcoes?.lojas ?? []).map((l) => ({ value: l.id_loja, label: l.nome }))}
                      />
                    )}
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <Badge tom={u.ativo ? "ok" : "neutro"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                      {!u.com_acesso ? <span className="text-xs text-suave">Ainda sem login</span> : null}
                      <Botao
                        pequeno
                        variante="fantasma"
                        disabled={ocupado === u.id_usuario}
                        onClick={() => alterar(u, { ativo: !u.ativo })}
                      >
                        {u.ativo ? "Desativar" : "Reativar"}
                      </Botao>
                    </div>
                  </td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-suave">
                    {equipe.carregando ? "Carregando o time…" : "Nenhuma pessoa no time."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </Tabela>
        </div>
      </Card>
    </div>
  );
}
