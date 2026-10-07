import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Campo, inputClasses } from "@/components/ui";
import { FotoCampanha } from "@/components/vitrine";
import { Marca } from "@/layouts/PortalLayout";
import { CAMPANHA } from "@/lib/loja";
import { destinoAposLogin } from "@/lib/destino";
import { entrar } from "@/lib/sessao";

export function Entrar() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const voltar = params.get("voltar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const r = await entrar(email, senha);
      // Cliente ou equipe: o tipo de conta vem do token e decide para onde ir.
      if (r.ok) return navigate(destinoAposLogin(r.sessao, voltar), { replace: true });
      setSenha("");
      if (r.motivo === "credenciais") return setErro("E-mail ou senha inválidos.");
      setErro(r.detalhe ?? "Não foi possível entrar agora. Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="loja grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <FotoCampanha id={CAMPANHA.sobMedida} largura={1400} className="absolute inset-0" />
        <div className="absolute inset-0 bg-tinta/55" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/" className="self-start">
            <Marca claro className="!text-left" />
          </Link>
          <div className="max-w-md">
            <p className="font-display text-4xl leading-tight">
              Seus pedidos, ajustes e conversas com a casa — e a operação das três casas — num só lugar.
            </p>
          </div>
          <p className="text-xs text-white/40">São Paulo · Rio de Janeiro · Belo Horizonte</p>
        </div>
      </div>

      <div className="flex flex-col px-6 py-10 md:px-16">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden">
            <Marca className="!text-left" />
          </Link>
          <Link to="/" className="ml-auto text-xs text-suave hover:text-marinho">
            ← Voltar para a loja
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="text-[44px] leading-none">Entre na sua conta</h1>
          <p className="mt-2 text-sm text-suave">
            Clientes e equipe Casa Lorenzi entram por aqui. Navegar pela coleção não exige login.
          </p>

          <form onSubmit={enviar} className="mt-8 space-y-4">
            <Campo label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                placeholder="seu@email.com"
                autoComplete="username"
                required
              />
            </Campo>
            <Campo label="Senha">
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={inputClasses}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Campo>
            {erro ? <p className="text-sm text-perigo">{erro}</p> : null}
            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-tabaco py-4 text-sm tracking-wide text-creme hover:bg-tinta disabled:opacity-60"
            >
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
