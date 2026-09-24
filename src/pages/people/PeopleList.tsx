import React, { useEffect, useState } from 'react';
import { IdCard, Pencil, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  DadosDePessoa,
  Pessoa,
  VinculoDePessoa,
  pessoaService
} from '../../services/pessoaService';
import {
  apenasDigitos,
  cpfValido,
  exibirCPF,
  exibirTelefone,
  formatarCEP,
  formatarCPF,
  formatarTelefone
} from '../../utils/mascaras';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const ROTULO_DO_VINCULO: Record<VinculoDePessoa, string> = {
  membro: 'Membro',
  voluntario: 'Voluntário',
  beneficiario: 'Beneficiário',
  usuario: 'Usuário do sistema'
};

const vazio: DadosDePessoa = { nomeCompleto: '' };

function paraFormulario(pessoa: Pessoa): DadosDePessoa {
  return {
    nomeCompleto: pessoa.nomeCompleto,
    cpf: pessoa.cpf ? exibirCPF(pessoa.cpf) : '',
    rg: pessoa.rg ?? '',
    dataNascimento: pessoa.dataNascimento ?? '',
    sexo: pessoa.sexo ?? '',
    email: pessoa.email ?? '',
    estadoCivil: pessoa.estadoCivil ?? '',
    profissao: pessoa.profissao ?? '',
    escolaridade: pessoa.escolaridade ?? '',
    nomeMae: pessoa.nomeMae ?? '',
    nomePai: pessoa.nomePai ?? '',
    responsavelNome: pessoa.responsavelNome ?? '',
    responsavelTelefone: pessoa.responsavelTelefone
      ? exibirTelefone(pessoa.responsavelTelefone)
      : '',
    endereco: pessoa.endereco ?? '',
    bairro: pessoa.bairro ?? '',
    cidade: pessoa.cidade ?? '',
    estado: pessoa.estado ?? '',
    cep: pessoa.cep ? formatarCEP(pessoa.cep) : ''
  };
}

/** Cadastro de Pessoa, a entidade que os vínculos apontam.
 *
 * Esta tela não existia: Pessoa só era criada de dentro do formulário de membro, voluntário ou
 * beneficiário, e quem não tinha vínculo nenhum — ou teve o vínculo encerrado — não aparecia em
 * lugar nenhum da interface, mesmo continuando no banco e mesmo sendo o dono de um CPF que a
 * associação guarda. Corrigir o nome dessa pessoa, ou atender a um pedido de exclusão, exigia
 * chamada direta à API.
 */
export const PeopleList: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [vinculosCompletos, setVinculosCompletos] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('TODAS');

  const [formulario, setFormulario] = useState<DadosDePessoa | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<Pessoa | null>(null);

  const podeEditar = hasPermission('edit_people');
  const podeExcluir = hasPermission('delete_people');

  const carregar = () => {
    setCarregando(true);
    pessoaService
      .listar()
      .then(({ pessoas, vinculosCompletos }) => {
        setPessoas(pessoas);
        setVinculosCompletos(vinculosCompletos);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
        addToast({ type: 'error', title: 'Erro ao carregar as pessoas', message });
      })
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, []);

  const filtradas = pessoas.filter((p) => {
    const termo = busca.trim().toLowerCase();
    const digitos = apenasDigitos(busca);
    // A busca por CPF só entra quando há dígitos no termo: `'x'.includes('')` é verdadeiro, e
    // sem essa condição qualquer letra daria match em todo mundo pelo lado do CPF.
    const casaBusca =
      termo === '' ||
      p.nomeCompleto.toLowerCase().includes(termo) ||
      (p.email ?? '').toLowerCase().includes(termo) ||
      (digitos !== '' && (p.cpf ?? '').includes(digitos));

    const casaFiltro =
      filtro === 'TODAS' ||
      (filtro === 'SEM_VINCULO' && p.vinculos.length === 0 && !p.contaTecnica) ||
      (filtro === 'TECNICAS' && p.contaTecnica);

    return casaBusca && casaFiltro;
  });

  const abrirNova = () => {
    setEditandoId(null);
    setFormulario({ ...vazio });
  };

  const abrirEdicao = (pessoa: Pessoa) => {
    setEditandoId(pessoa.id);
    setFormulario(paraFormulario(pessoa));
  };

  const salvar = async () => {
    if (!formulario) return;
    if (formulario.nomeCompleto.trim() === '') {
      addToast({ type: 'error', title: 'Informe o nome completo' });
      return;
    }
    // CPF é opcional, mas um CPF digitado errado é pior que nenhum: ele vira a chave pela qual
    // a pessoa é encontrada depois, e o backend só verifica duplicidade, não os dígitos.
    const digitosCpf = apenasDigitos(formulario.cpf ?? '');
    if (digitosCpf !== '' && !cpfValido(digitosCpf)) {
      addToast({
        type: 'error',
        title: 'CPF inválido',
        message: 'Confira os números — ou deixe o campo em branco, porque o CPF é opcional.'
      });
      return;
    }

    setSalvando(true);
    try {
      if (editandoId) {
        await pessoaService.atualizar(editandoId, formulario);
        addToast({ type: 'success', title: 'Cadastro atualizado', message: formulario.nomeCompleto });
      } else {
        await pessoaService.criar(formulario);
        addToast({ type: 'success', title: 'Pessoa cadastrada', message: formulario.nomeCompleto });
      }
      setFormulario(null);
      setEditandoId(null);
      carregar();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível salvar', message });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!excluindo) return;
    setSalvando(true);
    try {
      await pessoaService.excluir(excluindo.id);
      addToast({ type: 'success', title: 'Pessoa excluída', message: excluindo.nomeCompleto });
      setExcluindo(null);
      carregar();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível excluir', message });
    } finally {
      setSalvando(false);
    }
  };

  const semVinculo = pessoas.filter((p) => p.vinculos.length === 0 && !p.contaTecnica).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <IdCard className="w-6 h-6 text-[#F8D800]" />
            Pessoas
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            O cadastro base da associação. Uma pessoa pode ser membro, voluntário e beneficiário
            ao mesmo tempo — ou nenhum deles.
          </p>
        </div>
        {podeEditar && (
          <Button variant="secondary" onClick={abrirNova} leftIcon={<Plus className="w-4 h-4" />}>
            Nova pessoa
          </Button>
        )}
      </div>

      <div className="bg-[#181D1A] border border-[#222824] p-4 rounded-xl flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full md:w-64">
          <Select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            options={[
              { value: 'TODAS', label: `Todas as pessoas (${pessoas.length})` },
              { value: 'SEM_VINCULO', label: `Sem vínculo (${semVinculo})` },
              { value: 'TECNICAS', label: 'Contas técnicas do sistema' }
            ]}
          />
        </div>
      </div>

      {!vinculosCompletos && (
        <p className="text-xs text-[#727A74]">
          Seu perfil não alcança todas as listas de vínculo, então a coluna de vínculos mostra
          apenas o que você pode ver — uma pessoa sem nenhuma etiqueta aqui pode ter vínculos que
          o seu perfil não enxerga.
        </p>
      )}

      {carregando ? (
        <TableSkeleton rows={5} />
      ) : filtradas.length === 0 ? (
        <EmptyState
          title="Nenhuma pessoa encontrada"
          description="Ajuste a busca ou o filtro para ver o cadastro."
          actionLabel={podeEditar ? 'Nova pessoa' : undefined}
          onAction={abrirNova}
        />
      ) : (
        <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
                <tr>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4 hidden md:table-cell">CPF</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Contato</th>
                  <th className="py-3 px-4">Vínculos</th>
                  {(podeEditar || podeExcluir) && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222824]">
                {filtradas.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1e2521] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar pessoaId={p.id} nome={p.nomeCompleto} temFoto={p.temFoto} size="sm" />
                        <div>
                          <div className="font-medium text-white">{p.nomeCompleto}</div>
                          {p.contaTecnica && (
                            <div className="text-xs text-[#727A74]">Conta técnica do sistema</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#AEB5B0] hidden md:table-cell">
                      {p.cpf ? exibirCPF(p.cpf) : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#AEB5B0] hidden lg:table-cell">
                      {p.email ?? '—'}
                    </td>
                    <td className="py-3 px-4">
                      {p.vinculos.length === 0 ? (
                        <span className="text-xs text-[#727A74]">
                          {vinculosCompletos ? 'Sem vínculo' : '—'}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.vinculos.map((v) => (
                            <Badge key={v} variant={v === 'usuario' ? 'warning' : 'success'}>
                              {ROTULO_DO_VINCULO[v]}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    {(podeEditar || podeExcluir) && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          {podeEditar && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Editar cadastro"
                              aria-label={`Editar ${p.nomeCompleto}`}
                              onClick={() => abrirEdicao(p)}
                              leftIcon={<Pencil className="w-4 h-4" />}
                            />
                          )}
                          {podeExcluir && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Excluir cadastro"
                              aria-label={`Excluir ${p.nomeCompleto}`}
                              onClick={() => setExcluindo(p)}
                              leftIcon={<Trash2 className="w-4 h-4 text-red-400" />}
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={formulario !== null}
        onClose={() => (salvando ? undefined : setFormulario(null))}
        title={editandoId ? 'Editar pessoa' : 'Nova pessoa'}
        maxWidth="2xl"
      >
        {formulario && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              salvar();
            }}
            className="space-y-4"
          >
            <Input
              label="Nome completo"
              value={formulario.nomeCompleto}
              onChange={(e) => setFormulario({ ...formulario, nomeCompleto: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="CPF"
                value={formulario.cpf ?? ''}
                onChange={(e) => setFormulario({ ...formulario, cpf: formatarCPF(e.target.value) })}
                placeholder="000.000.000-00"
              />
              <Input
                label="RG"
                value={formulario.rg ?? ''}
                onChange={(e) => setFormulario({ ...formulario, rg: e.target.value })}
              />
              <Input
                label="Data de nascimento"
                type="date"
                value={formulario.dataNascimento ?? ''}
                onChange={(e) => setFormulario({ ...formulario, dataNascimento: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Sexo"
                value={formulario.sexo ?? ''}
                onChange={(e) => setFormulario({ ...formulario, sexo: e.target.value })}
                options={[
                  { value: '', label: 'Não informado' },
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Feminino' }
                ]}
              />
              <Input
                label="Estado civil"
                value={formulario.estadoCivil ?? ''}
                onChange={(e) => setFormulario({ ...formulario, estadoCivil: e.target.value })}
              />
              <Input
                label="E-mail"
                type="email"
                value={formulario.email ?? ''}
                onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Profissão"
                value={formulario.profissao ?? ''}
                onChange={(e) => setFormulario({ ...formulario, profissao: e.target.value })}
              />
              <Input
                label="Escolaridade"
                value={formulario.escolaridade ?? ''}
                onChange={(e) => setFormulario({ ...formulario, escolaridade: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nome da mãe"
                value={formulario.nomeMae ?? ''}
                onChange={(e) => setFormulario({ ...formulario, nomeMae: e.target.value })}
              />
              <Input
                label="Nome do pai"
                value={formulario.nomePai ?? ''}
                onChange={(e) => setFormulario({ ...formulario, nomePai: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Responsável (se menor de idade)"
                value={formulario.responsavelNome ?? ''}
                onChange={(e) => setFormulario({ ...formulario, responsavelNome: e.target.value })}
              />
              <Input
                label="Telefone do responsável"
                value={formulario.responsavelTelefone ?? ''}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    responsavelTelefone: formatarTelefone(e.target.value)
                  })
                }
                placeholder="(00) 00000-0000"
              />
            </div>

            <Input
              label="Endereço"
              value={formulario.endereco ?? ''}
              onChange={(e) => setFormulario({ ...formulario, endereco: e.target.value })}
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Bairro"
                value={formulario.bairro ?? ''}
                onChange={(e) => setFormulario({ ...formulario, bairro: e.target.value })}
              />
              <Input
                label="Cidade"
                value={formulario.cidade ?? ''}
                onChange={(e) => setFormulario({ ...formulario, cidade: e.target.value })}
              />
              <Input
                label="Estado"
                value={formulario.estado ?? ''}
                onChange={(e) => setFormulario({ ...formulario, estado: e.target.value })}
                maxLength={2}
                placeholder="PE"
              />
              <Input
                label="CEP"
                value={formulario.cep ?? ''}
                onChange={(e) => setFormulario({ ...formulario, cep: formatarCEP(e.target.value) })}
                placeholder="00000-000"
              />
            </div>

            <p className="text-xs text-[#727A74]">
              Só o nome é obrigatório. Cadastrar a pessoa aqui não a torna membro, voluntário nem
              beneficiário — o vínculo é criado na tela do respectivo módulo, apontando para este
              cadastro.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFormulario(null)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={salvando}>
                {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar pessoa'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={excluindo !== null}
        onClose={() => (salvando ? undefined : setExcluindo(null))}
        title="Excluir pessoa do cadastro"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#AEB5B0]">
            Excluir <strong className="text-white">{excluindo?.nomeCompleto}</strong> apaga o
            cadastro em definitivo, com CPF, endereço e histórico pessoal.
          </p>

          {excluindo && excluindo.vinculos.length > 0 && (
            <p className="text-xs text-red-400">
              Esta pessoa tem vínculo como{' '}
              {excluindo.vinculos.map((v) => ROTULO_DO_VINCULO[v].toLowerCase()).join(', ')}. O
              banco vai recusar a exclusão enquanto o vínculo existir — encerre ou remova o
              vínculo primeiro, se a exclusão for mesmo o caso.
            </p>
          )}

          <p className="text-xs text-[#727A74]">
            A exclusão física existe para atender a pedido de exclusão do titular (LGPD) e para
            desfazer um cadastro duplicado. Para quem apenas deixou a associação, o caminho é
            encerrar o vínculo — que preserva o histórico de atendimentos, inscrições e
            lançamentos. A exclusão fica registrada na auditoria com todos os dados anteriores.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExcluindo(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={excluir} disabled={salvando}>
              {salvando ? 'Excluindo...' : 'Excluir cadastro'}
            </Button>
          </div>
        </div>
      </Modal>

      {podeEditar && filtradas.length > 0 && (
        <p className="text-xs text-[#727A74] flex items-center gap-1">
          <UserPlus className="w-3 h-3" />
          Para transformar uma pessoa em membro, voluntário ou beneficiário, use a tela do módulo
          correspondente e escolha este cadastro — evita criar a mesma pessoa duas vezes.
        </p>
      )}
    </div>
  );
};
