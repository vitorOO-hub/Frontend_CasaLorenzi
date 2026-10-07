import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Campo, Segmentado, inputClasses } from "@/components/ui";
import { FotoCampanha } from "@/components/vitrine";
import { Marca } from "@/layouts/PortalLayout";
import { CAMPANHA } from "@/lib/loja";
import { telaInicial } from "@/lib/navegacao";
import { entrar, type Lado } from "@/lib/sessao";

export function Entrar() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const lado: Lado = params.get("time") ? "interno" : "cliente";
  const voltar = params.get("voltar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function trocarLado(novo: Lado) {
    setParams(novo === "interno" ? { time: "1" } : {});
    setEmail("");
    setSenha("");
    setErro(null);
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const r = await entrar(email, senha, lado);
      if (r.ok) {
        return navigate(r.sessao.tipo === "interno" ? telaInicial(r.sessao.papel) : (voltar ?? "/conta/pedidos"));
      }
      setSenha("");
      if (r.motivo === "credenciais") return setErro("E-mail ou senha inválidos.");
      if (r.motivo === "lado_errado")
        return setErro(
          lado === "cliente"
            ? "Esta conta é da equipe. Use a aba “Time Casa Lorenzi”."
            : "Esta conta não tem acesso à área interna. Se você é da equipe, peça ao administrador para conferir seu cadastro.",
        );
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
              : "Entre com a conta que a administração criou para você."}
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
        </div>
      </div>
    </div>
  );
}
