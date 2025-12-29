import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Megaphone,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Trophy,
  Users,
  TrendingUp,
  Calendar,
  CheckSquare,
  Target
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CAMPAIGN_TYPES = [
  { value: "redes_sociales", label: "Redes Sociales" },
  { value: "flyers", label: "Flyers" },
  { value: "email", label: "Email Marketing" },
  { value: "evento", label: "Evento" },
  { value: "promocion", label: "Promoción" },
  { value: "otro", label: "Otro" }
];

const STATUSES = [
  { value: "planificada", label: "Planificada", color: "bg-slate-100 text-slate-700" },
  { value: "en_progreso", label: "En Progreso", color: "bg-blue-100 text-blue-700" },
  { value: "completada", label: "Completada", color: "bg-emerald-100 text-emerald-700" },
  { value: "cancelada", label: "Cancelada", color: "bg-red-100 text-red-700" }
];

export default function Marketing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "redes_sociales",
    status: "planificada",
    start_date: "",
    end_date: "",
    budget: "",
    assigned_to: "",
    checklist: [],
    leads_generated: 0,
    clients_acquired: 0,
    sales_generated: 0,
    is_successful: false
  });
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Campaign.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  });

  const handleOpenDialog = (campaign = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name || "",
        description: campaign.description || "",
        type: campaign.type || "redes_sociales",
        status: campaign.status || "planificada",
        start_date: campaign.start_date || "",
        end_date: campaign.end_date || "",
        budget: campaign.budget?.toString() || "",
        assigned_to: campaign.assigned_to || "",
        checklist: campaign.checklist || [],
        leads_generated: campaign.leads_generated || 0,
        clients_acquired: campaign.clients_acquired || 0,
        sales_generated: campaign.sales_generated || 0,
        is_successful: campaign.is_successful || false
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: "",
        description: "",
        type: "redes_sociales",
        status: "planificada",
        start_date: "",
        end_date: "",
        budget: "",
        assigned_to: "",
        checklist: [
          { text: "Definir objetivos", completed: false },
          { text: "Crear contenido", completed: false },
          { text: "Publicar/Lanzar", completed: false },
          { text: "Medir resultados", completed: false }
        ],
        leads_generated: 0,
        clients_acquired: 0,
        sales_generated: 0,
        is_successful: false
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCampaign(null);
    setNewChecklistItem("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      budget: parseFloat(formData.budget) || 0
    };

    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data });
      handleCloseDialog();
    } else {
      createMutation.mutate(data);
    }
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setFormData({
      ...formData,
      checklist: [...formData.checklist, { text: newChecklistItem.trim(), completed: false }]
    });
    setNewChecklistItem("");
  };

  const toggleChecklistItem = (index) => {
    const newChecklist = [...formData.checklist];
    newChecklist[index].completed = !newChecklist[index].completed;
    setFormData({ ...formData, checklist: newChecklist });
  };

  const removeChecklistItem = (index) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.filter((_, i) => i !== index)
    });
  };

  const updateCampaignChecklist = async (campaign, index) => {
    const newChecklist = [...(campaign.checklist || [])];
    newChecklist[index].completed = !newChecklist[index].completed;
    updateMutation.mutate({ id: campaign.id, data: { checklist: newChecklist } });
  };

  const markAsSuccessful = (campaign) => {
    updateMutation.mutate({
      id: campaign.id,
      data: { is_successful: !campaign.is_successful }
    });
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const successfulCampaigns = campaigns.filter(c => c.is_successful);
  const activeCampaigns = campaigns.filter(c => c.status === 'en_progreso');
  const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads_generated || 0), 0);
  const totalClientsAcquired = campaigns.reduce((acc, c) => acc + (c.clients_acquired || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-pink-600" />
            Marketing
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de campañas y métricas
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-pink-600 hover:bg-pink-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Campaña
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Campañas Activas</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{activeCampaigns.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Exitosas</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{successfulCampaigns.length}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Trophy className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Leads Generados</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{totalLeads}</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Clientes Nuevos</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{totalClientsAcquired}</p>
              </div>
              <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="success">Logros y Éxitos</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Search */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar campaña..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={STATUSES.find(s => s.value === campaign.status)?.color}>
                          {STATUSES.find(s => s.value === campaign.status)?.label}
                        </Badge>
                        {campaign.is_successful && (
                          <Badge className="bg-amber-100 text-amber-700">
                            <Trophy className="h-3 w-3 mr-1" />
                            Exitosa
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800">{campaign.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {CAMPAIGN_TYPES.find(t => t.value === campaign.type)?.label}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(campaign)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => markAsSuccessful(campaign)}>
                          <Trophy className="h-4 w-4 mr-2" />
                          {campaign.is_successful ? 'Quitar Éxito' : 'Marcar Exitosa'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(campaign.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Checklist Preview */}
                  {campaign.checklist?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {campaign.checklist.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() => updateCampaignChecklist(campaign, idx)}
                          />
                          <span className={`text-sm ${item.completed ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                      {campaign.checklist.length > 3 && (
                        <p className="text-xs text-slate-400">+{campaign.checklist.length - 3} más</p>
                      )}
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">{campaign.leads_generated || 0}</p>
                      <p className="text-xs text-slate-500">Leads</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">{campaign.clients_acquired || 0}</p>
                      <p className="text-xs text-slate-500">Clientes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-600">${campaign.sales_generated || 0}</p>
                      <p className="text-xs text-slate-500">Ventas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="success">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Campañas Exitosas
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Campaña</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-center">Clientes</TableHead>
                  <TableHead className="text-right">Ventas Generadas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {successfulCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <Badge className="bg-slate-100 text-slate-600">
                        {CAMPAIGN_TYPES.find(t => t.value === campaign.type)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {campaign.end_date ? format(new Date(campaign.end_date), "d MMM yyyy", { locale: es }) : '-'}
                    </TableCell>
                    <TableCell className="text-center font-medium">{campaign.leads_generated || 0}</TableCell>
                    <TableCell className="text-center font-medium">{campaign.clients_acquired || 0}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      ${(campaign.sales_generated || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {successfulCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No hay campañas exitosas registradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Editar Campaña' : 'Nueva Campaña'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre de la campaña"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la campaña"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha y Hora Inicio</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha y Hora Fin</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Presupuesto</Label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Asignado a</Label>
                <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              <Label>Checklist</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {formData.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(idx)}
                    />
                    <span className={`flex-1 text-sm ${item.completed ? 'line-through text-slate-400' : ''}`}>
                      {item.text}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeChecklistItem(idx)}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Nueva tarea..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                />
                <Button type="button" variant="outline" onClick={addChecklistItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Leads</Label>
                <Input
                  type="number"
                  value={formData.leads_generated}
                  onChange={(e) => setFormData({ ...formData, leads_generated: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Clientes</Label>
                <Input
                  type="number"
                  value={formData.clients_acquired}
                  onChange={(e) => setFormData({ ...formData, clients_acquired: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ventas $</Label>
                <Input
                  type="number"
                  value={formData.sales_generated}
                  onChange={(e) => setFormData({ ...formData, sales_generated: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.is_successful}
                onCheckedChange={(checked) => setFormData({ ...formData, is_successful: checked })}
              />
              <Label className="cursor-pointer">Marcar como campaña exitosa</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
                {editingCampaign ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}