import { NavLink, Outlet } from "react-router-dom";
import { ExigeLogin } from "@/components/acesso";
import { cn } from "@/components/ui";
import { useSessao } from "@/lib/sessao";

const abas = [
  { to: "/conta/pedidos", rotulo: "Meus pedidos" },
  { to: "/conta/atendimento", rotulo: "Conversas com a casa" },
  { to: "/conta/perfil", rotulo: "Meus dados" },
];

/** Minha conta: pedidos, conversas e dados reunidos numa só área. */
export function ContaLayout() {
  const sessao = useSessao();
  const primeiroNome = sessao?.nome.split(" ")[0];

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-10 md:px-12">
      <ExigeLogin>
        <h1 className="text-[56px] leading-none md:text-[64px]">
          Olá, {primeiroNome}
          <i className="text-caramelo">.</i>
        </h1>
        <nav className="mt-8 flex gap-7 overflow-x-auto border-b border-dashed border-linha text-[15px]">
          {abas.map((a) => (
            <NavLink
              key={a.to}
              to={a.to}
              className={({ isActive }) =>
                cn(
                  "-mb-px shrink-0 border-b-[1.5px] pb-3",
                  isActive ? "border-dashed border-caramelo text-tinta" : "border-transparent text-suave hover:text-tinta",
                )
              }
            >
              {a.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="pt-10">
          <Outlet />
        </div>
      </ExigeLogin>
    </div>
  );
}
