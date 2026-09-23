import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { NAO_INFORMADA, volunteerService } from '../../services/domainServices';
import { Volunteer } from '../../types/domain';

interface EditarVoluntarioModalProps {
  voluntario: Volunteer | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Edição da atuação do voluntário: área, habilidades e disponibilidade.
 *
 * Esses três campos não tinham como ser preenchidos em lugar nenhum. O cadastro só
 * perguntava a área, e depois de criado não havia tela de edição -- a API já aceitava o
 * PUT, mas o front nunca o chamava. Na prática a disponibilidade ficava presa em "Não
 * informada" para sempre, que é justamente o dado usado para escalar alguém.
 *
 * Só a atuação se edita aqui. Nome, e-mail e telefone pertencem à Pessoa, e alterá-los
 * daqui mudaria também o cadastro de membro da mesma pessoa, sem que a tela avisasse.
 */
export const EditarVoluntarioModal: React.FC<EditarVoluntarioModalProps> = ({
  voluntario,
  onClose,
  onSaved
}) => {
  const [area, setArea] = useState('');
  const [habilidades, setHabilidades] = useState('');
  const [disponibilidade, setDisponibilidade] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!voluntario) return;
    // "Não informada" é texto de exibição, não valor: entra no formulário como vazio, senão
    // bastaria abrir e salvar para gravar essa frase como se fosse a resposta real.
    setArea(voluntario.area === NAO_INFORMADA ? '' : voluntario.area);
    setDisponibilidade(voluntario.availability === NAO_INFORMADA ? '' : voluntario.availability);
    setHabilidades(voluntario.skills.join(', '));
    setErro(null);
  }, [voluntario]);

  if (!voluntario) return null;

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await volunteerService.update(voluntario.id, {
        area,
        skills: habilidades,
        availability: disponibilidade
      });
      onSaved();
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={salvando ? () => {} : onClose}
      title={`Editar ${voluntario.name.split(' ')[0]}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={salvar} isLoading={salvando}>
            Salvar
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
        className="space-y-4"
      >
        {erro && (
          <p role="alert" className="text-red-400">
            {erro}
          </p>
        )}

        <Input
          label="Área de atuação"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Ex.: Pedagogia, Cozinha, Eventos"
        />

        <Input
          label="Habilidades & competências"
          value={habilidades}
          onChange={(e) => setHabilidades(e.target.value)}
          placeholder="Ex.: Psicologia, Libras, Violão"
          helperText="Separe por vírgula. Cada uma vira uma etiqueta no cartão e entra na busca."
        />

        <Input
          label="Disponibilidade"
          value={disponibilidade}
          onChange={(e) => setDisponibilidade(e.target.value)}
          placeholder="Ex.: Sábados à tarde, Segundas e quartas à noite"
          helperText="Texto livre: escreva como a pessoa costuma dizer."
        />

        {/* O submit do formulário existe para o Enter funcionar; os botões estão no rodapé
            do modal, que fica fora do <form>. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
};
