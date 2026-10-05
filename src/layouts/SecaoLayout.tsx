import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Contador, cn } from "@/components/ui";
import { abaDoCaminho, abasDoPapel, secaoDoCaminho } from "@/lib/navegacao";
import { usePendencias } from "@/lib/pendencias";
import { usePapel } from "@/lib/sessao";

/** Cabeçalho de abas comum às seções Estoque, Atendimento e Gestão. */
export function SecaoLayout() {
  const { pathname } = useLocation();
  const papel = usePapel();
  const pendencias = usePendencias();
  const secao = secaoDoCaminho(pathname);
  const abas = secao ? abasDoPapel(secao, papel) : [];
  const ativa = secao && abaDoCaminho(secao, pathname);

  return (
    <div>
      {secao && abas.length > 1 ? (
        <div className="-mt-2 mb-8 border-b border-linha">
          <p className="rotulo mb-2">{secao.rotulo}</p>
          <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label={`Abas de ${secao.rotulo}`}>
            {abas.map((a) => (
              <NavLink
                key={a.to}
                to={a.to}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm transition-colors",
                  ativa?.to === a.to
                    ? "border-dourado font-semibold text-marinho"
                    : "border-transparent text-suave hover:text-tinta",
                )}
              >
                {a.rotulo}
                {a.pendencia ? <Contador valor={pendencias[a.pendencia]} /> : null}
              </NavLink>
            ))}
          </nav>
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}
