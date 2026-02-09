import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2,
  Users, 
  CheckSquare, 
  MessageSquare, 
  Settings,
  LogOut,
  Zap,
  Sun,
  Moon,
  FolderOpen,
  FileText,
  CalendarDays,
  Share2,
  Megaphone,
  ChevronDown
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const menuGroups = [
  {
    title: 'Geral',
    items: [
      { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
      { title: 'Clientes', url: '/admin/clients', icon: Building2 },
      { title: 'Usuários', url: '/admin/users', icon: Users },
      { title: 'Tarefas', url: '/admin/tasks', icon: CheckSquare },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { title: 'Tráfego Pago', url: '/admin/traffic-ads', icon: Megaphone },
      { title: 'Calendário Editorial', url: '/admin/calendar', icon: CalendarDays },
      { title: 'Criação de Conteúdo', url: '/admin/content-creation', icon: Zap },
      { title: 'Redes Sociais', url: '/admin/social-media', icon: Share2 },
    ],
  },
  {
    title: 'Recursos',
    items: [
      { title: 'Arquivos', url: '/admin/files', icon: FolderOpen },
      { title: 'Pauta de Reunião', url: '/admin/agenda', icon: FileText },
      { title: 'Chat IA', url: '/admin/chat', icon: MessageSquare },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { title: 'Configurações', url: '/admin/settings', icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const isGroupActive = (items: { url: string }[]) => {
    return items.some(item => isActive(item.url));
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-sidebar-foreground">AgencyOS</h2>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {menuGroups.map((group) => (
          <Collapsible
            key={group.title}
            defaultOpen={isGroupActive(group.items)}
            className="group/collapsible"
          >
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors flex items-center justify-between w-full px-2 py-1.5">
                  <span>{group.title}</span>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive(item.url)}>
                          <NavLink 
                            to={item.url} 
                            end={item.url === '/admin'}
                            className="flex items-center gap-3"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            className="flex-1 justify-start text-muted-foreground hover:text-foreground"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
