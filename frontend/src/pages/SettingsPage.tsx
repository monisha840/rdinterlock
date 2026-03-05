import { useState, useEffect } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { toast } from "sonner";
import { Plus, X, Save, Loader2, IndianRupee } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings.api";
import { workersApi } from "@/api/workers.api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [expenseCategories, setExpenseCategories] = useState(["Fuel", "Food", "Material", "Other"]);

  const [newMachine, setNewMachine] = useState("");
  const [newBrickType, setNewBrickType] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newRawMaterial, setNewRawMaterial] = useState("");
  const [newRawMaterialUnit, setNewRawMaterialUnit] = useState("KG");

  // Staff & Worker input state
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("DRIVER");
  const [newStaffPayment, setNewStaffPayment] = useState("MONTHLY");
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerRole, setNewWorkerRole] = useState("OPERATOR");
  const [newWorkerPayment, setNewWorkerPayment] = useState("PER_BRICK");

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

  // Staff = MONTHLY payment workers (MANAGER, DRIVER, TELECALLER)
  const { data: allWorkersForSettings = [], isLoading: isStaffWorkersLoading } = useQuery({
    queryKey: ['workers-settings'],
    queryFn: () => workersApi.getAll(false), // activeOnly=false so we see all
  });
  const staffList = allWorkersForSettings.filter(w =>
    ['MANAGER', 'DRIVER', 'TELECALLER'].includes(w.role) && w.isActive
  );
  const workerList = allWorkersForSettings.filter(w =>
    !['MANAGER', 'DRIVER', 'TELECALLER'].includes(w.role) && w.isActive
  );

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
    mutationFn: settingsApi.deleteMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      toast.success("✅ Machine removed");
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
    mutationFn: settingsApi.deleteBrickType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brick-types'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      toast.success("✅ Brick type removed");
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
    mutationFn: settingsApi.deleteRawMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials-settings'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      toast.success("✅ Material removed");
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
    mutationFn: (data: { name: string; role: string; paymentType: string }) =>
      workersApi.create({
        name: data.name,
        role: data.role,
        paymentType: data.paymentType as any,
        rate: getDefaultRate(data.role, data.paymentType),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-settings'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      setNewStaffName("");
      toast.success("✅ Staff added — now visible in Attendance & Reports");
    },
    onError: (e: any) => toast.error("❌ Failed to add staff", { description: e.message }),
  });

  const removeStaffMutation = useMutation({
    mutationFn: (id: string) => workersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-settings'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      toast.success("✅ Staff removed");
    },
  });

  const addWorkerMutation = useMutation({
    mutationFn: (data: { name: string; role: string; paymentType: string }) =>
      workersApi.create({
        name: data.name,
        role: data.role,
        paymentType: data.paymentType as any,
        rate: getDefaultRate(data.role, data.paymentType),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-settings'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      setNewWorkerName("");
      toast.success("✅ Worker added — now visible in Attendance & Production");
    },
    onError: (e: any) => toast.error("❌ Failed to add worker", { description: e.message }),
  });

  const removeWorkerMutation = useMutation({
    mutationFn: (id: string) => workersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-settings'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['form-metadata'] });
      toast.success("✅ Worker removed");
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: settingsApi.updateSystemSettings,
    onSuccess: () => {
      toast.success("✅ Salary Rates saved");
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    }
  });

  const handleSalaryRateChange = (key: string, value: string) => {
    setSalaryRates(prev => ({ ...prev, [key]: value }));
  };

  const saveSalaryRates = () => {
    updateSettingsMutation.mutate(salaryRates);
  };

  const renderSection = (
    title: string,
    items: any[],
    isLoading: boolean,
    onRemove: (id: string) => void,
    onAdd: (value: string) => void,
    newValue: string,
    setNewValue: (v: string) => void,
    placeholder: string,
    label: string,
    displayKey: string = "name",
    renderExtra?: () => JSX.Element
  ) => (
    <EntryCard title={title}>
      <div className="space-y-2 mb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
          </div>
        ) : items.length > 0 ? (
          items.filter(item => item.isActive !== false).map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-3 bg-secondary/30 rounded-xl group">
              <span className="flex-1 text-sm font-medium text-foreground">
                {item[displayKey]} {item.unit ? `(${item.unit})` : ''}
              </span>
              <button
                onClick={() => onRemove(item.id)}
                className="text-muted-foreground hover:text-destructive touch-target px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground italic text-center py-2">No {title.toLowerCase()} configured</p>
        )}
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
          <div className="space-y-3">
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

      {renderSection(
        "Machines",
        machines,
        isMachinesLoading,
        (id) => removeMachineMutation.mutate(id),
        (val) => addMachineMutation.mutate({ name: val }),
        newMachine,
        setNewMachine,
        "New machine name",
        "Machine"
      )}

      {renderSection(
        "Brick Types",
        brickTypes,
        isBrickTypesLoading,
        (id) => removeBrickTypeMutation.mutate(id),
        (val) => addBrickTypeMutation.mutate({ size: val }),
        newBrickType,
        setNewBrickType,
        "New brick type (e.g. 6 inch)",
        "Brick Type",
        "size"
      )}

      {renderSection(
        "Raw Materials",
        rawMaterials,
        isRawMaterialsLoading,
        (id) => removeRawMaterialMutation.mutate(id),
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
        )
      )}


      {/* ─── Staff & Workers ─── */}
      <div className="grid grid-cols-2 gap-4">

        {/* STAFFS */}
        <EntryCard title="🧑‍💼 Staffs">
          <div className="space-y-2 mb-4">
            {isStaffWorkersLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
              </div>
            ) : staffList.length > 0 ? (
              staffList.map(s => (
                <div key={s.id} className="flex items-center gap-2 p-2.5 bg-secondary/30 rounded-xl group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">{s.role} • {s.paymentType}</p>
                  </div>
                  <button
                    onClick={() => removeStaffMutation.mutate(s.id)}
                    className="text-muted-foreground hover:text-destructive px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-2">No staff found</p>
            )}
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
                className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="DRIVER">Driver</option>
                <option value="MANAGER">Manager</option>
                <option value="TELECALLER">Telecaller</option>
                <option value="OPERATOR">Operator</option>
                <option value="HELPER">Helper</option>
                <option value="LOADER">Loader</option>
                <option value="MASON">Mason</option>
              </select>
              <select
                value={newStaffPayment}
                onChange={e => setNewStaffPayment(e.target.value)}
                className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="DAILY">Daily</option>
                <option value="PER_BRICK">Per Brick</option>
              </select>
            </div>
            <button
              onClick={() => {
                if (!newStaffName.trim()) return;
                addStaffMutation.mutate({ name: newStaffName.trim(), role: newStaffRole, paymentType: newStaffPayment });
              }}
              disabled={!newStaffName.trim() || addStaffMutation.isPending}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {addStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Staff
            </button>
          </div>
        </EntryCard>

        {/* WORKERS */}
        <EntryCard title="🔨 Workers">
          <div className="space-y-2 mb-4">
            {isStaffWorkersLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
              </div>
            ) : workerList.length > 0 ? (
              workerList.map(w => (
                <div key={w.id} className="flex items-center gap-2 p-2.5 bg-secondary/30 rounded-xl group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{w.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">{w.role} • {w.paymentType}</p>
                  </div>
                  <button
                    onClick={() => removeWorkerMutation.mutate(w.id)}
                    className="text-muted-foreground hover:text-destructive px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-2">No workers found</p>
            )}
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
                <option value="DRIVER">Driver</option>
                <option value="MANAGER">Manager</option>
                <option value="TELECALLER">Telecaller</option>
              </select>
              <select
                value={newWorkerPayment}
                onChange={e => setNewWorkerPayment(e.target.value)}
                className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="PER_BRICK">Per Brick</option>
                <option value="DAILY">Daily</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <button
              onClick={() => {
                if (!newWorkerName.trim()) return;
                addWorkerMutation.mutate({ name: newWorkerName.trim(), role: newWorkerRole, paymentType: newWorkerPayment });
              }}
              disabled={!newWorkerName.trim() || addWorkerMutation.isPending}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
