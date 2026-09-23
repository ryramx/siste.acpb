import { describe, it, expect } from 'vitest';
import {
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  calcularRecorte,
  escalaBase,
  limitarDeslocamento,
  limitarZoom,
  trocarParaJpg
} from './imagem';

const VIEWPORT = 256;

describe('escalaBase', () => {
  it('cobre a janela usando o menor lado', () => {
    // Paisagem 800x400: o lado curto (400) precisa alcancar 256.
    expect(escalaBase(800, 400, VIEWPORT)).toBeCloseTo(0.64);
    // Retrato 400x800: mesmo raciocinio, lado curto e a largura.
    expect(escalaBase(400, 800, VIEWPORT)).toBeCloseTo(0.64);
  });

  it('amplia imagem menor que a janela', () => {
    expect(escalaBase(100, 100, VIEWPORT)).toBeCloseTo(2.56);
  });
});

describe('limitarZoom', () => {
  it('prende nos extremos', () => {
    expect(limitarZoom(0.2)).toBe(ZOOM_MINIMO);
    expect(limitarZoom(99)).toBe(ZOOM_MAXIMO);
    expect(limitarZoom(2.5)).toBe(2.5);
  });
});

describe('limitarDeslocamento', () => {
  it('nao deixa abrir borda vazia de nenhum lado', () => {
    // Imagem de 400px numa janela de 256: pode andar de -144 a 0.
    expect(limitarDeslocamento(50, 400, VIEWPORT)).toBe(0);
    expect(limitarDeslocamento(-500, 400, VIEWPORT)).toBe(-144);
    expect(limitarDeslocamento(-70, 400, VIEWPORT)).toBe(-70);
  });

  it('centraliza quando a imagem nao cobre a janela', () => {
    expect(limitarDeslocamento(-999, 200, VIEWPORT)).toBe(28);
  });
});

describe('calcularRecorte', () => {
  it('numa imagem quadrada sem zoom, pega a imagem inteira', () => {
    const r = calcularRecorte(600, 600, VIEWPORT, 1, 0, 0);
    expect(r.sx).toBeCloseTo(0);
    expect(r.sy).toBeCloseTo(0);
    expect(r.tamanho).toBeCloseTo(600);
  });

  it('numa paisagem centralizada, corta as laterais em partes iguais', () => {
    // 800x400 na escala 0.64 exibe 512x256; centralizada, o x fica em -128.
    const r = calcularRecorte(800, 400, VIEWPORT, 1, -128, 0);
    expect(r.sx).toBeCloseTo(200);
    expect(r.sy).toBeCloseTo(0);
    expect(r.tamanho).toBeCloseTo(400);
    // Sobra o mesmo tanto dos dois lados: 200 antes, 200 depois.
    expect(800 - (r.sx + r.tamanho)).toBeCloseTo(200);
  });

  it('o zoom reduz a area recortada', () => {
    const semZoom = calcularRecorte(600, 600, VIEWPORT, 1, 0, 0);
    const comZoom = calcularRecorte(600, 600, VIEWPORT, 2, 0, 0);
    expect(comZoom.tamanho).toBeCloseTo(semZoom.tamanho / 2);
  });

  it('o recorte nunca sai da imagem, mesmo com deslocamento absurdo', () => {
    for (const [l, a] of [[800, 400], [400, 800], [600, 600]]) {
      for (const desloc of [-99999, 99999]) {
        const r = calcularRecorte(l, a, VIEWPORT, 1.7, desloc, desloc);
        expect(r.sx).toBeGreaterThanOrEqual(-0.001);
        expect(r.sy).toBeGreaterThanOrEqual(-0.001);
        expect(r.sx + r.tamanho).toBeLessThanOrEqual(l + 0.001);
        expect(r.sy + r.tamanho).toBeLessThanOrEqual(a + 0.001);
      }
    }
  });

  it('o zoom fora da faixa e limitado antes do calculo', () => {
    expect(calcularRecorte(600, 600, VIEWPORT, 99, 0, 0).tamanho).toBeCloseTo(
      calcularRecorte(600, 600, VIEWPORT, ZOOM_MAXIMO, 0, 0).tamanho
    );
  });
});

describe('trocarParaJpg', () => {
  it('troca a extensao porque o conteudo enviado e sempre JPEG', () => {
    expect(trocarParaJpg('retrato.png')).toBe('retrato.jpg');
    expect(trocarParaJpg('foto.JPEG')).toBe('foto.jpg');
    expect(trocarParaJpg('sem-extensao')).toBe('sem-extensao.jpg');
    expect(trocarParaJpg('ferias.2024.png')).toBe('ferias.2024.jpg');
  });
});
