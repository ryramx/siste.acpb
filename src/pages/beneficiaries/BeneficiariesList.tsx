import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, Search, Eye, Shield, Lock, Plus } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { beneficiaryService } from '../../services/domainServices';
import { Beneficiary } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { NovoVinculoModal } from '../../components/common/NovoVinculoModal';
import { useAuth } from '../../contexts/AuthContext';

export const BeneficiariesList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ageFilter, setAgeFilter] = useState('TODAS');

  const carregar = () => {
    setLoading(true);
    beneficiaryService
      .getAll()
      .then(setBeneficiaries)
      .catch(() => setBeneficiaries([]))
      .finally(() => setLoading(false));
  };

  useEffect(carregar, []);

  const filteredBeneficiaries = beneficiaries.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAge = ageFilter === 'TODAS' || b.ageGroup === ageFilter;
    return matchesSearch && matchesAge;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-[#004922]" />
            Beneficiários Assistidos
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            Módulo social com acesso restrito e histórico protegido de atendimentos comunitários.
          </p>
        </div>
        {hasPermission('edit_beneficiaries') && (
          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Novo beneficiário
          </Button>
        )}
      </div>

      <NovoVinculoModal
        papel="beneficiario"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={carregar}
      />

      {/* Aviso de Dados Restritos/LGPD */}
      <div className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl flex items-center gap-3 text-xs text-[#AEB5B0]">
        <Lock className="w-4 h-4 text-[#F8D800] shrink-0" />
        <span>
          Apenas informações essenciais são exibidas nesta listagem por razões de privacidade e proteção social.
        </span>
      </div>

      {/* Filtros */}
      <div className="bg-[#181D1A] border border-[#222824] p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80">
          <Input
            placeholder="Buscar beneficiário pelo nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="w-full md:w-60">
          <Select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            options={[
              { value: 'TODAS', label: 'Todas as Faixas Etárias' },
              { value: 'Criança (0-12)', label: 'Crianças (0-12)' },
              { value: 'Adolescente (13-17)', label: 'Adolescentes (13-17)' },
              { value: 'Adulto (18-59)', label: 'Adultos (18-59)' },
              { value: 'Idoso (60+)', label: 'Idosos (60+)' }
            ]}
          />
        </div>
      </div>

      {/* Tabela de Beneficiários */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : filteredBeneficiaries.length === 0 ? (
        <EmptyState
          title="Nenhum beneficiário encontrado"
          description="Tente ajustar os filtros de busca para encontrar o registro desejado."
          actionLabel="Limpar filtros"
          onAction={() => {
            setSearchTerm('');
            setAgeFilter('TODAS');
          }}
        />
      ) : (
        <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
                <tr>
                  <th className="py-3.5 px-4">Nome do Assistido</th>
                  <th className="py-3.5 px-4">Faixa Etária</th>
                  <th className="py-3.5 px-4">Situação</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222824]">
                {filteredBeneficiaries.map((b) => (
                  <tr key={b.id} className="hover:bg-[#1e2521] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{b.name}</td>
                    <td className="py-3.5 px-4 text-[#AEB5B0] text-xs">{b.ageGroup}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={b.status === 'EM_ATENDIMENTO' ? 'success' : 'neutral'}>
                        {b.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/beneficiarios/${b.id}`)}
                        className="p-1.5 text-[#AEB5B0] hover:text-white hover:bg-[#222824] rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                      >
                        <Eye className="w-4 h-4" /> Detalhes & Timeline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
