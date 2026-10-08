import React, { useEffect, useState } from 'react';
import { Users, Search, Clock, Plus, Pencil } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import { NAO_INFORMADA, volunteerService } from '../../services/domainServices';
import { Volunteer } from '../../types/domain';
import { NovoVinculoModal } from '../../components/common/NovoVinculoModal';
import { EditarVoluntarioModal } from '../../components/common/EditarVoluntarioModal';
import { separarDisponibilidade } from '../../utils/disponibilidade';
import { useAuth } from '../../contexts/AuthContext';
import { opcoesDeContato } from '../../utils/contato';

export const VolunteersList: React.FC = () => {
  const { hasPermission } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Volunteer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('TODAS');

  const carregar = () => {
    setLoading(true);
    volunteerService
      .getAll()
      .then(setVolunteers)
      .catch(() => setVolunteers([]))
      .finally(() => setLoading(false));
  };

  useEffect(carregar, []);

  // E daqui que sai o crescimento da lista de opcoes: tudo que ja foi gravado em algum
  // voluntario vira caixa marcavel nos dois modais. NAO_INFORMADA nao entra porque e texto
  // de exibicao, nao uma disponibilidade real.
  const opcoesEmUso = volunteers.flatMap((v) =>
    v.availability === NAO_INFORMADA ? [] : separarDisponibilidade(v.availability)
  );

  // A área é texto livre no cadastro ("Cozinha", "Pedagogia"...), então o filtro oferece as
  // áreas que existem de fato. Uma lista fixa deixava de fora qualquer área fora dela.
  const areasEmUso = [...new Set(volunteers.map((v) => v.area))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  const filteredVolunteers = volunteers.filter((v) => {
    // O subtitulo da tela promete busca por "dias disponiveis", entao a disponibilidade
    // tambem entra no termo -- antes so nome e habilidades eram considerados.
    const termo = searchTerm.toLowerCase();
    const matchesSearch =
      v.name.toLowerCase().includes(termo) ||
      v.skills.some((s) => s.toLowerCase().includes(termo)) ||
      v.availability.toLowerCase().includes(termo);

    const matchesArea = areaFilter === 'TODAS' || v.area === areaFilter;

    return matchesSearch && matchesArea;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <Users className="w-6 h-6 text-acpb-yellow" />
            Voluntários da ACPB
          </h1>
          <p className="text-sm text-text-secondary">
            Encontre voluntários por habilidades, área de atuação e dias disponíveis.
          </p>
        </div>
        {hasPermission('edit_volunteers') && (
          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Novo voluntário
          </Button>
        )}
      </div>

      <NovoVinculoModal
        papel="voluntario"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={carregar}
        opcoesDisponibilidade={opcoesEmUso}
      />

      <EditarVoluntarioModal
        voluntario={emEdicao}
        onClose={() => setEmEdicao(null)}
        onSaved={carregar}
        opcoesDisponibilidade={opcoesEmUso}
      />

      {/* Filtros e Busca */}
      <div className="bg-surface-card border border-surface-border p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80">
          <Input
            placeholder="Buscar por nome ou habilidade (ex: Pedagogia)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="w-full md:w-60">
          <Select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            options={[
              { value: 'TODAS', label: 'Todas as Áreas' },
              ...areasEmUso.map((area) => ({ value: area, label: area }))
            ]}
          />
        </div>
      </div>

      {/* Grid Híbrido de Cards de Voluntários */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[250px] w-full" />
          <Skeleton className="h-[250px] w-full" />
          <Skeleton className="h-[250px] w-full" />
        </div>
      ) : filteredVolunteers.length === 0 ? (
        <EmptyState
          title="Nenhum voluntário encontrado"
          description="Ajuste os filtros ou o termo de busca para tentar novamente."
          actionLabel="Limpar filtros"
          onAction={() => {
            setSearchTerm('');
            setAreaFilter('TODAS');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVolunteers.map((v) => (
            <div
              key={v.id}
              className="bg-surface-card border border-surface-border rounded-2xl p-5 hover:border-acpb-green/60 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar pessoaId={v.pessoaId} nome={v.name} temFoto={v.temFoto} size="lg" />
                    <div>
                      <h3 className="text-base font-bold text-white font-heading">{v.name}</h3>
                      <span className="text-xs text-acpb-yellow font-medium">{v.area}</span>
                    </div>
                  </div>
                  <Badge variant={v.status === 'ATIVO' ? 'success' : 'neutral'}>{v.status}</Badge>
                </div>

                {/* Habilidades Badges */}
                <div className="mb-4">
                  <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold block mb-1.5">
                    Habilidades & Competências:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {v.skills.length > 0 ? (
                      v.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="bg-surface-bg border border-surface-border text-xs text-text-secondary px-2 py-0.5 rounded-md"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      // Sem isto o rotulo "Habilidades" ficava sozinho, colado na caixa de
                      // disponibilidade logo abaixo, e parecia que o relogio era dali.
                      <span className="text-xs text-text-muted italic">Nenhuma informada</span>
                    )}
                  </div>
                </div>

                {/* Disponibilidade */}
                <div className="space-y-1.5 text-xs text-text-secondary bg-surface-bg p-3 rounded-xl border border-surface-border mb-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-acpb-yellow shrink-0" />
                    <span>
                      <span className="text-text-muted">Disponibilidade: </span>
                      {v.availability}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                {hasPermission('update_volunteers') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmEdicao(v)}
                    leftIcon={<Pencil className="w-3.5 h-3.5" />}
                  >
                    Editar
                  </Button>
                )}
                {/* Sem telefone nem e-mail no cadastro não há como contatar, e o botão some. */}
                {opcoesDeContato(v).map((opcao) => (
                  <a
                    key={opcao.rotulo}
                    href={opcao.href}
                    target={opcao.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    aria-label={`${opcao.rotulo} de ${v.name}`}
                    className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 border border-surface-border bg-surface-card hover:bg-surface-border text-white px-3 py-1.5 text-xs"
                  >
                    {opcao.rotulo}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
