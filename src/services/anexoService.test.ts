import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  anexoService,
  formatarTamanho,
  validarArquivo
} from './anexoService';
import { apiClient, ApiError } from './apiClient';

const anexoApi = {
  id: 7,
  movimentacao_financeira_id: 42,
  nome_original: 'recibo padaria.pdf',
  tipo_mime: 'application/pdf',
  tamanho_bytes: 2048,
  enviado_por_usuario_id: 3,
  created_at: '2026-09-20T14:30:00'
};

function arquivoFalso(nome: string, tipo: string, tamanho: number): File {
  const arquivo = new File(['x'], nome, { type: tipo });
  // `size` é somente-leitura em File: redefinir é o único jeito de simular um arquivo grande
  // sem alocar megabytes de verdade no teste.
  Object.defineProperty(arquivo, 'size', { value: tamanho });
  return arquivo;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validarArquivo', () => {
  it('aceita PDF, PNG e JPEG dentro do limite', () => {
    expect(validarArquivo(arquivoFalso('a.pdf', 'application/pdf', 1000))).toBeNull();
    expect(validarArquivo(arquivoFalso('a.png', 'image/png', 1000))).toBeNull();
    expect(validarArquivo(arquivoFalso('a.jpg', 'image/jpeg', 1000))).toBeNull();
  });

  it('recusa formato que o backend nao aceita', () => {
    // Recusar aqui evita subir o arquivo inteiro por uma rede de celular para ouvir um 400.
    const problema = validarArquivo(arquivoFalso('planilha.xlsx', 'application/vnd.ms-excel', 10));
    expect(problema).toMatch(/PDF, PNG ou JPEG/);
  });

  it('recusa arquivo acima do teto de 5MB', () => {
    const problema = validarArquivo(arquivoFalso('foto.jpg', 'image/jpeg', 6 * 1024 * 1024));
    expect(problema).toMatch(/5MB/);
  });

  it('recusa arquivo vazio, que o backend tambem recusa', () => {
    expect(validarArquivo(arquivoFalso('vazio.pdf', 'application/pdf', 0))).toMatch(/vazio/);
  });
});

describe('formatarTamanho', () => {
  it('usa B, KB e MB conforme a ordem de grandeza', () => {
    expect(formatarTamanho(512)).toBe('512 B');
    expect(formatarTamanho(2048)).toBe('2 KB');
    expect(formatarTamanho(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});

describe('anexoService.listar', () => {
  it('filtra pela movimentacao e traduz os campos do backend', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue([anexoApi]);

    const anexos = await anexoService.listar('42');

    expect(get).toHaveBeenCalledWith('/anexos-financeiros/?movimentacao_financeira_id=42');
    expect(anexos).toEqual([
      {
        id: '7',
        movimentacaoId: '42',
        nomeOriginal: 'recibo padaria.pdf',
        tipoMime: 'application/pdf',
        tamanhoBytes: 2048,
        enviadoEm: '2026-09-20T14:30:00',
        enviadoPorUsuarioId: '3'
      }
    ]);
  });
});

describe('anexoService.enviar', () => {
  it('manda multipart com o id da movimentacao como campo do formulario', async () => {
    // O endpoint recebe `movimentacao_financeira_id` como Form(...), não no corpo JSON:
    // mandá-lo em JSON resultaria em 422 sem explicação óbvia na tela.
    const postForm = vi.spyOn(apiClient, 'postForm').mockResolvedValue(anexoApi);
    const arquivo = arquivoFalso('recibo.pdf', 'application/pdf', 100);

    const criado = await anexoService.enviar('42', arquivo);

    expect(postForm).toHaveBeenCalledTimes(1);
    const [path, formData] = postForm.mock.calls[0] as [string, FormData];
    expect(path).toBe('/anexos-financeiros/');
    expect(formData.get('movimentacao_financeira_id')).toBe('42');
    expect(formData.get('arquivo')).toBe(arquivo);
    expect(criado.id).toBe('7');
  });

  it('propaga erro do backend (ex.: 400 de tipo nao permitido)', async () => {
    vi.spyOn(apiClient, 'postForm').mockRejectedValue(new ApiError(400, 'Tipo não permitido'));
    await expect(
      anexoService.enviar('42', arquivoFalso('a.pdf', 'application/pdf', 10))
    ).rejects.toThrow('Tipo não permitido');
  });
});

describe('anexoService.baixar', () => {
  beforeEach(() => {
    // jsdom nao implementa createObjectURL/revokeObjectURL.
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
  });

  it('baixa com o nome original, que o Content-Disposition nao entrega por este caminho', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const getBlob = vi.spyOn(apiClient, 'getBlob').mockResolvedValue(blob);
    const click = vi.fn();
    let nomeUsado: string | undefined;
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      Object.defineProperty(el, 'download', {
        set: (valor: string) => {
          nomeUsado = valor;
        },
        get: () => nomeUsado
      });
      Object.assign(el, { click });
      return el;
    }) as typeof document.createElement);

    await anexoService.baixar({
      id: '7',
      movimentacaoId: '42',
      nomeOriginal: 'recibo padaria.pdf',
      tipoMime: 'application/pdf',
      tamanhoBytes: 2048,
      enviadoEm: '2026-09-20T14:30:00',
      enviadoPorUsuarioId: '3'
    });

    expect(getBlob).toHaveBeenCalledWith('/anexos-financeiros/7/download');
    expect(nomeUsado).toBe('recibo padaria.pdf');
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});

describe('anexoService.remover', () => {
  it('chama o endpoint de exclusao do anexo', async () => {
    const remover = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);
    await anexoService.remover('7');
    expect(remover).toHaveBeenCalledWith('/anexos-financeiros/7');
  });

  it('propaga 403 de quem nao pode editar o financeiro', async () => {
    vi.spyOn(apiClient, 'delete').mockRejectedValue(new ApiError(403, 'Sem permissão'));
    await expect(anexoService.remover('7')).rejects.toThrow('Sem permissão');
  });
});
