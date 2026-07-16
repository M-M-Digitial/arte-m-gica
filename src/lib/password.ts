export function passwordValidationError(password: string) {
  if (password.length < 8) return "Use pelo menos 8 caracteres na senha.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Inclua letras maiúsculas e minúsculas na senha.";
  }
  if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Inclua pelo menos um número e um símbolo na senha.";
  }
  return null;
}
