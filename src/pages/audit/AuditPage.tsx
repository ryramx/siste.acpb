import React, { useCallback, useEffect, useState } from 'react';
import { ScrollText, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/apiClient';
import { auditService, AuditEntry, AuditFilters } from '../../services/auditService';

const TAMANHO_PAGINA = 50;

// Ações e tabelas realmente registradas por app/core/auditoria.py. A opção vazia
// significa "não filtrar" — o backend trata o parâmetro ausente como sem filtro.
const ACOES = [
  { value: '', label: 'Todas as ações' },
  { value: 'criar', label: 'Criar' },
  { value: 'editar', label: 'Editar' },
  { value: 'excluir', label: 'Excluir' },
  { value: 'desativar', label: 'Desativar' },
  // Tentativa recusada pelas travas de administrador (ver backend/app/api/routes/usuarios.py).
  { value: 'bloquear', label: 'Bloqueada' }
];

const TABELAS = [
  { value: '', label: 'Todas as tabelas' },
  { value: 'usuarios', label: 'Usuários' },
  { value: 'perfis', label: 'Perfis' },
  { value: 'usuario_perfis', label: 'Vínculos usuário–perfil' },
  { value: 'perfil_permissoes', label: 'Vínculos perfil–permissão' },
  { value: 'pessoas', label: 'Pessoas' },
  { value: 'movimentacoes_financeiras', label: 'Movimentações financeiras' },
  { value: 'anexos_financeiros', label: 'Anexos financeiros' }
];

const VARIANTE_POR_ACAO: Record<string, 'success' | 'info' | 'danger' | 'warning' | 'neutral'> = {
  criar: 'success',
  editar: 'info',
  excluir: 'danger',
  desativar: 'warning',
  bloquear: 'danger'
};

function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString('pt-BR');
}

const PainelDados: React.FC<{ titulo: string; dados: Record<string, unknown> | null }> = ({
  titulo,
  dados
}) => (
  <div className="flex-1 min-w-0">
    <h4 className="text-xs font-semibold text-[#AEB5B0] mb-2">{titulo}</h4>
    {dados === null ? (
      <p className="text-xs text-[#727A74] italic">Não registrado</p>
    ) : (
      <pre className="text-[11px] text-white bg-[#0F1210] border border-[#222824] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(dados, null, 2)}
      </pre>
    )}
  </div>
);

export const AuditPage: React.FC = () => {
  const { addToast } = useToast();

  const [registros, setRegistros] = useState<AuditEntry[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const [detalhe, setDetalhe] = useState<AuditEntry | null>(null);

  const [filtros, setFiltros] = useState<AuditFilters>({});

  const carregar = useCallback(
    async (filtrosAtuais: AuditFilters, paginaAtual: number) => {
      setLoading(true);
      setErro(null);
      try {
        const dados = await auditService.list({
          ...filtrosAtuais,
          limit: TAMANHO_PAGINA,
          offset: paginaAtual * TAMANHO_PAGINA
        });
        setRegistros(dados);
      } catch (err) {
        const mensagem =
          err instanceof ApiError ? err.message : 'Não foi possível carregar a auditoria.';
        setErro(mensagem);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    carregar(filtros, pagina);
  }, [carregar, filtros, pagina]);

  useEffect(() => {
    auditService
      .listarUsuarios()
      .then(setUsuarios)
      .catch(() => {
        // Sem a lista de usuários o filtro por ator fica indisponível, mas a
        // tela continua funcionando — não vale bloquear a auditoria por isso.
        addToast({
          type: 'warning',
          title: 'Filtro de usuário indisponível',
          message: 'Não foi possível carregar a lista de usuários.'
        });
      });
  }, [addToast]);

  const atualizarFiltro = (campo: keyof AuditFilters, valor: string) => {
    setPagina(0);
    setFiltros((atual) => ({ ...atual, [campo]: valor || undefined }));
  };

  const limparFiltros = () => {
    setPagina(0);
    setFiltros({});
  };

  // O backend não retorna total de registros; uma página cheia indica que
  // provavelmente há mais, então habilitamos "próxima" só nesse caso.
  const podeAvancar = registros.length === TAMANHO_PAGINA;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-[#F8D800]" />
          Auditoria
        </h1>
        <p className="text-sm text-[#AEB5B0]">
          Histórico de operações sensíveis: quem fez, o que mudou, quando e de qual IP.
        </p>
      </div>

      <div className="bg-[#181D1A] border border-[#222824] p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Select
          id="filtro-usuario"
          label="Usuário"
          value={filtros.usuarioId ?? ''}
          onChange={(e) => atualizarFiltro('usuarioId', e.target.value)}
          options={[
            { value: '', label: 'Todos os usuários' },
            ...usuarios.map((u) => ({ value: u.id, label: u.nome }))
          ]}
        />
        <Select
          id="filtro-acao"
          label="Ação"
          value={filtros.acao ?? ''}
          onChange={(e) => atualizarFiltro('acao', e.target.value)}
          options={ACOES}
        />
        <Select
          id="filtro-tabela"
          label="Tabela"
          value={filtros.tabela ?? ''}
          onChange={(e) => atualizarFiltro('tabela', e.target.value)}
          options={TABELAS}
        />
        <Input
          id="filtro-data-inicio"
          label="De"
          type="date"
          value={filtros.dataInicio ?? ''}
          onChange={(e) => atualizarFiltro('dataInicio', e.target.value)}
        />
        <Input
          id="filtro-data-fim"
          label="Até"
          type="date"
          value={filtros.dataFim ?? ''}
          onChange={(e) => atualizarFiltro('dataFim', e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-[#AEB5B0]">
          {loading ? 'Carregando...' : `${registros.length} registro(s) nesta página`}
        </span>
        <Button variant="outline" size="sm" onClick={limparFiltros} leftIcon={<Search className="w-4 h-4" />}>
          Limpar filtros
        </Button>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : erro ? (
        <EmptyState
          title="Não foi possível carregar a auditoria"
          description={erro}
          actionLabel="Tentar novamente"
          onAction={() => carregar(filtros, pagina)}
        />
      ) : registros.length === 0 ? (
        <EmptyState
          title="Nenhum registro encontrado"
          description="Nenhuma operação auditada corresponde aos filtros selecionados."
        />
      ) : (
        <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
                <tr>
                  <th className="py-3 px-4">Data/hora</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4 hidden md:table-cell">Tabela</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Registro</th>
                  <th className="py-3 px-4 hidden lg:table-cell">IP</th>
                  <th className="py-3 px-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222824]">
                {registros.map((r) => (
                  <tr key={r.id} className="hover:bg-[#1e2521] transition-colors">
                    <td className="py-3 px-4 text-[#AEB5B0] whitespace-nowrap">
                      {formatarDataHora(r.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-white">{r.usuarioNome}</td>
                    <td className="py-3 px-4">
                      <Badge variant={VARIANTE_POR_ACAO[r.acao] ?? 'neutral'} size="sm">
                        {r.acao}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[#AEB5B0] hidden md:table-cell">
                      {r.tabela ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-[#AEB5B0] hidden lg:table-cell">
                      {r.registroId ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-[#AEB5B0] hidden lg:table-cell">{r.ip ?? '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetalhe(r)}
                        aria-label={`Ver detalhes do registro ${r.id}`}
                        leftIcon={<Eye className="w-4 h-4" />}
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina === 0 || loading}
          onClick={() => setPagina((p) => Math.max(0, p - 1))}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Anterior
        </Button>
        <span className="text-xs text-[#AEB5B0]">Página {pagina + 1}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!podeAvancar || loading}
          onClick={() => setPagina((p) => p + 1)}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Próxima
        </Button>
      </div>

      <Modal
        isOpen={detalhe !== null}
        onClose={() => setDetalhe(null)}
        title={detalhe ? `${detalhe.acao} em ${detalhe.tabela ?? 'registro'}` : ''}
      >
        {detalhe && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-[#AEB5B0]">Usuário</dt>
                <dd className="text-white">{detalhe.usuarioNome}</dd>
              </div>
              <div>
                <dt className="text-[#AEB5B0]">Data/hora</dt>
                <dd className="text-white">{formatarDataHora(detalhe.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[#AEB5B0]">Registro</dt>
                <dd className="text-white">{detalhe.registroId ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[#AEB5B0]">IP</dt>
                <dd className="text-white">{detalhe.ip ?? '—'}</dd>
              </div>
            </dl>

            {detalhe.descricao && (
              <p className="text-xs text-[#AEB5B0]">{detalhe.descricao}</p>
            )}

            <div className="flex flex-col md:flex-row gap-4">
              <PainelDados titulo="Antes" dados={detalhe.dadosAnteriores} />
              <PainelDados titulo="Depois" dados={detalhe.dadosNovos} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
