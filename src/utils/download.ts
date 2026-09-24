/** Entrega um blob ao navegador como download.
 *
 * Existe porque nenhum dos arquivos do sistema pode ser baixado por um link comum: todos os
 * endpoints exigem o header `Authorization`, que um `<a href>` não envia. O caminho é buscar
 * o conteúdo pelo apiClient e entregá-lo daqui.
 *
 * Isolado em módulo próprio para que quem chama possa ser testado com este comportamento
 * substituído — em jsdom não há download de verdade.
 */
export function salvarArquivo(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
