import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { SeletorDisponibilidade } from './SeletorDisponibilidade';
import { juntarDisponibilidade } from '../../utils/disponibilidade';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import {
  volunteerService,
  beneficiaryService,
  projectService
} from '../../services/domainServices';
import { formatarCPF } from '../../utils/mascaras';

type Papel = 'voluntario' | 'beneficiario';

interface NovoVinculoModalProps {
  papel: Papel;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** So usado quando papel e 'voluntario': opcoes ja usadas por outros. */
  opcoesDisponibilidade?: string[];
}

const TEXTOS = {
  voluntario: {
    titulo: 'Novo voluntário',
    dataLabel: 'Data de início',
    extraLabel: 'Área de atuação',
    extraPlaceholder: 'Ex.: Pedagogia, Cozinha, Eventos'
  },
  beneficiario: {
    titulo: 'Novo beneficiário',
    dataLabel: 'Data de cadastro',
    extraLabel: 'Necessidades',
    extraPlaceholder: 'Ex.: Cesta básica, apoio escolar'
  }
} as const;

/** Cadastro de voluntário ou beneficiário.
 *
 * As duas listas existiam sem nenhuma forma de incluir alguém — abriam vazias e assim
 * permaneciam, o que também impedia vincular pessoas a projetos. O formulário é um só porque
 * a diferença entre os dois papéis é pequena, e mantê-los juntos evita que um ganhe correções
 * que o outro não recebe.
 *
 * Aceita os dois caminhos que a associação usa na prática: aproveitar alguém que já está no
 * cadastro (um membro que passa a ser voluntário, por exemplo) ou registrar uma pessoa nova.
 * Pessoa e vínculo nascem na mesma transação no backend, então uma falha não deixa cadastro
 * solto. */
export const NovoVinculoModal: React.FC<NovoVinculoModalProps> = ({
  papel,
  isOpen,
  onClose,
  onSaved,
  opcoesDisponibilidade = []
}) => {
  const textos = TEXTOS[papel];
  const hoje = new Date().toISOString().split('T')[0];

  const [origem, setOrigem] = useState<'cadastrada' | 'nova'>('cadastrada');
  const [pessoas, setPessoas] = useState<{ id: string; name: string }[]>([]);
  const [pessoaId, setPessoaId] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [data, setData] = useState(hoje);
  const [extra, setExtra] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // So aparecem no cadastro de voluntario: beneficiario nao tem area de atuacao nem
  // escala. `volunteerService.create` ja aceitava os dois, mas o formulario nunca perguntou,
  // entao todo voluntario nascia com a disponibilidade em branco.
  const [habilidades, setHabilidades] = useState('');
  const [disponibilidade, setDisponibilidade] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    // Reinicia a cada abertura: sem isto o formulário reabriria com o que foi digitado antes.
    setOrigem('cadastrada');
    setPessoaId('');
    setNomeCompleto('');
    setCpf('');
    setEmail('');
    setData(hoje);
    setExtra('');
    setHabilidades('');
    setDisponibilidade([]);
    setErro(null);
    projectService
      .getPessoasParaResponsavel()
      .then(setPessoas)
      .catch(() => setErro('Não foi possível carregar a lista de pessoas.'));
  }, [isOpen, hoje]);

  const podeSalvar =
    origem === 'cadastrada' ? pessoaId !== '' : nomeCompleto.trim() !== '';

  const salvar = async () => {
    if (!podeSalvar) return;
    setSalvando(true);
    setErro(null);
    const comum = {
      ...(origem === 'cadastrada'
        ? { pessoaId }
        : { nomeCompleto: nomeCompleto.trim(), cpf, email })
    };
    try {
      if (papel === 'voluntario') {
        await volunteerService.create({
          ...comum,
          startDate: data,
          area: extra,
          skills: habilidades,
          availability: juntarDisponibilidade(disponibilidade)
        });
      } else {
        await beneficiaryService.create({ ...comum, registrationDate: data, needs: extra });
      }
      onSaved();
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o cadastro.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={textos.titulo}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
        className="space-y-4"
      >
        <Select
          label="Quem será cadastrado"
          value={origem}
          onChange={(e) => setOrigem(e.target.value as 'cadastrada' | 'nova')}
          options={[
            { value: 'cadastrada', label: 'Alguém que já está no cadastro' },
            { value: 'nova', label: 'Uma pessoa nova' }
          ]}
        />

        {origem === 'cadastrada' ? (
          <Select
            label="Pessoa"
            value={pessoaId}
            onChange={(e) => setPessoaId(e.target.value)}
            options={[
              { value: '', label: 'Selecione...' },
              ...pessoas.map((p) => ({ value: p.id, label: p.name }))
            ]}
          />
        ) : (
          <>
            <Input
              label="Nome completo"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CPF"
                value={cpf}
                onChange={(e) => setCpf(formatarCPF(e.target.value))}
                placeholder="000.000.000-00"
              />
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={textos.dataLabel}
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
          <Input
            label={textos.extraLabel}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder={textos.extraPlaceholder}
          />
        </div>

        {papel === 'voluntario' && (
          <>
            <Input
              label="Habilidades & competências"
              value={habilidades}
              onChange={(e) => setHabilidades(e.target.value)}
              placeholder="Ex.: Psicologia, Libras, Violão"
              helperText="Separe por vírgula."
            />
            <SeletorDisponibilidade
              selecionadas={disponibilidade}
              onChange={setDisponibilidade}
              opcoesConhecidas={opcoesDisponibilidade}
              disabled={salvando}
            />
          </>
        )}

        {erro && <p className="text-xs text-red-500">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={salvando} disabled={!podeSalvar}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
};
