import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, FolderKanban, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { memberService } from '../../services/domainServices';
import { Member } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { AvatarUpload } from '../../components/ui/AvatarUpload';
import { Avatar } from '../../components/ui/Avatar';

export const MemberDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      memberService.getById(id).then((data) => {
        setMember(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-[#AEB5B0]">Carregando detalhes do membro...</div>;
  }

  if (!member) {
    return (
      <div className="p-8 text-center text-white space-y-4">
        <h2 className="text-xl font-bold">Membro não encontrado</h2>
        <Button onClick={() => navigate('/membros')}>Voltar para a lista</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[#AEB5B0]">
        <Link to="/membros" className="hover:text-white transition-colors">
          Pessoas
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/membros" className="hover:text-white transition-colors">
          Membros
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#222824]" />
        <span className="text-[#F8D800] font-semibold">{member.name}</span>
      </nav>

      {/* Header Profile Card */}
      <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {hasPermission('edit_members') ? (
            <AvatarUpload
              pessoaId={member.pessoaId}
              nome={member.name}
              temFoto={member.temFoto}
              onChange={(temFotoAgora) => setMember({ ...member, temFoto: temFotoAgora })}
            />
          ) : (
            <Avatar pessoaId={member.pessoaId} nome={member.name} temFoto={member.temFoto} size="xl" />
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-heading">{member.name}</h1>
              <Badge variant={member.status === 'ATIVO' ? 'success' : 'warning'}>
                {member.status}
              </Badge>
            </div>
            <p className="text-xs text-[#AEB5B0] mt-1">CPF: {member.cpf}</p>
            <p className="text-xs text-[#F8D800] font-medium mt-0.5">
              Cargo: {member.cargoName || 'Sem cargo associado'}
            </p>
          </div>
        </div>

        {hasPermission('edit_members') && (
          <Button
            variant="outline"
            onClick={() => navigate(`/membros/${member.id}/editar`)}
            leftIcon={<Edit className="w-4 h-4" />}
          >
            Editar Cadastro
          </Button>
        )}
      </div>

      {/* Detalhes Divididos em Seções */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informações Pessoais & Contato */}
        <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-[#F8D800] uppercase tracking-wider border-b border-[#222824] pb-2">
            Informações Pessoais e Contato
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-[#222824]/50">
              <span className="text-[#AEB5B0]">Data de Nascimento</span>
              <span className="text-white font-medium">{member.birthDate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#222824]/50">
              <span className="text-[#AEB5B0]">Telefone Principal</span>
              <span className="text-white font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#F8D800]" /> {member.phone}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#222824]/50">
              <span className="text-[#AEB5B0]">E-mail</span>
              <span className="text-white font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#F8D800]" /> {member.email}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#222824]/50">
              <span className="text-[#AEB5B0]">Data de Entrada</span>
              <span className="text-white font-medium">{member.entryDate}</span>
            </div>
          </div>

        </div>

        {/* Endereço & Observações */}
        <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-[#F8D800] uppercase tracking-wider border-b border-[#222824] pb-2">
            Endereço e Observações
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2.5 text-[#AEB5B0]">
              <MapPin className="w-4 h-4 text-[#F8D800] shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">
                  {member.address}, {member.number} {member.complement ? `- ${member.complement}` : ''}
                </p>
                <p className="text-xs text-[#727A74]">
                  {member.neighborhood} - {member.city} / {member.state}
                </p>
                <p className="text-xs text-[#727A74]">CEP: {member.cep}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#222824]">
              <span className="text-xs font-semibold text-[#AEB5B0] block mb-1">
                Observações Institucionais:
              </span>
              <p className="text-xs text-white bg-[#0F1210] p-3 rounded-lg border border-[#222824]">
                {member.notes || 'Nenhuma observação informada.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
