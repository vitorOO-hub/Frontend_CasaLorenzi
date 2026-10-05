import { Headset, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { MenuUsuario } from "@/components/MenuUsuario";
import { cn } from "@/components/ui";
import { lojas } from "@/lib/dados";
import { sair, useSessao } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

export const categoriasMenu = [
  { rotulo: "Coleção", to: "/loja" },
  { rotulo: "Alfaiataria", to: "/loja?categoria=Alfaiataria" },
  { rotulo: "Camisaria", to: "/loja?categoria=Camisaria" },
  { rotulo: "Malharia", to: "/loja?categoria=Malharia" },
  { rotulo: "Outerwear", to: "/loja?categoria=Outerwear" },
  { rotulo: "Acessórios", to: "/loja?categoria=Acessórios" },
];

export function Marca({ claro = false, className }: { claro?: boolean; className?: string }) {
  return (
    <span className={cn("block text-center leading-none", className)}>
      <span
        className={cn(
          "block font-display text-[26px] font-normal uppercase tracking-[0.28em] md:text-[30px]",
          claro ? "text-white" : "text-marinho",
        )}
      >
        Casa Lorenzi
      </span>
      <span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-[0.42em] text-dourado">
        Alfaiataria · 1962
      </span>
    </span>
  );
}

export function PortalLayout() {
  const sessao = useSessao();
  const { carrinho } = useEstado();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const itensSacola = carrinho.reduce((s, i) => s + i.quantidade, 0);
  const cliente = sessao?.tipo === "cliente" ? sessao : null;

  useEffect(() => {
    setMenuAberto(false);
    setBuscaAberta(false);
  }, [pathname, search]);

  function buscar(e: FormEvent) {
    e.preventDefault();
    navigate(`/loja?busca=${encodeURIComponent(termo.trim())}`);
    setTermo("");
  }

  const categoriaAtiva = (to: string) => `${pathname}${search}` === to;

  return (
    <div className="flex min-h-screen flex-col bg-creme">
      <div className="bg-marinho-escuro px-4 py-2 text-center text-[11px] tracking-[0.12em] text-white/80">
        Frete grátis acima de R$ 1.000 <span className="mx-2 text-dourado">·</span> Ajustes de
        alfaiataria sem custo <span className="mx-2 hidden text-dourado sm:inline">·</span>
        <span className="hidden sm:inline">Até 10x sem juros</span>
      </div>

      <header className="sticky top-0 z-40 border-b border-linha bg-papel/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 md:px-8 md:py-5">
          <div className="flex items-center gap-3">
            <button
              className="text-tinta lg:hidden"
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button
              className="text-tinta hover:text-marinho"
              onClick={() => setBuscaAberta((v) => !v)}
              aria-label="Buscar"
            >
              <Search className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          <Link to="/" aria-label="Casa Lorenzi — início">
            <Marca />
          </Link>

          <div className="flex items-center justify-end gap-4">
            <Link
              to="/conta/atendimento"
              className="hidden text-tinta hover:text-marinho sm:block"
              aria-label="Atendimento"
              title="Atendimento"
            >
              <Headset className="h-5 w-5" strokeWidth={1.5} />
            </Link>
            {cliente ? (
              <MenuUsuario
                compacto
                nome={cliente.nome}
                detalhe="Cliente Casa Lorenzi"
                email={cliente.email}
                onSair={() => {
                  sair();
                  navigate("/");
                }}
                itens={
                  <div className="py-1">
                    {[
                      ["/conta/pedidos", "Meus pedidos"],
                      ["/conta/atendimento", "Atendimento"],
                      ["/conta/perfil", "Meus dados"],
                    ].map(([to, rotulo]) => (
                      <Link
                        key={to}
                        to={to!}
                        className="block px-4 py-2 text-sm hover:bg-areia/60 hover:text-marinho"
                      >
                        {rotulo}
                      </Link>
                    ))}
                  </div>
                }
              />
            ) : (
              <Link to="/entrar" className="text-tinta hover:text-marinho" aria-label="Entrar">
                <UserRound className="h-5 w-5" strokeWidth={1.5} />
              </Link>
            )}
            <Link to="/sacola" className="relative text-tinta hover:text-marinho" aria-label="Sacola">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              {itensSacola ? (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-dourado px-1 text-[9px] font-bold text-white">
                  {itensSacola}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <nav className="hidden justify-center gap-9 pb-4 lg:flex" aria-label="Categorias">
          {categoriasMenu.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className={cn(
                "border-b pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors",
                categoriaAtiva(c.to)
                  ? "border-dourado text-marinho"
                  : "border-transparent text-tinta/75 hover:text-marinho",
              )}
            >
              {c.rotulo}
            </Link>
          ))}
        </nav>

        {buscaAberta ? (
          <form onSubmit={buscar} className="border-t border-linha bg-papel px-4 py-4">
            <div className="mx-auto flex max-w-2xl items-center gap-3 border-b border-marinho pb-2">
              <Search className="h-4 w-4 text-suave" />
              <input
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="O que você procura? Ex.: blazer, linho, mocassim"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-suave"
              />
              <button type="submit" className="rotulo !text-marinho">
                Buscar
              </button>
            </div>
          </form>
        ) : null}
      </header>

      {/* Menu lateral no celular */}
      {menuAberto ? (
        <div className="fixed inset-0 z-50 bg-marinho-escuro/50 lg:hidden" onClick={() => setMenuAberto(false)}>
          <div
            className="h-full w-80 max-w-[85%] bg-papel p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <Marca className="!text-left" />
              <button onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col">
              {categoriasMenu.map((c) => (
                <Link
                  key={c.to}
                  to={c.to}
                  className="border-b border-linha py-3.5 text-sm uppercase tracking-[0.16em]"
                >
                  {c.rotulo}
                </Link>
              ))}
            </nav>
            <div className="mt-8 space-y-3 text-sm text-suave">
              <Link to={cliente ? "/conta/pedidos" : "/entrar"} className="block">
                {cliente ? "Minha conta" : "Entrar"}
              </Link>
              <Link to="/conta/atendimento" className="block">
                Atendimento
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <main className="flex-1">
        <Outlet />
      </main>

      <Rodape />
    </div>
  );
}

function Rodape() {
  const [inscrito, setInscrito] = useState(false);
  return (
    <footer className="mt-24 bg-marinho-escuro text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:px-8">
        <div>
          <Marca claro className="!text-left" />
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/55">
            Alfaiataria, camisaria e malharia em pequenas séries. Desde 1962, o bom corte não tem
            estação.
          </p>
          <form
            className="mt-6 flex max-w-xs border-b border-white/25"
            onSubmit={(e) => {
              e.preventDefault();
              setInscrito(true);
            }}
          >
            {inscrito ? (
              <p className="py-2 text-sm text-dourado">Obrigado! Você receberá nossas novidades.</p>
            ) : (
              <>
                <input
                  type="email"
                  required
                  placeholder="Seu e-mail para novidades"
                  className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/35"
                />
                <button type="submit" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dourado">
                  Assinar
                </button>
              </>
            )}
          </form>
        </div>

        <div>
          <p className="rotulo !text-dourado">Coleção</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {categoriasMenu.map((c) => (
              <li key={c.to}>
                <Link to={c.to} className="hover:text-white">
                  {c.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="rotulo !text-dourado">Atendimento</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            <li>
              <Link to="/conta/atendimento" className="hover:text-white">
                Fale conosco
              </Link>
            </li>
            <li>
              <Link to="/conta/pedidos" className="hover:text-white">
                Meus pedidos
              </Link>
            </li>
            <li>WhatsApp (11) 99876-5432</li>
            <li>Seg. a sáb., 10h às 22h</li>
          </ul>
        </div>

        <div>
          <p className="rotulo !text-dourado">Nossas casas</p>
          <ul className="mt-5 space-y-4 text-sm">
            {lojas.map((l) => (
              <li key={l.id}>
                <span className="block text-white/90">{l.nome}</span>
                <span className="block text-xs text-white/45">
                  {l.endereco} · {l.cidade}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-white/40 md:px-8">
          <p>© 2026 Casa Lorenzi. Protótipo navegável — pagamentos simulados.</p>
          <NavLink to="/entrar?time=1" className="uppercase tracking-[0.2em] hover:text-white/80">
            Área interna
          </NavLink>
        </div>
      </div>
    </footer>
  );
}
