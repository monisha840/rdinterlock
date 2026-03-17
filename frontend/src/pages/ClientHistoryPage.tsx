import { useState, useMemo } from "react";
import { format } from "date-fns";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { ActionButton } from "@/components/ActionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { dispatchApi } from "@/api/dispatch.api";
import { clientsApi } from "@/api/clients.api";
import { Search, Truck, Calendar, User, MapPin, CheckCircle2, IndianRupee, Loader2, X, CreditCard, ChevronDown, ChevronRight } from "lucide-react";

/**
 * Client History Page
 * Shows completed dispatches as requested.
 */
const ClientHistoryPage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(new Set());

    // ─── Queries ───────────────────────────────────────────────────────────────

    // All clients with financial summaries
    const { data: allClients = [], isLoading: isLoadingClients } = useQuery({
        queryKey: ["clients"],
        queryFn: () => clientsApi.getAll(),
    });

    // DISPATCHED schedules → to know which clients have been dispatched (but not yet completed)
    const { data: dispatchedSchedules = [], isLoading: isLoadingSchedules } = useQuery({
        queryKey: ["client-schedules-all"], // Use shared key for better invalidation sync
        queryFn: () => clientsApi.getAllSchedules(),
    });

    // COMPLETED dispatches → to know which clients have been fully completed
    const { data: completedDispatches = [], isLoading: isLoadingDispatches } = useQuery({
        queryKey: ["dispatches-completed"],
        queryFn: () => dispatchApi.getAll(),
    });

    // ALL orders → to capture clients marked as DISPATCHED/COMPLETED directly on orders
    const { data: allOrders = [], isLoading: isLoadingOrders } = useQuery({
        queryKey: ["client-orders-all"],
        queryFn: () => clientsApi.getAllOrders(),
    });

    const isLoading = isLoadingClients || isLoadingSchedules || isLoadingDispatches || isLoadingOrders;

    // ─── Filter logic for Dispatches ────────────────────────────────────────────

    const historyDispatches = useMemo(() => {
        const dispatches: any[] = [];
        const clientsMap = new Map((allClients as any[]).map(c => [c.id, c]));

        // 1. From schedules marked as DISPATCHED (or COMPLETED if they somehow linger)
        (Array.isArray(dispatchedSchedules) ? dispatchedSchedules : []).forEach((s: any) => {
            const status = (s.status || '').toUpperCase();
            const clientData = clientsMap.get(s.clientId);
            const isFullyPaid = clientData ? (clientData.totalOrderAmount || 0) > 0 && (clientData.pendingAmount || 0) <= 0 : false;
            
            
            
            if (status !== "DISPATCHED" && status !== "COMPLETED" && status !== "PENDING" && status !== "SCHEDULED" && status !== "READY" && !isFullyPaid) return;
            
            // Filter by status if not ALL
            if (statusFilter !== "ALL") {
                if (statusFilter === "FULLY PAID") {
                    if (!isFullyPaid) return;
                } else if (statusFilter === "PENDING") {
                    if (status !== "PENDING" && status !== "SCHEDULED" && status !== "READY") return;
                } else {
                    if (status !== statusFilter) return;
                }
            }
            
            const clientName = s.client?.name || clientData?.name || 'Unknown';
            const location = s.location || s.client?.address || clientData?.address || '—';
            
            const searchLower = searchTerm.toLowerCase();
            if (searchTerm && !clientName.toLowerCase().includes(searchLower) && !location.toLowerCase().includes(searchLower)) {
                return;
            }

            dispatches.push({
                id: s.id,
                clientName,
                brickSize: s.brickType?.size ?? '—',
                quantity: s.quantity,
                location,
                date: s.dispatchDate,
                driver: s.driver?.name ?? '—',
                status: isFullyPaid ? 'Fully Paid' : status, // OVERRIDE IF PAID
                source: 'schedule',
                raw: s,
            });
        });

        // 2. From final Dispatches table (COMPLETED)
        (Array.isArray(completedDispatches) ? completedDispatches : []).forEach((d: any) => {
            const status = (d.status || '').toUpperCase();
            const clientData = clientsMap.get(d.customerId);
            const isFullyPaid = clientData ? (clientData.totalOrderAmount || 0) > 0 && (clientData.pendingAmount || 0) <= 0 : false;
            
            
            if (status !== "COMPLETED" && !isFullyPaid) return;

            // Filter by status if not ALL
            if (statusFilter !== "ALL") {
                if (statusFilter === "FULLY PAID" && !isFullyPaid) return;
                if (statusFilter !== "FULLY PAID" && status !== statusFilter) return;
            }
            
            const clientName = d.customer?.name || clientData?.name || 'Unknown';
            const location = d.location || d.customer?.address || clientData?.address || '—';

            const searchLower = searchTerm.toLowerCase();
            if (searchTerm && !clientName.toLowerCase().includes(searchLower) && !location.toLowerCase().includes(searchLower)) {
                return;
            }

            dispatches.push({
                id: d.id,
                clientName,
                brickSize: d.brickType?.size ?? '—',
                quantity: d.quantity,
                location,
                date: d.date,
                driver: d.driver?.name ?? '—',
                status: isFullyPaid ? 'Fully Paid' : 'COMPLETED',
                source: 'dispatch',
                raw: d,
            });
        });

        // 3. From Orders directly - Capture cases where order status is updated but no schedule exists
        (Array.isArray(allOrders) ? allOrders : []).forEach((o: any) => {
            const status = (o.status || '').toUpperCase();
            const clientData = clientsMap.get(o.clientId);
            const isFullyPaid = clientData ? (clientData.totalOrderAmount || 0) > 0 && (clientData.pendingAmount || 0) <= 0 : false;

            if (status !== "DISPATCHED" && status !== "COMPLETED" && status !== "PENDING" && !isFullyPaid) return;

            // Filter by status if not ALL
            if (statusFilter !== "ALL") {
                if (statusFilter === "FULLY PAID") {
                    if (!isFullyPaid) return;
                } else if (statusFilter === "PENDING") {
                    if (status !== "PENDING") return;
                } else {
                    if (status !== statusFilter) return;
                }
            }

            // Avoid duplication if already in dispatches (via schedule or dispatch)
            const hasEntry = dispatches.some(d => 
                (d.source === 'schedule' && d.raw?.orderId === o.id) || 
                (d.source === 'dispatch' && d.raw?.orderId === o.id)
            );
            if (hasEntry) return;

            const clientName = o.client?.name || clientData?.name || 'Unknown';
            const location = o.client?.address || clientData?.address || '—';

            const searchLower = searchTerm.toLowerCase();
            if (searchTerm && !clientName.toLowerCase().includes(searchLower) && !location.toLowerCase().includes(searchLower)) {
                return;
            }

            dispatches.push({
                id: o.id,
                clientName,
                brickSize: o.brickType?.size ?? '—',
                quantity: o.quantity,
                location,
                date: o.expectedDispatchDate || o.orderDate,
                driver: o.driver?.name || '—',
                status: isFullyPaid ? 'Fully Paid' : (status === 'DISPATCHED' ? 'DISPATCHED' : status === 'COMPLETED' ? 'COMPLETED' : status),
                source: 'order',
                raw: o,
            });
        });

        // 4. From Clients directly - ensure ANY fully paid client appears even without a schedule or order
        (allClients as any[]).forEach((c: any) => {
            const isFullyPaid = (c.totalOrderAmount || 0) > 0 && (c.pendingAmount || 0) <= 0;
            if (!isFullyPaid) return;
            
            if (statusFilter !== "ALL" && statusFilter !== "FULLY PAID") return;

            // Check if they are already represented by a schedule, dispatch or order
            const hasEntry = dispatches.some(d => 
                (d.source === 'schedule' && d.raw?.clientId === c.id) || 
                (d.source === 'dispatch' && d.raw?.customerId === c.id) ||
                (d.source === 'order' && d.raw?.clientId === c.id)
            );

            if (!hasEntry) {
                const searchLower = searchTerm.toLowerCase();
                const clientName = c.name || 'Unknown';
                const location = c.address || '—';

                if (searchTerm && !clientName.toLowerCase().includes(searchLower) && !location.toLowerCase().includes(searchLower)) {
                    return;
                }

                dispatches.push({
                    id: `client-${c.id}`,
                    clientName,
                    brickSize: '—',
                    quantity: '—',
                    location,
                    date: c.latestPaymentDate || c.updatedAt || new Date(),
                    driver: '—',
                    status: 'Fully Paid',
                    source: 'client',
                    raw: c,
                });
            }
        });

        // Group by Client ID
        const groupedMap = new Map<string, any>();
        dispatches.forEach(d => {
            const clientId = d.raw.clientId || d.raw.customerId || d.id;
            if (!groupedMap.has(clientId)) {
                groupedMap.set(clientId, {
                    clientId,
                    clientName: d.clientName,
                    location: d.location,
                    records: [],
                });
            }
            groupedMap.get(clientId).records.push(d);
        });

        const groupedDispatches = Array.from(groupedMap.values()).map(group => {
            // Sort records within group by date descending
            group.records.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const latest = group.records[0];
            const totalQty = group.records.reduce((sum: number, r: any) => sum + (typeof r.quantity === 'number' ? r.quantity : 0), 0);
            
            // Determine representative status
            let repStatus = latest.status;
            if (group.records.some((r: any) => r.status === 'Fully Paid')) repStatus = 'Fully Paid';
            else if (group.records.some((r: any) => r.status === 'DISPATCHED')) repStatus = 'DISPATCHED';

            return {
                ...group,
                latestDate: latest.date,
                latestBrickSize: latest.brickSize,
                latestDriver: latest.driver,
                totalQty,
                status: repStatus,
            };
        });

        // Sort groups by latest date descending
        return groupedDispatches.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
    }, [dispatchedSchedules, completedDispatches, allOrders, allClients, searchTerm, statusFilter]);

    const toggleExpand = (clientId: string) => {
        setExpandedClientIds(prev => {
            const next = new Set(prev);
            if (next.has(clientId)) next.delete(clientId); else next.add(clientId);
            return next;
        });
    };

    return (
        <MobileFormLayout title="Client History" subtitle="Record of all completed and dispatched deliveries">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search client or location..."
                        className="w-full h-11 pl-10 pr-10 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-full"
                        >
                            <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                    )}
                </div>
                
                <div className="sm:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full h-11 px-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none appearance-none font-medium cursor-pointer"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="DISPATCHED">Dispatched</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="FULLY PAID">Fully Paid</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary/40" />
                    <p className="text-sm">Loading client history...</p>
                </div>
            ) : historyDispatches.length === 0 ? (
                <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed border-border">
                    <Truck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">No completed dispatches yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                        Records appear here when their status is Dispatched or Completed.
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="mt-4 text-xs font-semibold text-primary"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto bg-card border border-border rounded-2xl shadow-sm">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-secondary/50 text-xs text-muted-foreground border-b border-border uppercase tracking-wider">
                            <tr>
                                <th className="py-3 px-4 font-semibold w-8"></th>
                                <th className="py-3 px-4 font-semibold">Client Name</th>
                                <th className="py-3 px-4 font-semibold">Last Brick Size</th>
                                <th className="py-3 px-4 font-semibold">Total Quantity</th>
                                <th className="py-3 px-4 font-semibold">Base Location</th>
                                <th className="py-3 px-4 font-semibold">Last Activity</th>
                                <th className="py-3 px-4 font-semibold">Overall Status</th>
                            </tr>
                        </thead>
                        {historyDispatches.map((group: any) => {
                            const isExpanded = expandedClientIds.has(group.clientId);
                            return (
                                <tbody key={group.clientId} className="border-b border-border last:border-0">
                                    <tr 
                                        onClick={() => toggleExpand(group.clientId)}
                                        className="hover:bg-secondary/30 transition-colors cursor-pointer"
                                    >
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-center">
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 font-bold text-foreground">
                                            {group.clientName}
                                            <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-secondary rounded-md text-muted-foreground">
                                                {group.records.length} items
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-muted-foreground">{group.latestBrickSize}</td>
                                        <td className="py-4 px-4 text-muted-foreground">
                                            {group.totalQty > 0 ? group.totalQty.toLocaleString() : '—'}
                                        </td>
                                        <td className="py-4 px-4 text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={group.location}>
                                            {group.location}
                                        </td>
                                        <td className="py-4 px-4 text-muted-foreground whitespace-nowrap">
                                            {format(new Date(group.latestDate), 'dd MMM yyyy')}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`text-[10px] px-2 py-1 rounded-md font-semibold ${
                                                group.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                group.status === 'Completed' || group.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                group.status === 'DISPATCHED' ? 'bg-orange-100 text-orange-700' :
                                                group.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {group.status}
                                            </span>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={7} className="bg-secondary/10 px-6 py-4">
                                                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-inner">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-bold uppercase tracking-tighter">
                                                            <tr>
                                                                <th className="py-2 px-3">Date</th>
                                                                <th className="py-2 px-3">Brick Size</th>
                                                                <th className="py-2 px-3">Qty</th>
                                                                <th className="py-2 px-3">Location</th>
                                                                <th className="py-2 px-3">Driver</th>
                                                                <th className="py-2 px-3">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/50">
                                                            {group.records.map((r: any, idx: number) => (
                                                                <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                                                                    <td className="py-2 px-3 whitespace-nowrap font-medium">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                                                                    <td className="py-2 px-3 text-muted-foreground">{r.brickSize}</td>
                                                                    <td className="py-2 px-3 text-muted-foreground">{(r.quantity || 0).toLocaleString()}</td>
                                                                    <td className="py-2 px-3 text-muted-foreground">{r.location}</td>
                                                                    <td className="py-2 px-3 text-muted-foreground">{r.driver}</td>
                                                                    <td className="py-2 px-3">
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                                                            r.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                                            r.status === 'COMPLETED' || r.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                                            r.status === 'DISPATCHED' ? 'bg-orange-100 text-orange-700' :
                                                                            'bg-secondary text-secondary-foreground'
                                                                        }`}>
                                                                            {r.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            );
                        })}
                    </table>
                </div>
            )}

            {/* Minimal Client Detail Modal can go here if needed later, but the requirement was simply to show the Dispatched records table */}
        </MobileFormLayout>
    );
};

export default ClientHistoryPage;
