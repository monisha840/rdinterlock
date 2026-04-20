import { useState } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Loader2, X, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients.api";
import { settingsApi } from "@/api/settings.api";
import { workersApi } from "@/api/workers.api";
import { SearchableSelect } from "@/components/SearchableSelect";

const STATUS_OPTIONS = ["SCHEDULED", "READY", "DISPATCHED", "COMPLETED"];
const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: "bg-orange-100 text-orange-700",
    READY: "bg-purple-100 text-purple-700",
    DISPATCHED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
};

const DispatchSchedulingPage = () => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({
        clientId: "",
        brickTypeId: "",
        quantity: "",
        location: "",
        dispatchDate: new Date().toISOString().split("T")[0],
        driverId: "",
        status: "SCHEDULED",
        notes: "",
        orderId: ""
    });

    const { data: schedules = [], isLoading } = useQuery({
        queryKey: ["dispatch-schedules"],
        queryFn: () => clientsApi.getAllSchedules(),
    });

    const { data: openOrders = [] } = useQuery({
        queryKey: ["open-orders"],
        queryFn: () => clientsApi.getOpenOrders()
    });

    const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => clientsApi.getAll() });
    const { data: brickTypes = [] } = useQuery({ queryKey: ["brick-types"], queryFn: () => settingsApi.getBrickTypes() });
    const { data: allWorkers = [] } = useQuery({ queryKey: ["workers"], queryFn: () => workersApi.getAll(true) });
    const drivers = allWorkers.filter((w: any) => w.role === "DRIVER");

    const selectedOrder = openOrders.find((o: any) => o.id === form.orderId);

    const handleOrderSelect = (orderId: string) => {
        const order = openOrders.find((o: any) => o.id === orderId);
        if (!order) {
            setForm({ ...form, orderId: "" });
            return;
        }

        const totalDispatched = order.dispatches?.reduce((sum: number, d: any) => sum + d.quantity, 0) || 0;
        const remaining = order.quantity - totalDispatched;

        setForm({
            ...form,
            orderId,
            clientId: order.clientId,
            brickTypeId: order.brickTypeId,
            quantity: String(remaining > 0 ? remaining : order.quantity),
            location: order.client?.address || "",
            dispatchDate: order.expectedDispatchDate ? new Date(order.expectedDispatchDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        });
    };

    const createMut = useMutation({
        mutationFn: (data: any) => clientsApi.createSchedule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dispatch-schedules"] });
            queryClient.invalidateQueries({ queryKey: ["open-orders"] });
            setShowModal(false);
            resetForm();
            toast.success("✅ Schedule created");
        },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }: any) => clientsApi.updateSchedule(id, data),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["dispatch-schedules"] });
            queryClient.invalidateQueries({ queryKey: ["dispatches"] });
            queryClient.invalidateQueries({ queryKey: ["open-orders"] });
            setShowModal(false);
            setEditing(null);
            resetForm();
            if (data.status === 'Completed' || !data.clientId) {
                toast.success("✅ Dispatch Completed & Recorded");
            } else {
                toast.success("✅ Schedule updated");
            }
        },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => clientsApi.deleteSchedule(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dispatch-schedules"] });
            queryClient.invalidateQueries({ queryKey: ["open-orders"] });
            toast.success("✅ Schedule deleted");
        },
    });

    const markDispatched = (id: string) => updateMut.mutate({ id, data: { status: "DISPATCHED" } });
    const markCompleted = (id: string) => updateMut.mutate({ id, data: { status: "COMPLETED" } });

    const resetForm = () => setForm({ clientId: "", brickTypeId: "", quantity: "", location: "", dispatchDate: new Date().toISOString().split("T")[0], driverId: "", status: "SCHEDULED", notes: "", orderId: "" });

    const openEdit = (s: any) => {
        setEditing(s);
        setForm({
            clientId: s.clientId,
            brickTypeId: s.brickTypeId,
            quantity: String(s.quantity),
            location: s.location || "",
            dispatchDate: new Date(s.dispatchDate).toISOString().split("T")[0],
            driverId: s.driverId || "",
            status: s.status,
            notes: s.notes || "",
            orderId: s.orderId || ""
        });
        setShowModal(true);
    };

    const handleSubmit = () => {
        if (!form.clientId || !form.brickTypeId || !form.quantity) return toast.error("Fill required fields");
        const payload = {
            clientId: form.clientId,
            brickTypeId: form.brickTypeId,
            quantity: parseInt(form.quantity),
            location: form.location || undefined,
            dispatchDate: form.dispatchDate,
            driverId: form.driverId || undefined,
            status: form.status,
            notes: form.notes || undefined,
            orderId: form.orderId || undefined
        };
        if (editing) updateMut.mutate({ id: editing.id, data: payload });
        else createMut.mutate(payload);
    };

    // Upcoming reminders (within 3 days and not dispatched/completed)
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 86400000);
    const upcoming = schedules.filter((s: any) => new Date(s.dispatchDate) <= threeDays && s.status !== "DISPATCHED" && s.status !== "COMPLETED");

    return (
        <MobileFormLayout title="Dispatch Scheduling" subtitle="Plan and track dispatches">
            {/* Upcoming Reminders */}
            {upcoming.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Upcoming Dispatches ({upcoming.length})</p>
                    {upcoming.map((s: any) => (
                        <p key={s.id} className="text-xs text-amber-600">{s.client?.name} — {s.brickType?.size} — {new Date(s.dispatchDate).toLocaleDateString()}</p>
                    ))}
                </div>
            )}

            <button onClick={() => { resetForm(); setEditing(null); setShowModal(true); }} className="w-full h-11 mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" /> Schedule Dispatch
            </button>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
            ) : schedules.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No schedules found</p>
            ) : (
                <div className="space-y-2">
                    {schedules.map((s: any) => (
                        <div key={s.id} className="p-3 bg-card border border-border rounded-xl">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold">{s.client?.name}</h3>
                                        {s.orderId && <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded-md ring-1 ring-border">Ordered</span>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {s.brickType?.size} • {s.quantity} pcs
                                        {s.location && ` • ${s.location}`}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        📅 {new Date(s.dispatchDate).toLocaleDateString()}
                                        {s.driver && ` • 🚗 ${s.driver.name}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] || "bg-gray-100"}`}>{s.status}</span>
                                    {s.status === "READY" && (
                                        <button onClick={() => markDispatched(s.id)} className="p-1.5 rounded-lg hover:bg-secondary" title="Mark Dispatched">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                                        </button>
                                    )}
                                    {s.status === "DISPATCHED" && (
                                        <button onClick={() => markCompleted(s.id)} className="p-1.5 rounded-lg hover:bg-secondary" title="Mark Completed">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                        </button>
                                    )}
                                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-secondary"><Edit2 className="h-3.5 w-3.5 text-amber-500" /></button>
                                    <button onClick={() => deleteMut.mutate(s.id)} className="p-1.5 rounded-lg hover:bg-secondary"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowModal(false); setEditing(null); resetForm(); }}>
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">{editing ? "Edit Schedule" : "New Schedule"}</h2>
                            <button onClick={() => { setShowModal(false); setEditing(null); resetForm(); }}><X className="h-5 w-5" /></button>
                        </div>

                        {/* Order Selector */}
                        <div className="mb-4">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">Linked Client Order (Optional)</p>
                            <select
                                value={form.orderId}
                                onChange={(e) => handleOrderSelect(e.target.value)}
                                className="w-full h-10 px-3 bg-secondary/80 border border-primary/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                            >
                                <option value="">--- Select Order to Auto-Fill ---</option>
                                {openOrders.map((o: any) => (
                                    <option key={o.id} value={o.id}>
                                        {o.client?.name} | {o.brickType?.size} | {o.quantity} pcs | {new Date(o.orderDate).toLocaleDateString()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Order Summary Card */}
                        {selectedOrder && (
                            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-primary uppercase">Order Summary</span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md font-bold">{selectedOrder.status}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center">
                                        <p className="text-[10px] text-muted-foreground">Ordered</p>
                                        <p className="text-xs font-bold">{selectedOrder.quantity}</p>
                                    </div>
                                    <div className="text-center border-x border-primary/10">
                                        <p className="text-[10px] text-muted-foreground">Dispatched</p>
                                        <p className="text-xs font-bold text-blue-600">
                                            {selectedOrder.dispatches?.reduce((sum: number, d: any) => sum + d.quantity, 0) || 0}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-muted-foreground">Remaining</p>
                                        <p className="text-xs font-bold text-green-600">
                                            {selectedOrder.quantity - (selectedOrder.dispatches?.reduce((sum: number, d: any) => sum + d.quantity, 0) || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Client Details</p>
                                <SearchableSelect
                                    value={form.clientId}
                                    onChange={(id) => setForm({ ...form, clientId: id })}
                                    options={clients.map((c: any) => ({ value: c.id, label: c.name, sublabel: c.phone }))}
                                    placeholder="Select Client *"
                                    emptyText="No matching client"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Brick Type</p>
                                    <select value={form.brickTypeId} onChange={(e) => setForm({ ...form, brickTypeId: e.target.value })} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                        <option value="">Brick Type *</option>
                                        {brickTypes.map((b: any) => <option key={b.id} value={b.id}>{b.size}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Quantity</p>
                                    <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} type="number" placeholder="Qty *" className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Dispatch Location</p>
                                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Date</p>
                                    <input value={form.dispatchDate} onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })} type="date" className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Driver</p>
                                    <select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                        <option value="">Select Driver</option>
                                        {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Status</p>
                                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2} className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm resize-none" />
                        </div>

                        <div className="flex gap-2 mt-5">
                            <button onClick={() => { setShowModal(false); setEditing(null); resetForm(); }} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Cancel</button>
                            <button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                                {(createMut.isPending || updateMut.isPending) ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : editing ? "Update" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MobileFormLayout>
    );
};

export default DispatchSchedulingPage;
