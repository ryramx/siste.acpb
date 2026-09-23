import React, { useEffect, useState } from 'react';
import { Plus, KeyRound, Power, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/apiClient';
import { userManagementService, profileService } from '../../services/settingsService';
import { SystemUser, SystemProfile, PessoaSemUsuario } from '../../types/settings';

function mensagemDeErro(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export const UsersManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const podeGerenciar = hasPermission('manage_users');

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pessoasDisponiveis, setPessoasDisponiveis] = useState<PessoaSemUsuario[]>([]);
  const [novoPessoaId, setNovoPessoaId] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [criando, setCriando] = useState(false);

  const [profilesModalUser, setProfilesModalUser] = useState<SystemUser | null>(null);
  const [allProfiles, setAllProfiles] = useState<SystemProfile[]>([]);
  const [togglingProfileId, setTogglingProfileId] = useState<string | null>(null);

  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userManagementService.getAll();
      setUsers(data);
    } catch (err) {
      const message = mensagemDeErro(err, 'Erro ao carregar usuários');
      setError(message);
      addToast({ type: 'error', title: 'Erro ao carregar usuários', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = async () => {
    setCreateModalOpen(true);
    setNovoPessoaId('');
    setNovoEmail('');
    setNovaSenha('');
    setPessoasDisponiveis([]);
    try {
      const pessoas = await userManagementService.listarPessoasSemUsuario();
      setPessoasDisponiveis(pessoas);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erro ao carregar pessoas disponíveis',
        message: mensagemDeErro(err, 'Não foi possível carregar as pessoas disponíveis')
      });
    }
  };

  const handleCreateUser = async () => {
    if (!novoPessoaId || !novoEmail || novaSenha.length < 8) {
      addToast({
        type: 'warning',
        title: 'Preencha todos os campos',
        message: 'Selecione a pessoa, informe o e-mail e uma senha com pelo menos 8 caracteres.'
      });
      return;
    }
    setCriando(true);
    try {
      await userManagementService.create({
        pessoaId: novoPessoaId,
        email: novoEmail,
        senha: novaSenha
      });
      addToast({ type: 'success', title: 'Usuário criado com sucesso' });
      setCreateModalOpen(false);
      fetchUsers();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erro ao criar usuário',
        message: mensagemDeErro(err, 'Não foi possível criar o usuário')
      });
    } finally {
      setCriando(false);
    }
  };

  const handleToggleAtivo = async (user: SystemUser) => {
    setTogglingUserId(user.id);
    try {
      await userManagementService.setAtivo(user.id, !user.ativo);
      addToast({
        type: 'success',
        title: user.ativo ? 'Usuário desativado' : 'Usuário reativado',
        message: `${user.name} foi ${user.ativo ? 'desativado' : 'reativado'} com sucesso.`
      });
      fetchUsers();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erro ao alterar status do usuário',
        message: mensagemDeErro(err, 'Não foi possível alterar o status do usuário')
      });
    } finally {
      setTogglingUserId(null);
    }
  };

  const openProfilesModal = async (user: SystemUser) => {
    setProfilesModalUser(user);
    try {
      const perfis = await profileService.getAll();
      setAllProfiles(perfis);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erro ao carregar perfis',
        message: mensagemDeErro(err, 'Não foi possível carregar a lista de perfis')
      });
    }
  };

  const handleToggleProfile = async (perfil: SystemProfile, vinculado: boolean) => {
    if (!profilesModalUser) return;
    setTogglingProfileId(perfil.id);
    try {
      if (vinculado) {
        await userManagementService.desvincularPerfil(profilesModalUser.id, perfil.id);
      } else {
        await userManagementService.vincularPerfil(profilesModalUser.id, perfil.id);
      }
      const usuariosAtualizados = await userManagementService.getAll();
      setUsers(usuariosAtualizados);
      const usuarioAtualizado = usuariosAtualizados.find((u) => u.id === profilesModalUser.id);
      if (usuarioAtualizado) setProfilesModalUser(usuarioAtualizado);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      addToast({
        type: 'error',
        title:
          status === 409
            ? 'Não foi possível alterar o vínculo'
            : 'Erro ao alterar perfil do usuário',
        message: mensagemDeErro(err, 'Não foi possível alterar o perfil deste usuário')
      });
    } finally {
      setTogglingProfileId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        {podeGerenciar && (
          <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Novo Usuário
          </Button>
        )}
      </div>

      <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={4} />
        ) : error ? (
          <EmptyState
            title="Erro ao carregar usuários"
            description={error}
            actionLabel="Tentar novamente"
            onAction={fetchUsers}
          />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            description={
              users.length === 0
                ? 'Ainda não há nenhum usuário cadastrado no sistema.'
                : 'Nenhum usuário corresponde à busca atual.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
                <tr>
                  <th className="py-3.5 px-4">Nome / E-mail</th>
                  <th className="py-3.5 px-4">Perfil(is)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222824]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#1e2521] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-xs text-[#727A74]">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.perfis.length === 0 ? (
                          <span className="text-xs text-[#727A74]">Sem perfil</span>
                        ) : (
                          u.perfis.map((p) => (
                            <span
                              key={p.perfilId}
                              className="text-xs font-bold text-[#F8D800] bg-[#0F1210] px-2 py-1 rounded border border-[#222824]"
                            >
                              {p.nome}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.ativo ? 'success' : 'danger'}>
                        {u.ativo ? 'ATIVO' : 'INATIVO'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {podeGerenciar && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openProfilesModal(u)}
                            leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                          >
                            Gerenciar Perfis
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={togglingUserId === u.id}
                            onClick={() => handleToggleAtivo(u)}
                            leftIcon={<Power className="w-3.5 h-3.5" />}
                          >
                            {u.ativo ? 'Desativar' : 'Reativar'}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Novo Usuário */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Novo Usuário do Sistema"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            {/* `form` liga o botão do rodapé ao <form> do corpo, para o Enter criar o
                usuário sem precisar do clique. */}
            <Button variant="primary" type="submit" form="form-novo-usuario" isLoading={criando}>
              Criar usuário
            </Button>
          </>
        }
      >
        <form
          id="form-novo-usuario"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateUser();
          }}
        >
        <p className="text-xs text-[#727A74]">
          Um usuário (login) só pode ser criado para uma Pessoa já cadastrada que ainda não tenha
          um usuário vinculado.
        </p>
        <Select
          label="Pessoa"
          name="pessoa"
          required
          value={novoPessoaId}
          onChange={(e) => setNovoPessoaId(e.target.value)}
          options={[
            { value: '', label: 'Selecione uma pessoa...' },
            ...pessoasDisponiveis.map((p) => ({ value: p.id, label: p.nome }))
          ]}
        />
        {pessoasDisponiveis.length === 0 && (
          <p className="text-xs text-[#F8D800]">
            Nenhuma pessoa disponível — todas as pessoas cadastradas já possuem um usuário, ou
            nenhuma pessoa foi cadastrada ainda.
          </p>
        )}
        <Input
          label="E-mail"
          name="email"
          type="email"
          required
          value={novoEmail}
          onChange={(e) => setNovoEmail(e.target.value)}
        />
        <Input
          label="Senha provisória"
          name="senha"
          type="password"
          required
          helperText="Mínimo de 8 caracteres."
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
        />
        </form>
      </Modal>

      {/* Modal: Gerenciar Perfis do Usuário */}
      <Modal
        isOpen={profilesModalUser !== null}
        onClose={() => setProfilesModalUser(null)}
        title={`Perfis de ${profilesModalUser?.name ?? ''}`}
      >
        <p className="text-xs text-[#727A74]">
          Marque os perfis que este usuário deve ter. Alterações são aplicadas imediatamente.
        </p>
        <div className="space-y-2">
          {allProfiles.map((perfil) => {
            const vinculado = profilesModalUser?.perfis.some((p) => p.perfilId === perfil.id) ?? false;
            return (
              <label
                key={perfil.id}
                className="flex items-center justify-between gap-3 p-3 bg-[#0F1210] border border-[#222824] rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={vinculado}
                    disabled={togglingProfileId === perfil.id || !perfil.ativo}
                    onChange={() => handleToggleProfile(perfil, vinculado)}
                    className="w-4 h-4 accent-[#004922]"
                  />
                  <span className="text-sm text-white">{perfil.nome}</span>
                </div>
                {!perfil.ativo && <Badge variant="neutral">Inativo</Badge>}
              </label>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
