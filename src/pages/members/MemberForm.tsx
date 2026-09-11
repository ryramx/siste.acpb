import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { memberService, CargoOption } from '../../services/domainServices';
import { useToast } from '../../contexts/ToastContext';

export const MemberForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(isEditing);
  const [cargos, setCargos] = useState<CargoOption[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    birthDate: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: 'Recife',
    state: 'PE',
    entryDate: new Date().toISOString().split('T')[0],
    status: 'ATIVO' as 'ATIVO' | 'INATIVO',
    cargoId: '',
    notes: ''
  });

  useEffect(() => {
    memberService.listarCargos().then((lista) => {
      setCargos(lista);
      setFormData((prev) => (prev.cargoId ? prev : { ...prev, cargoId: lista[0]?.id ?? '' }));
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    memberService.getById(id).then((membro) => {
      if (membro) {
        setFormData({
          name: membro.name,
          cpf: membro.cpf,
          birthDate: membro.birthDate,
          phone: membro.phone,
          whatsapp: membro.whatsapp,
          email: membro.email,
          address: membro.address,
          city: membro.city,
          state: membro.state,
          entryDate: membro.entryDate,
          status: membro.status,
          cargoId: membro.cargoId ?? '',
          notes: membro.notes ?? ''
        });
      }
      setLoadingInitialData(false);
    });
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing && id) {
        await memberService.update(id, formData);
        addToast({ type: 'success', title: 'Membro atualizado', message: 'Os dados foram salvos com sucesso.' });
      } else {
        await memberService.create(formData);
        addToast({
          type: 'success',
          title: 'Membro cadastrado',
          message: 'O novo membro foi registrado com sucesso na base ACPB.'
        });
      }
      navigate('/membros');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Erro ao salvar membro', message });
    } finally {
      setLoading(false);
    }
  };

  if (loadingInitialData) {
    return <div className="p-8 text-center text-[#AEB5B0]">Carregando dados do membro...</div>;
  }

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
        <h1 className="text-xl font-bold text-white font-heading">
          {isEditing ? 'Editar Membro' : 'Novo Membro'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SEÇÃO 1: INFORMAÇÕES PESSOAIS */}
        <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-semibold text-[#F8D800] uppercase tracking-wider text-xs border-b border-[#222824] pb-3">
            1. Informações Pessoais
          </h2>

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
            />
            <Input
              label="Data de Nascimento"
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={handleChange}
            />
          </div>
        </div>

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
            />
            <Input
              label="WhatsApp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="Deixe igual ao telefone se for o mesmo número"
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
            <div className="md:col-span-2">
              <Input
                label="Endereço"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Rua das Flores, 123"
              />
            </div>
            <Input label="Cidade" name="city" value={formData.city} onChange={handleChange} />
            <Input label="Estado" name="state" value={formData.state} onChange={handleChange} />
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
            {isEditing && (
              <Select
                label="Situação"
                name="status"
                value={formData.status}
                onChange={handleChange}
                options={[
                  { value: 'ATIVO', label: 'Ativo' },
                  { value: 'INATIVO', label: 'Inativo' }
                ]}
              />
            )}
            <Select
              label="Cargo"
              name="cargoId"
              value={formData.cargoId}
              onChange={handleChange}
              options={cargos.map((c) => ({ value: c.id, label: c.nome }))}
              required
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
