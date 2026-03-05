import { useState } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Loader2, X, Download, IndianRupee } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients.api";

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"];

const ClientLedgerPage = () => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [filterClient, setFilterClient] = useState("");
    const [form, setForm] = useState({ clientId: "", orderId: "", amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "CASH", notes: "" });

    const { data: payments = [], isLoading } = useQuery({
        queryKey: ["client-payments", filterClient],
        queryFn: () => clientsApi.getAllPayments({ clientId: filterClient || undefined }),
    });

    const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => clientsApi.getAll() });
    const { data: orders = [] } = useQuery({
        queryKey: ["client-orders-for-payment", form.clientId],
        queryFn: () => clientsApi.getAllOrders({ clientId: form.clientId }),
        enabled: !!form.clientId,
    });

    const createMut = useMutation({
        mutationFn: (data: any) => clientsApi.createPayment(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-payments"] }); queryClient.invalidateQueries({ queryKey: ["client-orders"] }); setShowModal(false); resetForm(); toast.success("✅ Payment recorded"); },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }: any) => clientsApi.updatePayment(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-payments"] }); setShowModal(false); setEditing(null); resetForm(); toast.success("✅ Payment updated"); },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => clientsApi.deletePayment(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-payments"] }); toast.success("✅ Payment deleted"); },
    });

    const resetForm = () => setForm({ clientId: "", orderId: "", amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "CASH", notes: "" });

    const openEdit = (p: any) => {
        setEditing(p);
        setForm({
            clientId: p.clientId, orderId: p.orderId || "", amount: String(p.amount),
            paymentDate: new Date(p.paymentDate).toISOString().split("T")[0], paymentMethod: p.paymentMethod, notes: p.notes || "",
        });
        setShowModal(true);
    };

    const handleSubmit = () => {
        if (!form.clientId || !form.amount) return toast.error("Fill required fields");
        const payload = {
            clientId: form.clientId, orderId: form.orderId || undefined,
            amount: parseFloat(form.amount), paymentDate: form.paymentDate,
            paymentMethod: form.paymentMethod, notes: form.notes || undefined,
        };
        if (editing) updateMut.mutate({ id: editing.id, data: { amount: payload.amount, paymentDate: payload.paymentDate, paymentMethod: payload.paymentMethod, notes: payload.notes } });
        else createMut.mutate(payload);
    };

    // Generate simple invoice
    const downloadInvoice = (payment: any) => {
        const order = payment.order;
        const lines = [
            "═══════════════════════════════════",
            "          RD INTERLOCK",
            "         PAYMENT INVOICE",
            "═══════════════════════════════════",
            "",
            `Client: ${payment.client?.name}`,
            `Date: ${new Date(payment.paymentDate).toLocaleDateString()}`,
            `Payment Method: ${payment.paymentMethod}`,
            "",
            "───────────────────────────────────",
            order ? `Order: ${order.brickType?.size || "N/A"} × ${order.quantity || 0} pcs` : "General Payment",
            order ? `Order Total: ₹${order.totalAmount?.toLocaleString()}` : "",
            `Amount Paid: ₹${payment.amount.toLocaleString()}`,
            payment.notes ? `Notes: ${payment.notes}` : "",
            "",
            "═══════════════════════════════════",
            "        Thank you for your",
            "           business!",
            "═══════════════════════════════════",
        ].filter(Boolean).join("\n");

        const blob = new Blob([lines], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice_${payment.client?.name}_${new Date(payment.paymentDate).toISOString().split("T")[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("📄 Invoice downloaded");
    };

    // Summary
    const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);

    return (
        <MobileFormLayout title="Client Ledger" subtitle="Payment tracking">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                    <p className="text-[10px] text-green-600 font-medium">Total Received</p>
                    <p className="text-lg font-bold text-green-700">₹{totalPaid.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                    <p className="text-[10px] text-blue-600 font-medium">Transactions</p>
                    <p className="text-lg font-bold text-blue-700">{payments.length}</p>
                </div>
            </div>

            {/* Filter */}
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="w-full h-10 px-3 mb-4 bg-card border border-border rounded-xl text-sm">
                <option value="">All Clients</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <button onClick={() => { resetForm(); setEditing(null); setShowModal(true); }} className="w-full h-11 mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" /> Add Payment
            </button>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
            ) : payments.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No payments recorded</p>
            ) : (
                <div className="space-y-2">
                    {payments.map((p: any) => (
                        <div key={p.id} className="p-3 bg-card border border-border rounded-xl">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <IndianRupee className="h-4 w-4 text-green-500" />
                                        <h3 className="text-sm font-bold text-green-700">₹{p.amount.toLocaleString()}</h3>
                                    </div>
                                    <p className="text-xs font-medium text-foreground mt-0.5">{p.client?.name}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {new Date(p.paymentDate).toLocaleDateString()} • {p.paymentMethod}
                                        {p.order && ` • Order: ${p.order.brickType?.size}`}
                                    </p>
                                    {p.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5">{p.notes}</p>}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => downloadInvoice(p)} className="p-1.5 rounded-lg hover:bg-secondary" title="Download Invoice">
                                        <Download className="h-3.5 w-3.5 text-blue-500" />
                                    </button>
                                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary"><Edit2 className="h-3.5 w-3.5 text-amber-500" /></button>
                                    <button onClick={() => deleteMut.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-secondary"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">{editing ? "Edit Payment" : "Add Payment"}</h2>
                            <button onClick={() => { setShowModal(false); setEditing(null); resetForm(); }}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, orderId: "" })} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                <option value="">Select Client *</option>
                                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {form.clientId && orders.length > 0 && (
                                <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                    <option value="">Link to Order (optional)</option>
                                    {orders.map((o: any) => <option key={o.id} value={o.id}>{o.brickType?.size} — {o.quantity} pcs — ₹{o.totalAmount?.toLocaleString()} ({o.status})</option>)}
                                </select>
                            )}
                            <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" placeholder="Amount *" className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                            <input value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} type="date" className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                            </select>
                            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2} className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm resize-none" />
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => { setShowModal(false); setEditing(null); resetForm(); }} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Cancel</button>
                            <button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                                {(createMut.isPending || updateMut.isPending) ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : editing ? "Update" : "Record"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MobileFormLayout>
    );
};

export default ClientLedgerPage;
