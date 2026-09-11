import React, { useEffect, useState } from 'react';
import { Users, Search, Clock, Award, Calendar, CheckCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import { volunteerService } from '../../services/domainServices';
import { Volunteer } from '../../types/domain';

export const VolunteersList: React.FC = () => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('TODAS');

  useEffect(() => {
    volunteerService.getAll().then((data) => {
      setVolunteers(data);
      setLoading(false);
    });
  }, []);

  const filteredVolunteers = volunteers.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesArea = areaFilter === 'TODAS' || v.area === areaFilter;

    return matchesSearch && matchesArea;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <Users className="w-6 h-6 text-[#F8D800]" />
            Voluntários da ACPB
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            Encontre voluntários por habilidades, área de atuação e dias disponíveis.
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-[#181D1A] border border-[#222824] p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
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
              { value: 'Educação', label: 'Educação' },
              { value: 'Saúde', label: 'Saúde' },
              { value: 'Assistência Social', label: 'Assistência Social' },
              { value: 'Eventos', label: 'Eventos' }
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
              className="bg-[#181D1A] border border-[#222824] rounded-2xl p-5 hover:border-[#004922]/60 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar pessoaId={v.pessoaId} nome={v.name} temFoto={v.temFoto} size="lg" />
                    <div>
                      <h3 className="text-base font-bold text-white font-heading">{v.name}</h3>
                      <span className="text-xs text-[#F8D800] font-medium">{v.area}</span>
                    </div>
                  </div>
                  <Badge variant={v.status === 'ATIVO' ? 'success' : 'neutral'}>{v.status}</Badge>
                </div>

                {/* Habilidades Badges */}
                <div className="mb-4">
                  <span className="text-[11px] text-[#727A74] uppercase tracking-wider font-semibold block mb-1.5">
                    Habilidades & Competências:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {v.skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="bg-[#0F1210] border border-[#222824] text-xs text-[#AEB5B0] px-2 py-0.5 rounded-md"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Disponibilidade */}
                <div className="space-y-1.5 text-xs text-[#AEB5B0] bg-[#0F1210] p-3 rounded-xl border border-[#222824] mb-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#F8D800]" />
                    <span>{v.availability}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-[#222824]">
                <Button variant="outline" size="sm">
                  Contatar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
