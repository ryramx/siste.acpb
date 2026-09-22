import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Calendar, Clock, MapPin, Users, UserCheck, ArrowRight, Trash2, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { StatCard } from '../../components/ui/StatCard';
import { eventService } from '../../services/domainServices';
import { EventItem } from '../../types/domain';
import { EventFormFields, EventFormValues } from './EventFormFields';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  // Incrementar dispara o efeito de novo. Recarregar a página inteira seria mais simples,
  // mas custaria ao usuário o estado da navegação para repetir uma única requisição.
  const [tentativa, setTentativa] = useState(0);
  const [edicao, setEdicao] = useState<EventFormValues | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setErroCarregamento(null);
    // Sem o catch, uma falha da API deixava a tela em "Carregando evento..." indefinidamente,
    // sem dizer o que aconteceu — o pior dos dois mundos para quem esta usando o sistema.
    eventService
      .getById(id)
      .then((data) => setEvent(data || null))
      .catch((err) => {
        setErroCarregamento(
          err instanceof Error ? err.message : 'Não foi possível carregar o evento.'
        );
      })
      .finally(() => setLoading(false));
  }, [id, tentativa]);

  const abrirEdicao = () => {
    if (!event) return;
    setEdicao({
      title: event.title,
      description: event.description,
      date: event.date,
      // O <input type="time"> não aceita o "HH:MM:SS" que a API devolve; corta os segundos.
      time: (event.time ?? '').slice(0, 5),
      location: event.location,
      maxSlots: event.maxSlots ?? 0,
      requiresRegistration: event.requiresRegistration
    });
  };

  const salvarEdicao = async () => {
    if (!event || !edicao) return;
    setSalvando(true);
    try {
      await eventService.update(event.id, { ...edicao, maxSlots: edicao.maxSlots || null });
      addToast({
        type: 'success',
        title: 'Evento atualizado',
        message: `${edicao.title} foi salvo.`
      });
      setEdicao(null);
      // Recarrega em vez de confiar no retorno: a contagem de inscritos e o nome do
      // responsável não vêm no PUT, e a tela os exibe.
      setTentativa((n) => n + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível salvar', message });
    } finally {
      setSalvando(false);
    }
  };

  const excluirEvento = async () => {
    if (!event) return;
    setExcluindo(true);
    try {
      await eventService.remove(event.id);
      addToast({
        type: 'success',
        title: 'Evento excluído',
        message: `${event.title} foi removido da agenda.`
      });
      navigate('/eventos');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível excluir', message });
      setExcluindo(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-[#AEB5B0]">Carregando evento...</div>;

  if (erroCarregamento) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-white">Não foi possível carregar este evento.</p>
        <p className="text-xs text-[#AEB5B0]">{erroCarregamento}</p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate('/eventos')}>
            Voltar para a agenda
          </Button>
          <Button variant="primary" onClick={() => setTentativa((n) => n + 1)}>
            Tentar de novo
          </Button>
        </div>
      </div>
    );
  }

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
          <p className="text-xs text-[#AEB5B0] mt-1">Responsável: {event.responsibleName ?? 'Não definido'}</p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('edit_events') && (
            <>
              <Button
                variant="outline"
                onClick={abrirEdicao}
                leftIcon={<Pencil className="w-4 h-4" />}
              >
                Editar
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmarExclusao(true)}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Excluir evento
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate(`/eventos/${event.id}/inscricoes`)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Ver inscrições
          </Button>
        </div>
      </div>

      {/* KPIs de Vagas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Vagas Totais" value={event.maxSlots ?? 'Sem limite'} icon={<Users className="w-5 h-5" />} accentColor="neutral" />
        <StatCard title="Inscritos Confirmados" value={event.filledSlots} icon={<UserCheck className="w-5 h-5" />} accentColor="green" />
        <StatCard
          title="Vagas Disponíveis"
          value={event.maxSlots !== null ? event.maxSlots - event.filledSlots : 'Sem limite'}
          icon={<Calendar className="w-5 h-5" />}
          accentColor="yellow"
        />
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

      <Modal isOpen={edicao !== null} onClose={() => setEdicao(null)} title="Editar evento">
        {edicao && (
          <EventFormFields
            values={edicao}
            onChange={setEdicao}
            onSubmit={salvarEdicao}
            onCancel={() => setEdicao(null)}
            submitLabel="Salvar alterações"
            saving={salvando}
          />
        )}
      </Modal>

      <Modal
        isOpen={confirmarExclusao}
        onClose={() => setConfirmarExclusao(false)}
        title="Excluir evento"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#AEB5B0]">
            Excluir <strong className="text-white">{event.title}</strong> de{' '}
            {event.date}? Esta ação não pode ser desfeita.
          </p>
          {event.filledSlots > 0 && (
            <p className="text-xs text-red-400">
              {event.filledSlots === 1
                ? 'A inscrição deste evento também será apagada.'
                : `As ${event.filledSlots} inscrições deste evento também serão apagadas.`}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmarExclusao(false)} disabled={excluindo}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={excluirEvento} disabled={excluindo}>
              {excluindo ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
