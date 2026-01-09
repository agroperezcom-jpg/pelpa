import React, { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { addHours, addDays, differenceInHours } from "date-fns";

export default function DraggableEventItem({
  event,
  onEventClick,
  onEventDrop,
  onEventResize,
  eventColor,
  isDragging,
  style,
  layout = "inline" // "inline", "block", "timeline"
}) {
  const [isResizing, setIsResizing] = useState(null); // null, "start", "end"
  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const handleDragStart = (e) => {
    if (!e.dataTransfer) return;
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX || e.touches?.[0]?.clientX,
      startY: e.clientY || e.touches?.[0]?.clientY,
      startTime: new Date()
    };
    e.dataTransfer.effectAllowed = "move";
    // Asegurar que todos los datos necesarios estén en el evento
    const eventPayload = {
      id: event.id,
      type: event.type,
      name: event.name,
      date: event.date,
      start_date: event.start_date,
      due_date: event.due_date,
      end_date: event.end_date,
      estimated_end_date: event.estimated_end_date,
      time: event.time,
      duration: event.duration,
      project_id: event.project_id,
      phase_id: event.phase_id,
      ...event
    };
    e.dataTransfer.setData("application/json", JSON.stringify(eventPayload));
  };

  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(direction);
    dragRef.current = {
      startX: e.clientX || e.touches?.[0]?.clientX,
      startY: e.clientY || e.touches?.[0]?.clientY
    };
  };

  const handleResizeMove = (e) => {
    if (!isResizing || !dragRef.current || !onEventResize) return;

    const currentX = e.clientX || e.touches?.[0]?.clientX;
    const currentY = e.clientY || e.touches?.[0]?.clientY;
    
    if (!currentX || !currentY) return;

    const deltaY = currentY - dragRef.current.startY;

    // Calcular delta en horas (aprox 60px = 1 hora en week view)
    const pixelsPerHour = 60;
    const hoursDelta = Math.round(deltaY / pixelsPerHour);

    if (hoursDelta === 0) return;

    const currentStartDate = new Date(event.start_date || event.date || event.created_date);
    const currentEndDate = new Date(event.due_date || event.end_date || event.estimated_end_date || addHours(currentStartDate, 1));

    if (isResizing === "end") {
      const newEndDate = addHours(currentEndDate, hoursDelta);
      onEventResize(event, newEndDate, "end");
    } else if (isResizing === "start") {
      const newStartDate = addHours(currentStartDate, hoursDelta);
      onEventResize(event, newStartDate, "start");
    }

    // Actualizar referencia para el próximo movimiento
    dragRef.current.startY = currentY;
  };

  const handleResizeEnd = () => {
    setIsResizing(null);
    dragRef.current = null;
  };

  React.useEffect(() => {
    if (!isResizing) return;

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("touchmove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);
    window.addEventListener("touchend", handleResizeEnd);

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("touchmove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
      window.removeEventListener("touchend", handleResizeEnd);
    };
  }, [isResizing, event]);

  if (layout === "inline") {
    return (
      <div
        ref={containerRef}
        draggable
        onDragStart={handleDragStart}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick(event);
        }}
        className={cn(
          "text-[10px] px-2 py-1 rounded text-white truncate cursor-move hover:opacity-80 transition-opacity",
          eventColor,
          isDragging && "opacity-50"
        )}
      >
        {event.name || event.title}
      </div>
    );
  }

  if (layout === "block") {
    return (
      <div
        ref={containerRef}
        draggable
        onDragStart={handleDragStart}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick(event);
        }}
        className={cn(
          "border rounded px-2 py-1 text-xs cursor-move hover:shadow-md transition-shadow relative group",
          eventColor,
          isDragging && "opacity-50",
          isResizing && "opacity-75"
        )}
        style={style}
      >
        <div className="font-medium truncate">{event.name || event.title}</div>
        {event.type && (
          <Badge variant="outline" className="text-[9px] mt-1 h-4">
            {event.type}
          </Badge>
        )}

        {/* Resize handles */}
        {onEventResize && (
          <>
            <div
              onMouseDown={(e) => handleResizeStart(e, "start")}
              onTouchStart={(e) => handleResizeStart(e, "start")}
              className="absolute top-0 left-0 right-0 h-2 cursor-n-resize opacity-0 group-hover:opacity-100 bg-blue-500/30 hover:bg-blue-500/50 transition-all rounded-t"
              title="Arrastra para cambiar hora de inicio"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, "end")}
              onTouchStart={(e) => handleResizeStart(e, "end")}
              className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 bg-blue-500/30 hover:bg-blue-500/50 transition-all rounded-b"
              title="Arrastra para cambiar hora de fin"
            />
          </>
        )}
      </div>
    );
  }

  if (layout === "timeline") {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick(event);
        }}
        className={cn(
          "absolute h-full rounded cursor-move hover:opacity-80 transition-opacity flex items-center px-2 sm:px-3 group",
          eventColor,
          isDragging && "opacity-50"
        )}
        style={style}
      >
        <span className="text-[10px] sm:text-xs text-white font-medium truncate">
          {event.name}
        </span>

        {/* Resize handles para timeline */}
        {onEventResize && (
          <>
            <div
              onMouseDown={(e) => handleResizeStart(e, "start")}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-blue-400 transition-all"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, "end")}
              className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-blue-400 transition-all"
            />
          </>
        )}
      </div>
    );
  }

  return null;
}