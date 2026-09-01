import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Users, HeartHandshake, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { projectService } from '../../services/domainServices';
import { Project } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const ProjectsList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Novo Projeto
  const [modalOpen, setModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    responsibleName: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'ATIVO' as Project['status']
  });

  const fetchProjects = async () => {
    const data = await projectService.getAll();
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectService.create(newProject);
      addToast({
        type: 'success',
        title: 'Projeto criado',
        message: 'Novo projeto cadastrado com sucesso.'
      });
      setModalOpen(false);
      fetchProjects();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao criar projeto' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-[#004922]" />
            Projetos Sociais e Institucionais
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            Centralização de iniciativas, voluntários, beneficiários e custos associados.
          </p>
        </div>

        {hasPermission('edit_projects') && (
          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Novo projeto
          </Button>
        )}
      </div>

      {/* Grid de Cards de Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p) => (
          <div
            key={p.id}
            className="bg-[#181D1A] border border-[#222824] rounded-2xl p-6 hover:border-[#004922]/60 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-lg font-bold text-white font-heading">{p.name}</h3>
                <Badge variant={p.status === 'ATIVO' ? 'success' : 'warning'}>
                  ● {p.status.replace('_', ' ')}
                </Badge>
              </div>

              <p className="text-xs text-[#AEB5B0] line-clamp-3 mb-6">{p.description}</p>

              {/* Estatísticas de Relação */}
              <div className="grid grid-cols-2 gap-3 mb-6 bg-[#0F1210] p-3 rounded-xl border border-[#222824]">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-[#F8D800]" />
                  <div>
                    <span className="text-sm font-bold text-white block">{p.beneficiariesCount}</span>
                    <span className="text-[10px] text-[#727A74]">Beneficiários</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#004922]" />
                  <div>
                    <span className="text-sm font-bold text-white block">{p.volunteersCount}</span>
                    <span className="text-[10px] text-[#727A74]">Voluntários</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#222824] flex items-center justify-between">
              <span className="text-xs text-[#AEB5B0]">
                Resp: <strong className="text-white">{p.responsibleName}</strong>
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/projetos/${p.id}`)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Gerenciar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Criar Projeto */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Projeto Institucional">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Nome do Projeto"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            required
          />
          <Input
            label="Responsável pelo Projeto"
            value={newProject.responsibleName}
            onChange={(e) => setNewProject({ ...newProject, responsibleName: e.target.value })}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#AEB5B0]">Descrição do Projeto</label>
            <textarea
              rows={3}
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              className="w-full bg-[#151917] border border-[#222824] rounded-lg p-3 text-sm text-white focus:outline-none"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar Projeto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
