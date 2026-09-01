import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_USERS } from '../../mocks/users';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@acpb.local');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await login(email);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMockUser = (userEmail: string) => {
    setEmail(userEmail);
    setErrorMessage('');
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
                  alert('Instruções de recuperação enviadas ao e-mail institucional.');
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

        {/* Área de atalhos rápidos com usuários fictícios para facilidade do teste */}
        <div className="mt-8 pt-6 border-t border-[#222824]">
          <span className="text-[11px] font-semibold text-[#727A74] uppercase tracking-wider block mb-3 text-center">
            Acesso Rápido com Perfis Mocks:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {MOCK_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelectMockUser(u.email)}
                className={`px-2.5 py-1.5 rounded text-[11px] font-medium text-left border transition-all truncate ${
                  email === u.email
                    ? 'bg-[#004922] border-[#004922] text-white font-semibold'
                    : 'bg-[#0F1210] border-[#222824] text-[#AEB5B0] hover:border-[#004922]/50 hover:text-white'
                }`}
              >
                {u.role.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
