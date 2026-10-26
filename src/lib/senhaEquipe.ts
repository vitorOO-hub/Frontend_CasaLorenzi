export function validarSenhaEquipe(senha: string, confirmar: string): string | null {
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return "Use letras e números na senha.";
  if (senha !== confirmar) return "As senhas não coincidem.";
  return null;
}
