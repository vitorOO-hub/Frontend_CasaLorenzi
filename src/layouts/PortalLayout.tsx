import { Menu, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
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
  const { carrinho } = useEstado();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // Menus guardam a rota em que foram abertos: ao navegar, fecham sozinhos.
  const rota = `${pathname}${search}`;
  const [menuEm, setMenuEm] = useState<string | null>(null);
  const [buscaEm, setBuscaEm] = useState<string | null>(null);
  const [termo, setTermo] = useState("");
  const menuAberto = menuEm === rota;
  const buscaAberta = buscaEm === rota;
  const itensSacola = carrinho.reduce((s, i) => s + i.quantidade, 0);
  const cliente = sessao?.tipo === "cliente" ? sessao : null;

  function buscar(e: FormEvent) {
    e.preventDefault();
    navigate(`/loja?busca=${encodeURIComponent(termo.trim())}`);
    setTermo("");
  }

  return (
    <div className="loja flex min-h-screen flex-col">
      <div className="flex justify-between border-b border-dashed border-linha px-5 py-2.5 text-xs text-suave md:px-12">
        <span>
          <b className="font-medium text-tinta">
            Edição {EDICAO.numero} · {EDICAO.nome}
          </b>{" "}
          — {EDICAO.temporada}
        </span>
        <span className="hidden sm:inline">Ibirapuera · Barra · Savassi · e aqui</span>
      </div>

      <header className="flex items-end justify-between gap-6 px-5 pb-5 pt-6 md:px-12">
        <div className="flex items-end gap-4">
          <button className="mb-1 lg:hidden" onClick={() => setMenuEm(rota)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <Link to="/" aria-label="Casa Lorenzi — início">
            <Marca />
          </Link>
        </div>

        <nav className="flex items-center gap-5 text-sm lg:gap-8" aria-label="Principal">
          {menu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                cn(
                  "hidden border-b-[1.5px] pb-0.5 lg:inline",
                  isActive ? "border-dashed border-caramelo" : "border-transparent hover:border-dashed hover:border-caramelo",
                )
              }
            >
              {m.rotulo}
            </NavLink>
          ))}
          <button onClick={() => setBuscaEm(buscaAberta ? null : rota)} aria-label="Buscar" className="hover:text-caramelo">
            <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
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
                <div className="py-1">
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
            <Link to="/entrar" className="hidden hover:text-caramelo sm:inline">
              Entrar
            </Link>
          )}
          <Link to="/sacola" className="whitespace-nowrap hover:text-caramelo">
            Sacola ({itensSacola})
          </Link>
          <Link
            to="/agendar"
            className="hidden border border-tinta px-4 py-2 transition-colors hover:bg-tinta hover:text-creme md:inline-block"
          >
            Agendar uma prova
          </Link>
        </nav>
      </header>

      {buscaAberta ? (
        <form onSubmit={buscar} className="border-y border-dashed border-linha px-5 py-4 md:px-12">
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

      {menuAberto ? (
        <div className="fixed inset-0 z-50 bg-tinta/40 lg:hidden" onClick={() => setMenuEm(null)}>
          <div className="loja h-full w-80 max-w-[85%] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-10 flex items-start justify-between">
              <Marca />
              <button onClick={() => setMenuEm(null)} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col">
              {[
                ...menu,
                { rotulo: "Agendar uma prova", to: "/agendar" },
                { rotulo: cliente ? "Minha conta" : "Entrar", to: cliente ? "/conta/pedidos" : "/entrar" },
              ].map((m) => (
                <Link key={m.to} to={m.to} className="alinhavo py-4 font-display text-2xl">
                  {m.rotulo}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

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
          <p className="font-mao text-2xl text-caramelo">Anotado. A primeira carta chega no começo do mês.</p>
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
