import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/apiClient';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const handleForgotPassword = async () => {
    setErrorMessage('');
    if (!email) {
      setErrorMessage('Informe seu e-mail acima para receber as instruções de recuperação.');
      return;
    }
    // A confirmação aparece antes da resposta, de propósito. O backend envia o e-mail dentro
    // da própria requisição, e um servidor SMTP lento segura a resposta por até 15 segundos —
    // tempo em que a tela ficava sem reação nenhuma e parecia que o clique não funcionou.
    // A mensagem não afirma que o e-mail existe, então não depende do resultado da chamada.
    setRecoveryMessage('Se o e-mail existir, instruções de recuperação foram enviadas.');
    try {
      await apiClient.post('/auth/recuperar-senha', { email });
    } catch {
      // Silencioso por decisão de segurança: responder diferente para e-mail existente e
      // inexistente revelaria quem tem cadastro.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1210] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos visuais sutis de fundo */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#004922]/15 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F8D800]/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#181D1A] border border-[#222824] rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in">
        {/* Institutional Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-[#0F1210] rounded-2xl border border-[#004922]/50 shadow-inner mb-4">
            <img
              src="/logo-acpb.png"
              alt="Logo ACPB"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-white font-heading tracking-wide">
            Associação Cristã Pau-Brasil
          </h1>
          <p className="text-xs text-[#F8D800] uppercase tracking-widest font-semibold mt-1">
            Sistema de Gestão Integrada
          </p>
        </div>

        {/* Mensagem de Erro Visual */}
        {errorMessage && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {recoveryMessage && (
          <div className="mb-6 p-3 bg-[#004922]/20 border border-[#004922] rounded-lg text-xs text-[#F8D800] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{recoveryMessage}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail Institucional"
            type="email"
            placeholder="seu.email@acpb.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <div>
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#AEB5B0] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />
            <div className="flex justify-end mt-1.5">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleForgotPassword();
                }}
                className="text-xs text-[#AEB5B0] hover:text-[#F8D800] transition-colors"
              >
                Esqueci minha senha
              </a>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            ENTRAR NO SISTEMA
          </Button>
        </form>
      </div>
    </div>
  );
};
