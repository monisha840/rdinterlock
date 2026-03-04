import { useState } from "react";
import { MobileFormLayout, FormField } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { PillSelector } from "@/components/PillSelector";
import { toast } from "sonner";
import { Save, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const roles = ["PRODUCTION", "MASON", "DRIVER", "LOADER", "OPERATOR", "HELPER", "OFFICE"];
const paymentTypes = ["PER_BRICK", "DAILY", "MONTHLY"];

interface Worker {
  id: string;
  name: string;
  role: string;
  paymentType: string;
  rate: number;
  isActive: boolean;
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workersApi } from "@/api/workers.api";
import { Loader2 } from "lucide-react";

const WorkersPage = () => {
  const queryClient = useQueryClient();
  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Production");
  const [payType, setPayType] = useState("Per Brick");
  const [rate, setRate] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers', showInactive],
    queryFn: () => workersApi.getAll(!showInactive),
  });

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, active }: { id: string, active: boolean }) =>
      workersApi.update(id, { isActive: active } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success("✅ Status Updated");
    },
  });

  const createWorkerMutation = useMutation({
    mutationFn: workersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success("✅ Worker Added");
      setName("");
      setRate("");
    },
  });

  const toggleWorkerStatus = (id: string, currentStatus: boolean) => {
    updateWorkerMutation.mutate({ id, active: !currentStatus });
  };

  const saveWorker = () => {
    if (!name.trim() || !rate) return;
    createWorkerMutation.mutate({
      name: name.trim(),
      role: role.toUpperCase(),
      paymentType: payType.toUpperCase().replace(" ", "_"),
      rate: parseFloat(rate),
      isActive: true
    } as any);
  };


  const roleColors: Record<string, string> = {
    PRODUCTION: "primary",
    MASON: "warning",
    DRIVER: "success",
    MANAGER: "destructive",
    OFFICE: "primary",
    LOADER: "accent",
    OPERATOR: "primary",
    HELPER: "secondary"
  };

  return (
    <MobileFormLayout title="👷 Workers">
      <EntryCard title="Add New Worker">
        <div className="space-y-5">
          <FormField label="Name" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Worker name"
              className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </FormField>

          <FormField label="Role">
            <PillSelector options={roles} value={role} onChange={setRole} />
          </FormField>

          <FormField label="Payment Type">
            <PillSelector options={paymentTypes} value={payType} onChange={setPayType} />
          </FormField>

          <FormField label="Rate (₹)" required>
            <input
              type="number"
              inputMode="numeric"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Enter rate"
              className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </FormField>

          <ActionButton
            label={createWorkerMutation.isPending ? "Adding..." : "Add Worker"}
            icon={UserPlus}
            variant="success"
            size="lg"
            onClick={saveWorker}
            className="w-full"
            disabled={createWorkerMutation.isPending}
          />
        </div>
      </EntryCard>

      <EntryCard title="All Workers">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground">
            {workers.length} {showInactive ? "Records" : "Active"}
          </span>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            Show Inactive
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          </label>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : workers.length > 0 ? (
            workers.map((w) => (
              <div key={w.id} className={`flex items-center gap-3 p-3.5 bg-secondary/30 rounded-xl transition-opacity ${!w.isActive ? "opacity-50" : ""}`}>
                {/* Avatar */}
                <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-white font-bold text-sm">{getInitials(w.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{w.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge label={w.role} variant={(roleColors[w.role] as any) || "default"} />
                    <span className="text-xs text-muted-foreground">{w.paymentType}</span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">₹{w.rate}</span>
                  <Switch checked={w.isActive} onCheckedChange={() => toggleWorkerStatus(w.id, w.isActive)} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground italic">No workers found.</div>
          )}
        </div>
      </EntryCard>
    </MobileFormLayout>
  );
};

export default WorkersPage;
