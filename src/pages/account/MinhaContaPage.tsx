import React, { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { AvatarUpload } from '../../components/ui/AvatarUpload';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const MINIMO_DA_SENHA = 8;

/** A própria conta: quem sou eu no sistema, minha foto e a troca da minha senha.
 *
 * A troca de senha não existia: o único caminho era o fluxo de recuperação por e-mail, que
 * serve ao esquecimento. Como a senha inicial de cada usuário é definida por um administrador,
 * trocá-la depois do primeiro acesso é operação de rotina — e quem desconfia que a senha foi
 * vista não deveria depender de receber um e-mail para agir.
 */
export const MinhaContaPage: React.FC = () => {
  const { user, updateUserPhotoStatus } = useAuth();
  const { addToast } = useToast();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!user) return null;

  const limpar = () => {
    setSenhaAtual('');
    setSenhaNova('');
    setConfirmacao('');
  };

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();

    // As duas validações são do navegador de propósito: erro de digitação não precisa de
    // requisição, e a confirmação nem chega ao backend (ele recebe uma senha só).
    if (senhaNova.length < MINIMO_DA_SENHA) {
      addToast({
        type: 'error',
        title: 'Senha curta',
        message: `A nova senha precisa ter pelo menos ${MINIMO_DA_SENHA} caracteres.`
      });
      return;
    }
    if (senhaNova !== confirmacao) {
      addToast({
        type: 'error',
        title: 'As senhas não conferem',
        message: 'Digite a nova senha igual nos dois campos.'
      });
      return;
    }

    setSalvando(true);
    try {
      await authService.alterarSenha(senhaAtual, senhaNova);
      limpar();
      addToast({
        type: 'success',
        title: 'Senha alterada',
        message: 'Use a nova senha no próximo login.'
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível alterar a senha', message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#F8D800]" />
          Minha conta
        </h1>
        <p className="text-sm text-[#AEB5B0]">
          Seus dados de acesso ao sistema. Alterações no cadastro pessoal (nome, CPF, endereço)
          são feitas na tela de Pessoas, por quem tem permissão para isso.
        </p>
      </div>

      <div className="bg-[#181D1A] border border-[#222824] rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-start">
        <AvatarUpload
          pessoaId={user.pessoaId}
          nome={user.name}
          temFoto={user.temFoto}
          onChange={updateUserPhotoStatus}
          size="lg"
        />
        <div className="space-y-2 min-w-0">
          <div>
            <p className="text-xs text-[#727A74]">Nome</p>
            <p className="text-white font-medium">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-[#727A74]">E-mail de acesso</p>
            <p className="text-white break-all">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-[#727A74]">Perfis</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {user.perfis.length === 0 ? (
                <span className="text-sm text-[#AEB5B0]">Sem perfil atribuído</span>
              ) : (
                user.perfis.map((perfil) => (
                  <Badge key={perfil} variant="success">
                    {perfil}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={trocarSenha} className="bg-[#181D1A] border border-[#222824] rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white font-heading flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#F8D800]" />
            Alterar senha
          </h2>
          <p className="text-sm text-[#AEB5B0]">
            Pedimos a senha atual para garantir que é você — e não alguém que pegou o
            computador ou o celular já logado.
          </p>
        </div>

        <Input
          label="Senha atual"
          type="password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          autoComplete="current-password"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nova senha"
            type="password"
            value={senhaNova}
            onChange={(e) => setSenhaNova(e.target.value)}
            autoComplete="new-password"
            minLength={MINIMO_DA_SENHA}
            required
          />
          <Input
            label="Repita a nova senha"
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="new-password"
            minLength={MINIMO_DA_SENHA}
            required
          />
        </div>

        <p className="text-xs text-[#727A74]">
          Pelo menos {MINIMO_DA_SENHA} caracteres. Trocar a senha não desconecta esta sessão nem
          as outras já abertas — se a preocupação é um acesso indevido em outro aparelho, troque
          a senha e avise o administrador. Qualquer link de recuperação de senha pedido antes
          deixa de valer na hora.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={limpar} disabled={salvando}>
            Limpar
          </Button>
          <Button type="submit" variant="primary" disabled={salvando}>
            {salvando ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </div>
      </form>
    </div>
  );
};
