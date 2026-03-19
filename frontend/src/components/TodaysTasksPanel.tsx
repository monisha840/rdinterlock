import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { remindersApi, Reminder } from "@/api/reminders.api";
import { CheckCircle2, Circle } from "lucide-react";
import { isPast, isToday } from "date-fns";

export const TodaysTasksPanel = () => {
  const queryClient = useQueryClient();
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['todays-reminders'],
    queryFn: remindersApi.getToday,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'PENDING' | 'COMPLETED' }) => 
      remindersApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todays-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["reminders-list"] });
    }
  });

  if (isLoading || !reminders) return null;

  const pendingTasks = reminders.filter(r => r.status === 'PENDING');

  if (pendingTasks.length === 0) {
    return (
      <div className="card-modern p-5 flex items-center gap-3 bg-primary/5 border-primary/20">
        <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
        <div>
          <h2 className="font-semibold text-foreground text-sm">📌 Today's Tasks</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All clear for today!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-modern p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-foreground text-sm">📌 Today's Tasks</h2>
        <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
          {pendingTasks.length}
        </span>
      </div>
      <div className="space-y-1">
        {pendingTasks.map((task: Reminder) => {
          const dueDate = new Date(task.dueDate);
          const overdue = isPast(dueDate) && !isToday(dueDate);

          return (
            <div key={task.id} className="flex items-start gap-3 p-2 rounded-xl transition-colors hover:bg-black/5">
              <button 
                onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'COMPLETED' })}
                className="mt-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
              >
                <Circle className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${overdue ? "text-destructive" : "text-foreground"}`}>
                  {task.title}
                </p>
                {overdue && (
                  <p className="text-[10px] font-bold text-destructive uppercase tracking-wide mt-0.5">
                    Overdue
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
