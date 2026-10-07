import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Campo, Segmentado, inputClasses } from "@/components/ui";
import { FotoCampanha } from "@/components/vitrine";
import { Marca } from "@/layouts/PortalLayout";
import { CAMPANHA } from "@/lib/loja";
import { telaInicial } from "@/lib/navegacao";
import {
  credenciaisInternas,
  credencialCliente,
  entrarComoCliente,
  entrarComoFuncionario,
  entrarComoFuncionarioReal,
  rotuloPapel,
  type Papel,
} from "@/lib/sessao";

export function Entrar() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const lado: "cliente" | "interno" = params.get("time") ? "interno" : "cliente";
  const voltar = params.get("voltar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function preencher(e: string, s: string) {
    setEmail(e);
    setSenha(s);
    setErro(null);
  }

  function trocarLado(novo: "cliente" | "interno") {
    setParams(novo === "interno" ? { time: "1" } : {});
    preencher("", "");
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (lado === "cliente") {
      if (!entrarComoCliente(email, senha)) return setErro("E-mail ou senha inválidos.");
      return navigate(voltar ?? "/conta/pedidos");
    }
    setEnviando(true);
    setErro(null);
    try {
      // Primeiro a conta real do Supabase; os acessos de demonstração seguem valendo como reserva.
      const real = await entrarComoFuncionarioReal(email, senha);
      if (real.ok) return navigate(telaInicial(real.sessao.tipo === "interno" ? real.sessao.papel : "atendente"));
      if (real.motivo === "sem_acesso")
        return setErro("Sua conta ainda não tem acesso à área interna. Fale com o administrador.");
      const demo = entrarComoFuncionario(email, senha);
      if (demo?.tipo !== "interno") return setErro("E-mail ou senha inválidos.");
      navigate(telaInicial(demo.papel));
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
              {lado === "cliente"
                ? "Seus pedidos, ajustes e conversas com a casa em um só lugar."
                : "Estoque, atendimento e gestão das três casas, numa operação só."}
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
          <Segmentado
            valor={lado}
            onChange={trocarLado}
            opcoes={[
              { value: "cliente", label: "Sou cliente" },
              { value: "interno", label: "Time Casa Lorenzi" },
            ]}
          />
          <h1 className="mt-8 text-[44px] leading-none">
            {lado === "cliente" ? "Entre na sua conta" : "Área interna"}
          </h1>
          <p className="mt-2 text-sm text-suave">
            {lado === "cliente"
              ? "Navegar pela coleção não exige login."
              : "Use seu e-mail corporativo."}
          </p>

          <form onSubmit={enviar} className="mt-8 space-y-4">
            <Campo label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                placeholder={lado === "cliente" ? "seu@email.com" : "nome@casalorenzi.com.br"}
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

          <div className="mt-10 border-t border-linha pt-6">
            <p className="rotulo mb-3">Acessos de demonstração</p>
            <div className="grid gap-2">
              {lado === "cliente" ? (
                <button
                  type="button"
                  onClick={() => preencher(credencialCliente.email, credencialCliente.senha)}
                  className="border border-linha bg-papel px-4 py-3 text-left text-xs transition-colors hover:border-marinho"
                >
                  <span className="block font-semibold">Cliente · Helena Vasconcelos</span>
                  <span className="text-suave">{credencialCliente.email}</span>
                </button>
              ) : (
                (Object.keys(credenciaisInternas) as Papel[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => preencher(credenciaisInternas[p].email, credenciaisInternas[p].senha)}
                    className="border border-linha bg-papel px-4 py-3 text-left text-xs transition-colors hover:border-marinho"
                  >
                    <span className="block font-semibold">{rotuloPapel[p]}</span>
                    <span className="text-suave">{credenciaisInternas[p].email}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
