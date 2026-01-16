import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function UserProfile() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: 1,
  });

  const { data: empleado } = useQuery({
    queryKey: ['empleado', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const empleados = await base44.entities.Empleado.filter({ email: currentUser.email });
      return empleados?.[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const handleLogout = async () => {
    try {
      await base44.auth.logout('/');
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'invited': return 'bg-blue-100 text-blue-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 p-0 rounded-full">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-sm font-medium">
            {getInitials(currentUser?.full_name)}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col gap-2 p-2 mb-2">
          <p className="text-sm font-medium text-foreground">{currentUser?.full_name}</p>
          <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
          {empleado && (
            <div className={`text-xs px-2 py-1 rounded w-fit ${getStatusColor(empleado.status)}`}>
              {empleado.status === 'active' ? 'Activo' : empleado.status === 'invited' ? 'Invitado' : 'Bloqueado'}
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}