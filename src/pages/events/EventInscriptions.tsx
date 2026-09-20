import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Users, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { eventService } from '../../services/domainServices';
import { EventItem } from '../../types/domain';
import { exibirTelefone } from '../../utils/mascaras';

export const EventInscriptions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      eventService.getById(id).then((data) => {
        setEvent(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div className="p-8 text-center text-[#AEB5B0]">Carregando inscrições...</div>;
  if (!event) return <div className="p-8 text-center text-white">Evento não encontrado.</div>;

  const inscriptions = event.inscriptions || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <nav className="flex items-center gap-2 text-xs text-[#AEB5B0]">
        <Link to="/eventos" className="hover:text-white transition-colors">Eventos</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/eventos/${event.id}`} className="hover:text-white transition-colors">{event.title}</Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#222824]" />
        <span className="text-[#F8D800] font-semibold">Inscrições</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">
            Inscrições: {event.title}
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            Controle de presenças e confirmação de participantes do evento.
          </p>
        </div>
      </div>

      {/* Cards de Resumo de Vagas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Vagas Totais" value={event.maxSlots ?? 'Sem limite'} icon={<Users className="w-5 h-5" />} accentColor="neutral" />
        <StatCard title="Inscritos" value={event.filledSlots} icon={<CheckCircle className="w-5 h-5" />} accentColor="green" />
        <StatCard
          title="Disponíveis"
          value={event.maxSlots !== null ? event.maxSlots - event.filledSlots : 'Sem limite'}
          icon={<Clock className="w-5 h-5" />}
          accentColor="yellow"
        />
      </div>

      {/* Tabela de Inscrições */}
      <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
            <tr>
              <th className="py-3.5 px-4">Participante</th>
              <th className="py-3.5 px-4">Data da Inscrição</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222824]">
            {inscriptions.map((ins) => (
              <tr key={ins.id} className="hover:bg-[#1e2521] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">
                  <div>{ins.participantName}</div>
                  <div className="text-xs text-[#727A74]">{exibirTelefone(ins.participantPhone)}</div>
                </td>
                <td className="py-3.5 px-4 text-[#AEB5B0] text-xs">{ins.inscriptionDate}</td>
                <td className="py-3.5 px-4">
                  <Badge variant={ins.status === 'CONFIRMADO' ? 'success' : 'warning'}>
                    {ins.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
