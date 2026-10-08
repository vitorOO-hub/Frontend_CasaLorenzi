import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Campo, inputClasses } from "@/components/ui";
import { FotoCampanha } from "@/components/vitrine";
import { Marca } from "@/layouts/PortalLayout";
import { CAMPANHA } from "@/lib/loja";
import { destinoAposLogin } from "@/lib/destino";
import {
  dadosDoCadastro,
  FORM_VAZIO,
  formatarCep,
  formatarTelefone,
  validarCadastro,
  type ErrosCadastro,
  type FormCadastro,
} from "@/lib/cadastro";
import { criarConta, entrar } from "@/lib/sessao";

export function Entrar() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const voltar = params.get("voltar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState<FormCadastro>(FORM_VAZIO);
  const [errosForm, setErrosForm] = useState<ErrosCadastro>({});
  const [aviso, setAviso] = useState<string | null>(null);

  const campo = (k: keyof FormCadastro, formatar?: (v: string) => string) => ({
    value: form[k],
    onChange: (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [k]: formatar ? formatar(e.target.value) : e.target.value })),
    className: inputClasses,
  });
  const erroDe = (k: keyof FormCadastro) =>
    errosForm[k] ? <span className="mt-1 block text-xs text-perigo">{errosForm[k]}</span> : null;

  function alternar() {
    setCriando((v) => !v);
    setErro(null);
    setErrosForm({});
    setAviso(null);
  }

  async function cadastrar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    const erros = validarCadastro(form);
    setErrosForm(erros);
    if (Object.keys(erros).length) return;
    setEnviando(true);
    try {
      const r = await criarConta(dadosDoCadastro(form));
      if (!r.ok) return setErro(r.detalhe);
      if ("confirmar" in r) {
        setEmail(form.email.trim().toLowerCase());
        setForm(FORM_VAZIO);
        setCriando(false);
        return setAviso("Conta criada! Confirme seu e-mail (veja a caixa de entrada) e depois entre por aqui.");
      }
      navigate(destinoAposLogin(r.sessao, voltar), { replace: true });
    } finally {
      setEnviando(false);
    }
  }

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
        </div>

        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="text-[44px] leading-none">{criando ? "Crie sua conta" : "Entre na sua conta"}</h1>
          <p className="mt-2 text-sm text-suave">
            {criando
              ? "Cadastro para clientes. Seus dados e pedidos ficam só na sua conta."
              : "Clientes e equipe Casa Lorenzi entram por aqui. Navegar pela coleção não exige login."}
          </p>
          {aviso ? <p className="mt-4 text-sm text-tabaco">{aviso}</p> : null}

          {criando ? (
            <form onSubmit={cadastrar} noValidate className="mt-8 space-y-4">
              <Campo label="Nome">
                <input {...campo("nome")} autoComplete="name" required />
                {erroDe("nome")}
              </Campo>
              <Campo label="E-mail">
                <input type="email" {...campo("email")} autoComplete="email" placeholder="seu@email.com" required />
                {erroDe("email")}
              </Campo>
              <Campo label="Telefone">
                <input {...campo("telefone", formatarTelefone)} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-0000" required />
                {erroDe("telefone")}
              </Campo>
              <Campo label="Senha" ajuda="Mínimo de 8 caracteres, com letras e números.">
                <input type="password" {...campo("senha")} autoComplete="new-password" required />
                {erroDe("senha")}
              </Campo>
              <Campo label="CEP">
                <input {...campo("cep", formatarCep)} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" required />
                {erroDe("cep")}
              </Campo>
              <Campo label="Rua">
                <input {...campo("rua")} autoComplete="address-line1" required />
                {erroDe("rua")}
              </Campo>
              <div className="grid grid-cols-3 gap-4">
                <Campo label="Número">
                  <input {...campo("numero")} required />
                  {erroDe("numero")}
                </Campo>
                <Campo label="Complemento" className="col-span-2">
                  <input {...campo("complemento")} placeholder="Opcional" />
                </Campo>
              </div>
              <Campo label="Bairro">
                <input {...campo("bairro")} required />
                {erroDe("bairro")}
              </Campo>
              {erro ? <p className="text-sm text-perigo">{erro}</p> : null}
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-tabaco py-4 text-sm tracking-wide text-creme hover:bg-tinta disabled:opacity-60"
              >
                {enviando ? "Criando…" : "Criar conta"}
              </button>
              <button type="button" onClick={alternar} className="w-full text-sm text-suave underline">
                Já tenho conta · Entrar
              </button>
            </form>
          ) : (
            <>
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
          <button type="button" onClick={alternar} className="mt-6 w-full text-sm text-suave underline">
            Ainda não tem conta? Criar conta de cliente
          </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
