import { useState } from "react";
import { MobileFormLayout, FormField } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { PillSelector } from "@/components/PillSelector";
import { toast } from "sonner";
import { Save, UserPlus, BarChart3, TrendingUp, Package, Calendar, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { KPICard } from "@/components/KPICard";

const roles = ["PRODUCTION", "MASON", "LOADER", "OPERATOR"];
const paymentTypes = ["PER_BRICK", "WEEKLY"];

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workersApi } from "@/api/workers.api";
import { Loader2 as Spinner } from "lucide-react";
import { Worker } from "@/types/api";

const WorkerStatsModal = ({ worker }: { worker: Worker }) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['worker-stats', worker.id],
    queryFn: () => workersApi.getStats(worker.id),
    enabled: !!worker.id,
  });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {worker.name}'s Statistics
        </DialogTitle>
      </DialogHeader>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Fetching worker performance...</p>
        </div>
      ) : stats ? (
        <div className="space-y-6 pt-4">
          {/* KPI Summary */}
          <div className="grid grid-cols-2 gap-4">
            <KPICard
              title="Total Bricks"
              value={stats.totalQuantity.toLocaleString()}
              icon={Package}
              variant="primary"
            />
            <KPICard
              title="Total Earnings"
              value={`₹${stats.totalEarnings.toLocaleString()}`}
              icon={TrendingUp}
              variant="success"
            />
          </div>

          {/* History Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Recent Production History
            </h3>
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.productions.length > 0 ? (
                    stats.productions.map((p: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {format(new Date(p.production.date), 'dd MMM')}
                        </TableCell>
                        <TableCell className="capitalize text-xs">
                          {p.production.shift.toLowerCase()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.production.brickType?.size || "Standard"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {p.quantity.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                        No production records found for this worker.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-[10px] text-muted-foreground italic text-center">
              Showing last 20 production records.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Failed to load stats. Please try again.
        </div>
      )}
    </DialogContent>
  );
};

const WorkersPage = () => {
  const queryClient = useQueryClient();
  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const [name, setName] = useState("");
  const [role, setRole] = useState("OPERATOR");
  const [payType, setPayType] = useState("PER_BRICK");
  const [weeklyWage, setWeeklyWage] = useState("");
  const [perBrickRate, setPerBrickRate] = useState("");
  const [rate6Inch, setRate6Inch] = useState("");
  const [rate8Inch, setRate8Inch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers', showInactive],
    queryFn: () => workersApi.getAll(!showInactive, 'Worker'),
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
      setWeeklyWage("");
      setPerBrickRate("");
      setRate6Inch("");
      setRate8Inch("");
    },
  });

  const toggleWorkerStatus = (id: string, currentStatus: boolean) => {
    updateWorkerMutation.mutate({ id, active: !currentStatus });
  };

  const saveWorker = () => {
    if (!name.trim()) {
      toast.error("Please enter a worker name");
      return;
    }

    const isMason = role.toUpperCase() === 'MASON';
    const isPerBrick = payType === 'PER_BRICK';

    // Masons use size-specific rates, not the generic rate fields
    if (isMason) {
      if (!rate6Inch || !rate8Inch) {
        toast.error("Please enter both 6-inch and 8-inch rates for Mason");
        return;
      }
    } else {
      if (isPerBrick && !perBrickRate) {
        toast.error("Please enter a per-brick rate");
        return;
      }
      if (!isPerBrick && !weeklyWage) {
        toast.error("Please enter a weekly wage");
        return;
      }
    }

    createWorkerMutation.mutate({
      name: name.trim(),
      role: role.toUpperCase(),
      employeeType: 'Worker',
      paymentType: payType.toUpperCase(),
      perBrickRate: isMason ? 0 : (isPerBrick ? parseFloat(perBrickRate) : 0),
      rate6Inch: isMason ? parseFloat(rate6Inch) : 0,
      rate8Inch: isMason ? parseFloat(rate8Inch) : 0,
      weeklyWage: isMason ? 0 : (!isPerBrick ? parseFloat(weeklyWage) : 0),
      rate: isMason ? parseFloat(rate6Inch) : (isPerBrick ? parseFloat(perBrickRate) : parseFloat(weeklyWage)),
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
            {role.toUpperCase() === 'MASON' ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={rate6Inch}
                  onChange={(e) => setRate6Inch(e.target.value)}
                  placeholder="6-inch Rate"
                  className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
                />
                <input
                  type="number"
                  value={rate8Inch}
                  onChange={(e) => setRate8Inch(e.target.value)}
                  placeholder="8-inch Rate"
                  className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            ) : payType === 'PER_BRICK' ? (
              <input
                type="number"
                value={perBrickRate}
                onChange={(e) => setPerBrickRate(e.target.value)}
                placeholder="Per Brick Rate"
                className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              />
            ) : (
              <input
                type="number"
                value={weeklyWage}
                onChange={(e) => setWeeklyWage(e.target.value)}
                placeholder="Weekly Wage"
                className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              />
            )}
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
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <StatusBadge label={w.role} variant={(roleColors[w.role] as any) || "default"} />
                    <span className="text-xs text-muted-foreground lowercase">{w.paymentType.replace("_", " ")}</span>
                    {w.advanceBalance > 0 && (
                      <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-lg border border-destructive/20">
                        Adv: ₹{w.advanceBalance}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 mr-2">
                  <span className="text-sm font-bold text-foreground">
                    {w.role === 'MASON' ? `₹${w.rate6Inch}/${w.rate8Inch}` : `₹${w.paymentType === 'PER_BRICK' ? w.perBrickRate : w.weeklyWage}`}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline transition-all">
                        <BarChart3 className="h-3 w-3" />
                        STATS
                      </button>
                    </DialogTrigger>
                    <WorkerStatsModal worker={w} />
                  </Dialog>
                </div>
                <Switch checked={w.isActive} onCheckedChange={() => toggleWorkerStatus(w.id, w.isActive)} />
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
