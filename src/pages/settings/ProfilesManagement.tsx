import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/apiClient';
import { profileService, permissionService } from '../../services/settingsService';
import { SystemProfile, SystemPermission } from '../../types/settings';

const PERFIL_ADMINISTRADOR = 'Administrador';

function mensagemDeErro(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export const ProfilesManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const podeGerenciar = hasPermission('manage_users');

  const [profiles, setProfiles] = useState<SystemProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [permissionsModalProfile, setPermissionsModalProfile] = useState<SystemProfile | null>(null);
  const [allPermissions, setAllPermissions] = useState<SystemPermission[]>([]);
  const [vinculadas, setVinculadas] = useState<Set<string>>(new Set());
  const [togglingPermissionId, setTogglingPermissionId] = useState<string | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await profileService.getAll();
      setProfiles(data);
    } catch (err) {
      const message = mensagemDeErro(err, 'Erro ao carregar perfis');
      setError(message);
      addToast({ type: 'error', title: 'Erro ao carregar perfis', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleAtivo = async (profile: SystemProfile) => {
    setTogglingId(profile.id);
    try {
      await profileService.setAtivo(profile.id, !profile.ativo);
      addToast({
        type: 'success',
        title: profile.ativo ? 'Perfil desativado' : 'Perfil reativado',
        message: `${profile.nome} foi ${profile.ativo ? 'desativado' : 'reativado'} com sucesso.`
      });
      fetchProfiles();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      addToast({
        type: 'error',
        title: status === 409 ? 'Ação bloqueada pelo sistema' : 'Erro ao alterar status do perfil',
        message: mensagemDeErro(err, 'Não foi possível alterar o status do perfil')
      });
    } finally {
      setTogglingId(null);
    }
  };

  const openPermissionsModal = async (profile: SystemProfile) => {
    setPermissionsModalProfile(profile);
    try {
      const [permissoes, vinculos] = await Promise.all([
        permissionService.getAll(),
        profileService.listarPermissoesVinculadas(profile.id)
      ]);
      setAllPermissions(permissoes);
      setVinculadas(vinculos);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erro ao carregar permissões',
        message: mensagemDeErro(err, 'Não foi possível carregar as permissões deste perfil')
      });
    }
  };

  const handleTogglePermission = async (permissao: SystemPermission) => {
    if (!permissionsModalProfile) return;
    const jaVinculada = vinculadas.has(permissao.id);
    setTogglingPermissionId(permissao.id);
    try {
      if (jaVinculada) {
        await profileService.desvincularPermissao(permissionsModalProfile.id, permissao.id);
      } else {
        await profileService.vincularPermissao(permissionsModalProfile.id, permissao.id);
      }
      const atualizadas = await profileService.listarPermissoesVinculadas(
        permissionsModalProfile.id
      );
      setVinculadas(atualizadas);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      addToast({
        type: 'error',
        title: status === 409 ? 'Ação bloqueada pelo sistema' : 'Erro ao alterar permissão',
        message: mensagemDeErro(err, 'Não foi possível alterar esta permissão')
      });
    } finally {
      setTogglingPermissionId(null);
    }
  };

  const permissoesPorModulo = allPermissions.reduce<Record<string, SystemPermission[]>>(
    (acc, p) => {
      (acc[p.modulo] ??= []).push(p);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <EmptyState
            title="Erro ao carregar perfis"
            description={error}
            actionLabel="Tentar novamente"
            onAction={fetchProfiles}
          />
        ) : profiles.length === 0 ? (
          <EmptyState
            title="Nenhum perfil cadastrado"
            description="Nenhum perfil de acesso foi encontrado no sistema."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
                <tr>
                  <th className="py-3.5 px-4">Perfil</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Descrição</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222824]">
                {profiles.map((p) => {
                  const protegido = p.nome === PERFIL_ADMINISTRADOR;
                  return (
                    <tr key={p.id} className="hover:bg-[#1e2521] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {p.nome}
                          {protegido && (
                            <Lock className="w-3.5 h-3.5 text-[#F8D800]" aria-label="Perfil protegido" />
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell text-[#AEB5B0] text-xs">
                        {p.descricao || 'Sem descrição'}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={p.ativo ? 'success' : 'danger'}>
                          {p.ativo ? 'ATIVO' : 'INATIVO'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {podeGerenciar && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPermissionsModal(p)}
                              leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                            >
                              Permissões
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              isLoading={togglingId === p.id}
                              disabled={protegido && p.ativo}
                              title={
                                protegido && p.ativo
                                  ? 'O perfil Administrador não pode ser desativado'
                                  : undefined
                              }
                              onClick={() => handleToggleAtivo(p)}
                            >
                              {p.ativo ? 'Desativar' : 'Reativar'}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Permissões do Perfil */}
      <Modal
        isOpen={permissionsModalProfile !== null}
        onClose={() => setPermissionsModalProfile(null)}
        title={`Permissões de ${permissionsModalProfile?.nome ?? ''}`}
        maxWidth="lg"
      >
        {permissionsModalProfile?.nome === PERFIL_ADMINISTRADOR && (
          <p className="text-xs text-[#F8D800] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Perfil protegido: o Administrador sempre tem todas as permissões e elas não podem ser
            removidas por aqui.
          </p>
        )}
        <div className="space-y-4">
          {Object.entries(permissoesPorModulo).map(([modulo, permissoes]) => (
            <div key={modulo}>
              <h4 className="text-xs font-bold text-[#AEB5B0] uppercase tracking-wider mb-1.5">
                {modulo}
              </h4>
              <div className="space-y-1.5">
                {permissoes.map((permissao) => {
                  const marcada = vinculadas.has(permissao.id);
                  const protegida = permissionsModalProfile?.nome === PERFIL_ADMINISTRADOR;
                  return (
                    <label
                      key={permissao.id}
                      className="flex items-center justify-between gap-3 p-2.5 bg-[#0F1210] border border-[#222824] rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={marcada}
                          disabled={
                            togglingPermissionId === permissao.id || protegida || !permissao.ativo
                          }
                          onChange={() => handleTogglePermission(permissao)}
                          className="w-4 h-4 accent-[#004922]"
                        />
                        <span className="text-sm text-white">{permissao.acao}</span>
                      </div>
                      {!permissao.ativo && <Badge variant="neutral">Inativa</Badge>}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
