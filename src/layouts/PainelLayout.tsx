import { LogOut, Store } from "lucide-react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bloqueio } from "@/components/acesso";
import { MenuUsuario } from "@/components/MenuUsuario";
import { Contador, Select, cn } from "@/components/ui";
import { lojas, nomeLoja } from "@/lib/dados";
import { abasDoPapel, podeAcessar, secoesDoPapel, type Secao } from "@/lib/navegacao";
import { usePendencias } from "@/lib/pendencias";
import {
  definirFiltroUnidade,
  equipe,
  rotuloPapel,
  sair,
  useFiltroUnidade,
  useLojaEscopo,
  usePapel,
  useSessao,
  useSessaoPronta,
} from "@/lib/sessao";

export function PainelLayout() {
  const sessao = useSessao();
  const pronta = useSessaoPronta();
  const papel = usePapel();
  const escopo = useLojaEscopo();
  const filtro = useFiltroUnidade();
  const pendencias = usePendencias();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (!pronta) return null;
  if (sessao?.tipo !== "interno") return <Navigate to={`/entrar?voltar=${encodeURIComponent(pathname)}`} replace />;

  // Nome do cadastro (lido com RLS); a loja exibida segue o escopo das telas simuladas.
  const pessoa = { nome: sessao.nome, lojaId: equipe[papel].lojaId };
  const visiveis = secoesDoPapel(papel);
  const contagem = (s: Secao) =>
    abasDoPapel(s, papel).reduce((soma, a) => soma + (a.pendencia ? pendencias[a.pendencia] : 0), 0);

  function encerrar() {
    sair();
    navigate("/", { replace: true });
  }

  const escopoTexto = escopo ? nomeLoja(escopo) : "Todas as unidades";

  return (
    <div className="flex min-h-screen bg-creme">
      {/* Barra lateral: no máximo 4 seções; as subdivisões ficam nas abas de cada seção */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-marinho-escuro px-4 py-8 text-white/90 md:flex">
        <NavLink to="/painel" className="px-3">
          <span className="block font-display text-[28px] font-light leading-none tracking-tight">
            Casa Lorenzi
          </span>
          <span className="filete mt-4" />
          <span className="rotulo mt-3 block !text-white/45">Operações</span>
        </NavLink>

        <nav className="mt-10 flex flex-col gap-1" aria-label="Seções">
          {visiveis.map((s) => (
            <NavLink
              key={s.id}
              to={s.to}
              end={s.to === "/painel"}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-white/10 text-white before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-dourado"
                    : "text-white/55 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <s.icone className="h-4 w-4" strokeWidth={1.5} />
              {s.rotulo}
              <Contador valor={contagem(s)} claro />
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-4 border-t border-white/10 px-3 pt-5">
          <div>
            <p className="text-sm text-white/80">{pessoa.nome}</p>
            <p className="text-xs text-white/40">{rotuloPapel[papel]}</p>
          </div>
          <div className="flex items-center justify-between text-xs">
            <NavLink to="/" className="flex items-center gap-1.5 text-white/45 hover:text-white">
              <Store className="h-3.5 w-3.5" /> Ver loja
            </NavLink>
            <button onClick={encerrar} className="flex items-center gap-1.5 text-white/45 hover:text-white">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-linha bg-papel/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-5 py-3 md:px-8">
            <div className="min-w-0">
              <p className="whitespace-nowrap font-display text-xl leading-none md:hidden">Casa Lorenzi</p>
              <p className="hidden truncate text-sm text-suave md:block">
                {rotuloPapel[papel]} · <span className="text-tinta">{escopoTexto}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* No Início o admin compara unidades pelos filtros do próprio dashboard. */}
              {papel === "admin" && pathname !== "/painel" ? (
                <Select
                  aria-label="Filtrar por unidade"
                  value={filtro}
                  onChange={(e) => definirFiltroUnidade(e.target.value)}
                  className="w-36 sm:w-48"
                  opcoes={[
                    { value: "", label: "Todas as unidades" },
                    ...lojas.map((l) => ({ value: l.id, label: l.nome })),
                  ]}
                />
              ) : null}
              <MenuUsuario
                nome={pessoa.nome}
                detalhe={`${rotuloPapel[papel]}${pessoa.lojaId ? ` · ${nomeLoja(pessoa.lojaId)}` : ""}`}
                email={sessao.email}
                onSair={encerrar}
              />
            </div>
          </div>
          {/* Navegação de seções no celular */}
          <nav className="flex gap-1 overflow-x-auto border-t border-linha px-3 py-2 md:hidden">
            {visiveis.map((s) => (
              <NavLink
                key={s.id}
                to={s.to}
                end={s.to === "/painel"}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm",
                    isActive ? "bg-marinho text-white" : "text-suave",
                  )
                }
              >
                <s.icone className="h-3.5 w-3.5" />
                {s.rotulo}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-5 py-8 md:px-8">
          {podeAcessar(papel, pathname) ? <Outlet /> : <Bloqueio papel={papel} />}
        </main>
      </div>
    </div>
  );
}
