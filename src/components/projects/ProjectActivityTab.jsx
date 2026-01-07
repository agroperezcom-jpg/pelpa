import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, MessageSquare, FileText, UserPlus, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProjectActivityTab({ projectId }) {
  const { data: activities = [] } = useQuery({
    queryKey: ['projectActivity', projectId],
    queryFn: () => base44.entities.ProjectActivity.filter({ project_id: projectId })
  });

  const activityIcons = {
    created: Activity,
    status_change: Activity,
    phase_change: Activity,
    task_change: Activity,
    assignment: UserPlus,
    comment: MessageSquare,
    document_upload: FileText,
    date_change: Calendar,
    budget_change: DollarSign
  };

  const activityColors = {
    created: "bg-green-100 text-green-700",
    status_change: "bg-blue-100 text-blue-700",
    phase_change: "bg-purple-100 text-purple-700",
    task_change: "bg-amber-100 text-amber-700",
    assignment: "bg-indigo-100 text-indigo-700",
    comment: "bg-slate-100 text-slate-700",
    document_upload: "bg-emerald-100 text-emerald-700",
    date_change: "bg-orange-100 text-orange-700",
    budget_change: "bg-pink-100 text-pink-700"
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          {activities.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Activity className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No hay actividad registrada</p>
            </div>
          )}

          {activities.map((activity) => {
            const Icon = activityIcons[activity.activity_type] || Activity;
            
            return (
              <div key={activity.id} className="flex gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{activity.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {activity.user_name} · {format(new Date(activity.created_date), "d MMM yyyy HH:mm", { locale: es })}
                      </p>
                    </div>
                    <Badge className={activityColors[activity.activity_type]} variant="outline" className="text-[10px]">
                      {activity.activity_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}