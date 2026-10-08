import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MemberForm } from './MemberForm';
import { ToastProvider } from '../../contexts/ToastContext';
import { memberService } from '../../services/domainServices';

const DADOS_ANA = {
  name: 'Ana Lima',
  cpf: '52998224725',
  rg: '',
  birthDate: '1985-03-02',
  gender: 'F',
  maritalStatus: '',
  occupation: '',
  education: '',
  motherName: '',
  fatherName: '',
  guardianName: '',
  guardianPhone: '',
  phone: '81999990000',
  whatsapp: '',
  email: 'ana@acpb.local',
  cep: '',
  address: '',
  neighborhood: '',
  city: 'Recife',
  state: 'PE'
};

function renderForm(url = '/membros/novo') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ToastProvider>
        <Routes>
          <Route path="/membros/novo" element={<MemberForm />} />
          <Route path="/membros" element={<p>lista de membros</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

/** Tornar membro alguém que já está no cadastro.
 *
 * O formulário só criava pessoa nova: quem foi cadastrado na tela de Pessoas (ou já era
 * voluntário) não tinha como virar membro, e o CPF repetido era recusado. */
describe('MemberForm — pessoa já cadastrada', () => {
  beforeEach(() => {
    vi.spyOn(memberService, 'listarCargos').mockResolvedValue([{ id: '2', nome: 'Associado' }]);
    vi.spyOn(memberService, 'listarPessoasSemMembro').mockResolvedValue([
      { id: '7', name: 'Ana Lima' }
    ]);
    vi.spyOn(memberService, 'dadosDaPessoa').mockResolvedValue(DADOS_ANA);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escolhe a pessoa, traz os dados dela e cria o membro sobre ela', async () => {
    const create = vi.spyOn(memberService, 'create').mockResolvedValue({} as never);
    renderForm();

    await userEvent.selectOptions(
      screen.getByLabelText('Quem será cadastrado'),
      'cadastrada'
    );
    // Sem pessoa escolhida, os dados pessoais ficam escondidos e não dá para salvar.
    expect(screen.queryByLabelText(/Nome completo/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar Membro/ })).toBeDisabled();

    await userEvent.selectOptions(await screen.findByLabelText('Pessoa'), '7');

    expect(await screen.findByLabelText(/Nome completo/)).toHaveValue('Ana Lima');
    expect(screen.getByDisplayValue('529.982.247-25')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Salvar Membro/ }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      pessoaId: '7',
      name: 'Ana Lima',
      cpf: '52998224725',
      cargoId: '2'
    });
    expect(await screen.findByText('lista de membros')).toBeInTheDocument();
  });

  it('vindo da tela de Pessoas, já abre com a pessoa escolhida', async () => {
    renderForm('/membros/novo?pessoa=7');

    expect(await screen.findByLabelText(/Nome completo/)).toHaveValue('Ana Lima');
    expect(memberService.dadosDaPessoa).toHaveBeenCalledWith('7');
    expect(screen.getByLabelText('Quem será cadastrado')).toHaveValue('cadastrada');
  });

  it('pessoa nova continua sem pessoaId', async () => {
    const create = vi.spyOn(memberService, 'create').mockResolvedValue({} as never);
    renderForm();

    await userEvent.type(await screen.findByLabelText(/Nome completo/), 'Carlos Souza');
    await waitFor(() => expect(screen.getByLabelText(/^Cargo/)).toHaveValue('2'));
    await userEvent.click(screen.getByRole('button', { name: /Salvar Membro/ }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).not.toHaveProperty('pessoaId');
  });
});
