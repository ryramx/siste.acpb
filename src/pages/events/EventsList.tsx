import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, MapPin, Clock, Users, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { eventService } from '../../services/domainServices';
import { EventItem } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

type ViewMode = 'mes' | 'semana' | 'dia' | 'lista';

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function formatarDataLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function inicioDaSemana(d: Date): Date {
  const inicio = new Date(d);
  inicio.setDate(inicio.getDate() - inicio.getDay());
  return inicio;
}

export const EventsList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('mes');
  const [dataReferencia, setDataReferencia] = useState(() => new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: formatarDataLocal(new Date()),
    time: '08:00',
    location: 'Sede ACPB',
    maxSlots: 50,
    requiresRegistration: true
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
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Erro ao criar evento', message });
    }
  };

  const eventosPorData = useMemo(() => {
    const mapa = new Map<string, EventItem[]>();
    for (const e of events) {
      const lista = mapa.get(e.date) ?? [];
      lista.push(e);
      mapa.set(e.date, lista);
    }
    return mapa;
  }, [events]);

  const navegarPeriodo = (direcao: 1 | -1) => {
    setDataReferencia((atual) => {
      const proxima = new Date(atual);
      if (viewMode === 'mes') proxima.setMonth(proxima.getMonth() + direcao);
      else if (viewMode === 'semana') proxima.setDate(proxima.getDate() + direcao * 7);
      else proxima.setDate(proxima.getDate() + direcao);
      return proxima;
    });
  };

  const renderMes = () => {
    const ano = dataReferencia.getFullYear();
    const mes = dataReferencia.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const offset = primeiroDia.getDay();
    const celulas: (Date | null)[] = [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: diasNoMes }, (_, i) => new Date(ano, mes, i + 1))
    ];
    const hojeStr = formatarDataLocal(new Date());

    return (
      <div className="bg-[#181D1A] border border-[#222824] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222824] pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white font-heading">
              {NOMES_MES[mes]} {ano}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navegarPeriodo(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setDataReferencia(new Date())}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={() => navegarPeriodo(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[#AEB5B0] mb-2">
              {DIAS_SEMANA.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {celulas.map((dia, idx) => {
                if (!dia) return <div key={`vazio-${idx}`} className="min-h-[90px]" />;
                const dataStr = formatarDataLocal(dia);
                const matchedEvents = eventosPorData.get(dataStr) ?? [];
                const ehHoje = dataStr === hojeStr;
                return (
                  <div
                    key={dataStr}
                    className={`min-h-[90px] bg-[#0F1210] border rounded-xl p-2 flex flex-col justify-between hover:border-[#004922] transition-colors ${
                      matchedEvents.length > 0 ? 'bg-[#004922]/10 border-[#004922]/40' : 'border-[#222824]'
                    } ${ehHoje ? 'ring-1 ring-[#F8D800]' : ''}`}
                  >
                    <span className={`text-xs font-bold ${matchedEvents.length > 0 ? 'text-[#F8D800]' : 'text-[#727A74]'}`}>
                      {dia.getDate()}
                    </span>
                    <div className="space-y-1 mt-1">
                      {matchedEvents.slice(0, 3).map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => navigate(`/eventos/${evt.id}`)}
                          className="bg-[#004922] text-white p-1 rounded text-[10px] font-semibold truncate cursor-pointer hover:bg-[#00632e]"
                          title={evt.title}
                        >
                          {evt.time ?? ''} {evt.title}
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

  const renderSemana = () => {
    const inicio = inicioDaSemana(dataReferencia);
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      return d;
    });
    const hojeStr = formatarDataLocal(new Date());

    return (
      <div className="bg-[#181D1A] border border-[#222824] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222824] pb-4">
          <h2 className="text-lg font-bold text-white font-heading">
            Semana de {dias[0].getDate()}/{dias[0].getMonth() + 1} a {dias[6].getDate()}/{dias[6].getMonth() + 1}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navegarPeriodo(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setDataReferencia(new Date())}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={() => navegarPeriodo(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {dias.map((dia) => {
            const dataStr = formatarDataLocal(dia);
            const matchedEvents = eventosPorData.get(dataStr) ?? [];
            const ehHoje = dataStr === hojeStr;
            return (
              <div key={dataStr} className={`bg-[#0F1210] border rounded-xl p-2 min-h-[120px] ${ehHoje ? 'ring-1 ring-[#F8D800]' : 'border-[#222824]'}`}>
                <div className="text-[10px] font-semibold text-[#AEB5B0] mb-1">
                  {DIAS_SEMANA[dia.getDay()]} {dia.getDate()}
                </div>
                <div className="space-y-1">
                  {matchedEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => navigate(`/eventos/${evt.id}`)}
                      className="bg-[#004922] text-white p-1 rounded text-[10px] font-semibold truncate cursor-pointer hover:bg-[#00632e]"
                      title={evt.title}
                    >
                      {evt.time ?? ''} {evt.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDia = () => {
    const dataStr = formatarDataLocal(dataReferencia);
    const matchedEvents = eventosPorData.get(dataStr) ?? [];
    return (
      <div className="bg-[#181D1A] border border-[#222824] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222824] pb-4">
          <h2 className="text-lg font-bold text-white font-heading">
            {DIAS_SEMANA[dataReferencia.getDay()]}, {dataReferencia.getDate()} de {NOMES_MES[dataReferencia.getMonth()]}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navegarPeriodo(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setDataReferencia(new Date())}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={() => navegarPeriodo(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
        {matchedEvents.length === 0 ? (
          <p className="text-xs text-[#727A74] text-center py-8">Nenhum evento neste dia.</p>
        ) : (
          <div className="space-y-3">
            {matchedEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => navigate(`/eventos/${evt.id}`)}
                className="bg-[#0F1210] border border-[#222824] p-4 rounded-xl flex items-center justify-between hover:border-[#004922]/50 transition-colors cursor-pointer"
              >
                <div>
                  <h3 className="text-sm font-bold text-white">{evt.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-[#AEB5B0] mt-1">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#F8D800]" /> {evt.time ?? 'Sem horário'}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#F8D800]" /> {evt.location}</span>
                  </div>
                </div>
                <Badge variant="success">{evt.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderLista = () => (
    <div className="space-y-3">
      {events.map((evt) => (
        <div
          key={evt.id}
          className="bg-[#181D1A] border border-[#222824] p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-[#004922]/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#004922]/30 border border-[#004922] flex flex-col items-center justify-center text-white shrink-0">
              <span className="text-[10px] font-bold uppercase">{NOMES_MES[Number(evt.date.split('-')[1]) - 1]?.slice(0, 3)}</span>
              <span className="text-sm font-bold text-[#F8D800]">{evt.date.split('-')[2]}</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white font-heading">{evt.title}</h3>
              <div className="flex items-center gap-4 text-xs text-[#AEB5B0] mt-1">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#F8D800]" /> {evt.time ?? 'Sem horário'}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#F8D800]" /> {evt.location}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {evt.filledSlots}{evt.maxSlots !== null ? `/${evt.maxSlots}` : ''} vagas</span>
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
  );

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
          <div className="flex bg-[#0F1210] p-1 border border-[#222824] rounded-lg overflow-x-auto">
            {([
              ['mes', 'Mês'],
              ['semana', 'Semana'],
              ['dia', 'Dia'],
              ['lista', 'Lista']
            ] as [ViewMode, string][]).map(([modo, label]) => (
              <button
                key={modo}
                onClick={() => setViewMode(modo)}
                className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap ${
                  viewMode === modo ? 'bg-[#004922] text-white' : 'text-[#AEB5B0]'
                }`}
              >
                {label}
              </button>
            ))}
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

      {loading ? (
        <div className="h-64 bg-[#181D1A] rounded-2xl animate-pulse" />
      ) : viewMode === 'mes' ? (
        renderMes()
      ) : viewMode === 'semana' ? (
        renderSemana()
      ) : viewMode === 'dia' ? (
        renderDia()
      ) : (
        renderLista()
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
          <Input
            label="Vagas Máximas"
            type="number"
            value={newEvent.maxSlots}
            onChange={(e) => setNewEvent({ ...newEvent, maxSlots: Number(e.target.value) })}
            required
          />
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
