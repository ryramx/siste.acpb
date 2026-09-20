import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Phone, Mail, Eye, Edit, Trash2, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { apenasDigitos, exibirCPF, exibirTelefone } from '../../utils/mascaras';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { memberService } from '../../services/domainServices';
import { Member } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const MembersList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  // Modal de Exclusão/Desativação
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await memberService.getAll();
      setMembers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar membros';
      setError(message);
      addToast({ type: 'error', title: 'Erro ao carregar membros', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apenasDigitos(m.cpf).includes(apenasDigitos(searchTerm)) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'TODOS' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    try {
      await memberService.delete(selectedMember.id);
      addToast({
        type: 'success',
        title: 'Membro desativado',
        message: `${selectedMember.name} foi desativado com sucesso.`
      });
      setDeleteModalOpen(false);
      fetchMembers();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao desativar membro' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#004922]" />
            Membros da Associação
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            Gerenciamento completo do corpo de associados da ACPB.
          </p>
        </div>

        {hasPermission('edit_members') && (
          <Button
            variant="primary"
            onClick={() => navigate('/membros/novo')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Novo membro
          </Button>
        )}
      </div>

      {/* Busca e Filtros */}
      <div className="bg-[#181D1A] border border-[#222824] p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80">
          <Input
            placeholder="Buscar por nome, CPF, e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'TODOS', label: 'Todos os Status' },
                { value: 'ATIVO', label: 'Ativo' },
                { value: 'INATIVO', label: 'Inativo' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Tabela ou Estados de Interface */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <EmptyState
          title="Erro ao carregar membros"
          description={error}
          actionLabel="Tentar novamente"
          onAction={fetchMembers}
        />
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          title="Nenhum membro encontrado"
          description="Não foram encontrados membros para os filtros selecionados."
          actionLabel={hasPermission('edit_members') ? 'Cadastrar membro' : undefined}
          onAction={() => navigate('/membros/novo')}
        />
      ) : (
        <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
                <tr>
                  <th className="py-3.5 px-4">Membro</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Contato</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Cargo</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222824]">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-[#1e2521] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar pessoaId={m.pessoaId} nome={m.name} temFoto={m.temFoto} size="sm" />
                        <div>
                          <div className="font-semibold text-white">{m.name}</div>
                          <div className="text-xs text-[#727A74]">CPF: {exibirCPF(m.cpf)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell text-[#AEB5B0]">
                      <div className="flex flex-col text-xs space-y-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#F8D800]" /> {exibirTelefone(m.phone)}
                        </span>
                        <span className="flex items-center gap-1 text-[#727A74]">
                          <Mail className="w-3 h-3" /> {m.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 hidden sm:table-cell text-[#AEB5B0] text-xs">
                      {m.cargoName || 'Nenhum'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={m.status === 'ATIVO' ? 'success' : 'danger'}>
                        {m.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/membros/${m.id}`)}
                          className="p-1.5 text-[#AEB5B0] hover:text-white hover:bg-[#222824] rounded-lg transition-colors"
                          title="Visualizar detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission('edit_members') && (
                          <button
                            onClick={() => navigate(`/membros/${m.id}`)}
                            className="p-1.5 text-[#AEB5B0] hover:text-[#F8D800] hover:bg-[#222824] rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('delete_members') && (
                          <button
                            onClick={() => {
                              setSelectedMember(m);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors"
                            title="Desativar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Crítica */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirmar Desativação de Membro"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteMember}>
              Sim, desativar membro
            </Button>
          </>
        }
      >
        <p>
          Tem certeza de que deseja desativar o cadastro de{' '}
          <strong className="text-white">{selectedMember?.name}</strong>?
        </p>
        <p className="text-xs text-red-400 mt-2">
          O membro passará para a situação de inativo no sistema.
        </p>
      </Modal>
    </div>
  );
};
