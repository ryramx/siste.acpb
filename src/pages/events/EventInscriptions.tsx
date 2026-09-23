import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Users, CheckCircle, Clock, UserPlus, Trash2, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { eventService, inscricaoService } from '../../services/domainServices';
import { EventInscription, EventItem, InscriptionStatus } from '../../types/domain';
import {
  apenasDigitos,
  cpfValido,
  exibirTelefone,
  formatarCPF,
  formatarTelefone
} from '../../utils/mascaras';

/** Duas origens de participante na mesma tela: quem já tem cadastro no sistema e o visitante
 *  que aparece no dia e ainda não é membro. O avulso vira uma Pessoa sem papel nenhum, o que
 *  permite reinscrevê-lo depois pela busca em vez de recadastrar. */
type Origem = 'cadastrada' | 'avulso';

const VISITANTE_VAZIO = { name: '', phone: '', cpf: '', email: '', notes: '' };

const badgeDoStatus: Record<InscriptionStatus, 'success' | 'warning' | 'danger'> = {
  CONFIRMADA: 'success',
  PENDENTE: 'warning',
  CANCELADA: 'danger'
};

export const EventInscriptions: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [inscriptions, setInscriptions] = useState<EventInscription[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [origem, setOrigem] = useState<Origem>('cadastrada');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  // Ver EventDetails: repete a busca sem recarregar a página.
  const [tentativa, setTentativa] = useState(0);

  const [pessoaOptions, setPessoaOptions] = useState<{ id: string; name: string }[]>([]);
  const [pessoaId, setPessoaId] = useState('');
  const [visitante, setVisitante] = useState(VISITANTE_VAZIO);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setErroCarregamento(null);
    eventService
      .getById(id)
      .then((data) => {
        setEvent(data || null);
        setInscriptions(data?.inscriptions ?? []);
      })
      .catch((err) => {
        // Sem isto a tela ficava em "Carregando inscrições..." para sempre quando a API
        // falhava, sem dizer o motivo.
        setErroCarregamento(
          err instanceof Error ? err.message : 'Não foi possível carregar as inscrições.'
        );
      })
      .finally(() => setLoading(false));
  }, [id, tentativa]);

  const ocupadas = inscriptions.filter((i) => i.status !== 'CANCELADA').length;
  const disponiveis = event?.maxSlots != null ? event.maxSlots - ocupadas : null;
  const lotado = disponiveis !== null && disponiveis <= 0;

  /** Carrega as pessoas só ao abrir o modal: varrer /pessoas/ no load da página custaria
   *  uma consulta que a maioria das visitas (só conferir a lista) nunca usa. */
  const abrirModal = useCallback(async () => {
    if (!id) return;
    setFormError(null);
    setOrigem('cadastrada');
    setPessoaId('');
    setVisitante(VISITANTE_VAZIO);
    setModalOpen(true);
    setPessoaOptions(await inscricaoService.listarPessoasDisponiveis(id));
  }, [id]);

  const cpfDigitado = apenasDigitos(visitante.cpf);
  // Mesma regra do cadastro de pessoas: CPF é opcional e o aviso nunca bloqueia a inscrição —
  // no balcão de um evento raramente se tem o documento em mãos.
  const avisoCpf =
    cpfDigitado.length === 11 && !cpfValido(cpfDigitado)
      ? 'Confira os dígitos: este CPF não passa na validação.'
      : undefined;

  const podeSalvar = origem === 'cadastrada' ? pessoaId !== '' : visitante.name.trim() !== '';

  const handleInscrever = async () => {
    if (!id || !podeSalvar) return;
    setSaving(true);
    setFormError(null);
    try {
      const criada =
        origem === 'cadastrada'
          ? await inscricaoService.inscreverPessoa(id, pessoaId)
          : await inscricaoService.inscreverAvulso(id, visitante);
      setInscriptions((atuais) => [...atuais, criada]);
      setModalOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível inscrever o participante.');
    } finally {
      setSaving(false);
    }
  };

  const handleAlterarStatus = async (inscricao: EventInscription, status: InscriptionStatus) => {
    const atualizada = await inscricaoService.alterarStatus(inscricao.id, status);
    setInscriptions((atuais) => atuais.map((i) => (i.id === inscricao.id ? atualizada : i)));
  };

  const handleRemover = async (inscricao: EventInscription) => {
    if (!window.confirm(`Remover a inscrição de ${inscricao.participantName}?`)) return;
    await inscricaoService.remover(inscricao.id);
    setInscriptions((atuais) => atuais.filter((i) => i.id !== inscricao.id));
  };

  if (loading) return <div className="p-8 text-center text-[#AEB5B0]">Carregando inscrições...</div>;

  if (erroCarregamento) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-white">Não foi possível carregar as inscrições deste evento.</p>
        <p className="text-xs text-[#AEB5B0]">{erroCarregamento}</p>
        <div className="flex items-center justify-center gap-2">
          <Link to="/eventos">
            <Button variant="outline">Voltar para a agenda</Button>
          </Link>
          <Button variant="primary" onClick={() => setTentativa((n) => n + 1)}>
            Tentar de novo
          </Button>
        </div>
      </div>
    );
  }

  if (!event) return <div className="p-8 text-center text-white">Evento não encontrado.</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <nav className="flex items-center gap-2 text-xs text-[#AEB5B0]">
        <Link to="/eventos" className="hover:text-white transition-colors">Eventos</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/eventos/${event.id}`} className="hover:text-white transition-colors">{event.title}</Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#222824]" />
        <span className="text-[#F8D800] font-semibold">Inscrições</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">
            Inscrições: {event.title}
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            Controle de presenças e confirmação de participantes do evento.
          </p>
        </div>
        <Button
          onClick={abrirModal}
          disabled={lotado}
          leftIcon={<UserPlus className="w-4 h-4" />}
          title={lotado ? 'Todas as vagas do evento já estão ocupadas' : undefined}
        >
          Inscrever participante
        </Button>
      </div>

      {/* Cards de Resumo de Vagas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Vagas Totais" value={event.maxSlots ?? 'Sem limite'} icon={<Users className="w-5 h-5" />} accentColor="neutral" />
        <StatCard title="Inscritos" value={ocupadas} icon={<CheckCircle className="w-5 h-5" />} accentColor="green" />
        <StatCard
          title="Disponíveis"
          value={disponiveis ?? 'Sem limite'}
          icon={<Clock className="w-5 h-5" />}
          accentColor="yellow"
        />
      </div>

      {/* Tabela de Inscrições */}
      {inscriptions.length === 0 ? (
        <EmptyState
          title="Nenhum participante inscrito"
          description="Inscreva pessoas já cadastradas ou registre visitantes avulsos que aparecerem no dia do evento."
          actionLabel="Inscrever participante"
          onAction={abrirModal}
          icon={<UserPlus className="w-8 h-8" />}
        />
      ) : (
        <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
              <tr>
                <th className="py-3.5 px-4">Participante</th>
                <th className="py-3.5 px-4">Data da Inscrição</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222824]">
              {inscriptions.map((ins) => (
                <tr key={ins.id} className="hover:bg-[#1e2521] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div>{ins.participantName}</div>
                    <div className="text-xs text-[#727A74]">{exibirTelefone(ins.participantPhone)}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#AEB5B0] text-xs">
                    {new Date(ins.inscriptionDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={badgeDoStatus[ins.status]}>{ins.status}</Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-end gap-1">
                      {ins.status === 'CANCELADA' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAlterarStatus(ins, 'CONFIRMADA')}
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                        >
                          Reativar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAlterarStatus(ins, 'CANCELADA')}
                          leftIcon={<XCircle className="w-4 h-4" />}
                        >
                          Cancelar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remover inscrição de ${ins.participantName}`}
                        onClick={() => handleRemover(ins)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Inscrever Participante"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            {/* O botão vive no rodapé do modal, fora do <form>. O atributo `form` é o que os
                liga: sem isso o Enter dentro dos campos não fazia nada. */}
            <Button
              type="submit"
              form="form-inscricao"
              isLoading={saving}
              disabled={!podeSalvar}
            >
              Inscrever
            </Button>
          </>
        }
      >
        <form
          id="form-inscricao"
          onSubmit={(e) => {
            e.preventDefault();
            handleInscrever();
          }}
        >
        <div className="flex gap-2 p-1 bg-[#0F1210] border border-[#222824] rounded-lg">
          {(
            [
              ['cadastrada', 'Pessoa cadastrada'],
              ['avulso', 'Visitante avulso']
            ] as [Origem, string][]
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => {
                setOrigem(valor);
                setFormError(null);
              }}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                origem === valor ? 'bg-[#F8D800] text-[#0F1210]' : 'text-[#AEB5B0] hover:text-white'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {origem === 'cadastrada' ? (
          <>
            <Select
              label="Pessoa"
              required
              value={pessoaId}
              onChange={(e) => setPessoaId(e.target.value)}
              options={[
                { value: '', label: 'Selecione uma pessoa' },
                ...pessoaOptions.map((p) => ({ value: p.id, label: p.name }))
              ]}
            />
            {pessoaOptions.length === 0 && (
              <p className="text-xs text-[#AEB5B0]">
                Todas as pessoas cadastradas já estão inscritas neste evento. Use a aba
                "Visitante avulso" para registrar alguém novo.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-[#AEB5B0]">
              O visitante entra no cadastro de pessoas sem virar membro, voluntário ou
              beneficiário — só o nome é obrigatório.
            </p>
            <Input
              label="Nome completo"
              required
              value={visitante.name}
              onChange={(e) => setVisitante({ ...visitante, name: e.target.value })}
            />
            <Input
              label="Telefone"
              placeholder="(81) 99999-9999"
              value={visitante.phone}
              onChange={(e) =>
                setVisitante({ ...visitante, phone: formatarTelefone(e.target.value) })
              }
            />
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={visitante.cpf}
              helperText={avisoCpf}
              onChange={(e) => setVisitante({ ...visitante, cpf: formatarCPF(e.target.value) })}
            />
            <Input
              label="E-mail"
              type="email"
              value={visitante.email}
              onChange={(e) => setVisitante({ ...visitante, email: e.target.value })}
            />
            <Input
              label="Observações"
              placeholder="Ex.: veio com a vizinha, primeira visita"
              value={visitante.notes}
              onChange={(e) => setVisitante({ ...visitante, notes: e.target.value })}
            />
          </>
        )}

        {formError && <p className="text-xs text-red-500">{formError}</p>}
        </form>
      </Modal>
    </div>
  );
};
