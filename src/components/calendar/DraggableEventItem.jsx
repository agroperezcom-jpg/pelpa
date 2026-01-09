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
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX || e.touches?.[0]?.clientX,
      startY: e.clientY || e.touches?.[0]?.clientY,
      startTime: new Date()
    };
    e.dataTransfer.effectAllowed = "move";
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

    const deltaX = (e.clientX || e.touches?.[0]?.clientX) - dragRef.current.startX;
    const deltaY = (e.clientY || e.touches?.[0]?.clientY) - dragRef.current.startY;

    // Calcular delta en horas (aprox 60px = 1 hora en week view)
    const pixelsPerHour = 60;
    const hoursDelta = Math.round(deltaY / pixelsPerHour);

    if (isResizing === "end") {
      onEventResize(event, addHours(event.due_date || event.end_date || new Date(), hoursDelta));
    } else if (isResizing === "start") {
      onEventResize(event, addHours(event.start_date || new Date(), hoursDelta), "start");
    }
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
        onClick={() => onEventClick(event)}
        className={cn(
          "text-[10px] px-2 py-1 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity",
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
        onClick={() => onEventClick(event)}
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
              className="absolute top-0 left-0 right-0 h-1.5 cursor-n-resize opacity-0 group-hover:opacity-100 bg-blue-400/20 hover:bg-blue-400/40 transition-all"
              title="Arrastra para cambiar fecha de inicio"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, "end")}
              onTouchStart={(e) => handleResizeStart(e, "end")}
              className="absolute bottom-0 left-0 right-0 h-1.5 cursor-s-resize opacity-0 group-hover:opacity-100 bg-blue-400/20 hover:bg-blue-400/40 transition-all"
              title="Arrastra para cambiar fecha de fin"
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
        onClick={() => onEventClick(event)}
        className={cn(
          "absolute h-full rounded cursor-pointer hover:opacity-80 transition-opacity flex items-center px-2 sm:px-3 group",
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