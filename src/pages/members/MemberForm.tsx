import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { memberService, CargoOption } from '../../services/domainServices';
import { buscarEnderecoPorCEP, CEPError } from '../../services/cepService';
import { useToast } from '../../contexts/ToastContext';
import {
  apenasDigitos,
  cpfValido,
  formatarCEP,
  formatarCPF,
  formatarTelefone
} from '../../utils/mascaras';

export const MemberForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(isEditing);
  const [cargos, setCargos] = useState<CargoOption[]>([]);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    birthDate: '',
    phone: '',
    whatsapp: '',
    email: '',
    cep: '',
    address: '',
    neighborhood: '',
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
          cpf: formatarCPF(membro.cpf),
          birthDate: membro.birthDate,
          phone: formatarTelefone(membro.phone),
          whatsapp: formatarTelefone(membro.whatsapp),
          email: membro.email,
          // A API devolve so digitos; a mascara e aplicada aqui, na entrada do formulario.
          cep: formatarCEP(membro.cep),
          address: membro.address,
          neighborhood: membro.neighborhood,
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

  /** Campos que sao exibidos com mascara enquanto o usuario digita. O que vai para a API
   * sao os digitos puros — ver `dadosParaEnvio`. */
  const MASCARAS: Record<string, (valor: string) => string> = {
    cpf: formatarCPF,
    phone: formatarTelefone,
    whatsapp: formatarTelefone,
    cep: formatarCEP
  };

  /** CPF em branco e legitimo: nem sempre a associacao tem o documento em maos no momento
   * do cadastro, e exigi-lo impediria registrar a pessoa. Por isso o aviso so aparece com os
   * 11 digitos preenchidos e invalidos — ou seja, erro de digitacao — e nunca bloqueia o
   * salvamento. Campo vazio e salvo como null. */
  const cpfDigitado = apenasDigitos(formData.cpf);
  const avisoCpf =
    cpfDigitado.length === 11 && !cpfValido(cpfDigitado)
      ? 'Confira os dígitos: este CPF não passa na validação.'
      : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const mascara = MASCARAS[name];
    setFormData((prev) => ({ ...prev, [name]: mascara ? mascara(value) : value }));
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    const digitos = apenasDigitos(e.target.value);
    setErroCep(null);
    // Busca no oitavo digito, sem esperar o usuario sair do campo: ele acabou de terminar
    // de digitar e o resultado aparece de imediato.
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    try {
      const endereco = await buscarEnderecoPorCEP(digitos);
      setFormData((prev) => ({
        ...prev,
        // Preenche apenas o que o ViaCEP devolveu: CEPs de cidades pequenas costumam vir
        // sem logradouro, e apagar o que o usuario ja digitou seria pior que nao preencher.
        address: endereco.logradouro || prev.address,
        neighborhood: endereco.bairro || prev.neighborhood,
        city: endereco.cidade || prev.city,
        state: endereco.estado || prev.state
      }));
    } catch (err) {
      setErroCep(err instanceof CEPError ? err.message : 'Nao foi possivel consultar o CEP.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // A mascara e so da exibicao: o banco guarda digitos, para que busca e comparacao nao
    // dependam de qual formato foi digitado.
    const dadosParaEnvio = {
      ...formData,
      cpf: apenasDigitos(formData.cpf),
      phone: apenasDigitos(formData.phone),
      whatsapp: apenasDigitos(formData.whatsapp),
      cep: apenasDigitos(formData.cep)
    };

    try {
      if (isEditing && id) {
        await memberService.update(id, dadosParaEnvio);
        addToast({ type: 'success', title: 'Membro atualizado', message: 'Os dados foram salvos com sucesso.' });
      } else {
        await memberService.create(dadosParaEnvio);
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
              inputMode="numeric"
              helperText={avisoCpf ?? 'Opcional — deixe em branco se ainda não tiver o documento'}
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
              inputMode="tel"
            />
            <Input
              label="WhatsApp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="(81) 99999-9999"
              inputMode="tel"
              helperText="Deixe igual ao telefone se for o mesmo número"
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
              onChange={handleCepChange}
              placeholder="00000-000"
              inputMode="numeric"
              error={erroCep ?? undefined}
              helperText={buscandoCep ? 'Buscando endereço...' : 'Preenche o endereço automaticamente'}
            />
            <div className="md:col-span-2">
              <Input
                label="Endereço"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Rua das Flores, 123"
              />
            </div>
            <Input
              label="Bairro"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              placeholder="Centro"
            />
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

          {/* A tela de detalhes já exibia "Observações Institucionais", mas não havia onde
              escrevê-las: o campo existia no banco e na API, e só faltava aqui. */}
          <div className="mt-4 w-full flex flex-col gap-1.5">
            <label
              htmlFor="notes"
              className="text-xs font-medium text-[#AEB5B0]"
            >
              Observações Institucionais
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Anotações internas sobre o membro (opcional)"
              className="w-full bg-[#151917] border border-[#222824] rounded-lg px-3 py-2 text-sm text-white placeholder-[#727A74] focus:outline-none focus:border-[#004922] focus:ring-1 focus:ring-[#004922] transition-colors"
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
