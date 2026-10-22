import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AvisoErro,
  Badge,
  Botao,
  Card,
  Campo,
  Filtros,
  LinhaVazia,
  Segmentado,
  Select,
  Tabela,
  Titulo,
  cn,
  inputClasses,
  linhaClicavel,
  td,
  th,
} from "@/components/ui";
import { useOpcoesChamados } from "@/hooks/useChamados";
import { useAtraso, useListaClientes, useOpcoesClientes } from "@/hooks/useClientes";
import type { SecaoClientes } from "@/lib/clientesApi";
import { NOMES_CATEGORIA_VULTO, POR_PAGINA_CLIENTES, SECOES_CLIENTES, tomCategoriaVulto } from "@/lib/clientesUi";
import { dataBRdoIso, moedaBR } from "@/lib/chamadosUi";
import { podeAprovar, usePapel } from "@/lib/sessao";
import { pontos } from "@/lib/vultoMais";
import { opcoesDeLojas } from "@/lib/lojasAgrupadas";

/**
 * Clientes do atendimento. As seções separam o trabalho de cada atendente: todos os clientes do
 * escopo, os que têm chamado em aberto e os que têm chamado assumido por quem está logado.
 */
export function Clientes() {
  const navigate = useNavigate();
  const gestor = podeAprovar(usePapel());
  const [secao, setSecao] = useState<SecaoClientes>("todos");
  const [busca, setBusca] = useState("");
  const [loja, setLoja] = useState("");
  const [lojaCadastro, setLojaCadastro] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [pagina, setPagina] = useState(0);

  const termo = useAtraso(busca);
  const opcoes = useOpcoesChamados();
  const opcoesClientes = useOpcoesClientes();
  const lista = useListaClientes({
    busca: termo,
    secao,
    idLoja: loja || undefined,
    idLojaCadastro: lojaCadastro || undefined,
    categoria: categoria || undefined,
    marca: marca || undefined,
    limit: POR_PAGINA_CLIENTES,
    offset: pagina * POR_PAGINA_CLIENTES,
  });

  const itens = lista.dados?.itens ?? [];
  const total = lista.dados?.total ?? 0;
  const lojas = opcoes.dados?.lojas ?? [];
  const lojasCadastro = opcoesClientes.dados?.lojas_cadastro ?? [];
  const categorias = opcoesClientes.dados?.categorias ?? [];
  const marcas = opcoesClientes.dados?.marcas ?? [];
  const colunas = gestor ? 9 : 7;

  return (
    <div>
      <Titulo
        titulo="Clientes"
        descricao="Uma ficha por pessoa; você vê os clientes com compras ou chamados no seu escopo de loja."
      />

      <div className="mb-4">
        <Segmentado
          valor={secao}
          onChange={(v) => {
            setSecao(v);
            setPagina(0);
          }}
          opcoes={SECOES_CLIENTES}
        />
      </div>

      <Filtros>
        <Campo label="Buscar" className="flex-1">
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
            maxLength={80}
            placeholder="Nome, e-mail ou telefone"
            className={inputClasses}
          />
        </Campo>
        {lojas.length > 1 ? (
          <Campo label="Loja" className="flex-1">
            <Select
              value={loja}
              onChange={(e) => {
                setLoja(e.target.value);
                setPagina(0);
              }}
              opcoes={opcoesDeLojas(lojas, "Todas")}
            />
          </Campo>
        ) : null}
        {marcas.length > 0 ? (
          <Campo label="Marca do cadastro" className="flex-1">
            <Select
              value={marca}
              onChange={(e) => {
                setMarca(e.target.value);
                setPagina(0);
              }}
              opcoes={[{ value: "", label: "Todas" }, ...marcas.map((m) => ({ value: m.codigo, label: m.nome }))]}
            />
          </Campo>
        ) : null}
        {lojasCadastro.length > 0 ? (
          <Campo label="Loja de cadastro" className="flex-1">
            <Select
              value={lojaCadastro}
              onChange={(e) => {
                setLojaCadastro(e.target.value);
                setPagina(0);
              }}
              opcoes={opcoesDeLojas(lojasCadastro, "Todas")}
            />
          </Campo>
        ) : null}
        {categorias.length > 0 ? (
          <Campo label="Lorenzi+" className="flex-1">
            <Select
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setPagina(0);
              }}
              opcoes={[{ value: "", label: "Todas" }, ...categorias.map((c) => ({ value: c.codigo, label: c.nome }))]}
            />
          </Campo>
        ) : null}
      </Filtros>

      <AvisoErro erro={lista.erro} className="mb-4" />

      <Card>
        <div aria-busy={lista.carregando} className={cn("transition-opacity", lista.carregando && "opacity-60")}>
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Cliente</th>
                <th className={th}>Telefone</th>
                <th className={th}>Cidade</th>
                <th className={th}>Loja de cadastro</th>
                <th className={th}>Lorenzi+</th>
                {gestor ? <th className={th}>Compras</th> : null}
                {gestor ? <th className={th}>Total gasto</th> : null}
                <th className={th}>Chamados</th>
                <th className={th}>Desde</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((c) => (
                <tr key={c.id_cliente} onClick={() => navigate(`/painel/atendimento/clientes/${c.id_cliente}`)} className={linhaClicavel}>
                  <td className={td}>
                    <p className="font-medium">{c.nome}</p>
                    <p className="text-xs text-suave">{c.email ?? "sem e-mail"}</p>
                  </td>
                  <td className={td}>{c.telefone ?? "—"}</td>
                  <td className={td}>{c.cidade ?? "—"}</td>
                  <td className={td}>{c.loja_cadastro ?? "—"}</td>
                  <td className={td}>
                    {c.categoria_vulto_mais ? (
                      <span className="flex flex-col items-start gap-1">
                        <Badge tom={tomCategoriaVulto(c.categoria_vulto_mais)}>
                          {NOMES_CATEGORIA_VULTO[c.categoria_vulto_mais] ?? c.categoria_vulto_mais}
                        </Badge>
                        <span className="text-xs text-suave tabular-nums">{pontos(c.saldo_pontos ?? 0)} pts</span>
                      </span>
                    ) : (
                      <span className="text-suave">—</span>
                    )}
                  </td>
                  {gestor ? <td className={`${td} tabular-nums`}>{c.compras ?? 0}</td> : null}
                  {gestor ? <td className={`${td} tabular-nums`}>{moedaBR(c.total_gasto ?? 0)}</td> : null}
                  <td className={td}>
                    {c.total_chamados}
                    {c.chamados_em_aberto ? <span className="ml-1 text-xs text-perigo">({c.chamados_em_aberto} em aberto)</span> : null}
                  </td>
                  <td className={td}>{dataBRdoIso(c.cliente_desde)}</td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <LinhaVazia colunas={colunas} texto={lista.carregando ? "Carregando os clientes…" : "Nenhum cliente encontrado."} />
              ) : null}
            </tbody>
          </Tabela>
        </div>

        {total > POR_PAGINA_CLIENTES ? (
          <div className="flex items-center justify-between border-t border-linha px-5 py-3 text-sm text-suave">
            <span>
              {pagina * POR_PAGINA_CLIENTES + 1}–{Math.min((pagina + 1) * POR_PAGINA_CLIENTES, total)} de {total}
            </span>
            <div className="flex gap-2">
              <Botao variante="secundario" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>
                Anterior
              </Botao>
              <Botao
                variante="secundario"
                disabled={(pagina + 1) * POR_PAGINA_CLIENTES >= total}
                onClick={() => setPagina(pagina + 1)}
              >
                Próxima
              </Botao>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
