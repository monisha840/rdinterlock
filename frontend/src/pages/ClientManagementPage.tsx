import { useState, useMemo } from "react";
import { format } from "date-fns";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { toast } from "sonner";
import {
    Plus, Search, X, Edit2, Trash2, Loader2, Phone, MapPin,
    ChevronDown, ChevronRight, ShoppingCart, IndianRupee
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients.api";
import { settingsApi } from "@/api/settings.api";
import { workersApi } from "@/api/workers.api";
import { stockApi } from "@/api/stock.api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["PENDING", "IN_PRODUCTION", "READY", "DISPATCHED", "COMPLETED"];
const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    IN_PRODUCTION: "bg-blue-100   text-blue-700",
    READY: "bg-purple-100 text-purple-700",
    DISPATCHED: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-green-100  text-green-700",
};

// ─── Types ────────────────────────────────────────────────────────────────────

const emptyOrderForm = (clientId = "") => ({
    clientId,
    brickTypeId: "",
    quantity: "",
    rate: "",
    totalAmount: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDispatchDate: "",
    status: "PENDING",
    notes: "",
    driverId: "",
    vehicleNumber: "",
    location: "",
    paidAmount: "0",
    paymentStatus: "PENDING" as any,
    dispatchDate: new Date().toISOString().split("T")[0],
    extraItems: [] as Array<{ name: string; price: number }>,
});

// ─── Component ────────────────────────────────────────────────────────────────

const ClientManagementPage = () => {
    const queryClient = useQueryClient();

    // ── UI state ──
    const [search, setSearch] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // ── Client modal ──
    const [showClientModal, setShowClientModal] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [clientForm, setClientForm] = useState({ name: "", phone: "", address: "", notes: "" });

    // ── Order modal ──
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [orderForm, setOrderForm] = useState(emptyOrderForm());
    const [autoCalc, setAutoCalc] = useState(true);

    // ── Delete Confirmation modal ──
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<any>(null);

    // ─── Queries ───────────────────────────────────────────────────────────────

    const { data: clients = [], isLoading: isLoadingClients } = useQuery({
        queryKey: ["clients", search],
        queryFn: () => clientsApi.getAll(search || undefined),
    });

    const { data: allOrders = [], isLoading: isLoadingOrders } = useQuery({
        queryKey: ["client-orders-all"],
        queryFn: () => clientsApi.getAllOrders({}),
    });

    const { data: stockData = [] } = useQuery({
        queryKey: ['stock', 'current'],
        queryFn: () => stockApi.getCurrent(),
    });

    const { data: brickTypes = [] } = useQuery({
        queryKey: ["brick-types"],
        queryFn: () => settingsApi.getBrickTypes(),
    });

    const { data: drivers = [] } = useQuery({
        queryKey: ["drivers"],
        queryFn: () => workersApi.getAll(true), // fetching all active employees to act as drivers
    });

    const eligibleDrivers = useMemo(() => {
        return (drivers as any[]).filter((d: any) => {
            const r = d.role?.toLowerCase().trim() || '';
            return r === 'driver' || r === 'drivers' || r.includes('driver');
        });
    }, [drivers]);

    const isLoading = isLoadingClients || isLoadingOrders;

    // ─── Group orders by client ────────────────────────────────────────────────
    const ordersByClient = useMemo(() => {
        const map: Record<string, any[]> = {};
        (allOrders as any[]).forEach((o: any) => {
            if (!map[o.clientId]) map[o.clientId] = [];
            map[o.clientId].push(o);
        });
        return map;
    }, [allOrders]);


    // ─── Client Mutations ──────────────────────────────────────────────────────

    const createClientMut = useMutation({
        mutationFn: (data: any) => clientsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            setShowClientModal(false);
            setClientForm({ name: "", phone: "", address: "", notes: "" });
            toast.success("✅ Client added");
        },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const updateClientMut = useMutation({
        mutationFn: ({ id, data }: any) => clientsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            setShowClientModal(false);
            setEditingClient(null);
            setClientForm({ name: "", phone: "", address: "", notes: "" });
            toast.success("✅ Client updated");
        },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const deleteClientMut = useMutation({
        mutationFn: (id: string) => clientsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["client-orders-all"] });
            setShowDeleteModal(false);
            setClientToDelete(null);
            toast.success("✅ Client and all data deleted permanently");
        },
        onError: (e: any) => toast.error("❌ Deletion failed", { description: e.message }),
    });

    // ─── Order Mutations ───────────────────────────────────────────────────────

    const createOrderMut = useMutation({
        mutationFn: (data: any) => clientsApi.createOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-orders-all"] });
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            // Don't close modal here if we are chaining another request, do it in the submit handler
        },
        onError: (e: any) => toast.error("❌ Failed to create order", { description: e.message }),
    });

    const updateOrderMut = useMutation({
        mutationFn: ({ id, data }: any) => clientsApi.updateOrder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-orders-all"] });
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
        onError: (e: any) => toast.error("❌ Failed to update order", { description: e.message }),
    });

    const deleteOrderMut = useMutation({
        mutationFn: (id: string) => clientsApi.deleteOrder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-orders-all"] });
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success("✅ Order deleted");
        },
    });


    // ─── Helpers ───────────────────────────────────────────────────────────────

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const openAddClient = () => {
        setEditingClient(null);
        setClientForm({ name: "", phone: "", address: "", notes: "" });
        setShowClientModal(true);
    };

    const openEditClient = (c: any) => {
        setEditingClient(c);
        setClientForm({ name: c.name, phone: c.phone || "", address: c.address || "", notes: c.notes || "" });
        setShowClientModal(true);
    };

    const handleClientSubmit = () => {
        if (!clientForm.name.trim()) return toast.error("Client name is required");
        if (editingClient) {
            updateClientMut.mutate({ id: editingClient.id, data: clientForm });
        } else {
            createClientMut.mutate(clientForm);
        }
    };

    const openAddOrder = (clientId: string) => {
        setEditingOrder(null);
        setOrderForm(emptyOrderForm(clientId));
        setAutoCalc(true);
        setShowOrderModal(true);
        // Auto-expand this client
        setExpandedIds(prev => new Set(prev).add(clientId));
    };

    const openEditOrder = (o: any) => {
        setEditingOrder(o);
        setOrderForm({
            clientId: o.clientId,
            brickTypeId: o.brickTypeId,
            quantity: String(o.quantity),
            rate: String(o.rate || ""),
            totalAmount: String(o.totalAmount || ""),
            orderDate: new Date(o.orderDate).toISOString().split("T")[0],
            expectedDispatchDate: o.expectedDispatchDate ? new Date(o.expectedDispatchDate).toISOString().split("T")[0] : "",
            status: o.status,
            notes: o.notes || "",
            driverId: o.driverId || "",
            vehicleNumber: o.vehicleNumber || "",
            location: o.location || "",
            paidAmount: String(o.paidAmount || "0"),
            paymentStatus: o.paymentStatus || "PENDING",
            dispatchDate: o.dispatchDate ? new Date(o.dispatchDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            extraItems: o.extraItems || [],
        });
        setAutoCalc(false);
        setShowOrderModal(true);
    };

    const handleOrderCalcChange = (field: "quantity" | "rate", value: string) => {
        setOrderForm(prev => {
            const updated = { ...prev, [field]: value };
            if (autoCalc) {
                const q = parseInt(field === "quantity" ? value : prev.quantity) || 0;
                const r = parseFloat(field === "rate" ? value : prev.rate) || 0;
                const extraCosts = (prev.extraItems || []).reduce((s, i) => s + (i.price || 0), 0);
                updated.totalAmount = (q > 0 || extraCosts > 0) ? String((q * r) + extraCosts) : "";
            }
            return updated;
        });
    };

    const addExtraItem = () => {
        const name = prompt("Item name (e.g. Cement, Loading, Lintel)");
        if (!name?.trim()) return;
        const priceStr = prompt("Price (₹)");
        const price = parseFloat(priceStr || "0") || 0;

        setOrderForm(prev => {
            const newItems = [...(prev.extraItems || []), { name: name.trim(), price }];
            const extraTotal = newItems.reduce((s, i) => s + (i.price || 0), 0);
            const q = parseInt(prev.quantity) || 0;
            const r = parseFloat(prev.rate) || 0;

            let newTotal = prev.totalAmount;
            if (autoCalc) {
                newTotal = String((q * r) + extraTotal);
            } else {
                // In manual mode, add the new item price to the currently set total
                const current = parseFloat(prev.totalAmount) || 0;
                newTotal = String(current + price);
            }

            return {
                ...prev,
                extraItems: newItems,
                totalAmount: newTotal,
            };
        });
    };

    const removeExtraItem = (idx: number) => {
        setOrderForm(prev => {
            const itemToRemove = (prev.extraItems || [])[idx];
            if (!itemToRemove) return prev;

            const newItems = prev.extraItems.filter((_, i) => i !== idx);
            const extraTotal = newItems.reduce((s, i) => s + (i.price || 0), 0);
            const q = parseInt(prev.quantity) || 0;
            const r = parseFloat(prev.rate) || 0;

            let newTotal = prev.totalAmount;
            if (autoCalc) {
                newTotal = String((q * r) + extraTotal);
            } else {
                // In manual mode, subtract the item price from the currently set total
                const current = parseFloat(prev.totalAmount) || 0;
                newTotal = String(Math.max(0, current - itemToRemove.price));
            }

            return {
                ...prev,
                extraItems: newItems,
                totalAmount: newTotal,
            };
        });
    };

    const handleOrderSubmit = async () => {
        if (!orderForm.brickTypeId) return toast.error("Please select a Brick Type");
        if (!orderForm.quantity) return toast.error("Quantity is required");
        if (!orderForm.totalAmount) return toast.error("Estimated Amount is required");
        
        if (!orderForm.clientId || !orderForm.brickTypeId || !orderForm.quantity || !orderForm.totalAmount) {
            return toast.error("Fill all required fields");
        }
        
        const payload = {
            clientId: orderForm.clientId,
            brickTypeId: orderForm.brickTypeId,
            quantity: parseInt(orderForm.quantity),
            rate: parseFloat(orderForm.rate) || 0,
            totalAmount: parseFloat(orderForm.totalAmount) || 0,
            orderDate: orderForm.orderDate,
            expectedDispatchDate: orderForm.expectedDispatchDate || undefined,
            status: orderForm.status,
            notes: orderForm.notes || undefined,
            driverId: orderForm.driverId || null,
            extraItems: orderForm.extraItems || [],
        };

        try {
            if (editingOrder) {
                await updateOrderMut.mutateAsync({ 
                    id: editingOrder.id, 
                    data: {
                        ...payload,
                        vehicleNumber: orderForm.vehicleNumber,
                        location: orderForm.location,
                        paidAmount: parseFloat(orderForm.paidAmount || "0"),
                        paymentStatus: orderForm.paymentStatus,
                        dispatchDate: orderForm.dispatchDate,
                    } 
                });
                toast.success("✅ Order updated");
            } else {
                await createOrderMut.mutateAsync(payload);
                toast.success("✅ Order created");
            }
        } catch (e: any) {
            return;
        }

        setShowOrderModal(false);
        setEditingOrder(null);
        setOrderForm(emptyOrderForm());
    };


    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <MobileFormLayout title="Client Management" subtitle="All clients and their orders in one place">

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search client by name, phone or location..."
                    className="w-full h-11 pl-10 pr-10 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors"
                />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Add Client Button */}
            <button
                onClick={openAddClient}
                className="w-full h-11 mb-5 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
                <Plus className="h-4 w-4" /> Add Client
            </button>

            {/* Client Cards */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                </div>
            ) : (clients as any[]).length === 0 ? (
                <div className="text-center py-16 bg-secondary/20 rounded-3xl border border-dashed border-border">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No clients found</p>
                    {search && (
                        <button onClick={() => setSearch("")} className="mt-3 text-xs font-semibold text-primary">
                            Clear search
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {(clients as any[]).map((client: any) => {
                        const clientOrders: any[] = ordersByClient[client.id] || [];
                        const isExpanded = expandedIds.has(client.id);
                        const totalBricks = clientOrders.reduce((s, o) => s + (o.quantity || 0), 0);

                        return (
                            <div key={client.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm transition-all hover:border-primary/20">

                                {/* ── Client Header ── */}
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() => toggleExpand(client.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-sm text-foreground">{client.name}</h3>
                                                {isExpanded ? (
                                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                ) : (
                                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {client.phone && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Phone className="h-3 w-3" /> {client.phone}
                                                    </span>
                                                )}
                                                {client.address && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MapPin className="h-3 w-3" /> {client.address}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => openAddOrder(client.id)}
                                                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                                                title="Add Order"
                                            >
                                                <Plus className="h-3.5 w-3.5 text-primary" />
                                            </button>
                                            <button
                                                onClick={() => openEditClient(client)}
                                                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                                                title="Edit Client"
                                            >
                                                <Edit2 className="h-3.5 w-3.5 text-amber-500" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setClientToDelete(client);
                                                    setShowDeleteModal(true);
                                                }}
                                                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                                                title="Delete Client"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Order Summary Row */}
                                    <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                                        <div className="py-1 px-2 bg-secondary/40 rounded-lg">
                                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Orders</p>
                                            <p className="text-xs font-bold text-foreground">{clientOrders.length}</p>
                                        </div>
                                        <div className="py-1 px-2 bg-secondary/40 rounded-lg">
                                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Bricks</p>
                                            <p className="text-xs font-bold text-foreground">{totalBricks.toLocaleString()}</p>
                                        </div>
                                        <div className="py-1 px-2 bg-green-50 rounded-lg border border-green-100">
                                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Total</p>
                                            <p className="text-xs font-bold text-green-700">₹{(client.totalOrderAmount ?? 0).toLocaleString()}</p>
                                        </div>
                                        <div className={`py-1 px-2 rounded-lg border ${(client.pendingAmount ?? 0) > 0 ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
                                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Pending</p>
                                            <p className={`text-xs font-bold ${(client.pendingAmount ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                                                ₹{Math.max(0, client.pendingAmount ?? 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Orders List (Expanded) ── */}
                                {isExpanded && (
                                    <div className="border-t border-border bg-secondary/10 px-4 pb-4 pt-3 space-y-2">
                                        {clientOrders.length === 0 ? (
                                            <div className="text-center py-4">
                                                <p className="text-xs text-muted-foreground">No orders yet</p>
                                                <button
                                                    onClick={() => openAddOrder(client.id)}
                                                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                                                >
                                                    + Add first order
                                                </button>
                                            </div>
                                        ) : (
                                            clientOrders.map((order: any) => (
                                                <div
                                                    key={order.id}
                                                    className="p-3 bg-card rounded-xl border border-border flex items-start justify-between gap-2"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-foreground">
                                                                {order.brickType?.size}
                                                            </span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                                                                {order.status?.replace(/_/g, " ")}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {(order.quantity || 0).toLocaleString()} pcs
                                                            <span className="mx-1">•</span>
                                                            <span className="font-medium text-foreground">₹{(order.totalAmount || 0).toLocaleString()}</span>
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                            Ordered: {format(new Date(order.orderDate), "dd MMM yyyy")}
                                                            {order.expectedDispatchDate && (
                                                                <> · Dispatch: {format(new Date(order.expectedDispatchDate), "dd MMM yyyy")}</>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => openEditOrder(order)} className="p-1.5 rounded-lg hover:bg-secondary">
                                                            <Edit2 className="h-3.5 w-3.5 text-amber-500" />
                                                        </button>
                                                        <button onClick={() => {
                                                            if (confirm("Delete this order?")) deleteOrderMut.mutate(order.id);
                                                        }} className="p-1.5 rounded-lg hover:bg-secondary">
                                                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {clientOrders.length > 0 && (
                                            <button
                                                onClick={() => openAddOrder(client.id)}
                                                className="w-full h-9 mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors"
                                            >
                                                <Plus className="h-3.5 w-3.5" /> Add Order
                                            </button>
                                        )}
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Client Modal ──────────────────────────────────────────────── */}
            {showClientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">{editingClient ? "Edit Client" : "Add Client"}</h2>
                            <button onClick={() => { setShowClientModal(false); setEditingClient(null); }}>
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <input
                                value={clientForm.name}
                                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                                placeholder="Client Name *"
                                className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                            />
                            <input
                                value={clientForm.phone}
                                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                                placeholder="Phone Number"
                                className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                            />
                            <input
                                value={clientForm.address}
                                onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                                placeholder="Location"
                                className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                            />
                            <textarea
                                value={clientForm.notes}
                                onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                                placeholder="Notes"
                                rows={2}
                                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none"
                            />
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={() => { setShowClientModal(false); setEditingClient(null); }}
                                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClientSubmit}
                                disabled={createClientMut.isPending || updateClientMut.isPending}
                                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                            >
                                {(createClientMut.isPending || updateClientMut.isPending)
                                    ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                    : editingClient ? "Update" : "Add"
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Order Modal ───────────────────────────────────────────────── */}
            {showOrderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl max-h-[92vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">{editingOrder ? "Edit Order" : "New Order"}</h2>
                            <button onClick={() => { setShowOrderModal(false); setEditingOrder(null); setOrderForm(emptyOrderForm()); }}>
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Brick Type */}
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Brick Type *</p>
                                <select
                                    value={orderForm.brickTypeId}
                                    onChange={(e) => setOrderForm({ ...orderForm, brickTypeId: e.target.value })}
                                    className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm"
                                >
                                    <option value="">Select Brick Type</option>
                                    {(brickTypes as any[]).map((b: any) => (
                                        <option key={b.id} value={b.id}>{b.size}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Quantity + Rate */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Quantity *</p>
                                    <input
                                        value={orderForm.quantity}
                                        onChange={(e) => handleOrderCalcChange("quantity", e.target.value)}
                                        type="number"
                                        placeholder="pcs"
                                        className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm"
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Rate / brick</p>
                                    <input
                                        value={orderForm.rate}
                                        onChange={(e) => handleOrderCalcChange("rate", e.target.value)}
                                        type="number"
                                        placeholder="₹"
                                        className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            {/* Total Amount */}
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Estimated Amount (₹) *</p>
                                <input
                                    value={orderForm.totalAmount}
                                    onChange={(e) => { setAutoCalc(false); setOrderForm({ ...orderForm, totalAmount: e.target.value }); }}
                                    type="number"
                                    placeholder="Auto-calculated or enter manually"
                                    className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm"
                                />
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Order Date</p>
                                    <input
                                        value={orderForm.orderDate}
                                        onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                                        type="date"
                                        className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm"
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Dispatch Date</p>
                                    <input
                                        value={orderForm.expectedDispatchDate}
                                        onChange={(e) => setOrderForm({ ...orderForm, expectedDispatchDate: e.target.value })}
                                        type="date"
                                        className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            {/* Status and Driver Dropdown */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Status</p>
                                    <select
                                        value={orderForm.status}
                                        onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                                        className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm"
                                    >
                                        {STATUS_OPTIONS.map((s) => (
                                            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Assign Driver (Optional)</p>
                                    <select
                                        value={orderForm.driverId}
                                        onChange={(e) => setOrderForm({ ...orderForm, driverId: e.target.value })}
                                        className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm"
                                    >
                                        <option value="">No driver assigned</option>
                                        {eligibleDrivers.map((d: any) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Stock Validation Banner (Only when status is DISPATCHED) */}
                            {orderForm.status === 'DISPATCHED' && orderForm.brickTypeId && (
                                <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                                    {(() => {
                                        const stock = (stockData as any[]).find(s => s.brickType.id === orderForm.brickTypeId);
                                        const available = stock?.currentStock || 0;
                                        const requested = parseInt(orderForm.quantity) || 0;
                                        const isDeficit = requested > available;

                                        return (
                                            <div className={`p-4 rounded-2xl border ${isDeficit ? 'bg-destructive/10 border-destructive animate-pulse' : 'bg-green-500/10 border-green-500/30'}`}>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isDeficit ? 'text-destructive' : 'text-green-600'}`}>
                                                            Stock Check
                                                        </p>
                                                        <p className={`text-sm font-black ${isDeficit ? 'text-destructive' : 'text-green-700'}`}>
                                                            {available.toLocaleString()} units available
                                                        </p>
                                                    </div>
                                                    {isDeficit && (
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-destructive uppercase">Deficit</p>
                                                            <p className="text-xs font-bold text-destructive">
                                                                -{(requested - available).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                {isDeficit && (
                                                    <p className="text-[10px] text-destructive font-bold mt-2">
                                                        ⚠️ Warning: Saving will fail due to insufficient stock.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Dispatch Specific Fields (Shown only when status is DISPATCHED) */}
                            {orderForm.status === 'DISPATCHED' && (
                                <div className="grid grid-cols-1 gap-3 p-4 bg-secondary/30 rounded-2xl border border-dashed border-border mt-2 animate-in slide-in-from-top-2 duration-300">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Final Dispatch Details</p>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Vehicle No</p>
                                            <input
                                                value={orderForm.vehicleNumber}
                                                onChange={(e) => setOrderForm({ ...orderForm, vehicleNumber: e.target.value })}
                                                placeholder="ABC-123"
                                                className="w-full h-10 px-3 bg-card border border-border rounded-xl text-sm"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Actual Date</p>
                                            <input
                                                type="date"
                                                value={orderForm.dispatchDate}
                                                onChange={(e) => setOrderForm({ ...orderForm, dispatchDate: e.target.value })}
                                                className="w-full h-10 px-3 bg-card border border-border rounded-xl text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Advance Paid (₹)</p>
                                            <input
                                                type="number"
                                                value={orderForm.paidAmount}
                                                onChange={(e) => setOrderForm({ ...orderForm, paidAmount: e.target.value })}
                                                className="w-full h-10 px-3 bg-card border border-border rounded-xl text-sm"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Payment Status</p>
                                            <select
                                                value={orderForm.paymentStatus}
                                                onChange={(e) => setOrderForm({ ...orderForm, paymentStatus: e.target.value as any })}
                                                className="w-full h-10 px-3 bg-card border border-border rounded-xl text-sm"
                                            >
                                                <option value="PENDING">Pending</option>
                                                <option value="PARTIAL">Partial</option>
                                                <option value="PAID">Paid</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Specific Delivery Location</p>
                                        <input
                                            value={orderForm.location}
                                            onChange={(e) => setOrderForm({ ...orderForm, location: e.target.value })}
                                            placeholder="Destination Address"
                                            className="w-full h-10 px-3 bg-card border border-border rounded-xl text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Extra Items */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Extra Items</p>
                                    <button
                                        type="button"
                                        onClick={addExtraItem}
                                        className="text-[11px] font-bold text-primary hover:underline px-1"
                                    >
                                        + ADD ITEM
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {(orderForm.extraItems || []).map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-secondary/30 px-3 py-2 rounded-xl text-xs">
                                            <span className="font-medium">{item.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">₹{item.price.toLocaleString()}</span>
                                                <button type="button" onClick={() => removeExtraItem(idx)}>
                                                    <X className="h-3 w-3 text-destructive" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(orderForm.extraItems || []).length === 0 && (
                                        <p className="text-[10px] text-muted-foreground italic px-1">No extra items yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            <textarea
                                value={orderForm.notes}
                                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                                placeholder="Notes (optional)"
                                rows={2}
                                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm resize-none"
                            />
                        </div>

                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={() => { setShowOrderModal(false); setEditingOrder(null); setOrderForm(emptyOrderForm()); }}
                                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOrderSubmit}
                                disabled={createOrderMut.isPending || updateOrderMut.isPending}
                                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                            >
                                {(createOrderMut.isPending || updateOrderMut.isPending)
                                    ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                    : editingOrder ? "Update Record" : "Confirm Order"
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-[400px] rounded-3xl p-6 shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4 text-red-600">
                            <Trash2 className="h-6 w-6" />
                        </div>
                        
                        <h2 className="text-xl font-bold text-foreground mb-2">Delete Client Permanently</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                            This will permanently remove <span className="font-semibold text-foreground">{clientToDelete?.name}</span> and all related orders, dispatch records, ledger entries, and history. 
                            <span className="block mt-2 font-medium text-red-600">This action cannot be undone.</span>
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowDeleteModal(false); setClientToDelete(null); }}
                                className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteClientMut.mutate(clientToDelete.id)}
                                disabled={deleteClientMut.isPending}
                                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                            >
                                {deleteClientMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MobileFormLayout>
    );
};

export default ClientManagementPage;
