import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/authService';

/** Tela que o link do e-mail de recuperação abre.
 *
 * O fluxo existia inteiro menos ela: o backend gera o token, envia o e-mail com
 * `/redefinir-senha?token=...` e expõe `POST /auth/redefinir-senha` para consumi-lo -- mas
 * essa rota não existia no front. O catch-all do roteador mandava para `/dashboard`, que é
 * protegido, e de lá para o login. Quem clicava no link voltava ao ponto de partida sem
 * explicação nenhuma.
 *
 * Fica fora do `ProtectedRoute`, junto do login: quem chega aqui não tem sessão -- é
 * justamente por não conseguir entrar que pediu a recuperação.
 */

/** Mesmo mínimo exigido pelo backend (`SENHA_TAMANHO_MINIMO` em `app/core/security.py`). Validar aqui
 * evita uma ida ao servidor para ouvir o óbvio, mas quem manda continua sendo o backend. */
const TAMANHO_MINIMO_SENHA = 5;

export const RedefinirSenha: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const validar = (): string | null => {
    if (senha.length < TAMANHO_MINIMO_SENHA) {
      return `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
    }
    // A confirmação existe porque a senha é digitada às cegas: um erro de digitação aqui
    // deixaria a pessoa trancada para fora com um token que já foi consumido.
    if (senha !== confirmacao) return 'As senhas não conferem.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }

    setErro('');
    setSalvando(true);
    try {
      await authService.redefinirSenhaComToken(token, senha);
      setConcluido(true);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : 'Não foi possível redefinir a senha. Peça um novo link e tente de novo.'
      );
    } finally {
      setSalvando(false);
    }
  };

  const moldura = (conteudo: React.ReactNode) => (
    <div className="min-h-screen bg-[#0F1210] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#004922]/15 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F8D800]/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="w-full max-w-md bg-[#181D1A] border border-[#222824] rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in">
        {conteudo}
      </div>
    </div>
  );

  // Link aberto sem token (copiado pela metade, ou a própria URL digitada à mão).
  if (!token) {
    return moldura(
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-bold text-white font-heading">Link incompleto</h1>
        <p className="text-sm text-[#AEB5B0]">
          Este endereço não traz o código de recuperação. Abra o link direto do e-mail, sem
          copiar e colar — alguns aplicativos cortam o endereço no meio.
        </p>
        <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
          Voltar ao login
        </Button>
      </div>
    );
  }

  if (concluido) {
    return moldura(
      <div className="space-y-4 text-center">
        <CheckCircle2 className="w-12 h-12 text-[#40C075] mx-auto" />
        <h1 className="text-xl font-bold text-white font-heading">Senha redefinida</h1>
        <p className="text-sm text-[#AEB5B0]">
          Sua nova senha já está valendo. Entre no sistema com ela.
        </p>
        <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
          Ir para o login
        </Button>
      </div>
    );
  }

  return moldura(
    <>
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-white font-heading">Criar nova senha</h1>
        <p className="text-sm text-[#AEB5B0] mt-1">
          Escolha uma senha para a sua conta no Sistema de Gestão da ACPB.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nova senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          placeholder="Mínimo de 5 caracteres"
          autoFocus
          required
        />

        <Input
          label="Repita a nova senha"
          type="password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          required
        />

        {erro && (
          <p role="alert" className="text-sm text-red-400">
            {erro}
          </p>
        )}

        <Button type="submit" variant="primary" isLoading={salvando} className="w-full">
          Salvar nova senha
        </Button>

        <p className="text-xs text-[#727A74] text-center">
          O link do e-mail vale por 30 minutos e só pode ser usado uma vez.
        </p>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-xs text-[#AEB5B0] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao login
        </Link>
      </form>
    </>
  );
};
