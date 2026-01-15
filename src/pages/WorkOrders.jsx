import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Briefcase, Calendar } from 'lucide-react';
import WorkOrderCard from '../components/work-orders/WorkOrderCard';
import WorkOrderDetailView from '../components/work-orders/WorkOrderDetailView';
import WorkOrderOperationalCalendar from '../components/work-orders/WorkOrderOperationalCalendar';

export default function WorkOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState('list');

  // Obtener todas las tareas de todos los proyectos
  const { data: allTasks = [], refetch } = useQuery({
    queryKey: ['allProjectTasks'],
    queryFn: () => base44.entities.ProjectTask.list('-created_date', 500)
  });

  // Obtener proyectos para mapear nombres
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200)
  });

  // Enriquecer tareas con información del proyecto
  const enrichedTasks = allTasks.map(task => {
    const project = projects.find(p => p.id === task.project_id);
    return {
      ...task,
      project_name: project?.name || 'Sin proyecto',
      client_name: project?.client_name,
      project_color: project?.color
    };
  });

  const filteredTasks = enrichedTasks.filter(task => {
    const matchesSearch =
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.project_name && task.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.client_name && task.client_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Summary stats basado en estados de tareas
  const stats = {
    total: allTasks.length,
    inProgress: allTasks.filter(task => task.status === 'en_progreso').length,
    pending: allTasks.filter(task => task.status === 'pendiente').length,
    completed: allTasks.filter(task => task.status === 'completada').length
  };

  if (selectedTask) {
    // Aquí podrías mostrar un detalle de la tarea si lo deseas
    // Por ahora, volvemos a la lista
    const project = projects.find(p => p.id === selectedTask.project_id);
    if (project) {
      window.location.href = `/Projects?id=${project.id}`;
      return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          Órdenes de Trabajo
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestiona las órdenes de trabajo gráficas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">En progreso</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Completadas</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Buscar por número, nombre o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent p-0 focus-visible:ring-0"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_progreso">En progreso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendario
          </TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list" className="mt-6">
          {filteredTasks.length > 0 ? (
            <div className="space-y-2">
              {filteredTasks.map(task => (
                <Card 
                  key={task.id} 
                  className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedTask(task)}
                  style={{ borderLeft: `4px solid ${task.project_color || '#3b82f6'}` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{task.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-slate-500">{task.project_name}</p>
                          {task.client_name && (
                            <>
                              <span className="text-slate-300">•</span>
                              <p className="text-sm text-slate-500">{task.client_name}</p>
                            </>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                          task.status === 'completada' ? 'bg-green-100 text-green-700' :
                          task.status === 'en_progreso' ? 'bg-orange-100 text-orange-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {task.status === 'completada' ? 'Completada' :
                           task.status === 'en_progreso' ? 'En progreso' :
                           'Pendiente'}
                        </span>
                        {task.due_date && (
                          <p className="text-xs text-slate-500">
                            {new Date(task.due_date).toLocaleDateString('es-AR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {searchTerm || filterStatus !== 'all'
                    ? 'No se encontraron tareas'
                    : 'No hay tareas creadas aún'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Vista de calendario disponible próximamente</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}