import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, HeartHandshake, Users, Calendar, DollarSign, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { projectService, eventService, financialService } from '../../services/domainServices';
import { Project, Beneficiary, Volunteer, EventItem, FinancialTransaction } from '../../types/domain';

export const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'beneficiaries' | 'volunteers' | 'events' | 'financial'>('overview');
  const [loading, setLoading] = useState(true);

  // Mocks Relacionados
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [financials, setFinancials] = useState<FinancialTransaction[]>([]);

  useEffect(() => {
    if (id) {
      Promise.all([
        projectService.getById(id),
        eventService.getAll(),
        financialService.getAll()
      ]).then(([p, eList, fList]) => {
        setProject(p || null);
        // Beneficiários e voluntários ainda não têm vínculo de projeto exposto pela API
        // (backend não relaciona Beneficiario a Projeto; Voluntario↔Projeto existe via
        // projeto_voluntarios, mas sem rota própria ainda — ver tarefa 30).
        setBeneficiaries([]);
        setVolunteers([]);
        setEvents(eList);
        setFinancials(fList.filter((item) => item.projectId === id));
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div className="p-8 text-center text-[#AEB5B0]">Carregando detalhes do projeto...</div>;
  if (!project) return <div className="p-8 text-center text-white">Projeto não encontrado.</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-[#AEB5B0]">
        <Link to="/projetos" className="hover:text-white transition-colors">
          Projetos
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#F8D800] font-semibold">{project.name}</span>
      </nav>

      {/* Header do Projeto */}
      <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white font-heading">{project.name}</h1>
            <Badge variant="success">● {project.status}</Badge>
          </div>
          <p className="text-xs text-[#AEB5B0] mt-1">
            Responsável Técnico: {project.responsibleName ?? 'Não definido'}
          </p>
        </div>
      </div>

      {/* Cards de Visão Geral das Relações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Eventos Realizados"
          value={project.eventsCount}
          icon={<Calendar className="w-5 h-5 text-blue-500" />}
          subtitle="Ações externas"
          accentColor="blue"
        />
        <StatCard
          title="Custos Totais"
          value={`R$ ${project.totalExpenses.toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5 text-red-400" />}
          subtitle="Despesas vinculadas"
          accentColor="neutral"
        />
      </div>

      {/* Navegação por Abas */}
      <div className="border-b border-[#222824] flex gap-2 overflow-x-auto pb-0">
        {[
          { key: 'overview', label: 'Visão Geral' },
          { key: 'beneficiaries', label: `Beneficiários (${beneficiaries.length})` },
          { key: 'volunteers', label: `Voluntários (${volunteers.length})` },
          { key: 'events', label: 'Eventos' },
          { key: 'financial', label: `Financeiro (${financials.length})` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-[#004922] text-[#F8D800] font-semibold bg-[#004922]/10 rounded-t-lg'
                : 'border-transparent text-[#AEB5B0] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das Abas */}
      <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#F8D800] uppercase tracking-wider">
              Descrição do Projeto
            </h3>
            <p className="text-sm text-white leading-relaxed">{project.description}</p>
          </div>
        )}

        {activeTab === 'beneficiaries' && (
          <div className="space-y-3">
            {beneficiaries.map((b) => (
              <div key={b.id} className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl flex justify-between items-center">
                <span className="text-sm font-medium text-white">{b.name}</span>
                <span className="text-xs text-[#AEB5B0]">{b.ageGroup}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'volunteers' && (
          <div className="space-y-3">
            {volunteers.map((v) => (
              <div key={v.id} className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl flex justify-between items-center">
                <span className="text-sm font-medium text-white">{v.name}</span>
                <span className="text-xs text-[#F8D800]">{v.area}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <p className="text-sm text-[#AEB5B0]">Nenhum evento diretamente associado a este projeto no momento.</p>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-3">
            {financials.map((f) => (
              <div key={f.id} className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl flex justify-between items-center text-xs">
                <span className="text-white font-medium">{f.description}</span>
                <span className="text-red-400 font-bold">R$ {f.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
