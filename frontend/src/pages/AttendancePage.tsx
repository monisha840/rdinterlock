import { useState, useEffect, useMemo } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { DatePickerField } from "@/components/DatePickerField";
import { StatusBadge } from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { DragScrollContainer } from "@/components/DragScrollContainer";
import { Save, Loader2, Users, Hammer, FileText, ChevronDown, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
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
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
    const [staffAttendance, setStaffAttendance] = useState<AttendanceState>({});
    const [workerAttendance, setWorkerAttendance] = useState<AttendanceState>({});
    const [notes, setNotes] = useState("");
    const [historyPage, setHistoryPage] = useState(1);


    // ─── Queries ──────────────────────────────────────────────────────────────
    const { data: allWorkers = [], isLoading } = useQuery({
        queryKey: ["workers", "all-active"],
        queryFn: () => workersApi.getAll(true),
    });

    // Attendance History Query
    const { data: attendanceHistory = [], isLoading: isHistoryLoading } = useQuery({
        queryKey: ["attendance-history", selectedWorkerId],
        queryFn: async () => {
            if (!selectedWorkerId) return [];
            const res = await apiClient.get(`/wages/attendance?workerId=${selectedWorkerId}`);
            return res.data as any[];
        },
        enabled: !!selectedWorkerId,
    });

    // Split workers
    const staffWorkers: Worker[] = allWorkers.filter(w =>
        ["MANAGER", "DRIVER", "TELECALLER"].includes(w.role)
    );
    const weeklyWorkers: Worker[] = allWorkers.filter(w =>
        !["MANAGER", "DRIVER", "TELECALLER"].includes(w.role)
    );

    // Attendance History Summary
    const historySummary = useMemo(() => {
        if (!attendanceHistory.length) return { total: 0, present: 0, absent: 0 };
        const total = attendanceHistory.length;
        const present = attendanceHistory.filter((a: any) => a.present).length;
        return { total, present, absent: total - present };
    }, [attendanceHistory]);

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
                    notes: notes.trim() || undefined,
                })),
                ...weeklyWorkers.map(w => ({
                    workerId: w.id,
                    date: format(date, "yyyy-MM-dd"),
                    present: workerAttendance[w.id] || false,
                    notes: notes.trim() || undefined,
                })),
            ];

            await apiClient.post("/wages/attendance/bulk", { records: attendanceRecords });
        },
        onSuccess: () => {
            toast.success("✅ Attendance saved");
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            queryClient.invalidateQueries({ queryKey: ["workers"] });
            queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
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

    // ─── Export ─────────────────────────────────────────────────────────────
    const handleAttendancePDF = () => {
        try {
            const allWorkersList = [...staffWorkers, ...weeklyWorkers];
            if (allWorkersList.length === 0) { toast.error("No workers to export"); return; }
            const doc = new jsPDF();
            doc.setFontSize(16); doc.text("RD Interlock - Attendance", 14, 15);
            doc.setFontSize(10); doc.text("Date: " + format(date, "dd MMM yyyy"), 14, 22);
            autoTable(doc, {
                head: [["Worker", "Role", "Type", "Status"]],
                body: allWorkersList.map(w => {
                    const isStaff = staffWorkers.some(s => s.id === w.id);
                    const isPresent = isStaff ? staffAttendance[w.id] : workerAttendance[w.id];
                    return [w.name, w.role, isStaff ? "Monthly Staff" : "Weekly Worker", isPresent ? "PRESENT" : "ABSENT"];
                }),
                startY: 28, styles: { fontSize: 9 }, headStyles: { fillColor: [59, 130, 246] },
            });
            doc.save("attendance-" + format(date, "dd-MM-yyyy") + ".pdf");
            toast.success("PDF exported");
        } catch (err: any) { toast.error("Export failed", { description: err.message }); }
    };

    const handleAttendanceExcel = () => {
        try {
            const allWorkersList = [...staffWorkers, ...weeklyWorkers];
            if (allWorkersList.length === 0) { toast.error("No workers to export"); return; }
            const cols = ["Worker", "Role", "Type", "Status", "Date"];
            const rows = allWorkersList.map(w => {
                const isStaff = staffWorkers.some(s => s.id === w.id);
                const isPresent = isStaff ? staffAttendance[w.id] : workerAttendance[w.id];
                return [w.name, w.role, isStaff ? "Monthly Staff" : "Weekly Worker", isPresent ? "PRESENT" : "ABSENT", format(date, "dd-MM-yyyy")];
            });
            const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance");
            XLSX.writeFile(wb, "attendance-" + format(date, "dd-MM-yyyy") + ".xlsx");
            toast.success("Excel exported");
        } catch (err: any) { toast.error("Export failed", { description: err.message }); }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <MobileFormLayout title="📅 Attendance">
            <div className="space-y-5">
                {/* Export */}
                <div className="flex gap-2">
                    <button onClick={handleAttendancePDF} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-secondary/50 border border-border text-[11px] font-bold hover:bg-secondary transition-all active:scale-[0.98]"><FileText className="h-3.5 w-3.5" /> PDF</button>
                    <button onClick={handleAttendanceExcel} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all active:scale-[0.98]"><Download className="h-3.5 w-3.5" /> Excel</button>
                </div>

                {/* Attendance History & Selection */}
                <EntryCard title="Attendance History">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Select Staff / Worker</label>
                            <div className="relative group">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50 group-focus-within:opacity-100 transition-opacity" />
                                <select
                                    value={selectedWorkerId}
                                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                                    className="w-full h-14 pl-11 pr-4 bg-secondary/30 border border-primary/10 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all appearance-none text-foreground"
                                >
                                    <option value="">Choose a person to view history...</option>
                                    <optgroup label="Monthly Staff">
                                        {staffWorkers.map(w => (
                                            <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Weekly Workers">
                                        {weeklyWorkers.map(w => (
                                            <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>

                        {selectedWorkerId && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-5">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                    <div className="bg-gradient-to-br from-secondary/50 to-background p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-border/50 text-center shadow-sm">
                                        <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-tighter mb-0.5 opacity-70">Total</p>
                                        <p className="text-xl sm:text-2xl font-black text-foreground">{historySummary.total}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-background p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-green-100 text-center shadow-sm">
                                        <p className="text-[9px] sm:text-[10px] font-black text-green-600 uppercase tracking-tighter mb-0.5">Present</p>
                                        <p className="text-xl sm:text-2xl font-black text-green-700">{historySummary.present}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-red-50 to-background p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-red-100 text-center shadow-sm">
                                        <p className="text-[9px] sm:text-[10px] font-black text-red-600 uppercase tracking-tighter mb-0.5">Absent</p>
                                        <p className="text-xl sm:text-2xl font-black text-red-700">{historySummary.absent}</p>
                                    </div>
                                </div>

                                {/* History Table */}
                                <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/50 shadow-sm backdrop-blur-sm">
                                    <DragScrollContainer showHint className="max-h-[300px] overflow-y-auto">
                                        <table className="w-full text-xs text-left border-collapse min-w-[400px]">
                                            <thead className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-md text-muted-foreground font-black border-b border-border uppercase tracking-widest text-[9px]">
                                                <tr>
                                                    <th className="py-2.5 px-3 sm:px-5">Date</th>
                                                    <th className="py-2.5 px-3 sm:px-5 text-center">Status</th>
                                                    <th className="py-2.5 px-3 sm:px-5">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                {isHistoryLoading ? (
                                                    <tr>
                                                        <td colSpan={3} className="py-10 text-center text-primary/40">
                                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                                            <p className="font-bold text-[10px] uppercase">Fetching logs...</p>
                                                        </td>
                                                    </tr>
                                                ) : attendanceHistory.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={3} className="py-10 text-center text-muted-foreground italic">
                                                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-10" />
                                                            No history found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    attendanceHistory.map((h: any) => (
                                                        <tr key={h.id} className="hover:bg-secondary/30 transition-colors group">
                                                            <td className="py-2.5 px-3 sm:px-5 font-bold text-foreground/80 whitespace-nowrap">
                                                                {format(new Date(h.date), "dd MMM")}
                                                            </td>
                                                            <td className="py-2.5 px-3 sm:px-5 text-center">
                                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                    h.present
                                                                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                                        : "bg-red-50 text-red-600 border border-red-100"
                                                                }`}>
                                                                    {h.present ? "Present" : "Absent"}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 sm:px-5 text-muted-foreground font-medium italic max-w-[120px] truncate" title={h.notes}>
                                                                {h.notes || "—"}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </DragScrollContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </EntryCard>

                {/* Date Picker */}
                <EntryCard title="Mark New Attendance">
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
                                        className={`rounded-2xl border p-3 sm:p-4 transition-all ${isPresent
                                            ? "border-primary/30 bg-primary/5"
                                            : "border-border bg-secondary/20"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                                <div
                                                    className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center text-white font-bold shadow-sm text-sm sm:text-base shrink-0 transition-colors ${isPresent ? "bg-primary" : "bg-muted-foreground/30"
                                                        }`}
                                                >
                                                    {w.name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[13px] sm:text-sm truncate">{w.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <StatusBadge label={w.role} variant={(roleColor[w.role] as any) || "default"} />
                                                        <span className="text-[10px] text-muted-foreground font-semibold">
                                                            ₹{w.rate}/day
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <label className="text-[8px] sm:text-[9px] text-green-600 font-bold uppercase">P</label>
                                                    <Checkbox
                                                        checked={isPresent}
                                                        onCheckedChange={() => toggleStaff(w.id)}
                                                        className="h-6 w-6 rounded-lg data-[state=checked]:bg-primary"
                                                    />
                                                </div>
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <label className="text-[8px] sm:text-[9px] text-destructive font-bold uppercase">A</label>
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
                                        className={`rounded-2xl border p-3 sm:p-4 transition-all ${isPresent ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-secondary/20"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                                <div
                                                    className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center text-white font-bold shadow-sm text-sm sm:text-base shrink-0 transition-colors ${isPresent ? "bg-amber-500" : "bg-muted-foreground/30"
                                                        }`}
                                                >
                                                    {w.name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[13px] sm:text-sm truncate">{w.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isMason ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                                            {w.role}
                                                        </span>
                                                        <span className="text-[9px] sm:text-[10px] text-muted-foreground font-semibold">
                                                            {isMason ? `₹${w.rate6Inch || w.rate || 9}/brick` : `₹${w.perBrickRate || w.rate || 2.5}/brick`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <label className="text-[8px] sm:text-[9px] text-green-600 font-bold uppercase">P</label>
                                                    <Checkbox
                                                        checked={isPresent}
                                                        onCheckedChange={() => toggleWorker(w.id)}
                                                        className="h-6 w-6 rounded-lg data-[state=checked]:bg-amber-500"
                                                    />
                                                </div>
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <label className="text-[8px] sm:text-[9px] text-destructive font-bold uppercase">A</label>
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
