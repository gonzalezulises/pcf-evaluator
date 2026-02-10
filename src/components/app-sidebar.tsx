'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Settings,
  Shield,
  Network,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';

const mainNav = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Organizaciones', href: '/organizations', icon: Building2 },
];

const adminNav = [
  { title: 'Usuarios', href: '/admin/users', icon: Shield },
  { title: 'Datos PCF', href: '/admin/pcf', icon: Network },
];

interface AppSidebarProps {
  user: { name: string; email: string; role: string };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">PCF Evaluator</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t px-4 py-3">
        <Link href="/settings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{user.name}</span>
            <span className="text-xs">{user.email}</span>
          </div>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
