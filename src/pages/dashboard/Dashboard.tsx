import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  HeartHandshake,
  FolderKanban,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_MEMBERS, MOCK_VOLUNTEERS, MOCK_BENEFICIARIES, MOCK_PROJECTS, MOCK_EVENTS, MOCK_FINANCIAL_TRANSACTIONS } from '../../mocks/domain';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Cálculos mockados baseados em dados reais estáticos
  const totalMembers = MOCK_MEMBERS.length * 30 + 7; // ~127
  const totalVolunteers = MOCK_VOLUNTEERS.length * 14 + 1; // ~43
  const totalBeneficiaries = MOCK_BENEFICIARIES.length * 105 + 8; // ~218
  const totalProjects = MOCK_PROJECTS.length + 5; // ~8

  const recentActivities = [
    { id: 1, user: 'João da Silva', action: 'cadastrou um novo membro', target: 'Ana Beatriz Souza', time: 'Há 15 min' },
    { id: 2, user: 'Mariana Santos', action: 'criou o evento', target: 'Acampamento Pau-Brasil', time: 'Há 1 hora' },
    { id: 3, user: 'Carlos Oliveira', action: 'registrou uma despesa', target: 'Energia Elétrica (R$ 387,42)', time: 'Há 3 horas' },
    { id: 4, user: 'Lucas Ferreira', action: 'adicionou horas ao voluntário', target: 'Roberto Mendes (+4h)', time: 'Ontem' }
  ];

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Saudação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181D1A] border border-[#222824] p-6 rounded-2xl relative overflow-hidden">
        <div className="z-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white font-heading">
            Bom dia, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-sm text-[#AEB5B0] mt-1">
            Aqui está o resumo atualizado da Associação Cristã Pau-Brasil.
          </p>
        </div>
        <div className="z-10 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/membros')}
          >
            Ver Membros
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/financeiro')}
          >
            Gestão Financeira
          </Button>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-[#004922]/20 to-transparent pointer-events-none" />
      </div>

      {/* Alerta Institucional de Atenção */}
      <div className="p-4 bg-[#181D1A] border border-[#F8D800]/30 rounded-xl flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-[#F8D800] shrink-0" />
        <div className="flex-1 text-xs md:text-sm text-[#AEB5B0]">
          <strong className="text-white font-medium">Atenção da Diretoria:</strong> A prestação de contas do projeto Reforço Escolar encerra em 3 dias.
        </div>
        <Badge variant="warning">Pendente</Badge>
      </div>

      {/* 4 KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Membros"
          value={totalMembers}
          icon={<UserCheck className="w-5 h-5" />}
          subtitle="Cadastrados ativos"
          trend={{ value: '+12% este mês', isPositive: true }}
          accentColor="green"
        />
        <StatCard
          title="Voluntários"
          value={totalVolunteers}
          icon={<Users className="w-5 h-5" />}
          subtitle="Em atuação"
          accentColor="yellow"
        />
        <StatCard
          title="Beneficiários"
          value={totalBeneficiaries}
          icon={<HeartHandshake className="w-5 h-5" />}
          subtitle="Famílias atendidas"
          trend={{ value: '+8 novas famílias', isPositive: true }}
          accentColor="blue"
        />
        <StatCard
          title="Projetos"
          value={totalProjects}
          icon={<FolderKanban className="w-5 h-5" />}
          subtitle="Projetos ativos"
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

            <div className="space-y-3">
              {MOCK_EVENTS.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => navigate(`/eventos`)}
                  className="p-3.5 bg-[#0F1210] border border-[#222824] rounded-xl flex items-center justify-between hover:border-[#004922]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#004922]/30 border border-[#004922] flex flex-col items-center justify-center text-white shrink-0">
                      <span className="text-[10px] font-bold uppercase">{evt.date.split('-')[1] === '09' ? 'SET' : 'AGO'}</span>
                      <span className="text-xs font-bold text-[#F8D800]">{evt.date.split('-')[2]}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{evt.title}</h4>
                      <p className="text-xs text-[#AEB5B0] flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-[#F8D800]" />
                        {evt.time} • {evt.location}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Agendado</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Situação Financeira */}
        <div className="bg-[#181D1A] border border-[#222824] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white font-heading flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#004922]" />
                Situação financeira (Mês Atual)
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
                <span className="text-base font-bold text-[#40C075] mt-1 block">R$ 8.420</span>
              </div>
              <div className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl">
                <span className="text-xs text-[#AEB5B0] block">Despesas</span>
                <span className="text-base font-bold text-red-400 mt-1 block">R$ 6.830</span>
              </div>
              <div className="p-3 bg-[#0F1210] border border-[#004922] rounded-xl bg-[#004922]/10">
                <span className="text-xs text-[#AEB5B0] block">Saldo</span>
                <span className="text-base font-bold text-[#F8D800] mt-1 block">R$ 1.590</span>
              </div>
            </div>

            {/* Barra visual proporcional */}
            <div className="w-full bg-[#0F1210] rounded-full h-3 overflow-hidden flex border border-[#222824]">
              <div className="bg-[#004922] h-full" style={{ width: '55%' }} title="Receitas 55%" />
              <div className="bg-red-800 h-full" style={{ width: '45%' }} title="Despesas 45%" />
            </div>
            <div className="flex justify-between text-[11px] text-[#727A74] mt-2">
              <span>● Receitas do mês</span>
              <span>● Despesas operacionais</span>
            </div>
          </div>
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className="bg-[#181D1A] border border-[#222824] rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white font-heading mb-4">
          Atividades recentes
        </h3>
        <div className="divide-y divide-[#222824]">
          {recentActivities.map((act) => (
            <div key={act.id} className="py-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#004922]" />
                <span className="text-white font-medium">{act.user}</span>
                <span className="text-[#AEB5B0]">{act.action}</span>
                <span className="text-[#F8D800] font-medium">{act.target}</span>
              </div>
              <span className="text-xs text-[#727A74]">{act.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
