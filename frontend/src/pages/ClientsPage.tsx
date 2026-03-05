import { useState } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { toast } from "sonner";
import { Plus, Search, X, Eye, Edit2, Trash2, Loader2, Phone, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients.api";
import { useNavigate } from "react-router-dom";

const ClientsPage = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ["clients", search],
        queryFn: () => clientsApi.getAll(search || undefined),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => clientsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            setShowModal(false);
            resetForm();
            toast.success("✅ Client added");
        },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: any) => clientsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            setShowModal(false);
            setEditingClient(null);
            resetForm();
            toast.success("✅ Client updated");
        },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => clientsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success("✅ Client removed");
        },
    });

    const resetForm = () => setForm({ name: "", phone: "", address: "", notes: "" });

    const openEdit = (c: any) => {
        setEditingClient(c);
        setForm({ name: c.name, phone: c.phone || "", address: c.address || "", notes: c.notes || "" });
        setShowModal(true);
    };

    const handleSubmit = () => {
        if (!form.name.trim()) return toast.error("Name is required");
        if (editingClient) {
            updateMutation.mutate({ id: editingClient.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    return (
        <MobileFormLayout title="Clients" subtitle="Manage all clients">
            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors"
                />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Add Button */}
            <button
                onClick={() => { resetForm(); setEditingClient(null); setShowModal(true); }}
                className="w-full h-11 mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
                <Plus className="h-4 w-4" /> Add Client
            </button>

            {/* Client List */}
            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
            ) : clients.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No clients found</p>
            ) : (
                <div className="space-y-2">
                    {clients.map((c: any) => (
                        <div key={c.id} className="p-3 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        {c.phone && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Phone className="h-3 w-3" /> {c.phone}
                                            </span>
                                        )}
                                        {c.address && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <MapPin className="h-3 w-3" /> {c.address}
                                            </span>
                                        )}
                                    </div>
                                    {c.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{c.notes}</p>}
                                    <div className="flex gap-3 mt-1.5">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                            {c._count?.orders || 0} Orders
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                            {c._count?.payments || 0} Payments
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                    <button onClick={() => navigate(`/clients/${c.id}`)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="View Profile">
                                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                                    </button>
                                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Edit">
                                        <Edit2 className="h-3.5 w-3.5 text-amber-500" />
                                    </button>
                                    <button onClick={() => deleteMutation.mutate(c.id)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Delete">
                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">{editingClient ? "Edit Client" : "Add Client"}</h2>
                        <div className="space-y-3">
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client Name *" className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone Number" className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Location" className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2} className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none" />
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => { setShowModal(false); setEditingClient(null); resetForm(); }} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
                            <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : editingClient ? "Update" : "Add"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MobileFormLayout>
    );
};

export default ClientsPage;
