import { useState, useMemo } from "react";
import { format } from "date-fns";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { ActionButton } from "@/components/ActionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { dispatchApi } from "@/api/dispatch.api";
import { clientsApi } from "@/api/clients.api";
import { Search, Truck, Calendar, User, MapPin, CheckCircle2, IndianRupee, Loader2, X, CreditCard, ChevronDown, ChevronRight, Factory, FileText, Download } from "lucide-react";
import { DragScrollContainer } from "@/components/DragScrollContainer";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

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

    const clientsMap = useMemo(() => {
        return new Map((allClients as any[]).map(c => [c.id, c]));
    }, [allClients]);

    // ─── Filter logic for Dispatches ────────────────────────────────────────────

    const historyDispatches = useMemo(() => {
        const dispatches: any[] = [];

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
                vehicleNumber: s.vehicleNumber || null,
                status: isFullyPaid ? 'Fully Paid' : status, // OVERRIDE IF PAID
                source: 'schedule',
                clientId: s.clientId,
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
                vehicleNumber: d.vehicleNumber || null,
                status: isFullyPaid ? 'Fully Paid' : 'COMPLETED',
                source: 'dispatch',
                clientId: d.customerId,
                raw: d,
            });
        });

        // 3. From Orders directly - Capture cases where order status is updated but no schedule exists
        (Array.isArray(allOrders) ? allOrders : []).forEach((o: any) => {
            const status = (o.status || '').toUpperCase();
            const clientData = clientsMap.get(o.clientId);
            const isFullyPaid = clientData ? (clientData.totalOrderAmount || 0) > 0 && (clientData.pendingAmount || 0) <= 0 : false;

            // Only show if DISPATCHED, COMPLETED or Fully Paid
            if (status !== "DISPATCHED" && status !== "COMPLETED" && !isFullyPaid) return;

            // Filter by status if not ALL
            if (statusFilter !== "ALL") {
                if (statusFilter === "FULLY PAID") {
                    if (!isFullyPaid) return;
                } else if (statusFilter === "PENDING") {
                    // Pending orders should not be in history normally, but if filtered as such:
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

            // Get driver/vehicle from the linked dispatch record if available
            const linkedDispatch = (o.dispatches || [])[0];
            dispatches.push({
                id: o.id,
                clientName,
                brickSize: o.brickType?.size ?? '—',
                quantity: o.quantity,
                location: linkedDispatch?.location || location,
                date: o.expectedDispatchDate || o.orderDate,
                driver: linkedDispatch?.driver?.name || o.driver?.name || '—',
                vehicleNumber: linkedDispatch?.vehicleNumber || null,
                status: isFullyPaid ? 'Fully Paid' : (status === 'DISPATCHED' ? 'DISPATCHED' : status === 'COMPLETED' ? 'COMPLETED' : status),
                source: 'order',
                clientId: o.clientId,
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
                    clientId: c.id,
                    raw: c,
                });
            }
        });

        // Group by Client ID
        const groupedMap = new Map<string, any>();
        dispatches.forEach(d => {
            const clientId = d.clientId || d.raw?.clientId || d.raw?.customerId || d.id;
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

    // ─── Export Helpers ─────────────────────────────────────────────────────
    const getExportRows = () => {
        const rows: any[][] = [];
        historyDispatches.forEach((group: any) => {
            const client = clientsMap.get(group.clientId);
            const totalBill = client?.totalOrderAmount || 0;
            const totalPaid = client?.totalPaid || 0;
            const pending = client?.pendingAmount || 0;

            group.records.forEach((r: any) => {
                rows.push([
                    group.clientName,
                    r.brickSize || "-",
                    typeof r.quantity === "number" ? r.quantity : "-",
                    group.location || "-",
                    r.date ? format(new Date(r.date), "dd-MM-yyyy") : "-",
                    r.driver || "-",
                    r.vehicleNumber || r.raw?.vehicleNumber || "-",
                    r.status || "-",
                    "Rs." + totalBill.toLocaleString(),
                    "Rs." + totalPaid.toLocaleString(),
                    "Rs." + Math.max(0, pending).toLocaleString(),
                ]);
            });
        });
        return rows;
    };

    const exportColumns = [
        "Client", "Brick Type", "Qty", "Location", "Date",
        "Driver", "Vehicle", "Status", "Total Bill", "Paid", "Pending"
    ];

    const handleExportPDF = () => {
        try {
            const rows = getExportRows();
            if (rows.length === 0) { toast.error("No data to export"); return; }

            const doc = new jsPDF({ orientation: "landscape" });
            doc.setFontSize(16);
            doc.text("RD Interlock - Client History", 14, 15);
            doc.setFontSize(10);
            doc.text("Generated: " + format(new Date(), "dd-MM-yyyy HH:mm"), 14, 22);

            autoTable(doc, {
                head: [exportColumns],
                body: rows,
                startY: 28,
                styles: { fontSize: 7 },
                headStyles: { fillColor: [59, 130, 246] },
            });

            const finalY = (doc as any).lastAutoTable?.finalY || 200;
            doc.setFontSize(9);
            doc.text("Total Clients: " + historyDispatches.length + "  |  Total Records: " + rows.length, 14, finalY + 8);

            doc.save("client-history-" + format(new Date(), "dd-MM-yyyy") + ".pdf");
            toast.success("PDF exported successfully");
        } catch (err: any) {
            console.error("PDF export error:", err);
            toast.error("PDF export failed", { description: err.message });
        }
    };

    const handleExportExcel = () => {
        try {
            const rows = getExportRows();
            if (rows.length === 0) { toast.error("No data to export"); return; }

            const sheetData = [exportColumns, ...rows];
            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            // Auto-width columns
            const colWidths = exportColumns.map((col, i) => {
                const maxLen = Math.max(col.length, ...rows.map(r => String(r[i] || "").length));
                return { wch: Math.min(maxLen + 2, 30) };
            });
            ws["!cols"] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Client History");
            XLSX.writeFile(wb, "client-history-" + format(new Date(), "dd-MM-yyyy") + ".xlsx");
            toast.success("Excel exported successfully");
        } catch (err: any) {
            console.error("Excel export error:", err);
            toast.error("Excel export failed", { description: err.message });
        }
    };

    const toggleExpand = (clientId: string) => {
        setExpandedClientIds(prev => {
            const next = new Set(prev);
            if (next.has(clientId)) next.delete(clientId); else next.add(clientId);
            return next;
        });
    };

    return (
        <MobileFormLayout title="Client History" subtitle="Record of all completed and dispatched deliveries">
            {/* Export Buttons */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={handleExportPDF}
                    className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm"
                >
                    <FileText className="h-3.5 w-3.5" /> Export PDF
                </button>
                <button
                    onClick={handleExportExcel}
                    className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all active:scale-[0.98] shadow-sm"
                >
                    <Download className="h-3.5 w-3.5" /> Export Excel
                </button>
            </div>

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
                        <option value="DISPATCHED">Dispatched</option>
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
                <DragScrollContainer showHint className="bg-card border border-border rounded-2xl shadow-sm">
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
                                            <td colSpan={7} className="bg-secondary/10 px-3 sm:px-5 py-3 border-b border-border shadow-inner">
                                                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">

                                                    {/* 🚚 Transport Details — inline */}
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <Truck className="h-3 w-3 text-blue-600" />
                                                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Transport</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                                            <span className="text-muted-foreground">Driver: <span className="font-bold text-foreground">{group.records[0]?.driver || '—'}</span></span>
                                                            <span className="text-muted-foreground">Vehicle: <span className="font-bold text-foreground">{group.records[0]?.vehicleNumber || group.records[0]?.raw?.vehicleNumber || '—'}</span></span>
                                                            <span className="text-muted-foreground">Location: <span className="font-bold text-foreground">{group.records[0]?.location || '—'}</span></span>
                                                        </div>
                                                    </div>

                                                    {/* 🧱 Order Details — inline table */}
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <Factory className="h-3 w-3 text-orange-600" />
                                                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Orders</span>
                                                        </div>
                                                        <div className="bg-card rounded-lg border border-border/40 overflow-hidden">
                                                            <table className="w-full text-[11px]">
                                                                <thead className="bg-secondary/30">
                                                                    <tr>
                                                                        <th className="py-1.5 px-2.5 text-left text-[9px] font-bold text-muted-foreground uppercase">Brick Type</th>
                                                                        <th className="py-1.5 px-2.5 text-right text-[9px] font-bold text-muted-foreground uppercase">Qty</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border/30">
                                                                    {group.records.slice(0, 3).map((r: any, idx: number) => (
                                                                        <tr key={idx}>
                                                                            <td className="py-1.5 px-2.5 font-medium text-foreground">{r.brickSize}</td>
                                                                            <td className="py-1.5 px-2.5 text-right font-black">{(r.quantity || 0).toLocaleString()}</td>
                                                                        </tr>
                                                                    ))}
                                                                    {group.records.length > 3 && (
                                                                        <tr>
                                                                            <td colSpan={2} className="py-1 px-2.5 text-center text-[9px] text-muted-foreground italic">
                                                                                + {group.records.length - 3} more
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    {/* 💰 Payment Info — compact inline */}
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <IndianRupee className="h-3 w-3 text-emerald-600" />
                                                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Payment</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-2">
                                                            <span className="text-muted-foreground">Total: <span className="font-black text-foreground">₹{(clientsMap.get(group.clientId)?.totalOrderAmount || 0).toLocaleString()}</span></span>
                                                            <span className="text-muted-foreground">Paid: <span className="font-black text-emerald-600">₹{(clientsMap.get(group.clientId)?.totalPaid || 0).toLocaleString()}</span></span>
                                                            <span className="text-muted-foreground">Advance: <span className="font-black text-blue-600">₹{(clientsMap.get(group.clientId)?.totalAdvance || 0).toLocaleString()}</span></span>
                                                        </div>

                                                        {/* Recent Payments */}
                                                        <div className="bg-card rounded-lg border border-border/40 overflow-hidden">
                                                            <div className="bg-secondary/30 px-2.5 py-1 border-b border-border text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                                                Recent Payments
                                                            </div>
                                                            <div className="max-h-[100px] overflow-y-auto">
                                                                {(() => {
                                                                    const client = clientsMap.get(group.clientId);
                                                                    const payments = (client?.payments || [])
                                                                        .filter((p: any) => p.type === 'PAYMENT' || p.type === 'ADVANCE')
                                                                        .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

                                                                    if (payments.length === 0) {
                                                                        return <div className="px-2.5 py-2 text-center text-[10px] text-muted-foreground italic">No payments</div>;
                                                                    }

                                                                    return (
                                                                        <table className="w-full text-[10px]">
                                                                            <tbody className="divide-y divide-border/20">
                                                                                {payments.slice(0, 5).map((p: any, idx: number) => (
                                                                                    <tr key={idx}>
                                                                                        <td className="py-1.5 px-2.5 text-muted-foreground whitespace-nowrap">{format(new Date(p.paymentDate), 'dd MMM')}</td>
                                                                                        <td className="py-1.5 px-2.5 font-semibold text-foreground truncate max-w-[80px]">
                                                                                            {p.type === 'ADVANCE' ? 'Advance' : (p.paymentMethod || 'Payment')}
                                                                                        </td>
                                                                                        <td className="py-1.5 px-2.5 text-right font-black text-emerald-600">₹{p.amount.toLocaleString()}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            );
                        })}
                    </table>
                </DragScrollContainer>
            )}

            {/* Minimal Client Detail Modal can go here if needed later, but the requirement was simply to show the Dispatched records table */}
        </MobileFormLayout>
    );
};

export default ClientHistoryPage;
