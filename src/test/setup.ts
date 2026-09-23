import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem isto, o DOM de um teste sobrevive para o seguinte e as buscas passam a encontrar
// elementos duplicados de telas que já deveriam ter saído.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
