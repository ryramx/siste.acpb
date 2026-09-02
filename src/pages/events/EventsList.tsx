import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, MapPin, Clock, Users, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { eventService } from '../../services/domainServices';
import { EventItem } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const EventsList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Modal Novo Evento
  const [modalOpen, setModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '2026-09-15',
    time: '08:00',
    location: 'Sede ACPB',
    responsibleName: 'João da Silva',
    category: 'Reunião' as EventItem['category'],
    targetAudience: 'Comunidade',
    maxSlots: 50,
    requiresRegistration: true,
    status: 'AGENDADO' as EventItem['status']
  });

  const fetchEvents = async () => {
    const data = await eventService.getAll();
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await eventService.create(newEvent);
      addToast({
        type: 'success',
        title: 'Evento criado',
        message: 'Novo evento adicionado à agenda ACPB com sucesso.'
      });
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao criar evento' });
    }
  };

  // Render do Calendário Visual Mensal Simulado
  const renderCalendar = () => {
    const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

    return (
      <div className="bg-[#181D1A] border border-[#222824] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222824] pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white font-heading">Setembro 2026</h2>
            <Badge variant="success">Mês Atual</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Wrapper responsivo para o calendário */}
        <div className="overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
          <div className="min-w-[600px]">
            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[#AEB5B0] mb-2">
              <div>DOM</div>
              <div>SEG</div>
              <div>TER</div>
              <div>QUA</div>
              <div>QUI</div>
              <div>SEX</div>
              <div>SÁB</div>
            </div>

            {/* Grade de Dias */}
            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map((day) => {
                const dayStr = day < 10 ? `0${day}` : `${day}`;
                const matchedEvents = events.filter((e) => e.date === `2026-09-${dayStr}`);

                return (
                  <div
                    key={day}
                    className={`min-h-[90px] bg-[#0F1210] border border-[#222824] rounded-xl p-2 flex flex-col justify-between hover:border-[#004922] transition-colors ${
                      matchedEvents.length > 0 ? 'bg-[#004922]/10 border-[#004922]/40' : ''
                    }`}
                  >
                    <span className={`text-xs font-bold ${matchedEvents.length > 0 ? 'text-[#F8D800]' : 'text-[#727A74]'}`}>
                      {day}
                    </span>

                    <div className="space-y-1 mt-1">
                      {matchedEvents.map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => navigate(`/eventos/${evt.id}`)}
                          className="bg-[#004922] text-white p-1 rounded text-[10px] font-semibold truncate cursor-pointer hover:bg-[#00632e]"
                          title={evt.title}
                        >
                          {evt.time} • {evt.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#F8D800]" />
            Agenda e Eventos ACPB
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            Calendário de atividades, mutirões, reuniões e gestão de inscrições.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#0F1210] p-1 border border-[#222824] rounded-lg">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 text-xs font-medium rounded ${
                viewMode === 'calendar' ? 'bg-[#004922] text-white' : 'text-[#AEB5B0]'
              }`}
            >
              Calendário
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-xs font-medium rounded ${
                viewMode === 'list' ? 'bg-[#004922] text-white' : 'text-[#AEB5B0]'
              }`}
            >
              Lista
            </button>
          </div>

          {hasPermission('edit_events') && (
            <Button
              variant="primary"
              onClick={() => setModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Novo evento
            </Button>
          )}
        </div>
      </div>

      {/* Visualização Calendário ou Lista */}
      {viewMode === 'calendar' ? (
        renderCalendar()
      ) : (
        <div className="space-y-3">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="bg-[#181D1A] border border-[#222824] p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-[#004922]/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#004922]/30 border border-[#004922] flex flex-col items-center justify-center text-white shrink-0">
                  <span className="text-[10px] font-bold uppercase">{evt.date.split('-')[1] === '09' ? 'SET' : 'AGO'}</span>
                  <span className="text-sm font-bold text-[#F8D800]">{evt.date.split('-')[2]}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white font-heading">{evt.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-[#AEB5B0] mt-1">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#F8D800]" /> {evt.time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#F8D800]" /> {evt.location}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {evt.filledSlots}/{evt.maxSlots} vagas</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/eventos/${evt.id}`)}
                leftIcon={<Eye className="w-4 h-4" />}
              >
                Detalhes
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Evento */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Evento Institucional">
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <Input
            label="Título do Evento"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data"
              type="date"
              value={newEvent.date}
              onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              required
            />
            <Input
              label="Horário"
              type="time"
              value={newEvent.time}
              onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
              required
            />
          </div>
          <Input
            label="Local"
            value={newEvent.location}
            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoria"
              value={newEvent.category}
              onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value as any })}
              options={[
                { value: 'Reunião', label: 'Reunião' },
                { value: 'Mutirão', label: 'Mutirão' },
                { value: 'Acampamento', label: 'Acampamento' },
                { value: 'Capacitação', label: 'Capacitação' }
              ]}
            />
            <Input
              label="Vagas Máximas"
              type="number"
              value={newEvent.maxSlots}
              onChange={(e) => setNewEvent({ ...newEvent, maxSlots: Number(e.target.value) })}
              required
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar Evento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
