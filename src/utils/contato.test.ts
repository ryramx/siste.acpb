import { describe, it, expect } from 'vitest';
import { linkWhatsApp, opcoesDeContato } from './contato';

describe('linkWhatsApp', () => {
  it('põe o código do Brasil na frente', () => {
    expect(linkWhatsApp('81999998888')).toBe('https://wa.me/5581999998888');
    expect(linkWhatsApp('(81) 99999-8888')).toBe('https://wa.me/5581999998888');
  });

  it('não duplica o código quando ele já está lá', () => {
    expect(linkWhatsApp('5581999998888')).toBe('https://wa.me/5581999998888');
  });

  it('número curto demais não vira link', () => {
    expect(linkWhatsApp('99998888')).toBeNull();
  });
});

describe('opcoesDeContato', () => {
  it('oferece WhatsApp e e-mail quando há os dois', () => {
    const opcoes = opcoesDeContato({ phone: '81999998888', whatsapp: true, email: 'ana@acpb.org' });
    expect(opcoes.map((o) => o.rotulo)).toEqual(['WhatsApp', 'E-mail']);
    expect(opcoes[1].href).toBe('mailto:ana@acpb.org');
  });

  it('telefone sem WhatsApp vira ligação', () => {
    const opcoes = opcoesDeContato({ phone: '8132221111', whatsapp: false, email: '' });
    expect(opcoes).toEqual([{ rotulo: 'Ligar', href: 'tel:+558132221111' }]);
  });

  it('sem telefone nem e-mail não há o que oferecer', () => {
    expect(opcoesDeContato({ phone: '', whatsapp: false, email: '' })).toEqual([]);
  });
});
