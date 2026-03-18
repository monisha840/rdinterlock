import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { remindersApi, Reminder } from "@/api/reminders.api";
import { ListTodo, Plus, CheckCircle2, Circle, Trash2, Calendar as CalIcon } from "lucide-react";
import { format, isToday, isPast } from "date-fns";
import { toast } from "sonner";
import { DatePickerField } from "@/components/DatePickerField";

export const RemindersPanel = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(new Date());

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders-list'],
    queryFn: remindersApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: remindersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders-list"] });
      setIsAdding(false);
      setNewTitle("");
      toast.success("Task added successfully");
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'PENDING' | 'COMPLETED' }) => 
      remindersApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders-list"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: remindersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders-list"] });
      toast.success("Task deleted");
    }
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle,
      dueDate: newDate.toISOString()
    });
  };

  if (isLoading) return null;

  const pendingReminders = reminders?.filter(r => r.status === 'PENDING') || [];
  const completedReminders = reminders?.filter(r => r.status === 'COMPLETED') || [];

  return (
    <div className="card-modern p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Reminders & Tasks</h2>
          {pendingReminders.length > 0 && (
            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
              {pendingReminders.length}
            </span>
          )}
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all hover:scale-110 active:scale-95"
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
            onChange={e => setNewTitle(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <DatePickerField 
                date={newDate} 
                onDateChange={setNewDate}
                label="Due Date"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button 
              onClick={() => setIsAdding(false)}
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

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {pendingReminders.length === 0 && !isAdding && (
          <div className="text-center py-8 opacity-40">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs font-medium">All clear for now!</p>
          </div>
        )}

        {pendingReminders.map((reminder: Reminder) => {
          const dueDate = new Date(reminder.dueDate);
          const overdue = isPast(dueDate) && !isToday(dueDate);
          
          return (
            <div key={reminder.id} className="group p-3 rounded-2xl border border-border/50 bg-background/50 flex items-start gap-3 transition-all">
              <button 
                onClick={() => updateStatusMutation.mutate({ id: reminder.id, status: 'COMPLETED' })}
                className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <Circle className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{reminder.title}</p>
                <p className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                  <CalIcon className="h-3 w-3" />
                  {format(dueDate, "dd MMM")} {overdue && "(Overdue)"}
                </p>
              </div>
              <button 
                onClick={() => deleteMutation.mutate(reminder.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        {completedReminders.length > 0 && (
          <div className="pt-4 mt-2 border-t border-dashed border-border/60">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Done</p>
             <div className="space-y-2 opacity-60">
                {completedReminders.map((reminder: Reminder) => (
                    <div key={reminder.id} className="flex items-center gap-3 p-2 px-3 group">
                         <button 
                            onClick={() => updateStatusMutation.mutate({ id: reminder.id, status: 'PENDING' })}
                            className="text-primary transition-colors"
                        >
                            <CheckCircle2 className="h-5 w-5" />
                        </button>
                        <p className="flex-1 text-sm text-muted-foreground line-through">{reminder.title}</p>
                        <button 
                            onClick={() => deleteMutation.mutate(reminder.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-destructive transition-all"
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
