import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { InputValor } from '../../components/ui/InputValor';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/apiClient';
import { patrimonioService } from '../../services/patrimonioService';
import {
  Asset,
  AssetFilters,
  AssetInput,
  AssetStatus,
  ASSET_STATUS_LABELS
} from '../../types/patrimonio';
import { formatarData, formatarMoeda } from '../../utils/dinheiro';

const OPCOES_STATUS = (Object.keys(ASSET_STATUS_LABELS) as AssetStatus[]).map((s) => ({
  value: s,
  label: ASSET_STATUS_LABELS[s]
}));

const VARIANTE_POR_STATUS: Record<AssetStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  ATIVO: 'success',
  EM_MANUTENCAO: 'warning',
  BAIXADO: 'danger',
  EMPRESTADO: 'info'
};

const FORM_VAZIO: AssetInput = {
  codigo: '',
  nome: '',
  categoria: '',
  dataAquisicao: '',
  valorAquisicao: null,
  local: '',
  responsavelId: '',
  status: 'ATIVO',
  observacoes: ''
};

function formatarMoedaOuTraco(valor: number | null): string {
  return valor === null ? '—' : formatarMoeda(valor);
}

export const AssetsList: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const podeEditar = hasPermission('edit_assets');

  const [bens, setBens] = useState<Asset[]>([]);
  const [pessoas, setPessoas] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<AssetFilters>({});

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetInput>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Asset | null>(null);

  const carregar = useCallback(async (filtrosAtuais: AssetFilters) => {
    setLoading(true);
    setErro(null);
    try {
      setBens(await patrimonioService.getAll(filtrosAtuais));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível carregar o patrimônio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar(filtros);
  }, [carregar, filtros]);

  useEffect(() => {
    if (!podeEditar) return;
    patrimonioService.listarPessoas().then(setPessoas).catch(() => setPessoas([]));
  }, [podeEditar]);

  const abrirCriacao = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  };

  const abrirEdicao = (bem: Asset) => {
    setEditando(bem);
    setForm({
      codigo: bem.codigo,
      nome: bem.nome,
      categoria: bem.categoria,
      dataAquisicao: bem.dataAquisicao ?? '',
      valorAquisicao: bem.valorAquisicao,
      local: bem.local ?? '',
      responsavelId: bem.responsavelId ?? '',
      status: bem.status,
      observacoes: bem.observacoes ?? ''
    });
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.codigo.trim() || !form.nome.trim() || !form.categoria.trim()) {
      addToast({
        type: 'warning',
        title: 'Campos obrigatórios',
        message: 'Preencha código, nome e categoria.'
      });
      return;
    }

    setSalvando(true);
    try {
      if (editando) {
        await patrimonioService.update(editando.id, form);
        addToast({ type: 'success', title: 'Bem atualizado', message: form.nome });
      } else {
        await patrimonioService.create(form);
        addToast({ type: 'success', title: 'Bem cadastrado', message: form.nome });
      }
      setModalAberto(false);
      carregar(filtros);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Não foi possível salvar',
        // Um código repetido volta como 409 do backend; a mensagem dele já explica.
        message: err instanceof ApiError ? err.message : 'Erro inesperado.'
      });
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    try {
      await patrimonioService.remove(paraExcluir.id);
      addToast({ type: 'success', title: 'Bem excluído', message: paraExcluir.nome });
      setParaExcluir(null);
      carregar(filtros);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Não foi possível excluir',
        message: err instanceof ApiError ? err.message : 'Erro inesperado.'
      });
    }
  };

  // A busca por texto é local; os demais filtros vão ao backend, que já sabe filtrá-los.
  const filtrados = bens.filter((b) => {
    const termo = busca.toLowerCase();
    return (
      b.nome.toLowerCase().includes(termo) ||
      b.codigo.toLowerCase().includes(termo) ||
      b.categoria.toLowerCase().includes(termo) ||
      (b.local ?? '').toLowerCase().includes(termo)
    );
  });

  const valorTotal = filtrados.reduce((acc, b) => acc + (b.valorAquisicao ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#F8D800]" />
            Patrimônio
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            Bens da associação: equipamentos, mobiliário, instrumentos e ferramentas.
          </p>
        </div>
        {podeEditar && (
          <Button onClick={abrirCriacao} leftIcon={<Plus className="w-4 h-4" />}>
            Novo bem
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#181D1A] border border-[#222824] border-l-4 border-l-[#004922] p-4 rounded-xl">
          <span className="text-xs text-[#AEB5B0]">Bens listados</span>
          <div className="text-xl font-bold text-white mt-1">{filtrados.length}</div>
        </div>
        <div className="bg-[#181D1A] border border-[#222824] border-l-4 border-l-[#F8D800] p-4 rounded-xl">
          <span className="text-xs text-[#AEB5B0]">Valor de aquisição somado</span>
          <div className="text-xl font-bold text-[#F8D800] mt-1">{formatarMoedaOuTraco(valorTotal)}</div>
        </div>
      </div>

      <div className="bg-[#181D1A] border border-[#222824] p-4 rounded-xl flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por código, nome, categoria ou local..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full md:w-52">
          <Select
            value={filtros.status ?? ''}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, status: (e.target.value as AssetStatus) || '' }))
            }
            options={[{ value: '', label: 'Todos os status' }, ...OPCOES_STATUS]}
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : erro ? (
        <EmptyState
          title="Não foi possível carregar o patrimônio"
          description={erro}
          actionLabel="Tentar novamente"
          onAction={() => carregar(filtros)}
        />
      ) : filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum bem encontrado"
          description={
            podeEditar
              ? 'Cadastre o primeiro bem do patrimônio da associação.'
              : 'Nenhum bem corresponde aos filtros selecionados.'
          }
          actionLabel={podeEditar ? 'Novo bem' : undefined}
          onAction={podeEditar ? abrirCriacao : undefined}
        />
      ) : (
        <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Bem</th>
                  <th className="py-3 px-4 hidden md:table-cell">Categoria</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Local</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Responsável</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Aquisição</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  {podeEditar && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222824]">
                {filtrados.map((b) => (
                  <tr key={b.id} className="hover:bg-[#1e2521] transition-colors">
                    <td className="py-3 px-4 text-[#F8D800] font-mono text-xs">{b.codigo}</td>
                    <td className="py-3 px-4 text-white">{b.nome}</td>
                    <td className="py-3 px-4 text-[#AEB5B0] hidden md:table-cell">{b.categoria}</td>
                    <td className="py-3 px-4 text-[#AEB5B0] hidden lg:table-cell">
                      {b.local ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-[#AEB5B0] hidden lg:table-cell">
                      {b.responsavelNome ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-[#AEB5B0] hidden sm:table-cell">
                      {formatarData(b.dataAquisicao)}
                    </td>
                    <td className="py-3 px-4 text-white">{formatarMoedaOuTraco(b.valorAquisicao)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={VARIANTE_POR_STATUS[b.status]} size="sm">
                        {ASSET_STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                    </td>
                    {podeEditar && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Editar ${b.nome}`}
                          onClick={() => abrirEdicao(b)}
                          leftIcon={<Pencil className="w-4 h-4" />}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Excluir ${b.nome}`}
                          onClick={() => setParaExcluir(b)}
                          leftIcon={<Trash2 className="w-4 h-4 text-red-400" />}
                        />
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
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editando ? `Editar ${editando.nome}` : 'Novo bem'}
      >
        {/* <form> de verdade para o Enter salvar: com os campos soltos num <div>, teclar Enter
            não fazia nada, e só o clique no botão funcionava. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="asset-codigo"
              label="Código"
              required
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              helperText="Identificação física do bem (tombamento)"
            />
            <Input
              id="asset-nome"
              label="Nome"
              required
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
            <Input
              id="asset-categoria"
              label="Categoria"
              required
              value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              placeholder="Ex.: Informática, Mobiliário"
            />
            <Select
              id="asset-status"
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AssetStatus }))}
              options={OPCOES_STATUS}
            />
            <Input
              id="asset-data"
              label="Data de aquisição"
              type="date"
              value={form.dataAquisicao ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, dataAquisicao: e.target.value }))}
            />
            <InputValor
              label="Valor de aquisição"
              value={form.valorAquisicao ?? null}
              onChange={(valorAquisicao) => setForm((f) => ({ ...f, valorAquisicao }))}
            />
            <Input
              id="asset-local"
              label="Local"
              value={form.local ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
            />
            <Select
              id="asset-responsavel"
              label="Responsável"
              value={form.responsavelId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}
              options={[
                { value: '', label: 'Sem responsável' },
                ...pessoas.map((p) => ({ value: p.id, label: p.nome }))
              ]}
            />
          </div>

          <Input
            id="asset-observacoes"
            label="Observações"
            value={form.observacoes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={salvando}>
              {editando ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={paraExcluir !== null}
        onClose={() => setParaExcluir(null)}
        title="Excluir bem do patrimônio"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#AEB5B0]">
            Excluir <strong className="text-white">{paraExcluir?.nome}</strong> (
            {paraExcluir?.codigo})? Esta ação não pode ser desfeita.
          </p>
          <p className="text-xs text-[#727A74]">
            Se o bem apenas saiu de uso, prefira alterar o status para "Baixado" — assim o histórico
            é preservado.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setParaExcluir(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
