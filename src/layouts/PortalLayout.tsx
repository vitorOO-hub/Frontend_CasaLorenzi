import { Menu, Plus, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/components/ui";
import { CAMPANHA, EDICAO, unsplash } from "@/lib/loja";
import { sair, useSessao } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

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

type SecaoMenu = { id: string; rotulo: string; to: string; itens: [string, string][]; destaque: { foto: string; legenda: string; to: string } };

export function PortalLayout() {
  const sessao = useSessao();
  const { carrinho, produtos } = useEstado();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // Menus guardam a rota em que foram abertos: ao navegar, fecham sozinhos.
  const rota = `${pathname}${search}`;
  const [menuEm, setMenuEm] = useState<string | null>(null);
  const [buscaEm, setBuscaEm] = useState<string | null>(null);
  const [painel, setPainel] = useState<{ id: string; rota: string } | null>(null);
  const [termo, setTermo] = useState("");
  const [rolou, setRolou] = useState(false);
  const menuAberto = menuEm === rota;
  const buscaAberta = buscaEm === rota;
  const painelAberto = painel?.rota === rota ? painel.id : null;
  const itensSacola = carrinho.reduce((s, i) => s + i.quantidade, 0);
  const cliente = sessao?.tipo === "cliente" ? sessao : null;
  const home = pathname === "/";
  // Na home o cabeçalho fica transparente sobre a abertura até a página rolar.
  const transparente = home && !rolou && !buscaAberta && !painelAberto;

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
  const secoesMenu: SecaoMenu[] = [
    {
      id: "destaques",
      rotulo: "Destaques",
      to: "/loja",
      itens: [[`Edição ${EDICAO.numero} · ${EDICAO.nome}`, "/loja"], ["Novidades", "/loja"], ["Casacos da estação", "/loja?categoria=Outerwear"], ["Últimas peças", "/loja?ordem=maior"]],
      destaque: { foto: unsplash(CAMPANHA.edicaoGrande, 700), legenda: `Edição ${EDICAO.numero} · ${EDICAO.nome}`, to: "/loja" },
    },
    {
      id: "pronta",
      rotulo: "Pronta-entrega",
      to: "/loja",
      itens: [["Ver tudo", "/loja"], ...categorias.map((c): [string, string] => [c, `/loja?categoria=${c}`])],
      destaque: { foto: unsplash(CAMPANHA.prontaEntrega, 700), legenda: "Casacos da estação", to: "/loja?categoria=Outerwear" },
    },
    {
      id: "casa",
      rotulo: "A casa",
      to: "/caderno",
      itens: [["Caderno do Ateliê", "/caderno"], ["As três casas", "/casas"], ["1962: a primeira tesoura", "/caderno/1962"]],
      destaque: { foto: unsplash(CAMPANHA.prova1, 700), legenda: "Caderno do Ateliê", to: "/caderno" },
    },
  ];

  const secaoDaRota = secoesMenu.find((m) => m.itens.some(([, to]) => to.split("?")[0] === pathname && pathname !== "/loja"))?.id ?? (pathname === "/loja" ? "pronta" : null);
  const secaoPainel = secoesMenu.find((m) => m.id === painelAberto);
  // Quem entra pela loja volta para a página onde estava, já logado (ver destinoAposLogin).
  const contaLink = cliente ? "/conta/pedidos" : `/entrar?voltar=${encodeURIComponent(rota)}`;
  const abrir = (id: string) => setPainel({ id, rota });

  return (
    <div className="loja min-h-screen">
      <div
        className={cn(
          "inset-x-0 top-0 z-40 transition-colors duration-300 [font-family:var(--font-menu)]",
          home ? "fixed" : "sticky",
          transparente ? "bg-transparent text-white" : "border-b border-linha bg-creme text-tinta",
        )}
        onMouseLeave={() => setPainel(null)}
        onKeyDown={(e) => e.key === "Escape" && setPainel(null)}
      >
        <header className="mx-auto flex h-16 max-w-[1600px] items-center gap-8 px-4 md:px-8 xl:gap-12">
          <button onClick={() => setMenuEm(rota)} className="hover:opacity-70 lg:hidden" aria-label="Abrir menu">
            <Menu className="h-5 w-5" strokeWidth={1.4} />
          </button>
          <Link to="/" aria-label="Casa Lorenzi — início" onMouseEnter={() => setPainel(null)} className="whitespace-nowrap font-display text-[24px] leading-none">
            Casa Lorenzi
          </Link>

          <nav className="hidden h-full items-stretch gap-7 lg:flex" aria-label="Principal">
            {secoesMenu.map((m) => {
              const marcada = painelAberto ? painelAberto === m.id : secaoDaRota === m.id;
              return (
                <Link
                  key={m.id}
                  to={m.to}
                  onMouseEnter={() => abrir(m.id)}
                  onFocus={() => abrir(m.id)}
                  aria-expanded={painelAberto === m.id}
                  className={cn(
                    "flex items-center border-b-2 pt-0.5 text-[13px] font-medium uppercase tracking-[0.12em]",
                    marcada ? "border-current" : "border-transparent hover:border-current",
                  )}
                >
                  {m.rotulo}
                </Link>
              );
            })}
          </nav>

          <nav className="ml-auto flex items-center gap-5 text-[12px] font-medium uppercase tracking-[0.12em]" aria-label="Atalhos" onMouseEnter={() => setPainel(null)}>
            <button onClick={() => setBuscaEm(buscaAberta ? null : rota)} aria-label="Buscar" className="flex items-center gap-2 uppercase hover:opacity-70">
              <Search className="h-[17px] w-[17px]" strokeWidth={1.5} />
              <span className="hidden md:inline">Buscar</span>
            </button>
            <Link to={contaLink} className="hidden hover:opacity-70 md:inline">
              {cliente ? cliente.nome.split(" ")[0] : "Entrar"}
            </Link>
            <Link to="/sacola" className="flex items-center gap-1.5 hover:opacity-70" aria-label={`Sacola com ${itensSacola} peças`}>
              <ShoppingBag className="h-[17px] w-[17px] md:hidden" strokeWidth={1.5} />
              <span className="hidden md:inline">Sacola</span> ({itensSacola})
            </Link>
            {cliente ? (
              <button
                onClick={() => {
                  sair();
                  navigate("/");
                }}
                className="hidden uppercase hover:opacity-70 xl:inline"
              >
                Sair
              </button>
            ) : null}
          </nav>
        </header>

        {/* Painel do menu: abre ao passar o mouse, ocupa a largura toda */}
        {secaoPainel ? (
          <div className="absolute inset-x-0 top-full hidden border-y border-linha bg-creme text-tinta lg:block">
            <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_300px] gap-12 px-8 py-10">
              <div>
                <p className="mb-5 text-[11px] uppercase tracking-[0.16em] text-suave">{secaoPainel.rotulo}</p>
                <ul className="grid max-w-3xl grid-flow-col grid-rows-5 gap-x-12 gap-y-2.5">
                  {secaoPainel.itens.map(([rotulo, to]) => (
                    <li key={rotulo}>
                      <Link to={to} className={cn("text-[15px] [font-family:var(--font-sans)] hover:text-terracota", rota === to && "text-terracota")}>
                        {rotulo}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-[11px] uppercase tracking-[0.16em] text-suave">Frete por nossa conta acima de R$ 1.000</p>
              </div>
              <Link to={secaoPainel.destaque.to} className="group block">
                <span className="foto-grao block aspect-[4/3]">
                  <img src={secaoPainel.destaque.foto} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                </span>
                <span className="mt-2.5 block text-[12px] uppercase tracking-[0.14em]">{secaoPainel.destaque.legenda}</span>
              </Link>
            </div>
          </div>
        ) : null}

        {buscaAberta ? (
          <form onSubmit={buscar} className="border-t border-linha bg-creme px-4 py-4 text-tinta md:px-8">
            <div className="mx-auto flex max-w-[1600px] items-center gap-3 border-b border-tinta pb-2">
              <Search className="h-4 w-4 text-suave" />
              <input
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Peça, tecido ou cor"
                className="flex-1 bg-transparent text-sm outline-none [font-family:var(--font-sans)] placeholder:text-suave"
              />
              <button type="submit" className="text-[12px] font-medium uppercase tracking-[0.12em]">
                Buscar
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {/* Celular e tablet: o mesmo menu em gaveta lateral */}
      <div
        className={cn("fixed inset-0 z-50 bg-tinta/30 transition-opacity duration-300 lg:hidden", menuAberto ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setMenuEm(null)}
        aria-hidden={!menuAberto}
      >
        <aside
          className={cn(
            "loja flex h-full w-[340px] max-w-[88%] flex-col overflow-y-auto px-7 pb-8 pt-5 transition-transform duration-500 ease-out [font-family:var(--font-menu)]",
            menuAberto ? "translate-x-0" : "-translate-x-full",
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label="Menu"
        >
          <button onClick={() => setMenuEm(null)} aria-label="Fechar menu" className="mb-6 self-end hover:text-terracota">
            <X className="h-5 w-5" strokeWidth={1.3} />
          </button>
          <NavegacaoVertical secoes={secoesMenu} inicial={secaoDaRota} pathname={pathname} search={search} />
          <div className="mt-auto flex flex-col gap-1 pt-10 text-[13px] uppercase tracking-[0.14em]">
            <Link to={contaLink} className="py-1.5 hover:text-terracota">
              {cliente ? `Conta · ${cliente.nome.split(" ")[0]}` : "Entrar"}
            </Link>
          </div>
        </aside>
      </div>

      <main>
        <Outlet />
      </main>

      <CartaMensal />
      <Rodape />
    </div>
  );
}

/** Navegação em coluna (gaveta do celular): cada seção abre logo abaixo, em acordeão. */
function NavegacaoVertical({ secoes, inicial, pathname, search }: { secoes: SecaoMenu[]; inicial: string | null; pathname: string; search: string }) {
  const [aberta, setAberta] = useState<string | null>(inicial);
  const atual = `${pathname}${search}`;
  return (
    <nav className="flex flex-col" aria-label="Principal">
      {secoes.map((m) => {
        const ativa = aberta === m.id;
        return (
          <div key={m.id}>
            <button
              onClick={() => setAberta(ativa ? null : m.id)}
              aria-expanded={ativa}
              className={cn("flex w-full items-center justify-between py-2.5 text-left text-[14px] uppercase tracking-[0.14em] hover:text-terracota", ativa && "text-terracota")}
            >
              {m.rotulo}
              <Plus className={cn("h-3.5 w-3.5 transition-transform duration-300", ativa && "rotate-45")} strokeWidth={1.4} />
            </button>
            <div className={cn("grid transition-[grid-template-rows] duration-400 ease-out", ativa ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <ul className="overflow-hidden border-l border-dashed border-linha pl-4">
                {m.itens.map(([rotulo, to], i) => (
                  <li key={rotulo} className={cn(i === 0 && "pt-1", i === m.itens.length - 1 && "pb-3")}>
                    <Link
                      to={to}
                      tabIndex={ativa ? 0 : -1}
                      className={cn("block py-1.5 text-[12.5px] uppercase tracking-[0.12em] text-suave hover:text-tinta", atual === to && "text-tinta")}
                    >
                      {rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
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
