import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  HeartHandshake,
  FolderKanban,
  CalendarDays,
  DollarSign,
  Building2,
  FileText,
  ScrollText,
  Settings,
  IdCard,
  UserCog,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  isMobileOpen,
  onMobileClose
}) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [peopleOpen, setPeopleOpen] = useState(true);
  const [financialOpen, setFinancialOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#181D1A] border-r border-[#222824] select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#222824]">
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src="/logo-acpb.png"
            alt="Logo ACPB"
            className="w-10 h-10 object-contain rounded-lg shrink-0 border border-[#004922]/50 bg-[#0F1210] p-0.5"
          />
          {isOpen && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="font-bold text-white text-sm font-heading tracking-wide">
                ACPB
              </span>
              <span className="text-[10px] text-[#F8D800] uppercase tracking-wider font-semibold">
                Sistema de Gestão
              </span>
            </div>
          )}
        </div>
        {/* Toggle Desktop Button */}
        <button
          onClick={onToggle}
          className="hidden md:flex p-1.5 rounded-lg text-[#AEB5B0] hover:text-white hover:bg-[#222824] transition-colors"
          title={isOpen ? 'Recolher menu' : 'Expandir menu'}
          aria-label={isOpen ? 'Recolher menu' : 'Expandir menu'}
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Mobile Close Button */}
        <button
          onClick={onMobileClose}
          aria-label="Fechar menu"
          className="md:hidden p-1.5 rounded-lg text-[#AEB5B0] hover:text-white hover:bg-[#222824]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {/* Dashboard */}
        {hasPermission('view_dashboard') && (
          <NavLink
            to="/dashboard"
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#004922] text-white font-semibold shadow-inner'
                  : 'text-[#AEB5B0] hover:bg-[#222824] hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5 shrink-0 text-[#F8D800]" />
            {isOpen && <span>Dashboard</span>}
          </NavLink>
        )}

        {/* Pessoas (Submenu Collapsible)
            O grupo só aparece se o perfil alcançar ao menos um dos submenus. Sem esta
            verificação ele aparecia para todo mundo e, para quem não tinha nenhuma das três
            permissões, abria vazio — um menu que só serve para frustrar quem clica. */}
        {(hasPermission('view_people') ||
          hasPermission('view_members') ||
          hasPermission('view_volunteers') ||
          hasPermission('view_beneficiaries')) && (
        <div>
          <button
            onClick={() => setPeopleOpen(!peopleOpen)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-[#AEB5B0] hover:bg-[#222824] hover:text-white`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 shrink-0 text-[#AEB5B0]" />
              {isOpen && <span>Pessoas</span>}
            </div>
            {isOpen && (
              peopleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {isOpen && peopleOpen && (
            <div className="ml-8 mt-1 space-y-1 border-l border-[#222824] pl-2">
              {/* Primeiro da lista porque e a entidade base: membro, voluntario e beneficiario
                  sao vinculos que apontam para um cadastro daqui. */}
              {hasPermission('view_people') && (
                <NavLink
                  to="/pessoas"
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-[#F8D800] bg-[#004922]/40 font-semibold'
                        : 'text-[#AEB5B0] hover:text-white hover:bg-[#222824]'
                    }`
                  }
                >
                  <IdCard className="w-4 h-4 shrink-0" />
                  Cadastro de pessoas
                </NavLink>
              )}
              {hasPermission('view_members') && (
                <NavLink
                  to="/membros"
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-[#F8D800] bg-[#004922]/40 font-semibold'
                        : 'text-[#AEB5B0] hover:text-white hover:bg-[#222824]'
                    }`
                  }
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  Membros
                </NavLink>
              )}

              {hasPermission('view_volunteers') && (
                <NavLink
                  to="/voluntarios"
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-[#F8D800] bg-[#004922]/40 font-semibold'
                        : 'text-[#AEB5B0] hover:text-white hover:bg-[#222824]'
                    }`
                  }
                >
                  <Users className="w-4 h-4 shrink-0" />
                  Voluntários
                </NavLink>
              )}

              {hasPermission('view_beneficiaries') && (
                <NavLink
                  to="/beneficiarios"
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-[#F8D800] bg-[#004922]/40 font-semibold'
                        : 'text-[#AEB5B0] hover:text-white hover:bg-[#222824]'
                    }`
                  }
                >
                  <HeartHandshake className="w-4 h-4 shrink-0" />
                  Beneficiários
                </NavLink>
              )}
            </div>
          )}
        </div>
        )}

        {/* Projetos */}
        {hasPermission('view_projects') && (
          <NavLink
            to="/projetos"
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#004922] text-white font-semibold'
                  : 'text-[#AEB5B0] hover:bg-[#222824] hover:text-white'
              }`
            }
          >
            <FolderKanban className="w-5 h-5 shrink-0" />
            {isOpen && <span>Projetos</span>}
          </NavLink>
        )}

        {/* Eventos */}
        {hasPermission('view_events') && (
          <NavLink
            to="/eventos"
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#004922] text-white font-semibold'
                  : 'text-[#AEB5B0] hover:bg-[#222824] hover:text-white'
              }`
            }
          >
            <CalendarDays className="w-5 h-5 shrink-0" />
            {isOpen && <span>Eventos</span>}
          </NavLink>
        )}

        {/* Financeiro (Expandable) */}
        {hasPermission('view_financial') && (
          <div>
            <button
              onClick={() => setFinancialOpen(!financialOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-[#AEB5B0] hover:bg-[#222824] hover:text-white"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 shrink-0 text-[#F8D800]" />
                {isOpen && <span>Financeiro</span>}
              </div>
              {isOpen && (
                financialOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {isOpen && financialOpen && (
              <div className="ml-8 mt-1 space-y-1 border-l border-[#222824] pl-2">
                {['', '/receitas', '/despesas', '/movimentacoes'].map((sub, i) => {
                  const labels = ['Dashboard', 'Receitas', 'Despesas', 'Movimentações'];
                  const icons = ['📊', '↑', '↓', '↕'];
                  return (
                    <NavLink
                      key={sub}
                      to={`/financeiro${sub}`}
                      end={sub === ''}
                      onClick={onMobileClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'text-[#F8D800] bg-[#004922]/40 font-semibold'
                            : 'text-[#AEB5B0] hover:text-white hover:bg-[#222824]'
                        }`
                      }
                    >
                      <span className="text-[10px]">{icons[i]}</span>
                      {labels[i]}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Patrimônio */}
        {hasPermission('view_assets') && (
          <NavLink
            to="/patrimonio"
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#004922] text-white font-semibold'
                  : 'text-[#AEB5B0] hover:bg-[#222824] hover:text-white'
              }`
            }
          >
            <Building2 className="w-5 h-5 shrink-0" />
            {isOpen && <span>Patrimônio</span>}
          </NavLink>
        )}

        {/* Relatórios — visível para quem puder exportar ao menos um módulo. */}
        {(hasPermission('view_financial') ||
          hasPermission('view_people') ||
          hasPermission('view_projects') ||
          hasPermission('view_events')) && (
          <NavLink
            to="/relatorios"
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#004922] text-white font-semibold'
                  : 'text-[#AEB5B0] hover:bg-[#222824] hover:text-white'
              }`
            }
          >
            <FileText className="w-5 h-5 shrink-0" />
            {isOpen && <span>Relatórios</span>}
          </NavLink>
        )}

        {/* Auditoria (restrita a auditoria.visualizar — na prática, Administrador) */}
        {hasPermission('view_audit') && (
          <NavLink
            to="/auditoria"
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#004922] text-white font-semibold'
                  : 'text-[#AEB5B0] hover:bg-[#222824] hover:text-white'
              }`
            }
          >
            <ScrollText className="w-5 h-5 shrink-0" />
            {isOpen && <span>Auditoria</span>}
          </NavLink>
        )}

        {/* Configurações (Apenas Administrador) */}
        {hasPermission('view_settings') && (
          <NavLink
            to="/configuracoes"
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#004922] text-white font-semibold'
                  : 'text-[#AEB5B0] hover:bg-[#222824] hover:text-white'
              }`
            }
          >
            <Settings className="w-5 h-5 shrink-0" />
            {isOpen && <span>Configurações</span>}
          </NavLink>
        )}
      </div>

      {/* Footer / Exit Section */}
      <div className="p-3 border-t border-[#222824] space-y-2">
        {user && isOpen && (
          <div className="px-3 py-2 bg-[#0F1210] rounded-lg border border-[#222824] flex items-center gap-3">
            <Avatar pessoaId={user.pessoaId} nome={user.name} temFoto={user.temFoto} size="sm" />
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-white truncate">{user.name}</span>
              <span className="text-[10px] text-[#F8D800] tracking-wide font-medium">{user.role}</span>
            </div>
          </div>
        )}

        {/* Sem verificacao de permissao: trocar a propria senha e ver os proprios perfis nao
            dependem de perfil nenhum. */}
        <NavLink
          to="/minha-conta"
          onClick={onMobileClose}
          className={({ isActive }) =>
            `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'text-[#F8D800] bg-[#004922]/40 font-semibold'
                : 'text-[#AEB5B0] hover:bg-[#222824] hover:text-white'
            }`
          }
        >
          <UserCog className="w-5 h-5 shrink-0" />
          {isOpen && <span>Minha conta</span>}
        </NavLink>

        <button
          onClick={handleLogout}
          aria-label="Sair da conta"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isOpen && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 left-0 bottom-0 z-30 transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-20'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onMobileClose}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl animate-slide-in">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
