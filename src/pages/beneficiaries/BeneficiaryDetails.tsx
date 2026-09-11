import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Plus, Calendar, Clock, UserCheck, ShieldCheck, HeartHandshake } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { beneficiaryService } from '../../services/domainServices';
import { Beneficiary, AttendanceRecord } from '../../types/domain';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

export const BeneficiaryDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, hasPermission } = useAuth();

  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Novo Atendimento
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newAttendance, setNewAttendance] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Social',
    notes: ''
  });

  const fetchBeneficiary = async () => {
    if (id) {
      const data = await beneficiaryService.getById(id);
      setBeneficiary(data || null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiary();
  }, [id]);

  const handleRegisterAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newAttendance.notes || !user) return;
    setSubmitting(true);

    try {
      await beneficiaryService.addAttendance(id, {
        ...newAttendance,
        responsavelPessoaId: user.pessoaId
      });
      addToast({
        type: 'success',
        title: 'Atendimento registrado',
        message: 'Novo atendimento adicionado ao histórico com sucesso.'
      });
      setModalOpen(false);
      setNewAttendance({
        date: new Date().toISOString().split('T')[0],
        type: 'Social',
        notes: ''
      });
      fetchBeneficiary();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Erro ao registrar atendimento', message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#AEB5B0]">Carregando histórico do beneficiário...</div>;
  }

  if (!beneficiary) {
    return (
      <div className="p-8 text-center text-white space-y-4">
        <h2 className="text-xl font-bold">Beneficiário não encontrado</h2>
        <Button onClick={() => navigate('/beneficiarios')}>Voltar para a lista</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[#AEB5B0]">
        <Link to="/beneficiarios" className="hover:text-white transition-colors">
          Pessoas
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/beneficiarios" className="hover:text-white transition-colors">
          Beneficiários
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#222824]" />
        <span className="text-[#F8D800] font-semibold">{beneficiary.name}</span>
      </nav>

      {/* Header Info Card */}
      <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white font-heading">{beneficiary.name}</h1>
            <Badge variant="success">{beneficiary.status.replace('_', ' ')}</Badge>
          </div>
          <p className="text-xs text-[#AEB5B0] mt-1">
            Faixa Etária: <strong className="text-white">{beneficiary.ageGroup}</strong>
          </p>
        </div>

        {hasPermission('edit_beneficiaries') && (
          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Registrar atendimento
          </Button>
        )}
      </div>

      {/* TIMELINE DE ATENDIMENTOS */}
      <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#222824] pb-4">
          <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-[#004922]" />
            Histórico Cronológico de Atendimentos
          </h2>
          <span className="text-xs text-[#AEB5B0]">
            {beneficiary.attendances.length} atendimento(s) registrado(s)
          </span>
        </div>

        <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#222824]">
          {beneficiary.attendances.map((att) => (
            <div key={att.id} className="relative group">
              {/* Ponto na timeline */}
              <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-[#004922] border-2 border-[#181D1A] ring-4 ring-[#004922]/20" />

              <div className="bg-[#0F1210] border border-[#222824] p-4 rounded-xl space-y-2 group-hover:border-[#004922]/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#222824]/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F8D800] bg-[#004922]/40 px-2 py-0.5 rounded">
                      {att.type}
                    </span>
                    <span className="text-xs text-[#AEB5B0] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#727A74]" /> {att.date}
                    </span>
                  </div>
                  <span className="text-xs text-[#727A74] flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#F8D800]" /> Responsável: {att.responsibleName}
                  </span>
                </div>

                <p className="text-xs md:text-sm text-white pt-1">{att.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Registrar Atendimento */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar Novo Atendimento"
      >
        <form onSubmit={handleRegisterAttendance} className="space-y-4">
          <Input
            label="Data do Atendimento"
            type="date"
            value={newAttendance.date}
            onChange={(e) => setNewAttendance({ ...newAttendance, date: e.target.value })}
            required
          />
          <Select
            label="Tipo de Atendimento"
            value={newAttendance.type}
            onChange={(e) => setNewAttendance({ ...newAttendance, type: e.target.value })}
            options={[
              { value: 'Social', label: 'Atendimento Social' },
              { value: 'Psicológico', label: 'Atendimento Psicológico' },
              { value: 'Entrega de Cesta', label: 'Entrega de Cesta Básica' },
              { value: 'Médico', label: 'Atendimento Médico' },
              { value: 'Jurídico', label: 'Apoio Jurídico' }
            ]}
          />
          <p className="text-xs text-[#AEB5B0]">
            Responsável: <strong className="text-white">{user?.name}</strong> (identificado pela sua sessão)
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#AEB5B0]">Descrição / Histórico do Atendimento *</label>
            <textarea
              rows={3}
              value={newAttendance.notes}
              onChange={(e) => setNewAttendance({ ...newAttendance, notes: e.target.value })}
              placeholder="Descreva detalhadamente a ação realizada..."
              className="w-full bg-[#151917] border border-[#222824] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#004922]"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Salvar Atendimento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
