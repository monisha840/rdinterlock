import { useState, useEffect } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { DatePickerField } from "@/components/DatePickerField";
import { StatusBadge } from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, Loader2, Banknote, Users, Hammer, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workersApi } from "@/api/workers.api";
import { format } from "date-fns";
import apiClient from "@/api/apiClient";
import type { Worker } from "@/types/api";

// ─── Types ───────────────────────────────────────────────────────────────────
interface AttendanceState { [workerId: string]: boolean }

// ─── Component ───────────────────────────────────────────────────────────────
const AttendancePage = () => {
    const queryClient = useQueryClient();
    const [date, setDate] = useState(new Date());
    const [notes, setNotes] = useState("");

    // Attendance for all workers
    const [staffAttendance, setStaffAttendance] = useState<AttendanceState>({});
    const [workerAttendance, setWorkerAttendance] = useState<AttendanceState>({});


    // ─── Queries ──────────────────────────────────────────────────────────────
    const { data: allWorkers = [], isLoading } = useQuery({
        queryKey: ["workers", "all-active"],
        queryFn: () => workersApi.getAll(true),
    });

    // Split workers
    const staffWorkers: Worker[] = allWorkers.filter(w =>
        ["MANAGER", "DRIVER", "TELECALLER"].includes(w.role)
    );
    const weeklyWorkers: Worker[] = allWorkers.filter(w =>
        !["MANAGER", "DRIVER", "TELECALLER"].includes(w.role)
    );

    // Fetch existing attendance for the date
    const { data: existingAttendance = [], isLoading: isAttLoading } = useQuery({
        queryKey: ["attendance", format(date, "yyyy-MM-dd")],
        queryFn: async () => {
            const res = await apiClient.get(`/wages/attendance?date=${format(date, "yyyy-MM-dd")}`);
            return res.data as { workerId: string; present: boolean }[];
        },
    });

    // Pre-fill attendance when date/workers change
    useEffect(() => {
        const map: AttendanceState = {};
        existingAttendance.forEach(r => { map[r.workerId] = r.present; });

        const newStaff: AttendanceState = {};
        staffWorkers.forEach(w => { newStaff[w.id] = map[w.id] ?? false; });
        setStaffAttendance(newStaff);

        const newWorker: AttendanceState = {};
        weeklyWorkers.forEach(w => { newWorker[w.id] = map[w.id] ?? false; });
        setWorkerAttendance(newWorker);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingAttendance.length, allWorkers.length]);

    // ─── Mutations ──────────────────────────────────────────────────────────
    const saveMutation = useMutation({
        mutationFn: async () => {
            // 1. Bulk attendance – all workers
            const attendanceRecords = [
                ...staffWorkers.map(w => ({
                    workerId: w.id,
                    date: format(date, "yyyy-MM-dd"),
                    present: staffAttendance[w.id] || false,
                })),
                ...weeklyWorkers.map(w => ({
                    workerId: w.id,
                    date: format(date, "yyyy-MM-dd"),
                    present: workerAttendance[w.id] || false,
                })),
            ];

            await apiClient.post("/wages/attendance/bulk", { records: attendanceRecords });

            await apiClient.post("/wages/attendance/bulk", { records: attendanceRecords });
        },
        onSuccess: () => {
            toast.success("✅ Attendance saved");
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            queryClient.invalidateQueries({ queryKey: ["workers"] });
            setNotes("");
        },
        onError: (err: any) => {
            toast.error("❌ Failed to save", { description: err?.response?.data?.message || err.message });
        },
    });

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const toggleStaff = (id: string) =>
        setStaffAttendance(p => ({ ...p, [id]: !p[id] }));
    const toggleWorker = (id: string) =>
        setWorkerAttendance(p => ({ ...p, [id]: !p[id] }));


    const roleColor: Record<string, string> = {
        DRIVER: "success",
        MANAGER: "destructive",
        TELECALLER: "primary",
    };

    const isLoaded = !isLoading && !isAttLoading;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <MobileFormLayout title="📅 Attendance">
            <div className="space-y-5">
                {/* Date Picker */}
                <EntryCard title="Select Date">
                    <DatePickerField date={date} onDateChange={setDate} />
                </EntryCard>

                {/* ═══════════════════════════════════════════════════
            SECTION 1: MONTHLY STAFF
        ═══════════════════════════════════════════════════ */}
                <EntryCard title="🏢 Monthly Staff">
                    <p className="text-[10px] text-muted-foreground mb-4 uppercase font-semibold tracking-wider">
                        Manager • Telecaller • Driver — paid monthly based on attendance
                    </p>
                    <div className="space-y-3">
                        {!isLoaded ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : staffWorkers.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-6">
                                No monthly staff found. Add Manager, Driver, or Telecaller workers.
                            </p>
                        ) : (
                            staffWorkers.map(w => {
                                const isPresent = staffAttendance[w.id] || false;

                                return (
                                    <div
                                        key={w.id}
                                        className={`rounded-2xl border p-4 transition-all ${isPresent
                                            ? "border-primary/30 bg-primary/5"
                                            : "border-border bg-secondary/20"
                                            }`}
                                    >
                                        {/* Header row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold shadow-sm text-base transition-colors ${isPresent ? "bg-primary" : "bg-muted-foreground/30"
                                                        }`}
                                                >
                                                    {w.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{w.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <StatusBadge label={w.role} variant={(roleColor[w.role] as any) || "default"} />
                                                        <span className="text-[10px] text-muted-foreground font-semibold">
                                                            ₹{w.rate}/day
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Present / Absent */}
                                            <div className="flex items-center gap-3">

                                                <div className="flex flex-col items-center gap-1">
                                                    <label className="text-[9px] text-green-600 font-bold uppercase">Present</label>
                                                    <Checkbox
                                                        checked={isPresent}
                                                        onCheckedChange={() => toggleStaff(w.id)}
                                                        className="h-6 w-6 rounded-lg data-[state=checked]:bg-primary"
                                                    />
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <label className="text-[9px] text-destructive font-bold uppercase">Absent</label>
                                                    <Checkbox
                                                        checked={!isPresent}
                                                        onCheckedChange={() => toggleStaff(w.id)}
                                                        className="h-6 w-6 rounded-lg data-[state=checked]:bg-destructive"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                );
                            })
                        )}
                    </div>
                </EntryCard>

                {/* ═══════════════════════════════════════════════════
            SECTION 2: WEEKLY WORKERS
        ═══════════════════════════════════════════════════ */}
                <EntryCard title="🔨 Weekly Workers">
                    <p className="text-[10px] text-muted-foreground mb-4 uppercase font-semibold tracking-wider">
                        Production Workers & Masons — paid weekly based on brick output
                    </p>
                    <div className="space-y-3">
                        {!isLoaded ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : weeklyWorkers.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-6">
                                No weekly workers found. Add Production Workers or Masons.
                            </p>
                        ) : (
                            weeklyWorkers.map(w => {
                                const isPresent = workerAttendance[w.id] || false;
                                const isMason = w.role === "MASON";

                                return (
                                    <div
                                        key={w.id}
                                        className={`rounded-2xl border p-4 transition-all ${isPresent ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-secondary/20"
                                            }`}
                                    >
                                        {/* Header row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold shadow-sm text-base transition-colors ${isPresent ? "bg-amber-500" : "bg-muted-foreground/30"
                                                        }`}
                                                >
                                                    {w.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{w.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isMason ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                                            {w.role}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-semibold">
                                                            {isMason ? "₹9/brick" : "₹2.50 Day / ₹3 Night"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Present / Absent */}
                                            <div className="flex items-center gap-3">

                                                <div className="flex flex-col items-center gap-1">
                                                    <label className="text-[9px] text-green-600 font-bold uppercase">Present</label>
                                                    <Checkbox
                                                        checked={isPresent}
                                                        onCheckedChange={() => toggleWorker(w.id)}
                                                        className="h-6 w-6 rounded-lg data-[state=checked]:bg-amber-500"
                                                    />
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <label className="text-[9px] text-destructive font-bold uppercase">Absent</label>
                                                    <Checkbox
                                                        checked={!isPresent}
                                                        onCheckedChange={() => toggleWorker(w.id)}
                                                        className="h-6 w-6 rounded-lg data-[state=checked]:bg-destructive"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                );
                            })
                        )}
                    </div>
                </EntryCard>

                {/* ═══════════════════════════════════════════════════
            SECTION 3: NOTES
        ═══════════════════════════════════════════════════ */}
                <EntryCard title="📝 Notes / Remarks">
                    <p className="text-[10px] text-muted-foreground mb-3 italic">
                        Record leave, production issues, machine breakdown, shift changes...
                    </p>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="e.g. Machine A broke down in night shift. Raju on leave."
                        rows={4}
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none resize-none transition-colors"
                    />
                </EntryCard>

                {/* Save Button */}
                <div className="sticky bottom-20 z-10 pt-2">
                    <ActionButton
                        label={saveMutation.isPending ? "Saving..." : "Save Attendance"}
                        icon={saveMutation.isPending ? Loader2 : Save}
                        variant="primary"
                        size="lg"
                        onClick={() => saveMutation.mutate()}
                        className="w-full shadow-xl"
                        disabled={saveMutation.isPending}
                    />
                </div>
            </div>
        </MobileFormLayout>
    );
};

export default AttendancePage;
