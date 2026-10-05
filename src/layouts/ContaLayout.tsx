import { NavLink, Outlet } from "react-router-dom";
import { ExigeLogin } from "@/components/acesso";
import { cn } from "@/components/ui";
import { useSessao } from "@/lib/sessao";

const abas = [
  { to: "/conta/pedidos", rotulo: "Meus pedidos" },
  { to: "/conta/atendimento", rotulo: "Atendimento" },
  { to: "/conta/perfil", rotulo: "Meus dados" },
];

/** Minha conta: pedidos, atendimento e dados reunidos numa só área. */
export function ContaLayout() {
  const sessao = useSessao();
  const primeiroNome = sessao?.nome.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 md:px-8">
      <ExigeLogin>
        <div className="mb-10 text-center">
          <p className="rotulo !text-dourado">Minha conta</p>
          <h1 className="mt-2 text-4xl font-light md:text-5xl">Olá, {primeiroNome}</h1>
        </div>
        <div className="grid gap-10 md:grid-cols-[13rem_1fr]">
          <nav className="flex gap-6 overflow-x-auto border-b border-linha md:flex-col md:gap-0 md:border-b-0 md:border-r md:pr-6">
            {abas.map((a) => (
              <NavLink
                key={a.to}
                to={a.to}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 border-b-2 py-3 text-sm transition-colors md:border-b-0 md:border-l-2 md:py-2.5 md:pl-4",
                    isActive
                      ? "border-dourado font-semibold text-marinho"
                      : "border-transparent text-suave hover:text-tinta",
                  )
                }
              >
                {a.rotulo}
              </NavLink>
            ))}
          </nav>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </ExigeLogin>
    </div>
  );
}
