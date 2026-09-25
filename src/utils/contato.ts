/** Links de contato com uma pessoa do cadastro (RQ-11 da rodada de QA de 25/09/2026). */

/** Link do WhatsApp para um telefone guardado só com dígitos (DDD + número).
 *
 * O wa.me exige o código do país; o cadastro guarda o número brasileiro sem ele. */
export function linkWhatsApp(numero: string): string | null {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length < 10) return null;
  const comPais = digitos.length >= 12 && digitos.startsWith('55') ? digitos : `55${digitos}`;
  return `https://wa.me/${comPais}`;
}

export interface OpcaoDeContato {
  rotulo: string;
  href: string;
}

/** O que dá para oferecer com o que está no cadastro. Lista vazia: não há como contatar. */
export function opcoesDeContato(pessoa: {
  phone: string;
  whatsapp: boolean;
  email: string;
}): OpcaoDeContato[] {
  const opcoes: OpcaoDeContato[] = [];
  const digitos = pessoa.phone.replace(/\D/g, '');
  const whats = pessoa.whatsapp ? linkWhatsApp(digitos) : null;
  if (whats) opcoes.push({ rotulo: 'WhatsApp', href: whats });
  else if (digitos.length >= 10) opcoes.push({ rotulo: 'Ligar', href: `tel:+55${digitos}` });
  if (pessoa.email.trim()) opcoes.push({ rotulo: 'E-mail', href: `mailto:${pessoa.email.trim()}` });
  return opcoes;
}
