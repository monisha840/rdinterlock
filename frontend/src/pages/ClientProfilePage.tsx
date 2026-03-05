import { useParams, useNavigate } from "react-router-dom";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { Loader2, ArrowLeft, Phone, MapPin, FileText, Package, Truck, IndianRupee, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients.api";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    "IN PRODUCTION": "bg-blue-100 text-blue-700",
    IN_PRODUCTION: "bg-blue-100 text-blue-700",
    READY: "bg-purple-100 text-purple-700",
    DISPATCHED: "bg-teal-100 text-teal-700",
    COMPLETED: "bg-green-100 text-green-700",
    SCHEDULED: "bg-orange-100 text-orange-700",
};

const ClientProfilePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [openSection, setOpenSection] = useState<string>("details");

    const { data: client, isLoading } = useQuery({
        queryKey: ["client-profile", id],
        queryFn: () => clientsApi.getById(id!),
        enabled: !!id,
    });

    const { data: ledger } = useQuery({
        queryKey: ["client-ledger", id],
        queryFn: () => clientsApi.getLedger(id!),
        enabled: !!id,
    });

    const toggle = (s: string) => setOpenSection(openSection === s ? "" : s);

    if (isLoading) return (
        <MobileFormLayout title="Client Profile">
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
        </MobileFormLayout>
    );

    if (!client) return (
        <MobileFormLayout title="Client Profile">
            <p className="text-center py-10 text-muted-foreground">Client not found</p>
        </MobileFormLayout>
    );

    const orders = client.orders || [];
    const payments = client.payments || [];
    const schedules = client.dispatchSchedules || [];
    const dispatches = client.dispatches || [];

    return (
        <MobileFormLayout title={client.name} subtitle="Client Profile">
            <button onClick={() => navigate("/clients")} className="flex items-center gap-1 text-sm text-primary mb-4 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to Clients
            </button>

            {/* Client Details Section */}
            <EntryCard title="👤 Client Details">
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {client.phone || "No phone"}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {client.address || "No address"}</div>
                    {client.notes && <div className="flex items-start gap-2"><FileText className="h-4 w-4 text-muted-foreground mt-0.5" /> {client.notes}</div>}
                </div>
                {ledger && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="p-2.5 bg-blue-50 rounded-xl text-center">
                            <p className="text-[10px] text-blue-600 font-medium">Total Orders</p>
                            <p className="text-sm font-bold text-blue-700">₹{ledger.totalOrderAmount?.toLocaleString()}</p>
                        </div>
                        <div className="p-2.5 bg-green-50 rounded-xl text-center">
                            <p className="text-[10px] text-green-600 font-medium">Total Paid</p>
                            <p className="text-sm font-bold text-green-700">₹{ledger.totalPaid?.toLocaleString()}</p>
                        </div>
                        <div className="p-2.5 bg-red-50 rounded-xl text-center">
                            <p className="text-[10px] text-red-600 font-medium">Pending</p>
                            <p className="text-sm font-bold text-red-700">₹{ledger.pendingAmount?.toLocaleString()}</p>
                        </div>
                    </div>
                )}
            </EntryCard>

            {/* Order Timeline */}
            <div className="mt-4">
                <button onClick={() => toggle("timeline")} className="w-full flex items-center justify-between p-3 bg-card border border-border rounded-xl text-sm font-semibold">
                    <span>📦 Order Timeline ({orders.length})</span>
                    {openSection === "timeline" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {openSection === "timeline" && (
                    <div className="mt-2 space-y-0">
                        {orders.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No orders yet</p>
                        ) : orders.map((o: any, idx: number) => (
                            <div key={o.id} className="flex gap-3 relative">
                                <div className="flex flex-col items-center">
                                    <div className={`h-3 w-3 rounded-full border-2 ${o.status === 'COMPLETED' ? 'bg-green-500 border-green-500' : 'bg-primary border-primary'}`} />
                                    {idx < orders.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                                </div>
                                <div className="pb-4 flex-1">
                                    <div className="p-2.5 bg-secondary/30 rounded-xl">
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-semibold">{o.brickType?.size} — {o.quantity} pcs</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || "bg-gray-100 text-gray-700"}`}>{o.status}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(o.orderDate).toLocaleDateString()} • ₹{o.totalAmount?.toLocaleString()}</p>
                                        {/* Timeline steps */}
                                        <div className="flex gap-1 mt-1.5">
                                            {["PENDING", "IN_PRODUCTION", "READY", "DISPATCHED", "COMPLETED"].map((step, i) => {
                                                const statOrder = ["PENDING", "IN_PRODUCTION", "READY", "DISPATCHED", "COMPLETED"];
                                                const current = statOrder.indexOf(o.status);
                                                const isCompleted = i <= current;
                                                return (
                                                    <div key={step} className={`h-1 flex-1 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Dispatch History */}
            <div className="mt-4">
                <button onClick={() => toggle("dispatch")} className="w-full flex items-center justify-between p-3 bg-card border border-border rounded-xl text-sm font-semibold">
                    <span>🚚 Dispatch History ({dispatches.length + schedules.length})</span>
                    {openSection === "dispatch" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {openSection === "dispatch" && (
                    <div className="mt-2 space-y-2">
                        {[...dispatches.map((d: any) => ({ ...d, source: 'dispatch' })), ...schedules.map((s: any) => ({ ...s, date: s.dispatchDate, source: 'schedule' }))]
                            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((d: any) => (
                                <div key={d.id} className="p-2.5 bg-secondary/30 rounded-xl text-xs">
                                    <div className="flex justify-between">
                                        <span className="font-semibold">{d.brickType?.size} — {d.quantity} pcs</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status || d.paymentStatus] || "bg-gray-100 text-gray-700"}`}>
                                            {d.status || d.paymentStatus}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground mt-0.5">
                                        {new Date(d.date).toLocaleDateString()}
                                        {d.driver && ` • Driver: ${d.driver.name}`}
                                        {d.vehicleType && ` • ${d.vehicleType}`}
                                    </p>
                                </div>
                            ))}
                        {dispatches.length + schedules.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">No dispatch history</p>
                        )}
                    </div>
                )}
            </div>

            {/* Payment Ledger */}
            <div className="mt-4">
                <button onClick={() => toggle("payments")} className="w-full flex items-center justify-between p-3 bg-card border border-border rounded-xl text-sm font-semibold">
                    <span>💰 Payment Ledger ({payments.length})</span>
                    {openSection === "payments" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {openSection === "payments" && (
                    <div className="mt-2 space-y-2">
                        {payments.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No payments recorded</p>
                        ) : payments.map((p: any) => (
                            <div key={p.id} className="p-2.5 bg-secondary/30 rounded-xl text-xs flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">₹{p.amount.toLocaleString()}</p>
                                    <p className="text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString()} • {p.paymentMethod}</p>
                                    {p.notes && <p className="text-muted-foreground italic">{p.notes}</p>}
                                </div>
                                <IndianRupee className="h-4 w-4 text-green-500" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MobileFormLayout>
    );
};

export default ClientProfilePage;
