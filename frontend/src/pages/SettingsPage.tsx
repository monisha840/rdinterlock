import { useState, useEffect } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { toast } from "sonner";
import { Plus, X, Save, Loader2, IndianRupee } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings.api";
import { workersApi } from "@/api/workers.api";
import { materialConfigApi } from "@/api/material-config.api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ConfirmModal } from "@/components/ConfirmModal";

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [expenseCategories, setExpenseCategories] = useState(["Fuel", "Food", "Material", "Other"]);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => { },
    variant: "destructive" as "default" | "destructive"
  });

  const triggerConfirm = (config: { title: string; description: string; onConfirm: () => void; variant?: "default" | "destructive" }) => {
    setConfirmModal({
      isOpen: true,
      title: config.title,
      description: config.description,
      onConfirm: config.onConfirm,
      variant: config.variant || "destructive"
    });
  };

  const [newMachine, setNewMachine] = useState("");
  const [newBrickType, setNewBrickType] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newRawMaterial, setNewRawMaterial] = useState("");
  const [newRawMaterialUnit, setNewRawMaterialUnit] = useState("KG");

  // Show inactive filters
  const [showInactiveMachines, setShowInactiveMachines] = useState(false);
  const [showInactiveBrickTypes, setShowInactiveBrickTypes] = useState(false);
  const [showInactiveRawMaterials, setShowInactiveRawMaterials] = useState(false);
  const [showInactiveStaff, setShowInactiveStaff] = useState(false);
  const [showInactiveWorkers, setShowInactiveWorkers] = useState(false);

  // Staff & Worker input state
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("DRIVER");
  const [newStaffPayment, setNewStaffPayment] = useState("MONTHLY");
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerRole, setNewWorkerRole] = useState("OPERATOR");
  const [newWorkerPayment, setNewWorkerPayment] = useState("PER_BRICK");
  const [newWorkerRate6Inch, setNewWorkerRate6Inch] = useState(0);
  const [newWorkerRate8Inch, setNewWorkerRate8Inch] = useState(0);

  // Track edited changes for staff/workers in salary rates section
  const [editedWorkerRates, setEditedWorkerRates] = useState<Record<string, string>>({});
  const [editedWorkerStatus, setEditedWorkerStatus] = useState<Record<string, boolean>>({});

  // Material Config state
  const [selectedBrickTypeForConfig, setSelectedBrickTypeForConfig] = useState("");
  const [cementPer1000, setCementPer1000] = useState<number>(0);
  const [flyAshPer1000, setFlyAshPer1000] = useState<number>(0);
  const [powderPer1000, setPowderPer1000] = useState<number>(0);

  // Form states
  const [newStaffSalary, setNewStaffSalary] = useState<number>(0);
  const [newWorkerWeeklyWage, setNewWorkerWeeklyWage] = useState<number>(0);
  const [newWorkerPerBrickRate, setNewWorkerPerBrickRate] = useState<number>(0);

  // --- Queries ---
  const { data: machines = [], isLoading: isMachinesLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => settingsApi.getMachines(false),
  });

  const { data: brickTypes = [], isLoading: isBrickTypesLoading } = useQuery({
    queryKey: ['brick-types'],
    queryFn: () => settingsApi.getBrickTypes(false),
  });

  const { data: rawMaterials = [], isLoading: isRawMaterialsLoading } = useQuery({
    queryKey: ['raw-materials-settings'],
    queryFn: () => settingsApi.getRawMaterials(false),
  });

  // Staff = employeeType 'Staff'
  const { data: allWorkersForSettings = [], isLoading: isStaffWorkersLoading } = useQuery({
    queryKey: ['workers-settings'],
    queryFn: () => workersApi.getAll(false), // activeOnly=false so we see all
  });

  const staffList = allWorkersForSettings.filter(w => w.employeeType === 'Staff');
  const workerList = allWorkersForSettings.filter(w => w.employeeType === 'Worker');

  const { data: materialConfigs = [], isLoading: isMaterialConfigsLoading } = useQuery({
    queryKey: ['material-configs'],
    queryFn: materialConfigApi.getAll,
  });

  const { data: remoteSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: settingsApi.getSystemSettings,
  });

  // --- System Settings State ---
  const [salaryRates, setSalaryRates] = useState({
    production_active: "false",
    production_day_rate: "2.50",
    production_night_rate: "1.25",
    mason_active: "false",
    mason_rate: "9.00",
    driver_active: "false",
    driver_rate: "800.00",
  });

  useEffect(() => {
    if (remoteSettings) {
      setSalaryRates(prev => ({
        ...prev,
        ...remoteSettings
      }));
    }
  }, [remoteSettings]);

  // --- Mutations ---
  const addMachineMutation = useMutation({
    mutationFn: settingsApi.createMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      setNewMachine("");
      toast.success("✅ Machine added successfully");
    }
  });

  const removeMachineMutation = useMutation({
    mutationFn: ({ id, force }: { id: string, force?: boolean }) => settingsApi.deleteMachine(id, force),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      toast.success(variables.force ? "🗑️ Machine permanently deleted" : "✅ Machine removed");
    }
  });

  const addBrickTypeMutation = useMutation({
    mutationFn: settingsApi.createBrickType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brick-types'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      setNewBrickType("");
      toast.success("✅ Brick type added");
    }
  });

  const removeBrickTypeMutation = useMutation({
    mutationFn: ({ id, force }: { id: string, force?: boolean }) => settingsApi.deleteBrickType(id, force),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brick-types'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      toast.success(variables.force ? "🗑️ Brick type permanently deleted" : "✅ Brick type removed");
    }
  });

  const addRawMaterialMutation = useMutation({
    mutationFn: settingsApi.createRawMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials-settings'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      setNewRawMaterial("");
      toast.success("✅ Material added");
    }
  });

  const removeRawMaterialMutation = useMutation({
    mutationFn: ({ id, force }: { id: string, force?: boolean }) => settingsApi.deleteRawMaterial(id, force),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials-settings'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      toast.success(variables.force ? "🗑️ Material permanently deleted" : "✅ Material removed");
    }
  });

  // --- Default rate lookup ---
  const getDefaultRate = (role: string, payType: string) => {
    if (payType === 'MONTHLY') {
      if (role === 'DRIVER') return 800;
      if (role === 'MANAGER') return 800;
      return 700;
    }
    if (role === 'MASON') return 9;
    if (payType === 'PER_BRICK') return 2.5;
    return 500; // DAILY default
  };

  // --- Staff / Worker Mutations ---
  const addStaffMutation = useMutation({
    mutationFn: (data: { name: string; role: string; monthlySalary: number }) =>
      workersApi.create({
        name: data.name,
        role: data.role,
        employeeType: 'Staff',
        paymentType: 'MONTHLY',
        monthlySalary: data.monthlySalary,
        rate: data.monthlySalary, // Legacy fallback
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-settings'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      setNewStaffName("");
      setNewStaffSalary(0);
      toast.success("✅ Staff member added");
    },
    onError: (e: any) => toast.error("❌ Failed to add staff", { description: e.message }),
  });

  const removeStaffMutation = useMutation({
    mutationFn: ({ id, force }: { id: string, force?: boolean }) => workersApi.delete(id, force),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workers-settings'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      toast.success(variables.force ? "🗑️ Staff permanently deleted" : "✅ Staff removed");
    },
  });

  const addWorkerMutation = useMutation({
    mutationFn: (data: { name: string; role: string; paymentType: string, perBrickRate: number, weeklyWage: number }) =>
      workersApi.create({
        name: data.name,
        role: data.role,
        employeeType: 'Worker',
        paymentType: data.paymentType,
        perBrickRate: data.perBrickRate,
        weeklyWage: data.weeklyWage,
        rate: data.paymentType === 'PER_BRICK' ? data.perBrickRate : data.weeklyWage,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-settings'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      setNewWorkerName("");
      setNewWorkerPerBrickRate(0);
      setNewWorkerWeeklyWage(0);
      toast.success("✅ Worker added — visible in Production & Attendance");
    },
    onError: (e: any) => toast.error("❌ Failed to add worker", { description: e.message }),
  });

  const removeWorkerMutation = useMutation({
    mutationFn: ({ id, force }: { id: string, force?: boolean }) => workersApi.delete(id, force),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workers-settings'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      toast.success(variables.force ? "🗑️ Worker permanently deleted" : "✅ Worker removed");
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: settingsApi.updateSystemSettings,
    onSuccess: () => {
      toast.success("✅ Salary Rates saved");
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    }
  });

  const upsertMaterialConfigMutation = useMutation({
    mutationFn: materialConfigApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-configs'] });
      setSelectedBrickTypeForConfig("");
      setCementPer1000(0);
      setFlyAshPer1000(0);
      setPowderPer1000(0);
      toast.success("✅ Material configuration saved");
    },
    onError: (e: any) => toast.error("❌ Failed to save config", { description: e.message })
  });

  const handleSalaryRateChange = (key: string, value: string) => {
    setSalaryRates(prev => ({ ...prev, [key]: value }));
  };

  const saveSalaryRates = async () => {
    try {
      // 1. Save global system rates
      await updateSettingsMutation.mutateAsync(salaryRates);

      // 2. Save individual staff changes (Rate and Active status)
      const allChangedIds = Array.from(new Set([
        ...Object.keys(editedWorkerRates),
        ...Object.keys(editedWorkerStatus)
      ]));

      const updates = allChangedIds.map(id => {
        const updateData: any = {};
        if (editedWorkerRates[id] !== undefined) {
          const newRate = parseFloat(editedWorkerRates[id]);
          updateData.rate = newRate;
          updateData.monthlySalary = newRate;
        }
        if (editedWorkerStatus[id] !== undefined) {
          updateData.isActive = editedWorkerStatus[id];
        }
        return workersApi.update(id, updateData);
      });

      if (updates.length > 0) {
        await Promise.all(updates);
        setEditedWorkerRates({});
        setEditedWorkerStatus({});
        queryClient.invalidateQueries({ queryKey: ['workers-settings'] });
        queryClient.invalidateQueries({ queryKey: ['workers'] });
        toast.success("✅ Staff updates saved");
      }
    } catch (err: any) {
      toast.error("❌ Failed to save staff updates", { description: err.message });
    }
  };

  const renderSection = (
    title: string,
    items: any[],
    isLoading: boolean,
    onRemove: (id: string, force: boolean) => void,
    onAdd: (value: string) => void,
    newValue: string,
    setNewValue: (v: string) => void,
    placeholder: string,
    label: string,
    displayKey: string = "name",
    renderExtra?: () => JSX.Element,
    showInactive?: boolean,
    onToggleInactive?: (v: boolean) => void
  ) => (
    <EntryCard title={title}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">{title} List</p>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Show Inactive</span>
            <Switch
              checked={showInactive || false}
              onCheckedChange={onToggleInactive}
              className="scale-75"
            />
          </div>
        </div>
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
            </div>
          ) : items.length > 0 ? (
            items.filter(item => showInactive || item.isActive !== false).map((item) => (
              <div key={item.id} className={`flex items-center gap-2 p-3 bg-secondary/30 rounded-xl group transition-opacity ${item.isActive === false ? 'opacity-60 bg-red-500/5' : ''}`}>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {item[displayKey]} {item.unit ? `(${item.unit})` : ''}
                  {item.isActive === false && <span className="ml-2 text-[8px] font-bold text-red-500 uppercase">Inactive</span>}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.isActive === false && (
                    <button
                      onClick={() => triggerConfirm({
                        title: `Delete ${label} Permanently?`,
                        description: `This will permanently remove this ${label.toLowerCase()} record. This action cannot be undone.`,
                        onConfirm: () => onRemove(item.id, true)
                      })}
                      className="text-muted-foreground hover:text-destructive touch-target px-2"
                      title="Delete Permanently"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(item.id, false)}
                    className={`text-muted-foreground hover:text-destructive touch-target px-2 ${item.isActive === false ? 'hidden' : ''}`}
                    title="Deactivate"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground italic text-center py-2">No {title.toLowerCase()} configured</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {renderExtra && renderExtra()}
        <div className="flex gap-2">
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
          />
          <ActionButton
            label="Add"
            icon={Plus}
            variant="primary"
            onClick={() => onAdd(newValue)}
            disabled={!newValue.trim()}
          />
        </div>
      </div>
    </EntryCard>
  );

  return (
    <MobileFormLayout title="⚙️ Settings">
      <EntryCard title="💰 Salary Rates">
        <div className="space-y-6">
          {/* Production Worker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-2">
                1. Production Worker
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{salaryRates.production_active === "true" ? "Active" : "Inactive"}</span>
                <Switch
                  checked={salaryRates.production_active === "true"}
                  onCheckedChange={(checked) => handleSalaryRateChange('production_active', String(checked))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-primary/20">
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-medium uppercase px-1">Day Shift</p>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="number"
                    value={salaryRates.production_day_rate}
                    onChange={(e) => handleSalaryRateChange('production_day_rate', e.target.value)}
                    className="w-full h-10 pl-8 pr-3 bg-background border border-border rounded-xl text-sm font-bold focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-medium uppercase px-1">Night Shift</p>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="number"
                    value={salaryRates.production_night_rate}
                    onChange={(e) => handleSalaryRateChange('production_night_rate', e.target.value)}
                    className="w-full h-10 pl-8 pr-3 bg-background border border-border rounded-xl text-sm font-bold focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mason */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-2">
                2. Mason
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{salaryRates.mason_active === "true" ? "Active" : "Inactive"}</span>
                <Switch
                  checked={salaryRates.mason_active === "true"}
                  onCheckedChange={(checked) => handleSalaryRateChange('mason_active', String(checked))}
                />
              </div>
            </div>
            <div className="pl-2 border-l-2 border-primary/20">
              <div className="space-y-1.5 max-w-[50%]">
                <p className="text-[10px] text-muted-foreground font-medium uppercase px-1">Rate Per Brick</p>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="number"
                    value={salaryRates.mason_rate}
                    onChange={(e) => handleSalaryRateChange('mason_rate', e.target.value)}
                    className="w-full h-10 pl-8 pr-3 bg-background border border-border rounded-xl text-sm font-bold focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Driver */}
          <div className="space-y-3 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-2">
                3. Driver
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{salaryRates.driver_active === "true" ? "Active" : "Inactive"}</span>
                <Switch
                  checked={salaryRates.driver_active === "true"}
                  onCheckedChange={(checked) => handleSalaryRateChange('driver_active', String(checked))}
                />
              </div>
            </div>
            <div className="pl-2 border-l-2 border-primary/20">
              <div className="space-y-1.5 max-w-[50%]">
                <p className="text-[10px] text-muted-foreground font-medium uppercase px-1">Daily Rate</p>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="number"
                    value={salaryRates.driver_rate}
                    onChange={(e) => handleSalaryRateChange('driver_rate', e.target.value)}
                    className="w-full h-10 pl-8 pr-3 bg-background border border-border rounded-xl text-sm font-bold focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Individual Staff Members */}
          {staffList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-primary flex items-center gap-2">
                  🧑‍💼 Individual Staff Rates & Status
                </Label>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Managed Individually</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {staffList.map(s => {
                  const isActive = editedWorkerStatus[s.id] !== undefined ? editedWorkerStatus[s.id] : s.isActive;
                  const rate = editedWorkerRates[s.id] !== undefined ? editedWorkerRates[s.id] : s.monthlySalary;

                  return (
                    <div key={s.id} className={`flex items-center justify-between p-3 bg-secondary/20 rounded-xl border border-border/50 transition-opacity ${!isActive ? 'opacity-60' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground truncate">{s.name}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">{s.role} • {s.paymentType}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[8px] font-bold text-muted-foreground uppercase">Status</span>
                          <Switch
                            checked={isActive}
                            onCheckedChange={(checked) => setEditedWorkerStatus(prev => ({ ...prev, [s.id]: checked }))}
                          />
                        </div>
                        <div className="relative w-32">
                          <span className="absolute -top-4 left-1 text-[8px] font-bold text-muted-foreground uppercase">Monthly Salary</span>
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="number"
                            value={rate}
                            onChange={(e) => setEditedWorkerRates(prev => ({ ...prev, [s.id]: e.target.value }))}
                            className="w-full h-10 pl-8 pr-3 bg-background border border-border rounded-xl text-sm font-bold focus:border-primary outline-none"
                          />
                        </div>
                        {!isActive && (
                          <button
                            onClick={() => triggerConfirm({
                              title: "Delete Staff Permanently?",
                              description: `This will permanently remove staff member "${s.name}". This action cannot be undone.`,
                              onConfirm: () => removeStaffMutation.mutate({ id: s.id, force: true })
                            })}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete Permanently"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <ActionButton
            label={updateSettingsMutation.isPending ? "Saving..." : "Save Salary Rates"}
            icon={updateSettingsMutation.isPending ? Loader2 : Save}
            variant="primary"
            onClick={saveSalaryRates}
            className="w-full shadow-lg h-12"
            disabled={updateSettingsMutation.isPending}
          />
        </div>
      </EntryCard>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
      />

      {renderSection(
        "Machines",
        machines,
        isMachinesLoading,
        (id, force) => removeMachineMutation.mutate({ id, force }),
        (val) => addMachineMutation.mutate({ name: val }),
        newMachine,
        setNewMachine,
        "New machine name",
        "Machine",
        "name",
        undefined,
        showInactiveMachines,
        setShowInactiveMachines
      )}

      {renderSection(
        "Brick Types",
        brickTypes,
        isBrickTypesLoading,
        (id, force) => removeBrickTypeMutation.mutate({ id, force }),
        (val) => addBrickTypeMutation.mutate({ size: val }),
        newBrickType,
        setNewBrickType,
        "New brick type (e.g. 6 inch)",
        "Brick Type",
        "size",
        undefined,
        showInactiveBrickTypes,
        setShowInactiveBrickTypes
      )}

      {renderSection(
        "Raw Materials",
        rawMaterials,
        isRawMaterialsLoading,
        (id, force) => removeRawMaterialMutation.mutate({ id, force }),
        (val) => addRawMaterialMutation.mutate({ name: val, unit: newRawMaterialUnit }),
        newRawMaterial,
        setNewRawMaterial,
        "New material name",
        "Material",
        "name",
        () => (
          <div className="flex gap-2 mb-1">
            {['KG', 'BAG', 'LTR', 'TON', 'NOS'].map(u => (
              <button
                key={u}
                onClick={() => setNewRawMaterialUnit(u)}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-colors ${newRawMaterialUnit === u
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/50"
                  }`}
              >
                {u}
              </button>
            ))}
          </div>
        ),
        showInactiveRawMaterials,
        setShowInactiveRawMaterials
      )}

      {/* --- Material Configuration --- */}
      <EntryCard title="🧱 Material Config (per 1000 Bricks)">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {isMaterialConfigsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : materialConfigs.length > 0 ? (
              <div className="space-y-2 mb-2">
                {materialConfigs.map(config => (
                  <div key={config.id} className="p-3 bg-secondary/30 rounded-xl border border-border/50 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-primary">{config.brickType?.size}</span>
                      <button 
                         onClick={() => {
                           setSelectedBrickTypeForConfig(config.brickTypeId);
                           setCementPer1000(config.cementPer1000);
                           setFlyAshPer1000(config.flyAshPer1000);
                           setPowderPer1000(config.powderPer1000);
                         }}
                         className="text-[10px] text-primary hover:underline font-bold"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase text-muted-foreground font-bold">Cement</span>
                        <span className="text-xs font-medium">{config.cementPer1000} KG</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase text-muted-foreground font-bold">Fly Ash</span>
                        <span className="text-xs font-medium">{config.flyAshPer1000} KG</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase text-muted-foreground font-bold">Powder</span>
                        <span className="text-xs font-medium">{config.powderPer1000} KG</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-2">No configurations set</p>
            )}
          </div>

          <div className="bg-secondary/20 p-4 rounded-2xl space-y-3 border border-border/30">
            <p className="text-[10px] font-bold text-muted-foreground uppercase px-1">
              {selectedBrickTypeForConfig ? 'Update Config' : 'Add New Config'}
            </p>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase ml-1">Brick Type</Label>
              <select
                value={selectedBrickTypeForConfig}
                onChange={(e) => setSelectedBrickTypeForConfig(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm focus:border-primary outline-none transition-colors"
              >
                <option value="">Select Brick Type</option>
                {brickTypes.filter(bt => bt.isActive).map(bt => (
                  <option key={bt.id} value={bt.id}>{bt.size}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase ml-1">Cement (KG)</Label>
                <input
                  type="number"
                  placeholder="KG"
                  value={cementPer1000 || ''}
                  onChange={(e) => setCementPer1000(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase ml-1">Fly Ash (KG)</Label>
                <input
                  type="number"
                  placeholder="KG"
                  value={flyAshPer1000 || ''}
                  onChange={(e) => setFlyAshPer1000(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase ml-1">Powder (KG)</Label>
                <input
                  type="number"
                  placeholder="KG"
                  value={powderPer1000 || ''}
                  onChange={(e) => setPowderPer1000(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm focus:border-primary outline-none"
                />
              </div>
            </div>

            <ActionButton
              label={upsertMaterialConfigMutation.isPending ? "Saving..." : "Save Config"}
              icon={Save}
              variant="primary"
              onClick={() => {
                if (!selectedBrickTypeForConfig) {
                  toast.error("Please select a brick type");
                  return;
                }
                upsertMaterialConfigMutation.mutate({
                  brickTypeId: selectedBrickTypeForConfig,
                  cementPer1000,
                  flyAshPer1000,
                  powderPer1000
                });
              }}
              className="w-full h-11"
              disabled={upsertMaterialConfigMutation.isPending || !selectedBrickTypeForConfig}
            />
          </div>
        </div>
      </EntryCard>


      {/* ─── Staff & Workers ─── */}
      <div className="grid grid-cols-2 gap-4">

        {/* STAFFS */}
        <EntryCard title="🧑‍💼 Staffs">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Staff List</p>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Show Inactive</span>
                <Switch
                  checked={showInactiveStaff}
                  onCheckedChange={setShowInactiveStaff}
                  className="scale-75"
                />
              </div>
            </div>
            <div className="space-y-2">
              {isStaffWorkersLoading ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
                </div>
              ) : staffList.length > 0 ? (
                staffList.filter(s => showInactiveStaff || s.isActive).map(s => (
                  <div key={s.id} className={`flex items-center gap-2 p-2.5 bg-secondary/30 rounded-xl group transition-opacity ${!s.isActive ? 'opacity-60 bg-red-500/5' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {s.name} {!s.isActive && <span className="ml-1 text-[8px] font-bold text-red-500 uppercase">(Inactive)</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">{s.role} • {s.paymentType}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!s.isActive && (
                        <button
                          onClick={() => {
                            if (confirm(`Permanently delete staff "${s.name}"? This cannot be undone.`)) {
                              removeStaffMutation.mutate({ id: s.id, force: true });
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive px-1"
                          title="Delete Permanently"
                        >
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      )}
                      <button
                        onClick={() => removeStaffMutation.mutate({ id: s.id, force: false })}
                        className={`text-muted-foreground hover:text-destructive px-1 ${!s.isActive ? 'hidden' : ''}`}
                        title="Deactivate"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-2">No staff found</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <input
              value={newStaffName}
              onChange={e => setNewStaffName(e.target.value)}
              placeholder="Enter staff name"
              className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newStaffRole}
                onChange={e => setNewStaffRole(e.target.value)}
                className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="MANAGER">Manager</option>
                <option value="DRIVER">Driver</option>
                <option value="TELECALLER">Telecaller</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="OTHER">Other Staff</option>
              </select>
            </div>
            <p className="text-[9px] text-muted-foreground italic px-1">Payment Type: Monthly Salary (Fixed)</p>
            <button
              onClick={() => {
                if (!newStaffName.trim()) return;
                addStaffMutation.mutate({
                  name: newStaffName.trim(),
                  role: newStaffRole,
                  monthlySalary: 0 // Default to 0, managed individually
                });
              }}
              disabled={!newStaffName.trim() || addStaffMutation.isPending}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {addStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Staff
            </button>
          </div>
        </EntryCard>

        <EntryCard title="🔨 Workers">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Worker List</p>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Show Inactive</span>
                <Switch
                  checked={showInactiveWorkers}
                  onCheckedChange={setShowInactiveWorkers}
                  className="scale-75"
                />
              </div>
            </div>
            <div className="space-y-2">
              {isStaffWorkersLoading ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
                </div>
              ) : workerList.length > 0 ? (
                workerList.filter(w => showInactiveWorkers || w.isActive).map(w => (
                  <div key={w.id} className={`flex items-center gap-2 p-2.5 bg-secondary/30 rounded-xl group transition-opacity ${!w.isActive ? 'opacity-60 bg-red-500/5' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {w.name} {!w.isActive && <span className="ml-1 text-[8px] font-bold text-red-500 uppercase">(Inactive)</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">{w.role} • {w.paymentType.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!w.isActive && (
                        <button
                          onClick={() => triggerConfirm({
                            title: "Delete Worker Permanently?",
                            description: `This will permanently remove worker "${w.name}". This action cannot be undone.`,
                            onConfirm: () => removeWorkerMutation.mutate({ id: w.id, force: true })
                          })}
                          className="text-muted-foreground hover:text-destructive px-1"
                        >
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      )}
                      <button
                        onClick={() => removeWorkerMutation.mutate({ id: w.id, force: false })}
                        className={`text-muted-foreground hover:text-destructive px-1 ${!w.isActive ? 'hidden' : ''}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-2">No workers found</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <input
              value={newWorkerName}
              onChange={e => setNewWorkerName(e.target.value)}
              placeholder="Enter worker name"
              className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newWorkerRole}
                onChange={e => setNewWorkerRole(e.target.value)}
                className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="OPERATOR">Operator</option>
                <option value="HELPER">Helper</option>
                <option value="LOADER">Loader</option>
                <option value="MASON">Mason</option>
              </select>
              <select
                value={newWorkerPayment}
                onChange={e => setNewWorkerPayment(e.target.value)}
                className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="PER_BRICK">Per Brick</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>

            {/* Mason-specific rate fields */}
            {newWorkerRole === 'MASON' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={newWorkerRate6Inch || ""}
                  onChange={e => setNewWorkerRate6Inch(parseFloat(e.target.value) || 0)}
                  placeholder="6-inch Rate (₹)"
                  step="0.5"
                  className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
                />
                <input
                  type="number"
                  value={newWorkerRate8Inch || ""}
                  onChange={e => setNewWorkerRate8Inch(parseFloat(e.target.value) || 0)}
                  placeholder="8-inch Rate (₹)"
                  step="0.5"
                  className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Rate field for non-mason roles */}
            {newWorkerRole !== 'MASON' && (
              <input
                type="number"
                value={newWorkerPayment === 'PER_BRICK' ? newWorkerPerBrickRate || "" : newWorkerWeeklyWage || ""}
                onChange={e => newWorkerPayment === 'PER_BRICK'
                  ? setNewWorkerPerBrickRate(parseFloat(e.target.value) || 0)
                  : setNewWorkerWeeklyWage(parseFloat(e.target.value) || 0)
                }
                placeholder={newWorkerPayment === 'PER_BRICK' ? "Per Brick Rate (₹)" : "Weekly Wage (₹)"}
                step="0.5"
                className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              />
            )}

            <button
              onClick={() => {
                if (!newWorkerName.trim()) return;
                if (newWorkerRole === 'MASON' && (!newWorkerRate6Inch || !newWorkerRate8Inch)) {
                  toast.error("Please enter both 6-inch and 8-inch rates for Mason");
                  return;
                }
                addWorkerMutation.mutate({
                  name: newWorkerName.trim(),
                  role: newWorkerRole,
                  paymentType: newWorkerPayment,
                  perBrickRate: newWorkerRole !== 'MASON' && newWorkerPayment === 'PER_BRICK' ? newWorkerPerBrickRate : 0,
                  weeklyWage: newWorkerRole !== 'MASON' && newWorkerPayment === 'WEEKLY' ? newWorkerWeeklyWage : 0,
                  rate6Inch: newWorkerRole === 'MASON' ? newWorkerRate6Inch : 0,
                  rate8Inch: newWorkerRole === 'MASON' ? newWorkerRate8Inch : 0,
                } as any);
                setNewWorkerName("");
                setNewWorkerRate6Inch(0);
                setNewWorkerRate8Inch(0);
                setNewWorkerPerBrickRate(0);
                setNewWorkerWeeklyWage(0);
              }}
              disabled={!newWorkerName.trim() || addWorkerMutation.isPending}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {addWorkerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Worker
            </button>
          </div>
        </EntryCard>

      </div>
    </MobileFormLayout>
  );
};

export default SettingsPage;
