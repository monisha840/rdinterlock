import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { remindersApi, Reminder } from "@/api/reminders.api";
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar as CalIcon,
  Edit2,
  Trash2,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import { DatePickerField } from "@/components/DatePickerField";

// Full-featured tasks panel (formerly split between TodaysTasksPanel + RemindersPanel).
// Lives next to Smart Alerts and handles add / edit / delete / complete / re-open.
export const TodaysTasksPanel = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(new Date());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState(new Date());

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["reminders-list"],
    queryFn: remindersApi.getAll,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["reminders-list"] });
    queryClient.invalidateQueries({ queryKey: ["todays-reminders"] });
  };

  const createMutation = useMutation({
    mutationFn: remindersApi.create,
    onSuccess: () => {
      invalidateAll();
      setIsAdding(false);
      setNewTitle("");
      setNewDate(new Date());
      toast.success("Task added");
    },
    onError: (e: any) => toast.error("Failed to add task", { description: e.message }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PENDING" | "COMPLETED" }) =>
      remindersApi.update(id, { status }),
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Reminder> }) =>
      remindersApi.update(id, data),
    onSuccess: () => {
      invalidateAll();
      setEditingId(null);
      toast.success("Task updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: remindersApi.delete,
    onSuccess: () => {
      invalidateAll();
      toast.success("Task deleted");
    },
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      dueDate: newDate.toISOString(),
    });
  };

  if (isLoading) {
    return (
      <div className="card-modern p-5 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  const pending = (reminders || []).filter((r) => r.status === "PENDING");
  const completed = (reminders || []).filter((r) => r.status === "COMPLETED");

  // Split pending into Today (overdue + due today) and Upcoming so the panel
  // still earns its "Today's Tasks" name.
  const isDueTodayOrOverdue = (r: Reminder) => {
    const d = new Date(r.dueDate);
    return isToday(d) || isPast(d);
  };
  const todayTasks = pending.filter(isDueTodayOrOverdue);
  const upcomingTasks = pending.filter((r) => !isDueTodayOrOverdue(r));

  return (
    <div className="card-modern p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-foreground text-sm">📌 Today's Tasks</h2>
          {pending.length > 0 && (
            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
              {pending.length}
            </span>
          )}
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all hover:scale-110 active:scale-95"
            aria-label="Add task"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-secondary/30 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <input
            autoFocus
            type="text"
            placeholder="Assign a task..."
            className="w-full bg-transparent border-none text-sm font-semibold focus:ring-0 placeholder:text-muted-foreground/60"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <DatePickerField date={newDate} onDateChange={setNewDate} label="Due Date" />
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => {
                setIsAdding(false);
                setNewTitle("");
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || createMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {createMutation.isPending ? "Adding..." : "Add Task"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {pending.length === 0 && !isAdding && (
          <div className="text-center py-8 opacity-40">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs font-medium">All clear for now!</p>
          </div>
        )}

        {todayTasks.length > 0 && <TaskGroup
          label="Today"
          tasks={todayTasks}
          editingId={editingId}
          editTitle={editTitle}
          editDate={editDate}
          setEditingId={setEditingId}
          setEditTitle={setEditTitle}
          setEditDate={setEditDate}
          onComplete={(id) => updateStatusMutation.mutate({ id, status: "COMPLETED" })}
          onSaveEdit={(id) =>
            updateMutation.mutate({
              id,
              data: { title: editTitle.trim(), dueDate: editDate.toISOString() },
            })
          }
          onDelete={(id) => deleteMutation.mutate(id)}
          savingEdit={updateMutation.isPending}
        />}

        {upcomingTasks.length > 0 && <TaskGroup
          label="Upcoming"
          tasks={upcomingTasks}
          editingId={editingId}
          editTitle={editTitle}
          editDate={editDate}
          setEditingId={setEditingId}
          setEditTitle={setEditTitle}
          setEditDate={setEditDate}
          onComplete={(id) => updateStatusMutation.mutate({ id, status: "COMPLETED" })}
          onSaveEdit={(id) =>
            updateMutation.mutate({
              id,
              data: { title: editTitle.trim(), dueDate: editDate.toISOString() },
            })
          }
          onDelete={(id) => deleteMutation.mutate(id)}
          savingEdit={updateMutation.isPending}
        />}

        {completed.length > 0 && (
          <div className="pt-3 mt-1 border-t border-dashed border-border/60">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
              Done
            </p>
            <div className="space-y-1 opacity-70">
              {completed.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2 px-3 group">
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: r.id, status: "PENDING" })}
                    className="text-primary transition-colors"
                    title="Reopen task"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                  <p className="flex-1 text-sm text-muted-foreground line-through truncate">
                    {r.title}
                  </p>
                  <button
                    onClick={() => deleteMutation.mutate(r.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Reusable subgroup ─────────────────────────────────────────────────────
interface TaskGroupProps {
  label: string;
  tasks: Reminder[];
  editingId: string | null;
  editTitle: string;
  editDate: Date;
  setEditingId: (id: string | null) => void;
  setEditTitle: (v: string) => void;
  setEditDate: (d: Date) => void;
  onComplete: (id: string) => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string) => void;
  savingEdit: boolean;
}

const TaskGroup = ({
  label,
  tasks,
  editingId,
  editTitle,
  editDate,
  setEditingId,
  setEditTitle,
  setEditDate,
  onComplete,
  onSaveEdit,
  onDelete,
  savingEdit,
}: TaskGroupProps) => (
  <div className="space-y-1.5">
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
      {label}
    </p>
    {tasks.map((task) => {
      const due = new Date(task.dueDate);
      const overdue = isPast(due) && !isToday(due);

      if (editingId === task.id) {
        return (
          <div
            key={task.id}
            className="bg-secondary/30 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <input
              autoFocus
              type="text"
              placeholder="Task title..."
              className="w-full bg-transparent border-none text-sm font-semibold focus:ring-0 placeholder:text-muted-foreground/60"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <DatePickerField date={editDate} onDateChange={setEditDate} label="Due Date" />
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                onClick={() => onSaveEdit(task.id)}
                disabled={!editTitle.trim() || savingEdit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        );
      }

      return (
        <div
          key={task.id}
          className="group p-3 rounded-2xl border border-border/50 bg-background/50 flex items-start gap-3 transition-all hover:border-primary/30"
        >
          <button
            onClick={() => onComplete(task.id)}
            className="mt-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
            title="Mark complete"
          >
            <Circle className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold truncate ${overdue ? "text-destructive" : "text-foreground"}`}
            >
              {task.title}
            </p>
            <p
              className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}
            >
              <CalIcon className="h-3 w-3" />
              {format(due, "dd MMM yyyy")}
              {overdue && " · Overdue"}
            </p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all shrink-0">
            <button
              onClick={() => {
                setEditingId(task.id);
                setEditTitle(task.title);
                setEditDate(new Date(task.dueDate));
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    })}
  </div>
);
