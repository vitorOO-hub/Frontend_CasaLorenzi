import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErroApi } from "@/api/erros";
import { supabase } from "@/api/supabase";
import { Campo, inputClasses } from "@/components/ui";
import { validarSenhaEquipe } from "@/lib/senhaEquipe";

type Convite = "carregando" | "pronto" | "invalido" | "erro";

export function DefinirSenha() {
  const navigate = useNavigate();
  const [convite, setConvite] = useState<Convite>("carregando");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let montado = true;
    let cancelarAuth: (() => void) | undefined;
    void Promise.resolve().then(() => supabase()).then(async (cliente) => {
      if (!montado) return;
      const { data } = cliente.auth.onAuthStateChange((_evento, sessao) => {
        if (montado && sessao) setEmail(sessao.user.email ?? "");
      });
      cancelarAuth = () => data.subscription.unsubscribe();
      const { data: resposta, error: falha } = await cliente.auth.getSession();
      if (!montado) return;
      if (falha) {
        setErro("Não foi possível validar este convite. Peça um novo link à gestão.");
        setConvite("erro");
      } else if (resposta.session) {
        setEmail(resposta.session.user.email ?? "");
        setConvite("pronto");
      } else {
        setConvite("invalido");
      }
      if (window.location.hash) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }
    }).catch((e: unknown) => {
      if (!montado) return;
      setErro(e instanceof ErroApi ? e.message : "Não foi possível validar este convite. Peça um novo link à gestão.");
      setConvite("erro");
    });

    return () => {
      montado = false;
      cancelarAuth?.();
    };
  }, []);

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErro(validarSenhaEquipe(senha, confirmar));
    if (validarSenhaEquipe(senha, confirmar)) return;
    setEnviando(true);
    try {
      const auth = supabase().auth;
      const { error: falha } = await auth.updateUser({ password: senha });
      if (falha) {
        setErro(
          falha.code === "weak_password"
            ? "Essa senha não atende aos critérios de segurança do projeto. Escolha outra."
            : "Não foi possível definir a senha. Peça um novo convite à gestão.",
        );
        return;
      }
      await auth.signOut({ scope: "local" }).catch(() => undefined);
      navigate("/entrar?convite=concluido", { replace: true });
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível definir a senha agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="loja flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md border border-linha bg-papel p-7 shadow-suave sm:p-9">
        <span className="filete mb-4" />
        <p className="rotulo mb-2">Acesso da equipe</p>
        <h1 className="text-4xl leading-tight">Defina sua senha</h1>
        {convite === "carregando" ? (
          <p className="mt-4 text-sm text-suave" role="status">Validando convite…</p>
        ) : convite === "pronto" ? (
          <>
            <p className="mt-2 text-sm text-suave">Crie uma senha para acessar a plataforma.</p>
            {email ? <p className="mt-4 text-sm font-medium">{email}</p> : null}
            <form onSubmit={salvar} className="mt-6 space-y-4">
              <Campo label="Nova senha" ajuda="Pelo menos 8 caracteres, com letras e números.">
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className={inputClasses}
                />
              </Campo>
              <Campo label="Repita a senha">
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className={inputClasses}
                />
              </Campo>
              {erro ? <p className="text-sm text-perigo" role="alert">{erro}</p> : null}
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-tabaco py-3 text-sm font-medium text-creme hover:bg-tinta disabled:opacity-60"
              >
                {enviando ? "Salvando…" : "Salvar senha"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-suave" role="alert">
              {erro ?? "Este convite já foi usado ou expirou. Peça um novo link ao administrador ou gerente."}
            </p>
            <Link to="/entrar" className="mt-6 inline-flex text-sm font-medium text-marinho underline">
              Ir para entrar
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
