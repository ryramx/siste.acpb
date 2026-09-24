import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { getSession } from '../../services/session';

interface Props {
  children: React.ReactNode;
}

interface State {
  erro: Error | null;
}

/** Último anteparo do lado do navegador.
 *
 * Um erro de renderização em React derruba a árvore inteira: a tela fica **branca**, sem
 * mensagem e sem menu — e, do lado do servidor, sem rastro nenhum, porque nenhuma requisição
 * falhou. Era o modo de falha mais invisível do sistema: quem estava no celular via a página
 * apagar e ninguém ficava sabendo.
 *
 * Aqui o erro vira uma tela com explicação e um caminho de volta, e é relatado ao backend, que
 * o registra no mesmo log dos erros de servidor (`POST /monitoramento/erro-cliente`).
 *
 * Fica fora dos providers de propósito: um erro *no* provider de autenticação ou de toast
 * também precisa ser pego, então esta tela não pode depender de nenhum dos dois.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo): void {
    // Continua no console: é onde quem está depurando na própria máquina espera encontrar.
    console.error('Erro de renderização:', erro, info.componentStack);

    // Só relata com sessão: a rota exige autenticação, e sem token a chamada só geraria um 401
    // em cima do erro que já aconteceu.
    if (!getSession()) return;

    apiClient
      .post('/monitoramento/erro-cliente', {
        mensagem: erro.message.slice(0, 500),
        caminho: window.location.pathname + window.location.search,
        // A pilha de componentes diz *qual tela* quebrou, que é a informação que falta no
        // servidor. Cortada porque o backend recusa acima de 2000 caracteres.
        detalhe: (info.componentStack ?? '').slice(0, 2000)
      })
      // Falha no relato não pode piorar a situação: a tela de erro já está de pé.
      .catch(() => undefined);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0F1210] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#181D1A] border border-[#222824] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#F8D800]">
            <AlertTriangle className="w-6 h-6" />
            <h1 className="text-lg font-bold text-white font-heading">
              Algo quebrou nesta tela
            </h1>
          </div>

          <p className="text-sm text-[#AEB5B0]">
            O erro foi registrado para quem mantém o sistema. Nada do que você tinha salvo se
            perdeu — o problema é na exibição desta tela.
          </p>

          <p className="text-xs text-[#727A74]">
            Recarregar costuma resolver. Se acontecer de novo no mesmo lugar, avise quem
            administra o sistema e diga o que você estava fazendo.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 rounded-lg bg-[#004922] hover:bg-[#00632e] text-white text-sm font-medium cursor-pointer"
            >
              Recarregar a tela
            </button>
            <button
              type="button"
              onClick={() => {
                // `assign` e não `reload`: o objetivo é sair da tela que quebra, não repeti-la.
                window.location.assign('/dashboard');
              }}
              className="flex-1 px-4 py-2 rounded-lg border border-[#222824] bg-[#181D1A] hover:bg-[#222824] text-white text-sm font-medium cursor-pointer"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }
}
