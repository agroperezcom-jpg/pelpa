import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  User,
  MessageSquare,
  Send,
  GripVertical,
  Clock,
  DollarSign,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const PROJECT_TYPES = [
  { value: "diseno", label: "Diseño" },
  { value: "impresion", label: "Impresión" },
  { value: "venta_especial", label: "Venta Especial" },
  { value: "encuadernacion", label: "Encuadernación" },
  { value: "evento", label: "Evento" },
  { value: "otro", label: "Otro" }
];

const STATUSES = [
  { value: "pendiente", label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  { value: "en_progreso", label: "En Progreso", color: "bg-blue-100 text-blue-700" },
  { value: "completado", label: "Completado", color: "bg-emerald-100 text-emerald-700" },
  { value: "cancelado", label: "Cancelado", color: "bg-slate-100 text-slate-700" }
];

const PRIORITIES = [
  { value: "alta", label: "Alta", color: "bg-red-500" },
  { value: "media", label: "Media", color: "bg-amber-500" },
  { value: "baja", label: "Baja", color: "bg-green-500" }
];

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("kanban");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    client_id: "",
    type: "otro",
    status: "pendiente",
    priority: "media",
    start_date: "",
    due_date: "",
    budget: "",
    assigned_employees: []
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedProject?.id],
    queryFn: () => selectedProject ? base44.entities.ProjectMessage.filter({ project_id: selectedProject.id }, 'created_date') : [],
    enabled: !!selectedProject
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectMessage.create(data),
    onSuccess: () => refetchMessages()
  });

  const handleOpenDialog = (project = null) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name || "",
        description: project.description || "",
        client_id: project.client_id || "",
        type: project.type || "otro",
        status: project.status || "pendiente",
        priority: project.priority || "media",
        start_date: project.start_date || "",
        due_date: project.due_date || "",
        budget: project.budget?.toString() || "",
        assigned_employees: project.assigned_employees || []
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: "",
        description: "",
        client_id: "",
        type: "otro",
        status: "pendiente",
        priority: "media",
        start_date: "",
        due_date: "",
        budget: "",
        assigned_employees: []
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProject(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const client = clients.find(c => c.id === formData.client_id);
    const data = {
      ...formData,
      client_name: client?.name || "",
      budget: parseFloat(formData.budget) || 0
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
      handleCloseDialog();
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const projectId = result.draggableId;
    const newStatus = result.destination.droppableId;
    
    updateMutation.mutate({ id: projectId, data: { status: newStatus } });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedProject) return;
    
    sendMessageMutation.mutate({
      project_id: selectedProject.id,
      sender_email: user?.email,
      sender_name: user?.full_name,
      message: newMessage.trim()
    });
    setNewMessage("");
  };

  const openChat = (project) => {
    setSelectedProject(project);
    setIsChatOpen(true);
  };

  const filteredProjects = projects.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProjectsByStatus = (status) => filteredProjects.filter(p => p.status === status);

  const renderProjectCard = (project, index) => (
    <Draggable key={project.id} draggableId={project.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`bg-white rounded-lg border p-4 mb-3 shadow-sm hover:shadow-md transition-all ${
            snapshot.isDragging ? 'shadow-lg' : ''
          }`}
        >
          <div className="flex items-start gap-2">
            <div {...provided.dragHandleProps} className="mt-1 cursor-grab">
              <GripVertical className="h-4 w-4 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${PRIORITIES.find(p => p.value === project.priority)?.color}`} />
                    <h3 className="font-medium text-slate-800 truncate">{project.name}</h3>
                  </div>
                  {project.client_name && (
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      {project.client_name}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(project)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openChat(project)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteMutation.mutate(project.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center gap-3 mt-3 text-xs">
                {project.due_date && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(project.due_date), "d MMM", { locale: es })}
                  </span>
                )}
                {project.budget > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <DollarSign className="h-3 w-3" />
                    {project.budget.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Badge className="text-xs bg-slate-100 text-slate-600">
                  {PROJECT_TYPES.find(t => t.value === project.type)?.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Proyectos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar proyecto o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList className="bg-slate-100">
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="list">Lista</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUSES.filter(s => s.value !== 'cancelado').map((status) => (
              <div key={status.value} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-700">{status.label}</h3>
                  <Badge className={`${status.color} text-xs`}>
                    {getProjectsByStatus(status.value).length}
                  </Badge>
                </div>
                <Droppable droppableId={status.value}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="min-h-[200px]"
                    >
                      {getProjectsByStatus(status.value).map((project, index) => 
                        renderProjectCard(project, index)
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Proyecto</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Cliente</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Tipo</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Estado</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Fecha Límite</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="border-t hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${PRIORITIES.find(p => p.value === project.priority)?.color}`} />
                        <span className="font-medium">{project.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{project.client_name || '-'}</td>
                    <td className="p-4">
                      <Badge className="bg-slate-100 text-slate-600">
                        {PROJECT_TYPES.find(t => t.value === project.type)?.label}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={STATUSES.find(s => s.value === project.status)?.color}>
                        {STATUSES.find(s => s.value === project.status)?.label}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-600">
                      {project.due_date ? format(new Date(project.due_date), "d MMM yyyy", { locale: es }) : '-'}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(project)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openChat(project)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(project.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del proyecto"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del proyecto"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin cliente</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Límite</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Presupuesto</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingProject ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Chat - {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="h-80 overflow-y-auto space-y-3 p-2 bg-slate-50 rounded-lg">
            {messages.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No hay mensajes aún</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_email === user?.email ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender_email === user?.email 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border'
                  }`}>
                    <p className={`text-xs font-medium ${msg.sender_email === user?.email ? 'text-blue-100' : 'text-slate-500'}`}>
                      {msg.sender_name}
                    </p>
                    <p className="text-sm mt-1">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.sender_email === user?.email ? 'text-blue-200' : 'text-slate-400'}`}>
                      {format(new Date(msg.created_date), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}