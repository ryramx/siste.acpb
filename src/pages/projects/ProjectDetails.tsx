import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  HeartHandshake,
  Users,
  Calendar,
  DollarSign,
  ArrowLeft,
  Plus,
  Trash2,
  UserCog,
  Pencil
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  projectService,
  eventService,
  financialService,
  volunteerService,
  beneficiaryService
} from '../../services/domainServices';
import {
  Project,
  ProjectVolunteerLink,
  ProjectBeneficiaryLink,
  EventItem,
  FinancialTransaction
} from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { formatarData, formatarMoeda } from '../../utils/dinheiro';

/** Opção de pessoa disponível para vincular (voluntário ou beneficiário ainda não no projeto). */
interface CandidateOption {
  id: string;
  name: string;
}

export const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  // Secretário, Coordenador e Voluntário veem projetos mas não o financeiro. Pedir as
  // movimentações para eles só rende um 403 — e, dentro do Promise.all, derrubava a tela toda.
  const podeVerFinanceiro = hasPermission('view_financial');

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'beneficiaries' | 'volunteers' | 'events' | 'financial'>('overview');
  const [loading, setLoading] = useState(true);

  const [beneficiaries, setBeneficiaries] = useState<ProjectBeneficiaryLink[]>([]);
  const [volunteers, setVolunteers] = useState<ProjectVolunteerLink[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [financials, setFinancials] = useState<FinancialTransaction[]>([]);

  // Modais de vínculo. `saving` trava o botão para não criar o mesmo vínculo duas vezes
  // com um duplo clique — o backend rejeitaria com 409, mas o erro confundiria o usuário.
  const [volunteerModalOpen, setVolunteerModalOpen] = useState(false);
  const [beneficiaryModalOpen, setBeneficiaryModalOpen] = useState(false);
  const [responsibleModalOpen, setResponsibleModalOpen] = useState(false);
  const [edicao, setEdicao] = useState<{
    name: string;
    description: string;
    status: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  // Incrementar dispara o efeito de novo, sem recarregar a página inteira.
  const [tentativa, setTentativa] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const [volunteerOptions, setVolunteerOptions] = useState<CandidateOption[]>([]);
  const [beneficiaryOptions, setBeneficiaryOptions] = useState<CandidateOption[]>([]);
  const [personOptions, setPersonOptions] = useState<CandidateOption[]>([]);

  const [volunteerForm, setVolunteerForm] = useState({ id: '', role: '', entryDate: '' });
  const [beneficiaryForm, setBeneficiaryForm] = useState({ id: '', role: '', entryDate: '' });
  const [responsibleId, setResponsibleId] = useState('');

  useEffect(() => {
    if (!id) return;
    // Quando o perfil do usuário chega depois da tela, o efeito roda de novo; a resposta da
    // busca anterior não pode sobrescrever a nova.
    let cancelado = false;
    setLoading(true);
    setErroCarregamento(null);
    // Sem o catch, qualquer falha deixava a tela em "Carregando detalhes do projeto..." para
    // sempre, sem dizer o que aconteceu (o mesmo defeito que a tela de evento já teve).
    Promise.all([
      projectService.getById(id),
      projectService.getBeneficiaries(id),
      projectService.getVolunteers(id),
      eventService.getAll(),
      podeVerFinanceiro ? financialService.getAll() : Promise.resolve([] as FinancialTransaction[])
    ])
      .then(([p, bList, vList, eList, fList]) => {
        if (cancelado) return;
        setProject(p || null);
        setBeneficiaries(bList);
        setVolunteers(vList);
        setEvents(eList.filter((e) => e.projectId === id));
        setFinancials(fList.filter((item) => item.projectId === id));
      })
      .catch((err) => {
        if (cancelado) return;
        setErroCarregamento(
          err instanceof Error ? err.message : 'Não foi possível carregar o projeto.'
        );
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id, podeVerFinanceiro, tentativa]);

  /** Carrega candidatos sob demanda, ao abrir o modal — listar todos no load da página
   *  custaria duas varreduras de /pessoas/ que a maioria das visitas nunca usa. */
  const openVolunteerModal = useCallback(async () => {
    setFormError(null);
    setVolunteerForm({ id: '', role: '', entryDate: '' });
    setVolunteerModalOpen(true);
    const todos = await volunteerService.getAll();
    const jaVinculados = new Set(volunteers.map((v) => v.volunteerId));
    setVolunteerOptions(
      todos
        .filter((v) => !jaVinculados.has(v.id))
        .map((v) => ({ id: v.id, name: v.name }))
    );
  }, [volunteers]);

  const openBeneficiaryModal = useCallback(async () => {
    setFormError(null);
    setBeneficiaryForm({ id: '', role: '', entryDate: '' });
    setBeneficiaryModalOpen(true);
    const todos = await beneficiaryService.getAll();
    const jaVinculados = new Set(beneficiaries.map((b) => b.beneficiaryId));
    setBeneficiaryOptions(
      todos
        .filter((b) => !jaVinculados.has(b.id))
        .map((b) => ({ id: b.id, name: b.name }))
    );
  }, [beneficiaries]);

  const abrirEdicao = () => {
    if (!project) return;
    setFormError(null);
    setEdicao({
      name: project.name,
      description: project.description ?? '',
      status: project.status
    });
  };

  const salvarEdicao = async () => {
    if (!id || !edicao) return;
    setSaving(true);
    try {
      const atualizado = await projectService.update(id, edicao);
      setProject(atualizado);
      setEdicao(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível salvar o projeto.');
    } finally {
      setSaving(false);
    }
  };

  const openResponsibleModal = useCallback(async () => {
    setFormError(null);
    setResponsibleId(project?.responsibleId ?? '');
    setResponsibleModalOpen(true);
    setPersonOptions(await projectService.getPessoasParaResponsavel());
  }, [project]);

  const handleAddVolunteer = async () => {
    if (!id || !volunteerForm.id) return;
    setSaving(true);
    setFormError(null);
    try {
      const criado = await projectService.addVolunteer(id, {
        volunteerId: volunteerForm.id,
        role: volunteerForm.role,
        entryDate: volunteerForm.entryDate
      });
      setVolunteers((atuais) => [...atuais, criado]);
      setVolunteerModalOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível vincular o voluntário.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBeneficiary = async () => {
    if (!id || !beneficiaryForm.id) return;
    setSaving(true);
    setFormError(null);
    try {
      const criado = await projectService.addBeneficiary(id, {
        beneficiaryId: beneficiaryForm.id,
        role: beneficiaryForm.role,
        entryDate: beneficiaryForm.entryDate
      });
      setBeneficiaries((atuais) => [...atuais, criado]);
      setBeneficiaryModalOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível vincular o beneficiário.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResponsible = async () => {
    if (!id) return;
    setSaving(true);
    setFormError(null);
    try {
      const atualizado = await projectService.update(id, { responsibleId: responsibleId || null });
      setProject(atualizado);
      setResponsibleModalOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível salvar o responsável.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveVolunteer = async (link: ProjectVolunteerLink) => {
    if (!id) return;
    if (!window.confirm(`Remover ${link.personName} deste projeto?`)) return;
    await projectService.removeVolunteer(id, link.id);
    setVolunteers((atuais) => atuais.filter((v) => v.id !== link.id));
  };

  const handleRemoveBeneficiary = async (link: ProjectBeneficiaryLink) => {
    if (!id) return;
    if (!window.confirm(`Remover ${link.personName} deste projeto?`)) return;
    await projectService.removeBeneficiary(id, link.id);
    setBeneficiaries((atuais) => atuais.filter((b) => b.id !== link.id));
  };

  if (loading) return <div className="p-8 text-center text-[#AEB5B0]">Carregando detalhes do projeto...</div>;
  if (erroCarregamento) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-white">Não foi possível carregar este projeto.</p>
        <p className="text-xs text-[#AEB5B0]">{erroCarregamento}</p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate('/projetos')}>
            Voltar para projetos
          </Button>
          <Button onClick={() => setTentativa((t) => t + 1)}>Tentar de novo</Button>
        </div>
      </div>
    );
  }
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Pencil className="w-4 h-4" />}
            onClick={abrirEdicao}
          >
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<UserCog className="w-4 h-4" />}
            onClick={openResponsibleModal}
          >
            {project.responsibleName ? 'Alterar responsável' : 'Definir responsável'}
          </Button>
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
        {/* Sem acesso ao financeiro o total chega zerado, e "R$ 0.00" leria como "sem gastos". */}
        {podeVerFinanceiro && (
          <StatCard
            title="Custos Totais"
            value={formatarMoeda(project.totalExpenses)}
            icon={<DollarSign className="w-5 h-5 text-red-400" />}
            subtitle="Despesas vinculadas"
            accentColor="neutral"
          />
        )}
      </div>

      {/* Navegação por Abas */}
      <div className="border-b border-[#222824] flex gap-2 overflow-x-auto pb-0">
        {[
          { key: 'overview', label: 'Visão Geral' },
          { key: 'beneficiaries', label: `Beneficiários (${beneficiaries.length})` },
          { key: 'volunteers', label: `Voluntários (${volunteers.length})` },
          { key: 'events', label: `Eventos (${events.length})` },
          ...(podeVerFinanceiro ? [{ key: 'financial', label: `Financeiro (${financials.length})` }] : [])
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
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={openBeneficiaryModal}
              >
                Adicionar Beneficiário
              </Button>
            </div>
            {beneficiaries.length === 0 ? (
              <EmptyState
                title="Nenhum beneficiário vinculado"
                description="Vincule as pessoas atendidas por este projeto para acompanhar quem ele alcança."
                icon={<HeartHandshake className="w-8 h-8" />}
                actionLabel="Adicionar Beneficiário"
                onAction={openBeneficiaryModal}
              />
            ) : (
              <div className="space-y-3">
                {beneficiaries.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl flex justify-between items-center gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{b.personName}</p>
                      {b.role && <p className="text-xs text-[#AEB5B0]">{b.role}</p>}
                    </div>
                    <button
                      onClick={() => handleRemoveBeneficiary(b)}
                      aria-label={`Remover ${b.personName} do projeto`}
                      className="text-[#AEB5B0] hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-[#222824] shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'volunteers' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={openVolunteerModal}
              >
                Adicionar Voluntário
              </Button>
            </div>
            {volunteers.length === 0 ? (
              <EmptyState
                title="Nenhum voluntário vinculado"
                description="Vincule os voluntários que atuam neste projeto para montar a equipe."
                icon={<Users className="w-8 h-8" />}
                actionLabel="Adicionar Voluntário"
                onAction={openVolunteerModal}
              />
            ) : (
              <div className="space-y-3">
                {volunteers.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl flex justify-between items-center gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{v.personName}</p>
                      <p className="text-xs text-[#AEB5B0]">
                        {v.role || 'Sem função definida'}
                        {v.area && <span className="text-[#F8D800]"> · {v.area}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveVolunteer(v)}
                      aria-label={`Remover ${v.personName} do projeto`}
                      className="text-[#AEB5B0] hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-[#222824] shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-[#AEB5B0]">
                Nenhum evento diretamente associado a este projeto no momento.
              </p>
            ) : (
              events.map((e) => (
                <div
                  key={e.id}
                  className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl flex justify-between items-center"
                >
                  <span className="text-sm font-medium text-white">{e.title}</span>
                  <span className="text-xs text-[#AEB5B0]">{formatarData(e.date)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-3">
            {financials.map((f) => (
              <div key={f.id} className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl flex justify-between items-center text-xs">
                <span className="text-white font-medium">{f.description}</span>
                <span className="text-red-400 font-bold">{formatarMoeda(f.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: vincular voluntário */}
      <Modal
        isOpen={volunteerModalOpen}
        onClose={() => setVolunteerModalOpen(false)}
        title="Adicionar Voluntário ao Projeto"
        footer={
          <>
            <Button variant="outline" onClick={() => setVolunteerModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddVolunteer} isLoading={saving} disabled={!volunteerForm.id}>
              Vincular
            </Button>
          </>
        }
      >
        <Select
          label="Voluntário"
          required
          value={volunteerForm.id}
          onChange={(e) => setVolunteerForm({ ...volunteerForm, id: e.target.value })}
          options={[
            { value: '', label: 'Selecione um voluntário' },
            ...volunteerOptions.map((v) => ({ value: v.id, label: v.name }))
          ]}
        />
        <Input
          label="Função no projeto"
          placeholder="Ex.: Instrutor, Apoio logístico"
          value={volunteerForm.role}
          onChange={(e) => setVolunteerForm({ ...volunteerForm, role: e.target.value })}
        />
        <Input
          label="Data de entrada"
          type="date"
          value={volunteerForm.entryDate}
          onChange={(e) => setVolunteerForm({ ...volunteerForm, entryDate: e.target.value })}
        />
        {volunteerOptions.length === 0 && (
          <p className="text-xs text-[#AEB5B0]">
            Todos os voluntários cadastrados já estão neste projeto.
          </p>
        )}
        {formError && <p className="text-xs text-red-500">{formError}</p>}
      </Modal>

      {/* Modal: vincular beneficiário */}
      <Modal
        isOpen={beneficiaryModalOpen}
        onClose={() => setBeneficiaryModalOpen(false)}
        title="Adicionar Beneficiário ao Projeto"
        footer={
          <>
            <Button variant="outline" onClick={() => setBeneficiaryModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddBeneficiary}
              isLoading={saving}
              disabled={!beneficiaryForm.id}
            >
              Vincular
            </Button>
          </>
        }
      >
        <Select
          label="Beneficiário"
          required
          value={beneficiaryForm.id}
          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, id: e.target.value })}
          options={[
            { value: '', label: 'Selecione um beneficiário' },
            ...beneficiaryOptions.map((b) => ({ value: b.id, label: b.name }))
          ]}
        />
        <Input
          label="Papel no projeto"
          placeholder="Ex.: Aluno, Família atendida"
          value={beneficiaryForm.role}
          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, role: e.target.value })}
        />
        <Input
          label="Data de entrada"
          type="date"
          value={beneficiaryForm.entryDate}
          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, entryDate: e.target.value })}
        />
        {beneficiaryOptions.length === 0 && (
          <p className="text-xs text-[#AEB5B0]">
            Todos os beneficiários cadastrados já estão neste projeto.
          </p>
        )}
        {formError && <p className="text-xs text-red-500">{formError}</p>}
      </Modal>

      {/* Modal: responsável técnico */}
      <Modal isOpen={edicao !== null} onClose={() => setEdicao(null)} title="Editar projeto">
        {edicao && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              salvarEdicao();
            }}
            className="space-y-4"
          >
            <Input
              label="Nome do Projeto"
              value={edicao.name}
              onChange={(e) => setEdicao({ ...edicao, name: e.target.value })}
              required
            />
            <Input
              label="Descrição"
              value={edicao.description}
              onChange={(e) => setEdicao({ ...edicao, description: e.target.value })}
            />
            <Input
              label="Status"
              value={edicao.status}
              onChange={(e) => setEdicao({ ...edicao, status: e.target.value })}
              required
            />
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEdicao(null)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={saving}>
                Salvar
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={responsibleModalOpen}
        onClose={() => setResponsibleModalOpen(false)}
        title="Responsável Técnico do Projeto"
        footer={
          <>
            <Button variant="outline" onClick={() => setResponsibleModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveResponsible} isLoading={saving}>
              Salvar
            </Button>
          </>
        }
      >
        <Select
          label="Responsável"
          value={responsibleId}
          onChange={(e) => setResponsibleId(e.target.value)}
          options={[
            { value: '', label: 'Sem responsável definido' },
            ...personOptions.map((p) => ({ value: p.id, label: p.name }))
          ]}
        />
        {formError && <p className="text-xs text-red-500">{formError}</p>}
      </Modal>

      <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/projetos')}>
        Voltar para Projetos
      </Button>
    </div>
  );
};
