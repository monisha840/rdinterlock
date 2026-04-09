import { useState, useMemo } from "react";
import { format } from "date-fns";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { toast } from "sonner";
import {
    Plus, Search, X, Edit2, Trash2, Loader2, Phone, MapPin,
    ChevronDown, ChevronRight, ShoppingCart, IndianRupee, CreditCard,
    Calendar as CalendarIcon, AlertCircle, Truck, Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients.api";
import { settingsApi } from "@/api/settings.api";
import { workersApi } from "@/api/workers.api";
import { stockApi } from "@/api/stock.api";
import { transportApi } from "@/api/transport.api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["PENDING", "IN_PRODUCTION", "READY", "DISPATCHED"];
const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    IN_PRODUCTION: "bg-blue-100   text-blue-700",
    READY: "bg-purple-100 text-purple-700",
    DISPATCHED: "bg-orange-100 text-orange-700",
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
    constructionTypes: [] as string[],
    notes: "",
    location: "",
    paidAmount: "0",
    paymentStatus: "PENDING" as any,
    dispatchDate: new Date().toISOString().split("T")[0],
    extraItems: [] as Array<{ name: string; price: number }>,
    driverId: "",
    vehicleNumber: "",
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

    const { data: vehicles = [] } = useQuery({
        queryKey: ["transport-vehicles"],
        queryFn: () => transportApi.getVehicles(),
    });

    const { data: allWorkers = [] } = useQuery({
        queryKey: ["workers-all"],
        queryFn: () => workersApi.getAll(true),
    });

    const drivers = (allWorkers as any[]).filter((w: any) =>
        w.role?.toUpperCase() === 'DRIVER' || w.employeeType?.toUpperCase() === 'DRIVER'
    );

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

    const fullyPaidMut = useMutation({
        mutationFn: async (order: any) => {
            const client = (clients as any[]).find(c => c.id === order.clientId);
            if (!client) throw new Error("Client not found");

            // Calculate remaining balance for this specific order
            // Note: Since we track balance per client in the UI, but payments can be per order or generic,
            // we'll record a payment for the specific order if possible.
            const total = order.totalAmount || 0;
            const paid = order.paidAmount || 0;
            const balance = Math.max(0, total - paid);

            if (balance <= 0) {
                toast.info("Order is already fully paid");
                return;
            }

            return clientsApi.createPayment({
                clientId: order.clientId,
                orderId: order.id,
                amount: balance,
                paymentDate: new Date().toISOString().split("T")[0],
                paymentMethod: "CASH",
                notes: `Fully Paid one-click - Order: ${order.brickType?.size}`,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["client-orders-all"] });
            queryClient.invalidateQueries({ queryKey: ["cashbook"] });
            toast.success("✅ Payment recorded. Order is now fully paid.");
        },
        onError: (e: any) => toast.error("❌ Action failed", { description: e.message }),
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
            constructionTypes: o.constructionType ? o.constructionType.split(", ") : [],
            notes: o.notes || "",
            location: o.location || "",
            paidAmount: String(o.paidAmount || "0"),
            paymentStatus: o.paymentStatus || "PENDING",
            dispatchDate: o.dispatchDate ? new Date(o.dispatchDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            extraItems: o.extraItems || [],
            driverId: o.driverId || "",
            vehicleNumber: o.vehicleNumber || "",
        });
        setAutoCalc(false);
        setShowOrderModal(true);
    };

    const handleOrderCalcChange = (field: "quantity" | "rate", value: string) => {
        setOrderForm(prev => {
            const updated = { ...prev, [field]: value };
            // Always recalculate total when quantity or rate changes
            const q = parseInt(field === "quantity" ? value : prev.quantity) || 0;
            const r = parseFloat(field === "rate" ? value : prev.rate) || 0;
            const extraCosts = (prev.extraItems || []).reduce((s, i) => s + (i.price || 0), 0);
            const total = (q * r) + extraCosts;
            updated.totalAmount = total > 0 ? String(total) : "";
            return updated;
        });
        setAutoCalc(true);
    };

    // Extra item inline form state
    const [extraItemName, setExtraItemName] = useState("");
    const [extraItemPrice, setExtraItemPrice] = useState("");

    const addExtraItem = () => {
        if (!extraItemName.trim() || !extraItemPrice) {
            toast.error("Enter both item name and price");
            return;
        }
        const price = parseFloat(extraItemPrice) || 0;
        if (price <= 0) {
            toast.error("Price must be greater than 0");
            return;
        }

        setOrderForm(prev => {
            const newItems = [...(prev.extraItems || []), { name: extraItemName.trim(), price }];
            const extraTotal = newItems.reduce((s, i) => s + (i.price || 0), 0);
            const q = parseInt(prev.quantity) || 0;
            const r = parseFloat(prev.rate) || 0;
            const newTotal = String((q * r) + extraTotal);

            return {
                ...prev,
                extraItems: newItems,
                totalAmount: newTotal,
            };
        });
        setAutoCalc(true);
        setExtraItemName("");
        setExtraItemPrice("");
    };

    const removeExtraItem = (idx: number) => {
        setOrderForm(prev => {
            const itemToRemove = (prev.extraItems || [])[idx];
            if (!itemToRemove) return prev;

            const newItems = prev.extraItems.filter((_, i) => i !== idx);
            const extraTotal = newItems.reduce((s, i) => s + (i.price || 0), 0);
            const q = parseInt(prev.quantity) || 0;
            const r = parseFloat(prev.rate) || 0;
            // Always recalculate
            const newTotal = String((q * r) + extraTotal);

            return {
                ...prev,
                extraItems: newItems,
                totalAmount: newTotal,
            };
        });
        setAutoCalc(true);
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
            constructionType: orderForm.constructionTypes.length > 0 ? orderForm.constructionTypes.join(", ") : undefined,
            notes: orderForm.notes || undefined,
            extraItems: orderForm.extraItems || [],
            driverId: orderForm.driverId || undefined,
            vehicleNumber: orderForm.vehicleNumber || undefined,
        };

        try {
            if (editingOrder) {
                await updateOrderMut.mutateAsync({ 
                    id: editingOrder.id, 
                    data: {
                        ...payload,
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
                        const allClientOrders: any[] = (allOrders as any[]).filter((o: any) => o.clientId === client.id);
                        const isExpanded = expandedIds.has(client.id);
                        const totalBricks = allClientOrders.reduce((s: number, o: any) => s + (o.quantity || 0), 0);

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
                                            <p className="text-xs font-bold text-foreground">{allClientOrders.length}</p>
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
                                                <p className="text-xs text-muted-foreground">
                                                    {allClientOrders.length > 0 ? "All orders dispatched/completed" : "No orders yet"}
                                                </p>
                                                <button
                                                    onClick={() => openAddOrder(client.id)}
                                                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                                                >
                                                    + Add {allClientOrders.length > 0 ? "new" : "first"} order
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
                                                            {order.constructionType && <><span className="mx-1">•</span><span className="font-medium">{order.constructionType}</span></>}
                                                            <span className="mx-1">•</span>
                                                            <span className="font-medium text-foreground">₹{(order.totalAmount || 0).toLocaleString()}</span>
                                                            {order.extraItems && Array.isArray(order.extraItems) && order.extraItems.length > 0 && (
                                                                <span className="ml-1 text-[9px] text-primary font-bold">
                                                                    (+{order.extraItems.length} extras: ₹{order.extraItems.reduce((s: number, i: any) => s + (i.price || 0), 0).toLocaleString()})
                                                                </span>
                                                            )}
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-3xl border border-primary/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                        {/* Header */}
                        <div className="p-4 sm:p-6 border-b border-border/50 flex justify-between items-center bg-secondary/20 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-primary tracking-tight">
                                    {editingOrder ? "Edit Client Order" : "Record New Order"}
                                </h2>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Order workflow</p>
                            </div>
                            <button 
                                onClick={() => { setShowOrderModal(false); setEditingOrder(null); setOrderForm(emptyOrderForm()); }}
                                className="h-9 w-9 flex items-center justify-center rounded-xl bg-background border border-border shadow-sm active:scale-95 transition-all"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            {/* Brick Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">Select Brick Type *</label>
                                <div className="relative">
                                    <ShoppingCart className="absolute left-3.5 top-3 h-4 w-4 text-primary opacity-50" />
                                    <select
                                        value={orderForm.brickTypeId}
                                        onChange={(e) => setOrderForm({ ...orderForm, brickTypeId: e.target.value })}
                                        className="w-full h-12 pl-10 pr-4 bg-background border border-primary/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/10 transition-all appearance-none"
                                    >
                                        <option value="">Choose item size...</option>
                                        {(brickTypes as any[]).map((b: any) => (
                                            <option key={b.id} value={b.id}>{b.size}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3.5 top-4 h-3 w-3 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>

                            {/* Construction Type */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">Construction Type (select multiple)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {["Room", "Compound", "Godown", "Other"].map((ct) => (
                                        <button key={ct} type="button" onClick={() => {
                                            const types = orderForm.constructionTypes.includes(ct)
                                                ? orderForm.constructionTypes.filter(t => t !== ct)
                                                : [...orderForm.constructionTypes, ct];
                                            setOrderForm({ ...orderForm, constructionTypes: types });
                                        }}
                                            className={`h-10 px-2 rounded-xl text-[11px] sm:text-xs font-bold border transition-all truncate ${orderForm.constructionTypes.includes(ct) ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background text-muted-foreground border-primary/10 hover:border-primary/40"}`}>
                                            {ct}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quantities */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">Quantity *</label>
                                    <Input
                                        value={orderForm.quantity}
                                        onChange={(e) => handleOrderCalcChange("quantity", e.target.value)}
                                        type="number"
                                        placeholder="0"
                                        className="h-12 rounded-xl bg-background border-primary/10 font-black text-base"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">Rate / Unit</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-3.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            value={orderForm.rate}
                                            onChange={(e) => handleOrderCalcChange("rate", e.target.value)}
                                            type="number"
                                            placeholder="0"
                                            className="h-12 pl-8 rounded-xl bg-background border-primary/10 font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Amount Display */}
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest">Estimated Total</p>
                                    <Badge variant="outline" className="rounded-lg h-5 text-[9px] font-bold border-primary/20 bg-background text-primary">
                                        {autoCalc ? "Auto-calculated" : "Custom"}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-2xl font-black text-foreground">₹</span>
                                    <input
                                        value={orderForm.totalAmount}
                                        onChange={(e) => { setAutoCalc(false); setOrderForm({ ...orderForm, totalAmount: e.target.value }); }}
                                        type="number"
                                        className="w-full bg-transparent border-none p-0 text-2xl font-black focus:ring-0"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Extra Items List */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest px-1">Bill Extras</label>
                                {/* Inline Add Extra Form */}
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase px-1">Item Name</label>
                                        <Input
                                            value={extraItemName}
                                            onChange={(e) => setExtraItemName(e.target.value)}
                                            placeholder="e.g. Cement, Loading"
                                            className="h-10 rounded-xl bg-background border-primary/10 text-sm"
                                        />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase px-1">Price (₹)</label>
                                        <Input
                                            value={extraItemPrice}
                                            onChange={(e) => setExtraItemPrice(e.target.value)}
                                            type="number"
                                            placeholder="0"
                                            className="h-10 rounded-xl bg-background border-primary/10 text-sm font-bold"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addExtraItem}
                                        className="h-10 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0 hover:bg-primary/90 transition-all"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {(orderForm.extraItems || []).map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-secondary/50 px-4 py-3 rounded-xl border border-border/50 animate-in slide-in-from-left-2 duration-200">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground">{item.name}</span>
                                                <span className="text-[10px] text-muted-foreground">Service/Product</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black">₹{item.price.toLocaleString()}</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeExtraItem(idx)}
                                                    className="h-6 w-6 flex items-center justify-center rounded-lg bg-destructive/10 text-destructive active:scale-95"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(orderForm.extraItems || []).length === 0 && (
                                        <div className="text-center py-6 rounded-2xl border border-dashed border-border/50 bg-secondary/10">
                                            <p className="text-[10px] text-muted-foreground italic">No extra charges added</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dates Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">Order Placed On</label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={orderForm.orderDate}
                                            onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                                            type="date"
                                            className="h-12 pl-10 rounded-xl bg-background border-primary/10 text-sm font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">Expected Delivery</label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={orderForm.expectedDispatchDate}
                                            onChange={(e) => setOrderForm({ ...orderForm, expectedDispatchDate: e.target.value })}
                                            type="date"
                                            className="h-12 pl-10 rounded-xl bg-background border-primary/10 text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Status Section */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Workflow Status</label>
                                    <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                        <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${STATUS_COLORS[orderForm.status] || 'bg-gray-400'}`} />
                                        {orderForm.status.replace(/_/g, " ")}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {STATUS_OPTIONS.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setOrderForm({ ...orderForm, status: s })}
                                            className={`h-12 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                                                orderForm.status === s 
                                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                                                : "bg-background text-muted-foreground border-border/50 hover:bg-secondary"
                                            }`}
                                        >
                                            {s.replace(/_/g, " ")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Stock Check (if status changed in real-time) */}
                            {orderForm.status === 'DISPATCHED' && orderForm.brickTypeId && (
                                <div className="py-2 animate-in slide-in-from-top-4 duration-300">
                                    {(() => {
                                        const stock = (stockData as any[]).find(s => s.brickType.id === orderForm.brickTypeId);
                                        const available = stock?.currentStock || 0;
                                        const requested = parseInt(orderForm.quantity) || 0;
                                        const isDeficit = requested > available;

                                        return (
                                            <div className={`p-4 rounded-3xl border-2 ${isDeficit ? 'bg-destructive/5 border-destructive shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-emerald-500/5 border-emerald-500/30'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDeficit ? 'text-destructive' : 'text-emerald-600'}`}>Stock Audit</p>
                                                    {isDeficit && <AlertCircle className="h-4 w-4 text-destructive" />}
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-xl font-black text-foreground">{available.toLocaleString()}</p>
                                                    <p className="text-xs text-muted-foreground font-semibold">units currently available</p>
                                                </div>
                                                {isDeficit && (
                                                    <p className="text-[10px] font-bold text-destructive mt-2 leading-tight">
                                                        ⚠️ CRITICAL: Order exceeds current inventory by {(requested - available).toLocaleString()} units.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Final Dispatch Reveal */}
                            {orderForm.status === 'DISPATCHED' && (
                                <div className="space-y-4 p-5 rounded-3xl border-2 border-primary/20 bg-primary/5 animate-in slide-in-from-bottom-4 duration-400">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                            <Truck className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-primary">Final Settlement</p>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Complete dispatch info</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase opacity-70 ml-1">Dispatch Date</label>
                                            <Input
                                                type="date"
                                                value={orderForm.dispatchDate}
                                                onChange={(e) => setOrderForm({ ...orderForm, dispatchDate: e.target.value })}
                                                className="h-10 rounded-xl bg-background border-primary/20 font-bold"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase opacity-70 ml-1">Advance Received</label>
                                                <div className="relative">
                                                    <IndianRupee className="absolute left-3 top-3 h-3 w-3 text-emerald-600" />
                                                    <Input
                                                        type="number"
                                                        value={orderForm.paidAmount}
                                                        onChange={(e) => setOrderForm({ ...orderForm, paidAmount: e.target.value })}
                                                        className="h-10 pl-8 rounded-xl bg-background border-primary/20 font-black text-emerald-600"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase opacity-70 ml-1">Pay Status</label>
                                                <select
                                                    value={orderForm.paymentStatus}
                                                    onChange={(e) => setOrderForm({ ...orderForm, paymentStatus: e.target.value as any })}
                                                    className="w-full h-10 px-3 bg-background border border-primary/20 rounded-xl text-xs font-bold"
                                                >
                                                    <option value="PENDING">Pending</option>
                                                    <option value="PARTIAL">Partial Payment</option>
                                                    <option value="PAID">Fully Paid</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase opacity-70 ml-1">Driver</label>
                                                <select
                                                    value={orderForm.driverId}
                                                    onChange={(e) => setOrderForm({ ...orderForm, driverId: e.target.value })}
                                                    className="w-full h-10 px-3 bg-background border border-primary/20 rounded-xl text-xs font-bold"
                                                >
                                                    <option value="">Select Driver</option>
                                                    {drivers.length > 0 ? (
                                                        drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)
                                                    ) : (
                                                        (allWorkers as any[]).slice(0, 20).map((w: any) => <option key={w.id} value={w.id}>{w.name} ({w.role})</option>)
                                                    )}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase opacity-70 ml-1">Vehicle</label>
                                                <select
                                                    value={orderForm.vehicleNumber}
                                                    onChange={(e) => setOrderForm({ ...orderForm, vehicleNumber: e.target.value })}
                                                    className="w-full h-10 px-3 bg-background border border-primary/20 rounded-xl text-xs font-bold"
                                                >
                                                    <option value="">Select Vehicle</option>
                                                    {(vehicles as any[]).map((v: any) => <option key={v.id} value={v.vehicleNumber}>{v.vehicleNumber} — {v.ownerName || v.driverName || 'N/A'}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase opacity-70 ml-1">Delivery Destination</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-primary/50" />
                                                <Input
                                                    value={orderForm.location}
                                                    onChange={(e) => setOrderForm({ ...orderForm, location: e.target.value })}
                                                    placeholder="Address info..."
                                                    className="h-10 pl-9 rounded-xl bg-background border-primary/20 text-xs font-semibold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Internal Notes */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">Internal Notes</label>
                                <textarea
                                    value={orderForm.notes}
                                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                                    placeholder="Add any specific requirements or notes..."
                                    rows={3}
                                    className="w-full p-4 bg-background border border-primary/10 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/5 transition-all outline-none resize-none placeholder:text-muted-foreground/50"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-6 border-t border-border/50 bg-secondary/20 flex gap-4 shrink-0">
                            <button
                                onClick={() => { setShowOrderModal(false); setEditingOrder(null); setOrderForm(emptyOrderForm()); }}
                                className="flex-1 h-12 rounded-2xl border border-border bg-background text-sm font-bold active:scale-[0.98] transition-all hover:bg-secondary/80"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleOrderSubmit}
                                disabled={createOrderMut.isPending || updateOrderMut.isPending}
                                className="flex-[2] h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-black shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {createOrderMut.isPending || updateOrderMut.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {editingOrder ? "Save Changes" : "Confirm Order"}
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
