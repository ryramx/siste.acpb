import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Calendar, Clock, MapPin, Users, UserCheck, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { eventService } from '../../services/domainServices';
import { EventItem } from '../../types/domain';

export const EventDetails: React.FC = () => {
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

  if (loading) return <div className="p-8 text-center text-[#AEB5B0]">Carregando evento...</div>;
  if (!event) return <div className="p-8 text-center text-white">Evento não encontrado.</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <nav className="flex items-center gap-2 text-xs text-[#AEB5B0]">
        <Link to="/eventos" className="hover:text-white transition-colors">
          Eventos
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#F8D800] font-semibold">{event.title}</span>
      </nav>

      {/* Header Evento */}
      <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white font-heading">{event.title}</h1>
            <Badge variant="success">{event.status}</Badge>
          </div>
          <p className="text-xs text-[#AEB5B0] mt-1">Categoria: {event.category} • Responsável: {event.responsibleName}</p>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate(`/eventos/${event.id}/inscricoes`)}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Ver inscrições
        </Button>
      </div>

      {/* KPIs de Vagas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Vagas Totais" value={event.maxSlots} icon={<Users className="w-5 h-5" />} accentColor="neutral" />
        <StatCard title="Inscritos Confirmados" value={event.filledSlots} icon={<UserCheck className="w-5 h-5" />} accentColor="green" />
        <StatCard title="Vagas Disponíveis" value={event.maxSlots - event.filledSlots} icon={<Calendar className="w-5 h-5" />} accentColor="yellow" />
      </div>

      {/* Informações detalhadas */}
      <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-semibold text-[#F8D800] uppercase tracking-wider border-b border-[#222824] pb-2">
          Informações Básicas do Evento
        </h3>
        <p className="text-sm text-white">{event.description}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#AEB5B0] pt-2">
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#F8D800]" /> Data: <strong className="text-white">{event.date}</strong></div>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#F8D800]" /> Horário: <strong className="text-white">{event.time}</strong></div>
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#F8D800]" /> Local: <strong className="text-white">{event.location}</strong></div>
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-[#F8D800]" /> Público-alvo: <strong className="text-white">{event.targetAudience}</strong></div>
        </div>
      </div>
    </div>
  );
};
