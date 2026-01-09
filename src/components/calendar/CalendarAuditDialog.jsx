import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Search, ArrowRight, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ACTION_LABELS = {
  move: "Movió",
  resize: "Redimensionó",
  create: "Creó",
  edit: "Editó",
  delete: "Eliminó"
};

const ACTION_COLORS = {
  move: "bg-blue-100 text-blue-800 border-blue-200",
  resize: "bg-purple-100 text-purple-800 border-purple-200",
  create: "bg-green-100 text-green-800 border-green-200",
  edit: "bg-amber-100 text-amber-800 border-amber-200",
  delete: "bg-red-100 text-red-800 border-red-200"
};

export default function CalendarAuditDialog({ isOpen, onClose, auditLogs = [] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historial de Cambios del Calendario
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por evento o usuario..."
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterAction === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterAction("all")}
            >
              Todos
            </Button>
            <Button
              variant={filterAction === "move" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterAction("move")}
            >
              Movimientos
            </Button>
            <Button
              variant={filterAction === "resize" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterAction("resize")}
            >
              Redimensiones
            </Button>
          </div>
        </div>

        {/* Lista de logs */}
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No hay cambios registrados</p>
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", ACTION_COLORS[log.action] || "bg-slate-100")}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                      <span className="font-medium text-sm">{log.event_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {log.event_type}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.timestamp), "dd/MM/yy HH:mm", { locale: es })}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground mb-2">
                    Por <strong>{log.user_name}</strong>
                  </div>

                  {(log.old_start_date || log.new_start_date) && (
                    <div className="flex items-center gap-2 text-xs bg-secondary/50 rounded p-2 mt-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatDateTime(log.old_start_date)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span className="font-medium">
                        {formatDateTime(log.new_start_date)}
                      </span>
                    </div>
                  )}

                  {log.action === "resize" && log.old_end_date && log.new_end_date && (
                    <div className="flex items-center gap-2 text-xs bg-secondary/50 rounded p-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Fin:</span>
                      <span className="text-muted-foreground">
                        {formatDateTime(log.old_end_date)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span className="font-medium">
                        {formatDateTime(log.new_end_date)}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}