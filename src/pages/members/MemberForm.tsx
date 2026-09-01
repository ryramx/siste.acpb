import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, UserCheck, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { memberService } from '../../services/domainServices';
import { useToast } from '../../contexts/ToastContext';

export const MemberForm: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    birthDate: '',
    phone: '',
    whatsapp: '',
    email: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'Recife',
    state: 'PE',
    entryDate: new Date().toISOString().split('T')[0],
    status: 'ATIVO' as 'ATIVO' | 'AFASTADO' | 'INATIVO',
    projectId: 'proj-1',
    notes: '',
    isMinor: false,
    guardianName: '',
    guardianPhone: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await memberService.create({
        ...formData,
        projectName: formData.projectId === 'proj-1' ? 'Projeto Reforço Escolar' : 'Projeto Cestas Básicas',
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      });
      addToast({
        type: 'success',
        title: 'Membro cadastrado',
        message: 'O novo membro foi registrado com sucesso na base ACPB.'
      });
      navigate('/membros');
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao salvar membro' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Topo / Voltar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/membros')}
          className="flex items-center gap-2 text-sm text-[#AEB5B0] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para lista
        </button>
        <h1 className="text-xl font-bold text-white font-heading">Novo Membro</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SEÇÃO 1: INFORMAÇÕES PESSOAIS */}
        <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-semibold text-[#F8D800] uppercase tracking-wider text-xs border-b border-[#222824] pb-3">
            1. Informações Pessoais
          </h2>

          <div className="flex flex-col sm:flex-row gap-6 items-center py-2">
            <div className="w-24 h-24 rounded-full bg-[#0F1210] border-2 border-dashed border-[#004922] flex flex-col items-center justify-center text-center p-2">
              <Upload className="w-6 h-6 text-[#004922] mb-1" />
              <span className="text-[10px] text-[#727A74]">Simular foto</span>
            </div>
            <div className="flex-1 space-y-2 text-xs text-[#AEB5B0]">
              <p className="font-semibold text-white">Foto de Perfil</p>
              <p>Formatos permitidos: JPG, PNG até 2MB. (Upload simulado no frontend)</p>
              <Button type="button" variant="outline" size="sm">
                Selecionar arquivo
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome completo"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Digite o nome completo"
              required
            />
            <Input
              label="CPF"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              placeholder="000.000.000-00"
              required
            />
            <Input
              label="Data de Nascimento"
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={handleChange}
              required
            />
            <div className="flex items-center pt-6 gap-2">
              <input
                type="checkbox"
                id="isMinor"
                name="isMinor"
                checked={formData.isMinor}
                onChange={handleChange}
                className="w-4 h-4 rounded border-[#222824] bg-[#0F1210] text-[#004922] focus:ring-[#004922]"
              />
              <label htmlFor="isMinor" className="text-sm font-medium text-[#AEB5B0]">
                Pessoa é menor de idade (requer responsável)
              </label>
            </div>
          </div>
        </div>

        {/* SEÇÃO RESPONSÁVEL (Se menor de idade) */}
        {formData.isMinor && (
          <div className="bg-[#181D1A] border border-[#F8D800]/40 p-6 rounded-2xl space-y-4 animate-fade-in">
            <h2 className="text-base font-semibold text-[#F8D800] uppercase tracking-wider text-xs border-b border-[#222824] pb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Informações do Responsável Legal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Responsável"
                name="guardianName"
                value={formData.guardianName}
                onChange={handleChange}
                placeholder="Nome do pai, mãe ou tutor"
                required
              />
              <Input
                label="Telefone do Responsável"
                name="guardianPhone"
                value={formData.guardianPhone}
                onChange={handleChange}
                placeholder="(81) 90000-0000"
                required
              />
            </div>
          </div>
        )}

        {/* SEÇÃO 2: CONTATO */}
        <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-semibold text-[#F8D800] uppercase tracking-wider text-xs border-b border-[#222824] pb-3">
            2. Contato
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Telefone Principal"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(81) 99999-9999"
              required
            />
            <Input
              label="WhatsApp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="(81) 99999-9999"
            />
            <Input
              label="E-mail"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="exemplo@email.com"
            />
          </div>
        </div>

        {/* SEÇÃO 3: ENDEREÇO */}
        <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-semibold text-[#F8D800] uppercase tracking-wider text-xs border-b border-[#222824] pb-3">
            3. Endereço
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="CEP"
              name="cep"
              value={formData.cep}
              onChange={handleChange}
              placeholder="50000-000"
            />
            <div className="md:col-span-2">
              <Input
                label="Endereço (Rua/Av)"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Rua das Flores"
              />
            </div>
            <Input
              label="Número"
              name="number"
              value={formData.number}
              onChange={handleChange}
              placeholder="123"
            />
            <Input
              label="Complemento"
              name="complement"
              value={formData.complement}
              onChange={handleChange}
              placeholder="Apt, Bloco"
            />
            <Input
              label="Bairro"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              placeholder="Bairro"
            />
            <Input
              label="Cidade"
              name="city"
              value={formData.city}
              onChange={handleChange}
            />
            <Input
              label="Estado"
              name="state"
              value={formData.state}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* SEÇÃO 4: ASSOCIAÇÃO */}
        <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-semibold text-[#F8D800] uppercase tracking-wider text-xs border-b border-[#222824] pb-3">
            4. Dados da Associação
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Data de Entrada"
              name="entryDate"
              type="date"
              value={formData.entryDate}
              onChange={handleChange}
            />
            <Select
              label="Situação"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'ATIVO', label: 'Ativo' },
                { value: 'AFASTADO', label: 'Afastado' },
                { value: 'INATIVO', label: 'Inativo' }
              ]}
            />
            <Select
              label="Projeto Vinculado"
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
              options={[
                { value: 'proj-1', label: 'Projeto Reforço Escolar' },
                { value: 'proj-2', label: 'Projeto Cestas Básicas' }
              ]}
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => navigate('/membros')}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Salvar Membro
          </Button>
        </div>
      </form>
    </div>
  );
};
