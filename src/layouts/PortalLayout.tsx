import { Menu, Search, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { MenuUsuario } from "@/components/MenuUsuario";
import { cn } from "@/components/ui";
import { EDICAO } from "@/lib/loja";
import { sair, useSessao } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

const menu = [
  { rotulo: "Pronta-entrega", to: "/loja" },
  { rotulo: "Sob medida", to: "/sob-medida" },
  { rotulo: "Caderno do Ateliê", to: "/caderno" },
  { rotulo: "As casas", to: "/casas" },
];

/** Marca empilhada, alinhada à esquerda. */
export function Marca({ claro = false, grande = false, className }: { claro?: boolean; grande?: boolean; className?: string }) {
  return (
    <span className={cn("block font-display leading-[0.9]", claro ? "text-creme" : "text-marinho", className)}>
      <span className={cn("block", grande ? "text-[60px] md:text-[88px]" : "text-[34px]")}>
        Casa
        <br />
        Lorenzi
      </span>
      {grande ? null : (
        <small className={cn("mt-2 block font-sans text-[11px] tracking-wide", claro ? "text-creme/60" : "text-suave")}>
          Alfaiates desde 1962
        </small>
      )}
    </span>
  );
}

export function PortalLayout() {
  const sessao = useSessao();
  const { carrinho, produtos } = useEstado();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // Menus guardam a rota em que foram abertos: ao navegar, fecham sozinhos.
  const rota = `${pathname}${search}`;
  const [menuEm, setMenuEm] = useState<string | null>(null);
  const [buscaEm, setBuscaEm] = useState<string | null>(null);
  const [termo, setTermo] = useState("");
  const [rolou, setRolou] = useState(false);
  const menuAberto = menuEm === rota;
  const buscaAberta = buscaEm === rota;
  const itensSacola = carrinho.reduce((s, i) => s + i.quantidade, 0);
  const cliente = sessao?.tipo === "cliente" ? sessao : null;
  const home = pathname === "/";
  // Na home o cabeçalho fica transparente sobre o vídeo até a página rolar.
  const transparente = home && !rolou && !buscaAberta;

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 60);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  function buscar(e: FormEvent) {
    e.preventDefault();
    navigate(`/loja?busca=${encodeURIComponent(termo.trim())}`);
    setTermo("");
  }

  const categorias = Array.from(new Set(produtos.map((p) => p.categoria))).sort();

  return (
    <div className="loja flex min-h-screen flex-col">
      <div
        className={cn(
          "inset-x-0 top-0 z-40 transition-colors duration-500",
          home ? "fixed" : "sticky",
          transparente ? "bg-transparent text-white" : "bg-creme text-tinta shadow-[0_1px_0_#ddd2c0]",
        )}
      >
        <div className={cn("flex justify-center px-5 py-2 text-xs md:px-12", transparente ? "text-white/80" : "border-b border-dashed border-linha text-suave")}>
          <span>
            <b className={cn("font-medium", transparente ? "text-white" : "text-tinta")}>
              Edição {EDICAO.numero} · {EDICAO.nome}
            </b>{" "}
            — frete por nossa conta acima de R$ 1.000 · ajustes sempre sem custo
          </span>
        </div>

        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-4 md:px-12">
          <button onClick={() => setMenuEm(rota)} className="flex items-center gap-3 justify-self-start text-sm hover:opacity-70" aria-label="Abrir menu">
            <Menu className="h-5 w-5" strokeWidth={1.4} />
            <span className="hidden md:inline">Menu</span>
          </button>

          <Link to="/" aria-label="Casa Lorenzi — início" className="text-center font-display text-[28px] leading-none md:text-[34px]">
            Casa Lorenzi
          </Link>

          <nav className="flex items-center gap-5 justify-self-end text-sm md:gap-7" aria-label="Atalhos">
            <button onClick={() => setBuscaEm(buscaAberta ? null : rota)} aria-label="Buscar" className="hover:opacity-70">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </button>
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
                  <div className="py-1 text-tinta">
                    {[
                      ["/conta/pedidos", "Meus pedidos"],
                      ["/conta/atendimento", "Conversas com a casa"],
                      ["/conta/perfil", "Meus dados"],
                    ].map(([to, rotulo]) => (
                      <Link key={to} to={to!} className="block px-4 py-2 text-sm hover:bg-palha/60">
                        {rotulo}
                      </Link>
                    ))}
                  </div>
                }
              />
            ) : (
              <Link to="/entrar" className="hidden hover:opacity-70 sm:inline">
                Entrar
              </Link>
            )}
            <Link to="/sacola" className="whitespace-nowrap hover:opacity-70">
              Sacola ({itensSacola})
            </Link>
          </nav>
        </header>

        {buscaAberta ? (
          <form onSubmit={buscar} className="border-t border-dashed border-linha px-5 py-4 md:px-12">
            <div className="mx-auto flex max-w-2xl items-center gap-3 border-b border-tinta pb-2">
              <Search className="h-4 w-4 text-suave" />
              <input
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Peça, tecido ou cor — “linho”, “merino”, “Areia de Ipanema”"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-suave"
              />
              <button type="submit" className="link-tracejado text-sm">
                Buscar
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {/* Menu vertical: abre na lateral, por cima da página */}
      <div
        className={cn("fixed inset-0 z-50 bg-tinta/40 transition-opacity duration-300", menuAberto ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setMenuEm(null)}
        aria-hidden={!menuAberto}
      >
        <aside
          className={cn(
            "loja flex h-full w-[420px] max-w-[88%] flex-col overflow-y-auto px-8 pb-8 pt-6 transition-transform duration-500 ease-out",
            menuAberto ? "translate-x-0" : "-translate-x-full",
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label="Menu"
        >
          <div className="mb-10 flex items-center justify-between">
            <Marca />
            <button onClick={() => setMenuEm(null)} aria-label="Fechar menu" className="self-start">
              <X className="h-5 w-5" strokeWidth={1.4} />
            </button>
          </div>

          <nav className="flex flex-col" aria-label="Principal">
            <Link to="/loja" className="py-2 font-display text-[34px] leading-tight hover:text-caramelo">
              Edição {EDICAO.numero} · {EDICAO.nome}
            </Link>
            <div className="mb-4 ml-0.5 mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[15px] text-suave">
              {categorias.map((c) => (
                <Link key={c} to={`/loja?categoria=${c}`} className="hover:text-tinta">
                  {c}
                </Link>
              ))}
            </div>
            {menu.slice(1).map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) => cn("alinhavo py-3 font-display text-[30px] leading-tight hover:text-caramelo", isActive && "text-caramelo")}
              >
                {m.rotulo}
              </NavLink>
            ))}
            <Link to="/agendar" className="alinhavo py-3 font-display text-[30px] leading-tight hover:text-caramelo">
              Agendar uma prova
            </Link>
          </nav>

          <div className="mt-auto space-y-2 pt-10 text-sm text-suave">
            <Link to={cliente ? "/conta/pedidos" : "/entrar"} className="block hover:text-tinta">
              {cliente ? `Minha conta · ${cliente.nome.split(" ")[0]}` : "Entrar na minha conta"}
            </Link>
            <Link to="/conta/atendimento" className="block hover:text-tinta">
              Fale com a casa · WhatsApp (11) 99876-5432
            </Link>
            <Link to="/entrar?time=1" className="block text-xs text-suave/70 hover:text-tinta">
              Área interna
            </Link>
          </div>
        </aside>
      </div>

      <main className="flex-1">
        <Outlet />
      </main>

      <CartaMensal />
      <Rodape />
    </div>
  );
}

function CartaMensal() {
  const [inscrito, setInscrito] = useState(false);
  return (
    <div className="mt-28 border-y border-dashed border-linha py-14">
      <div className="mx-auto grid max-w-[1360px] items-center gap-10 px-5 md:grid-cols-2 md:px-12">
        <p className="font-display text-[30px] leading-tight md:text-[34px]">
          Uma carta por mês, escrita no ateliê.
          <span className="block text-[20px] text-suave md:text-[22px]">
            Novas edições, convites para provas e nenhuma promoção-relâmpago.
          </span>
        </p>
        {inscrito ? (
          <p className="font-mao text-[14px] leading-relaxed text-caramelo">Anotado. A primeira carta chega no começo do mês.</p>
        ) : (
          <form
            className="flex border-b-[1.5px] border-tinta"
            onSubmit={(e) => {
              e.preventDefault();
              setInscrito(true);
            }}
          >
            <input type="email" required placeholder="Seu e-mail" className="flex-1 bg-transparent py-3.5 outline-none" />
            <button type="submit" className="text-sm font-medium text-caramelo">
              Quero receber
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Rodape() {
  const colunas: [string, [string, string][]][] = [
    [
      "Comprar",
      [
        ["Edição 64 · Garoa", "/loja"],
        ["Pronta-entrega", "/loja"],
        ["Sob medida", "/sob-medida"],
        ["Agendar uma prova", "/agendar"],
      ],
    ],
    [
      "Ajuda",
      [
        ["Meus pedidos", "/conta/pedidos"],
        ["Trocas e ajustes", "/conta/atendimento"],
        ["Fale com a casa", "/conta/atendimento/novo"],
        ["WhatsApp (11) 99876-5432", "/conta/atendimento"],
      ],
    ],
    [
      "A casa",
      [
        ["Caderno do Ateliê", "/caderno"],
        ["As três casas", "/casas"],
        ["1962: a primeira tesoura", "/caderno/1962"],
        ["Área interna", "/entrar?time=1"],
      ],
    ],
  ];
  return (
    <footer className="px-5 pb-10 pt-20 md:px-12">
      <div className="mx-auto grid max-w-[1360px] gap-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <Link to="/" className="sm:col-span-2 md:col-span-1">
          <Marca grande />
        </Link>
        {colunas.map(([titulo, links]) => (
          <div key={titulo}>
            <h5 className="mb-3 text-[13px] font-medium text-caramelo">{titulo}</h5>
            <ul className="space-y-2 text-[15px]">
              {links.map(([rotulo, to]) => (
                <li key={rotulo}>
                  <Link to={to} className="hover:text-caramelo">
                    {rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-14 max-w-[1360px] border-t border-dashed border-linha pt-5 text-center text-xs text-suave">
        © 2026 Casa Lorenzi · Protótipo — fotos do Unsplash com tratamento de cor; nomes, histórias e eventos são ilustrativos.
      </p>
    </footer>
  );
}
