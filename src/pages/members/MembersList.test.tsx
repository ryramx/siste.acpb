import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MembersList } from './MembersList';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { comSessaoSalva, USUARIO_ADMIN } from '../../test/utils';
import { authService } from '../../services/authService';
import { memberService } from '../../services/domainServices';
import { Member } from '../../types/domain';

function membro(id: string, name: string, cpf: string, email: string): Member {
  return {
    id,
    pessoaId: id,
    name,
    cpf,
    rg: '',
    birthDate: '1990-01-01',
    gender: '',
    maritalStatus: '',
    occupation: '',
    education: '',
    motherName: '',
    fatherName: '',
    guardianName: '',
    guardianPhone: '',
    temFoto: false,
    phone: '',
    whatsapp: '',
    email,
    cep: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    entryDate: '2026-01-01',
    status: 'ATIVO'
  };
}

const MEMBROS = [
  membro('1', 'Maria Souza', '11122233344', 'maria@acpb.local'),
  membro('2', 'João Pereira', '55566677788', 'joao@acpb.local')
];

function renderLista() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <MembersList />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

/** Busca da lista de membros.
 *
 * O bug que originou estes testes: digitar no campo não filtrava nada. A comparação por CPF
 * era avaliada sempre e, como `'qualquer'.includes('')` é verdadeiro, buscar por letras dava
 * correspondência em todo mundo pelo lado do CPF — a lista nunca reduzia.
 */
describe('MembersList — busca', () => {
  beforeEach(() => {
    comSessaoSalva();
    vi.spyOn(authService, 'refreshCurrentUser').mockResolvedValue(USUARIO_ADMIN);
    vi.spyOn(memberService, 'getAll').mockResolvedValue(MEMBROS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('filtra por nome', async () => {
    renderLista();
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), 'Maria');

    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.queryByText('João Pereira')).not.toBeInTheDocument();
  });

  it('não deixa passar todo mundo quando o termo não é um CPF', async () => {
    renderLista();
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), 'zzzznaoexiste');

    expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
    expect(screen.queryByText('João Pereira')).not.toBeInTheDocument();
  });

  it('filtra por CPF mesmo digitado com máscara', async () => {
    renderLista();
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), '111.222.333-44');

    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.queryByText('João Pereira')).not.toBeInTheDocument();
  });

  it('campo vazio mostra todos de novo', async () => {
    renderLista();
    const campo = await screen.findByPlaceholderText(/Buscar por nome/i);

    await userEvent.type(campo, 'Maria');
    await userEvent.clear(campo);

    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
  });
});
