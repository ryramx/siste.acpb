import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  HeartHandshake,
  FolderKanban,
  Calendar,
  Clock,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/apiClient';
import { eventService } from '../../services/domainServices';
import { EventItem } from '../../types/domain';
import { fraseDoMomento, saudacao } from '../../utils/saudacao';
import { formatarMoeda } from '../../utils/dinheiro';

interface DashboardResumo {
  quantidade_pessoas: number;
  membros_ativos: number;
  voluntarios_ativos: number;
  beneficiarios: number;
  projetos_ativos: number;
  proximos_eventos: number;
  saldo_financeiro: number;
  receitas_confirmadas: number;
  despesas_confirmadas: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [resumo, setResumo] = useState<DashboardResumo | null>(null);
  const [proximosEventos, setProximosEventos] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorteada uma vez por visita: trocar de frase a cada re-render seria distração pura.
  const frase = useMemo(() => fraseDoMomento(), []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumoData, eventos] = await Promise.all([
        apiClient.get<DashboardResumo>('/dashboard/resumo'),
        eventService.getAll()
      ]);
      setResumo(resumoData);
      const hoje = new Date().toISOString().split('T')[0];
      setProximosEventos(
        eventos
          .filter((e) => e.date >= hoje)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 4)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-[#181D1A] rounded-lg w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#181D1A] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !resumo) {
    return (
      <EmptyState
        title="Erro ao carregar o dashboard"
        description={error ?? 'Não foi possível carregar os dados.'}
        actionLabel="Tentar novamente"
        onAction={fetchData}
      />
    );
  }

  const saldoPositivo = resumo.saldo_financeiro >= 0;
  const totalMovimentado = resumo.receitas_confirmadas + resumo.despesas_confirmadas;
  const percReceitas = totalMovimentado > 0 ? (resumo.receitas_confirmadas / totalMovimentado) * 100 : 50;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Saudação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181D1A] border border-[#222824] p-6 rounded-2xl relative overflow-hidden">
        <div className="z-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white font-heading">
            {saudacao()}, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-sm text-[#AEB5B0] mt-1">
            {frase}
          </p>
        </div>
        <div className="z-10 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/membros')}>
            Ver Membros
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/financeiro')}>
            Gestão Financeira
          </Button>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-[#004922]/20 to-transparent pointer-events-none" />
      </div>

      {/* 4 KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Membros Ativos"
          value={resumo.membros_ativos}
          icon={<UserCheck className="w-5 h-5" />}
          subtitle={`${resumo.quantidade_pessoas} pessoas cadastradas`}
          accentColor="green"
        />
        <StatCard
          title="Voluntários"
          value={resumo.voluntarios_ativos}
          icon={<Users className="w-5 h-5" />}
          subtitle="Em atuação"
          accentColor="yellow"
        />
        <StatCard
          title="Beneficiários"
          value={resumo.beneficiarios}
          icon={<HeartHandshake className="w-5 h-5" />}
          subtitle="Famílias atendidas"
          accentColor="blue"
        />
        <StatCard
          title="Projetos Ativos"
          value={resumo.projetos_ativos}
          icon={<FolderKanban className="w-5 h-5" />}
          subtitle={`${resumo.proximos_eventos} eventos futuros`}
          accentColor="neutral"
        />
      </div>

      {/* Seção do Meio: Próximos Eventos + Situação Financeira */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Eventos */}
        <div className="bg-[#181D1A] border border-[#222824] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white font-heading flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#F8D800]" />
                Próximos eventos
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/eventos')}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Ver todos
              </Button>
            </div>

            {proximosEventos.length === 0 ? (
              <p className="text-xs text-[#727A74] py-4 text-center">
                Nenhum evento futuro agendado.
              </p>
            ) : (
              <div className="space-y-3">
                {proximosEventos.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => navigate(`/eventos/${evt.id}`)}
                    className="p-3.5 bg-[#0F1210] border border-[#222824] rounded-xl flex items-center justify-between hover:border-[#004922]/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#004922]/30 border border-[#004922] flex flex-col items-center justify-center text-white shrink-0">
                        <span className="text-[10px] font-bold uppercase">
                          {evt.date.split('-')[1]}/{evt.date.split('-')[0].slice(2)}
                        </span>
                        <span className="text-xs font-bold text-[#F8D800]">{evt.date.split('-')[2]}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{evt.title}</h4>
                        <p className="text-xs text-[#AEB5B0] flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-[#F8D800]" />
                          {evt.time ?? 'Horário a definir'} • {evt.location}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">{evt.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Situação Financeira */}
        <div className="bg-[#181D1A] border border-[#222824] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white font-heading flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#004922]" />
                Situação financeira (confirmada)
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/financeiro')}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Relatório
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl">
                <span className="text-xs text-[#AEB5B0] block">Receitas</span>
                <span className="text-base font-bold text-[#40C075] mt-1 block">
                  {formatarMoeda(resumo.receitas_confirmadas)}
                </span>
              </div>
              <div className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl">
                <span className="text-xs text-[#AEB5B0] block">Despesas</span>
                <span className="text-base font-bold text-red-400 mt-1 block">
                  {formatarMoeda(resumo.despesas_confirmadas)}
                </span>
              </div>
              <div className="p-3 bg-[#0F1210] border border-[#004922] rounded-xl bg-[#004922]/10">
                <span className="text-xs text-[#AEB5B0] block">Saldo</span>
                <span className={`text-base font-bold mt-1 block ${saldoPositivo ? 'text-[#F8D800]' : 'text-red-400'}`}>
                  {formatarMoeda(resumo.saldo_financeiro)}
                </span>
              </div>
            </div>

            {totalMovimentado > 0 && (
              <>
                <div className="w-full bg-[#0F1210] rounded-full h-3 overflow-hidden flex border border-[#222824]">
                  <div className="bg-[#004922] h-full" style={{ width: `${percReceitas}%` }} title="Receitas" />
                  <div className="bg-red-800 h-full" style={{ width: `${100 - percReceitas}%` }} title="Despesas" />
                </div>
                <div className="flex justify-between text-[11px] text-[#727A74] mt-2">
                  <span>● Receitas confirmadas</span>
                  <span>● Despesas confirmadas</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
