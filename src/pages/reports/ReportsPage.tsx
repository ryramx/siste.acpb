import React, { useState } from 'react';
import { FileText, Download, DollarSign, Users, FolderKanban, CalendarDays } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/apiClient';
import { reportService, ReportFormat, ReportKey, ReportFilters } from '../../services/reportService';
import { PermissionKey } from '../../types/user';

type FilterKind = 'date' | 'text' | 'select';

interface FilterDef {
  name: string;
  label: string;
  kind: FilterKind;
  placeholder?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
}

interface ReportDef {
  key: ReportKey;
  title: string;
  description: string;
  icon: React.ReactNode;
  /** Permissão exigida pelo endpoint correspondente no backend. */
  permission: PermissionKey;
  filters: FilterDef[];
}

const RELATORIOS: ReportDef[] = [
  {
    key: 'financeiro',
    title: 'Financeiro',
    description: 'Movimentações com conta, categoria, valor e status.',
    icon: <DollarSign className="w-5 h-5 text-[#F8D800]" />,
    permission: 'view_financial',
    filters: [
      { name: 'data_inicio', label: 'Data inicial', kind: 'date' },
      { name: 'data_fim', label: 'Data final', kind: 'date' },
      {
        name: 'tipo',
        label: 'Tipo',
        kind: 'select',
        // O backend grava ENTRADA/SAIDA (a UI financeira exibe como Receita/Despesa).
        options: [
          { value: '', label: 'Todos' },
          { value: 'ENTRADA', label: 'Receitas (entrada)' },
          { value: 'SAIDA', label: 'Despesas (saída)' }
        ]
      }
    ]
  },
  {
    key: 'pessoas',
    title: 'Pessoas',
    description: 'Cadastro geral com contato, cidade e data de nascimento.',
    icon: <Users className="w-5 h-5 text-[#F8D800]" />,
    permission: 'view_people',
    filters: [{ name: 'cidade', label: 'Cidade', kind: 'text', placeholder: 'Todas as cidades' }]
  },
  {
    key: 'projetos',
    title: 'Projetos',
    description: 'Projetos com período, orçamento, local e status.',
    icon: <FolderKanban className="w-5 h-5 text-[#F8D800]" />,
    permission: 'view_projects',
    filters: [
      {
        name: 'status_filtro',
        label: 'Status',
        kind: 'text',
        placeholder: 'Todos os status',
        // Campo livre porque o backend aceita qualquer status (filtra com ILIKE);
        // um select fixo esconderia status cadastrados fora desta lista.
        helperText: 'Ex.: ATIVO, PLANEJADO'
      }
    ]
  },
  {
    key: 'eventos',
    title: 'Eventos',
    description: 'Eventos com data, local e limite de participantes.',
    icon: <CalendarDays className="w-5 h-5 text-[#F8D800]" />,
    permission: 'view_events',
    filters: [
      { name: 'data_inicio', label: 'Data inicial', kind: 'date' },
      { name: 'data_fim', label: 'Data final', kind: 'date' }
    ]
  }
];

const FORMATOS: { value: ReportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'pdf', label: 'PDF' }
];

const ReportCard: React.FC<{ def: ReportDef }> = ({ def }) => {
  const { addToast } = useToast();
  const [formato, setFormato] = useState<ReportFormat>('csv');
  const [filtros, setFiltros] = useState<ReportFilters>({});
  const [baixando, setBaixando] = useState(false);

  const atualizarFiltro = (nome: string, valor: string) =>
    setFiltros((atual) => ({ ...atual, [nome]: valor }));

  const baixar = async () => {
    setBaixando(true);
    try {
      await reportService.download(def.key, formato, filtros);
      addToast({
        type: 'success',
        title: 'Relatório gerado',
        message: `${def.title} baixado em ${formato.toUpperCase()}.`
      });
    } catch (err) {
      const mensagem =
        err instanceof ApiError ? err.message : 'Não foi possível gerar o relatório.';
      addToast({ type: 'error', title: 'Falha ao gerar relatório', message: mensagem });
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="bg-[#181D1A] border border-[#222824] rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-[#0F1210] rounded-lg border border-[#222824] shrink-0">
          {def.icon}
        </div>
        <div>
          <h2 className="text-white font-semibold font-heading">{def.title}</h2>
          <p className="text-xs text-[#AEB5B0] mt-0.5">{def.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {def.filters.map((filtro) => {
          const id = `${def.key}-${filtro.name}`;
          const valor = filtros[filtro.name] ?? '';
          return filtro.kind === 'select' ? (
            <Select
              key={filtro.name}
              id={id}
              label={filtro.label}
              value={valor}
              onChange={(e) => atualizarFiltro(filtro.name, e.target.value)}
              options={filtro.options ?? []}
            />
          ) : (
            <Input
              key={filtro.name}
              id={id}
              label={filtro.label}
              type={filtro.kind === 'date' ? 'date' : 'text'}
              value={valor}
              placeholder={filtro.placeholder}
              helperText={filtro.helperText}
              onChange={(e) => atualizarFiltro(filtro.name, e.target.value)}
            />
          );
        })}

        <Select
          id={`${def.key}-formato`}
          label="Formato"
          value={formato}
          onChange={(e) => setFormato(e.target.value as ReportFormat)}
          options={FORMATOS}
        />
      </div>

      <Button
        onClick={baixar}
        isLoading={baixando}
        leftIcon={<Download className="w-4 h-4" />}
        className="w-full sm:w-auto sm:self-start"
      >
        {baixando ? 'Gerando...' : 'Baixar relatório'}
      </Button>
    </div>
  );
};

export const ReportsPage: React.FC = () => {
  const { hasPermission } = useAuth();

  // Cada relatório é autorizado no backend pela permissão do seu módulo; aqui só
  // evitamos oferecer um download que resultaria em 403.
  const disponiveis = RELATORIOS.filter((r) => hasPermission(r.permission));

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#F8D800]" />
          Relatórios
        </h1>
        <p className="text-sm text-[#AEB5B0]">
          Exporte os dados da associação em CSV, Excel ou PDF.
        </p>
      </div>

      {disponiveis.length === 0 ? (
        <EmptyState
          title="Nenhum relatório disponível"
          description="Seu perfil não tem permissão para visualizar nenhum dos módulos exportáveis."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {disponiveis.map((def) => (
            <ReportCard key={def.key} def={def} />
          ))}
        </div>
      )}
    </div>
  );
};
