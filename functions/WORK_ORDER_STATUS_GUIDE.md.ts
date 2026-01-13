# Advanced Work Order Status & Operational Calendar
## Graphic Workflow Implementation Guide

---

## OVERVIEW

This system implements professional work order management for graphic production with:
- Automatic status tracking based on task completion
- Delivery date management with overdue detection
- Operational calendar for delivery planning
- Admin-only manual status overrides

All implementation uses English for internal logic, Spanish for UI labels.

---

## 1. WORK ORDER STATUS LIFECYCLE

### Status Values (Internal → UI)

```
DESIGN       → En diseño
PRINTING     → En impresión
FINISHING    → En terminación
READY        → Listo para retirar
DELIVERED    → Entregado
CANCELLED    → Cancelado
```

### Visual Indicators

- **En diseño** - Blue icons/badges
- **En impresión** - Orange icons/badges
- **En terminación** - Amber icons/badges
- **Listo para retirar** - Green icons/badges
- **Entregado** - Emerald icons/badges
- **Cancelado** - Red icons/badges
- **Vencida** - Red alert with icon

---

## 2. AUTOMATIC STATUS MANAGEMENT

### Rule Engine

The system automatically determines Work Order status based on task completion:

```
if ANY task.task_type === DESIGN && status !== completado
  → Project.work_order_status = DESIGN

else if (all DESIGN tasks done) && ANY task.task_type === PRINTING && status !== completado
  → Project.work_order_status = PRINTING

else if (all DESIGN & PRINTING done) && ANY task.task_type === FINISHING && status !== completado
  → Project.work_order_status = FINISHING

else if ALL tasks completed
  → Project.work_order_status = READY

else
  → keep current status
```

### Automatic Update Trigger

Backend function: `updateWorkOrderStatusAutomatically`

```javascript
await base44.functions.invoke('updateWorkOrderStatusAutomatically', {
  project_id: 'proj_123',
  company_id: 'empresa_001'
});
```

Response includes:
- `previousStatus` - Before update
- `newStatus` - After update
- `tasksAnalyzed` - Number of tasks processed

---

## 3. TASK TYPES FOR GRAPHIC WORKFLOW

### Supported Types

Each task linked to a work order must have one of these types:

```
DESIGN     → Design phase
PRINTING   → Print phase
FINISHING  → Finishing phase
DELIVERY   → Delivery (optional)
OTHER      → Miscellaneous
```

### Task Impact on Status

Only tasks with types `DESIGN`, `PRINTING`, `FINISHING` affect auto-status:

- `DELIVERY` and `OTHER` don't trigger status changes
- Always check `task_type` before updating Project status
- Task status values: `pendiente`, `en_progreso`, `completado`

---

## 4. DELIVERY DATE TRACKING

### Properties

**Project fields:**
- `estimated_delivery_date` (Date) - User-set target
- `real_delivery_date` (Date, nullable) - Auto-filled on DELIVERED

### Mark as Delivered

Backend function: `markWorkOrderDelivered`

```javascript
await base44.functions.invoke('markWorkOrderDelivered', {
  project_id: 'proj_123',
  company_id: 'empresa_001'
});
```

**On success:**
- `work_order_status` → `DELIVERED`
- `real_delivery_date` → Today's date
- Only admins can call this

---

## 5. OVERDUE DETECTION

### Overdue Condition

A Work Order is **overdue** when:

```
estimated_delivery_date < today
AND work_order_status !== DELIVERED
AND work_order_status !== CANCELLED
```

### Overdue Retrieval

Backend function: `getOverdueWorkOrders`

```javascript
const { overdueWorkOrders } = await base44.functions.invoke('getOverdueWorkOrders', {
  company_id: 'empresa_001'
});
```

Returns array with:
- `id`, `name`, `number`
- `client`, `status`
- `estimatedDate`
- `daysOverdue` - Calculated difference

---

## 6. UI COMPONENTS

### WorkOrderStatusBadge

Shows status with visual indicators and overdue badge.

```jsx
import WorkOrderStatusBadge from '@/components/work-orders/WorkOrderStatusBadge';

<WorkOrderStatusBadge status="PRINTING" isOverdue={false} />
```

### WorkOrderDeliveryInfo

Card showing delivery dates and "Mark as Delivered" button (admin only).

```jsx
import WorkOrderDeliveryInfo from '@/components/work-orders/WorkOrderDeliveryInfo';

<WorkOrderDeliveryInfo
  workOrder={workOrder}
  onMarkDelivered={handleDelivered}
  isAdmin={true}
  isLoading={false}
/>
```

### WorkOrderOperationalCalendar

Interactive calendar showing:
- Work orders grouped by estimated delivery date
- Overdue work orders highlighted in red
- Month navigation
- Legend of status colors

```jsx
<WorkOrderOperationalCalendar workOrders={filteredWorkOrders} />
```

---

## 7. DETAIL VIEW FEATURES

### WorkOrderDetailView

Complete work order management interface:

**Header Section:**
- Work order number, name
- Status badge with visual indicator

**State Control:**
- Current status display
- Admin: Manual status dropdown
- Admin: Auto-update button (based on tasks)

**Delivery Information:**
- Estimated delivery date
- Real delivery date (if delivered)
- Days until/overdue indicator
- Admin: Mark as Delivered button
- Overdue alert (if applicable)

**Tabs:**
1. General - Client, dates, description, responsible
2. Tareas - All tasks with types and status
3. Materiales - Inventory movements
4. Facturación - Sales link and budgets

---

## 8. MULTI-COMPANY SAFETY

All operations scoped by `company_id`:

```
Project.company_id
Task.company_id
CalendarEvent.company_id
```

All three must match active company context.

### Examples

✅ Correct - All same company:
```
Project: company_id = "empresa_001"
Task: company_id = "empresa_001"
Update: company_id = "empresa_001"
```

❌ Blocked - Company mismatch:
```
Project: company_id = "empresa_001"
Update: company_id = "empresa_002"  ← Error
```

---

## 9. NON-BREAKING GUARANTEES

✅ Existing projects without `is_work_order=true` completely unchanged
✅ Existing tasks work normally
✅ Calendar continues for all event types
✅ New logic applies only when `is_work_order=true`

No data migration required.

---

## 10. INTEGRATION EXAMPLE

### Complete Work Order Flow

```javascript
// 1. Fetch work order
const [workOrder] = await base44.entities.Project.filter({
  id: 'proj_123',
  is_work_order: true
});

// 2. Get tasks
const tasks = await base44.entities.Task.filter({
  project_id: 'proj_123'
});

// 3. Update task status
await base44.entities.Task.update(task.id, {
  status: 'completado'
});

// 4. Auto-update work order status
const result = await base44.functions.invoke(
  'updateWorkOrderStatusAutomatically',
  { project_id: 'proj_123', company_id: 'empresa_001' }
);

// 5. Check if overdue
const { overdueWorkOrders } = await base44.functions.invoke(
  'getOverdueWorkOrders',
  { company_id: 'empresa_001' }
);

// 6. Mark as delivered (admin only)
if (isAdmin && workOrder.work_order_status === 'READY') {
  await base44.functions.invoke('markWorkOrderDelivered', {
    project_id: 'proj_123',
    company_id: 'empresa_001'
  });
}
```

---

## 11. TESTING CHECKLIST

- [ ] Task completion triggers status update
- [ ] All three phases follow design → printing → finishing
- [ ] Overdue calculation correct (date comparison)
- [ ] Non-admin users cannot mark as delivered
- [ ] Non-work-order projects unaffected
- [ ] Calendar shows correct delivery dates
- [ ] Multi-company isolation working
- [ ] Status badges display correctly
- [ ] Admin can manually override status
- [ ] real_delivery_date set when marked delivered

---

## 12. TROUBLESHOOTING

**Status not updating automatically:**
- Verify task.task_type is set (DESIGN/PRINTING/FINISHING)
- Check task.status is updated to 'completado'
- Call updateWorkOrderStatusAutomatically explicitly if needed

**Overdue not showing:**
- Verify estimated_delivery_date is set on Project
- Check date format is valid ISO date (YYYY-MM-DD)
- Ensure work_order_status is not DELIVERED or CANCELLED

**Delivery date not saved:**
- Only admins can mark as delivered
- Project must have is_work_order = true
- Check company_id matches

---

## 13. API ENDPOINTS

| Function | Purpose | Admin Only |
|----------|---------|-----------|
| `updateWorkOrderStatusAutomatically` | Auto-calc status from tasks | No* |
| `markWorkOrderDelivered` | Mark as DELIVERED + set date | **Yes** |
| `getOverdueWorkOrders` | List overdue orders | No |

*Admin option to manually trigger exists in UI