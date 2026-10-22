import { useState, type FormEvent } from "react";
import { Campo, inputClasses } from "@/components/ui";
import { ErroApi } from "@/api/erros";
import { formatarCpf } from "@/lib/cadastro";
import {
  ativarConta,
  ATIVACAO_VAZIA,
  consultarAtivacao,
  validarAtivacao,
  validarCpfDaAtivacao,
  type ErrosAtivacao,
  type FormAtivacao,
} from "@/lib/ativarConta";

const botao = "w-full bg-tabaco py-4 text-sm tracking-wide text-creme hover:bg-tinta disabled:opacity-60";

const mensagemDoErro = (erro: unknown) =>
  erro instanceof ErroApi ? erro.message : "Não foi possível agora. Tente de novo em instantes.";

/**
 * "Primeiro acesso ou recuperar conta": quem já é cliente (Vulto+) e ainda não tem login informa o
 * CPF e cria a senha. Se o cadastro não tem e-mail, a pessoa informa o e-mail junto.
 */
export function AtivarConta({ aoAtivar, aoVoltar }: { aoAtivar: (emailMascarado: string) => void; aoVoltar: () => void }) {
  const [form, setForm] = useState<FormAtivacao>(ATIVACAO_VAZIA);
  const [pedeEmail, setPedeEmail] = useState<boolean | null>(null); // null = ainda na etapa do CPF
  const [erros, setErros] = useState<ErrosAtivacao>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const mudar = (k: keyof FormAtivacao, formatar?: (v: string) => string) => ({
    value: form[k],
    onChange: (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [k]: formatar ? formatar(e.target.value) : e.target.value })),
    className: inputClasses,
  });
  const erroDe = (k: keyof FormAtivacao) =>
    erros[k] ? <span className="mt-1 block text-xs text-perigo">{erros[k]}</span> : null;

  async function continuar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    const msg = validarCpfDaAtivacao(form.cpf);
    setErros(msg ? { cpf: msg } : {});
    if (msg) return;
    setEnviando(true);
    try {
      setPedeEmail((await consultarAtivacao(form.cpf)).pede_email);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function ativar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    const encontrados = validarAtivacao(form, pedeEmail === true);
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;
    setEnviando(true);
    try {
      aoAtivar((await ativarConta(form, pedeEmail === true)).email);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  }

  function trocarCpf() {
    setPedeEmail(null);
    setErros({});
    setErro(null);
    setForm((f) => ({ ...ATIVACAO_VAZIA, cpf: f.cpf }));
  }

  if (pedeEmail === null) {
    return (
      <form onSubmit={continuar} noValidate className="mt-8 space-y-4">
        <Campo label="CPF">
          <input {...mudar("cpf", formatarCpf)} inputMode="numeric" placeholder="000.000.000-00" autoFocus required />
          {erroDe("cpf")}
        </Campo>
        {erro ? <p className="text-sm text-perigo">{erro}</p> : null}
        <button type="submit" disabled={enviando} className={botao}>
          {enviando ? "Verificando…" : "Continuar"}
        </button>
        <button type="button" onClick={aoVoltar} className="w-full text-sm text-suave underline">
          Voltar para o login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={ativar} noValidate className="mt-8 space-y-4">
      <p className="text-sm text-suave">
        CPF {form.cpf} ·{" "}
        <button type="button" onClick={trocarCpf} className="underline">
          trocar
        </button>
      </p>
      {pedeEmail ? (
        <Campo label="E-mail" ajuda="Seu cadastro ainda não tem e-mail. Você vai entrar com ele.">
          <input type="email" {...mudar("email")} autoComplete="email" placeholder="seu@email.com" required />
          {erroDe("email")}
        </Campo>
      ) : null}
      <Campo label="Crie uma senha" ajuda="Mínimo de 8 caracteres, com letras e números.">
        <input type="password" {...mudar("senha")} autoComplete="new-password" required />
        {erroDe("senha")}
      </Campo>
      <Campo label="Repita a senha">
        <input type="password" {...mudar("confirmar")} autoComplete="new-password" required />
        {erroDe("confirmar")}
      </Campo>
      {erro ? <p className="text-sm text-perigo">{erro}</p> : null}
      <button type="submit" disabled={enviando} className={botao}>
        {enviando ? "Ativando…" : "Ativar minha conta"}
      </button>
      <button type="button" onClick={aoVoltar} className="w-full text-sm text-suave underline">
        Voltar para o login
      </button>
    </form>
  );
}
