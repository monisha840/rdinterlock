import { useState } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import {
  LayoutDashboard, BookOpen, BookText, BarChart3, Users, CreditCard,
  Truck, CalendarCheck, Settings, Hammer, MapPin,
  ChevronDown, ChevronRight,
  ClipboardList, HelpCircle, ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureDetail {
  title: string;
  whatItDoes: string[];
  howToUse: string[];
  outputSeenAt: string[];
  recordStoredIn: string;
  navPath: string;
  routePath: string;
}

interface Section {
  id: string;
  title: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  features: FeatureDetail[];
}

const sections: Section[] = [
  {
    id: "dashboard",
    title: "Dashboard (Home)",
    icon: LayoutDashboard,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    features: [
      {
        title: "Dashboard Overview",
        whatItDoes: [
          "Shows today's production count",
          "Shows ready stock available",
          "Shows today's dispatch count and cash balance",
          "Shows today's expenses and pending payments",
          "Shows upcoming dispatch alerts (next 3 days)",
          "Shows production chart for last 7 days",
          "Shows smart alerts and reminders",
        ],
        howToUse: [
          "Open the app — Dashboard is the first page",
          "All numbers update automatically as you enter data in other sections",
          "Tap any card to go to that section directly",
        ],
        outputSeenAt: ["Dashboard page — all cards and charts update live"],
        recordStoredIn: "Data comes from Production, Dispatch, Cash Book, Client orders",
        navPath: "Bottom nav → Home",
        routePath: "/",
      },
    ],
  },
  {
    id: "daily-entry",
    title: "Daily Entry (Production)",
    icon: BookOpen,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    features: [
      {
        title: "Record Daily Production",
        whatItDoes: [
          "Record brick production per machine and shift",
          "Track damaged bricks",
          "Assign workers to production",
          "Auto-calculate available bricks (total minus damaged)",
          "Auto-calculate material consumption (Cement, Fly Ash, Powder)",
        ],
        howToUse: [
          "Select date (defaults to today)",
          "Choose Machine (Machine 1, Machine 2, etc.)",
          "Choose Shift — Morning or Night",
          "Choose Brick Size (6 inch, 8 inch, etc.)",
          "Enter quantity produced",
          "Enter damaged bricks (if any)",
          "Select workers who worked on this production",
          "Click 'Save Production'",
        ],
        outputSeenAt: [
          "Today's Summary — just below the form",
          "Labour Summary — shows each worker's bricks, rate, earned amount",
          "Dashboard — Today Production card updates",
          "Reports → Stocks tab — stock numbers update",
          "Reports → Worker Wages tab — worker wages calculated from this data",
          "Mason Ledger — if mason was assigned",
        ],
        recordStoredIn: "Production database → linked to workers, machine, brick type",
        navPath: "Bottom nav → Entry",
        routePath: "/daily-entry",
      },
      {
        title: "Edit / Delete Production Entries",
        whatItDoes: [
          "Delete demo entries or wrong entries",
          "Edit worker bricks count in Labour Summary",
        ],
        howToUse: [
          "Scroll to Today's Summary or Labour Summary section",
          "Use pencil icon to edit, trash icon to delete",
        ],
        outputSeenAt: ["Today's Summary and Labour Summary update instantly"],
        recordStoredIn: "Production database",
        navPath: "Bottom nav → Entry → scroll down",
        routePath: "/daily-entry",
      },
    ],
  },
  {
    id: "cash-book",
    title: "Cash Book",
    icon: BookText,
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
    features: [
      {
        title: "Record Money IN / OUT",
        whatItDoes: [
          "Record all money coming IN — Client Payment, Advance Return, Other Income",
          "Record all money going OUT — Fuel, Material, Labour, Transport, Worker Advance, Staff Salary, etc.",
          "Track payment mode — Cash, UPI, Bank Transfer, Cheque",
          "Auto-sync: Client Payment here → appears in Client Ledger automatically",
          "Auto-sync: Worker Advance here → appears in Advance Ledger automatically",
        ],
        howToUse: [
          "Select Money IN or Money OUT",
          "Choose category from dropdown",
          "If 'Client Payment' → select client name",
          "If 'Worker Advance' → select worker name",
          "Enter amount and notes",
          "Choose payment mode",
          "Click 'Save Entry'",
        ],
        outputSeenAt: [
          "Transaction History — below the form",
          "KPI cards — Current Balance, Today Money IN/OUT, Monthly Expenses",
          "Dashboard — Cash Balance and Expenses cards update",
          "Client Ledger — if client payment was recorded",
          "Advance Ledger — if worker advance was recorded",
        ],
        recordStoredIn: "Cash entries database. If client payment → also in Client Ledger. If worker advance → also in Advance Ledger.",
        navPath: "Bottom nav → Cash",
        routePath: "/cash-book",
      },
      {
        title: "Export & Import",
        whatItDoes: [
          "Export all transactions to PDF",
          "Export all transactions to Excel",
          "Import transactions from Excel file",
        ],
        howToUse: [
          "In Transaction History section, use PDF / Excel / Import buttons",
          "Filter by date first, then export only what you need",
        ],
        outputSeenAt: ["Downloaded PDF/Excel file on your phone/laptop"],
        recordStoredIn: "Cash entries database",
        navPath: "Bottom nav → Cash → Transaction History",
        routePath: "/cash-book",
      },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    icon: BarChart3,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    features: [
      {
        title: "Staff Salaries",
        whatItDoes: [
          "Calculate monthly salary for Manager, Driver, Telecaller",
          "Shows: Days worked, daily rate, gross salary, advances deducted, paid, pending",
          "Pay salary directly from here",
          "Pay advance directly from here",
          "Save & Generate monthly settlements",
          "Export salary report to PDF / Excel",
        ],
        howToUse: [
          "Go to Reports → Staff Salaries tab",
          "Select month using date filter at top",
          "Click 'Recalculate' to get latest numbers",
          "Click 'Pay Salary' on any staff to record payment",
          "Click 'Pay Advance' to give advance",
          "Click 'Save & Generate Settlements' to finalize",
          "Use Export PDF / Excel buttons at bottom",
        ],
        outputSeenAt: [
          "Staff salary cards with all details",
          "Cash Book — salary payment appears there",
          "Advance Ledger — advance appears there",
        ],
        recordStoredIn: "Settlements database, Cash entries, Worker advance records",
        navPath: "Bottom nav → Reports → Staff Salaries tab",
        routePath: "/reports",
      },
      {
        title: "Worker Wages",
        whatItDoes: [
          "Calculate weekly wages for Operators, Masons, Helpers, Loaders",
          "Based on brick output from Daily Entry",
          "Rates: Operator Day Rs.2.50/brick, Night Rs.3/brick, Mason Rs.9/brick",
          "Shows: Day bricks, Night bricks, Total, Gross wage, Advances, Paid, Pending",
        ],
        howToUse: [
          "Go to Reports → Worker Wages tab",
          "Select date range using filter",
          "Click 'Recalculate' for latest data",
          "Click 'Pay Wage' to record wage payment",
          "Click 'Pay Advance' to give advance",
          "Export to PDF / Excel",
        ],
        outputSeenAt: [
          "Worker wage cards with breakdown",
          "Cash Book — wage payment appears there",
        ],
        recordStoredIn: "Calculated from Production data + Worker rates",
        navPath: "Bottom nav → Reports → Worker Wages tab",
        routePath: "/reports",
      },
      {
        title: "Advance Ledger",
        whatItDoes: [
          "Shows advance balance for every worker and staff",
          "Filter by role — Operator, Mason, Helper, Loader, Driver, Manager",
          "Shows each advance transaction with date and payment mode",
        ],
        howToUse: [
          "Go to Reports → Advance Ledger tab",
          "Use role filter pills at top to filter",
          "Click 'Pay Advance' on any worker to give new advance",
          "Export to PDF / Excel",
        ],
        outputSeenAt: [
          "Advance cards per worker with balance and history",
          "Worker Wages tab — advance deducted from wages",
          "Staff Salaries tab — advance deducted from salary",
        ],
        recordStoredIn: "Worker advance records database",
        navPath: "Bottom nav → Reports → Advance Ledger tab",
        routePath: "/reports",
      },
      {
        title: "Stocks (Inventory)",
        whatItDoes: [
          "View live inventory — Total Produced, Total Dispatched, Ready Stock",
          "Stock by brick size (6 inch, 8 inch separately)",
          "Material availability — Cement, Fly Ash, Powder levels",
          "Production capacity — how many bricks possible with current materials",
        ],
        howToUse: [
          "Go to Reports → Stocks tab",
          "All data is auto-calculated from production and dispatch records",
          "Click refresh button to get latest numbers",
        ],
        outputSeenAt: [
          "Inventory cards and stock-by-size grid",
          "Dashboard — Ready Stock card",
          "Client Management — stock check when dispatching",
        ],
        recordStoredIn: "Calculated from Production, Dispatch, and Brick Return records",
        navPath: "Bottom nav → Reports → Stocks tab",
        routePath: "/reports",
      },
      {
        title: "Logs (Activity Timeline)",
        whatItDoes: [
          "View complete activity history for any person",
          "Shows: Attendance, Production, Payments, Transport, Sales, Expenses",
          "Filter by activity type and date range",
        ],
        howToUse: [
          "Go to Reports → Logs tab",
          "Select a staff or worker from dropdown",
          "Use filter pills to show specific activity types",
          "Set date range using global filter at top",
        ],
        outputSeenAt: ["Timeline view with all activities grouped by date"],
        recordStoredIn: "Aggregated from all database tables",
        navPath: "Bottom nav → Reports → Logs tab",
        routePath: "/reports",
      },
    ],
  },
  {
    id: "clients",
    title: "Client Management",
    icon: Users,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
    features: [
      {
        title: "Add Client & Create Orders",
        whatItDoes: [
          "Add new clients with Name, Phone, Location",
          "Create orders: Brick Type, Construction Type (Room/Compound/Godown), Quantity, Rate",
          "Add extra items to order bill — Cement, Loading charges, etc.",
          "Track order status: PENDING → IN PRODUCTION → READY → DISPATCHED",
        ],
        howToUse: [
          "Click 'Add Client' → enter name and location → Save",
          "Click '+' on any client to add order",
          "Fill brick type, construction type, quantity, rate",
          "Add extras in 'Bill Extras' section (e.g. Cement Rs.1800)",
          "Total auto-calculates including extras",
          "Click 'Confirm Order'",
        ],
        outputSeenAt: [
          "Client card shows all orders with status",
          "Financial summary per client — Orders, Bricks, Total, Pending",
          "Dashboard — Upcoming Dispatch shows orders due in 3 days",
        ],
        recordStoredIn: "Client database + Orders database",
        navPath: "More → Client Lounge → Client Management",
        routePath: "/client-management",
      },
      {
        title: "Dispatch Order (with Driver & Vehicle)",
        whatItDoes: [
          "Change order status to DISPATCHED",
          "Assign Driver and Vehicle",
          "Set dispatch date and delivery location",
          "Auto stock check — warns if insufficient stock",
          "Record advance received and payment status",
        ],
        howToUse: [
          "Click edit on any order",
          "Change status to 'DISPATCHED'",
          "New section appears — fill Driver, Vehicle, Location, Advance",
          "Click 'Save Changes'",
        ],
        outputSeenAt: [
          "Client History — dispatched order appears there",
          "Dashboard — dispatch count updates",
          "Stocks — stock decreases after dispatch",
        ],
        recordStoredIn: "Orders database + Dispatch database",
        navPath: "More → Client Management → Edit Order → set DISPATCHED",
        routePath: "/client-management",
      },
    ],
  },
  {
    id: "client-ledger",
    title: "Client Ledger",
    icon: CreditCard,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
    features: [
      {
        title: "Payments, Advances & Returns",
        whatItDoes: [
          "Record client payments received",
          "Record advance payments from clients",
          "Record brick returns from clients",
          "View delivery ledger per client",
          "Shows: Total Received, Total Advance, Pending per client",
        ],
        howToUse: [
          "Click 'Add Payment' → search client → enter amount → Save",
          "Click 'Add Advance' → search client → enter amount → Save",
          "Click 'Add Brick Return' → search client → select brick type → enter quantity → Save",
          "Click 'Delivery Ledger' under any client to see delivery-wise breakdown",
        ],
        outputSeenAt: [
          "Client card — Payment, Advance, Pending amounts update",
          "Delivery Ledger dropdown — Date, Brick Type, Qty, Amount, Received, Pending",
          "Client Management — pending amounts reflect there too",
          "Stocks — increases when brick return is recorded",
        ],
        recordStoredIn: "Client payments database + Brick returns database",
        navPath: "More → Client Lounge → Client Ledger",
        routePath: "/client-ledger",
      },
    ],
  },
  {
    id: "client-history",
    title: "Client History",
    icon: MapPin,
    iconColor: "text-cyan-600",
    iconBg: "bg-cyan-50",
    features: [
      {
        title: "Dispatched & Completed Deliveries",
        whatItDoes: [
          "View all dispatched and completed orders grouped by client",
          "Shows: Driver, Vehicle, Location, Brick Type, Quantity, Payment info",
          "Export complete history to PDF and Excel",
          "Filter by status — All, Dispatched, Fully Paid",
        ],
        howToUse: [
          "Click any client row to expand full details",
          "Use search bar to find specific client",
          "Click 'Export PDF' or 'Export Excel' at the top",
        ],
        outputSeenAt: ["Expandable table with Transport, Order, and Payment details per client"],
        recordStoredIn: "Dispatch database + Orders database + Payments database",
        navPath: "More → Client Lounge → Client History",
        routePath: "/client-history",
      },
    ],
  },
  {
    id: "attendance",
    title: "Attendance",
    icon: CalendarCheck,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50",
    features: [
      {
        title: "Daily Attendance Marking",
        whatItDoes: [
          "Mark Present/Absent for Monthly Staff (Manager, Driver, Telecaller)",
          "Mark Present/Absent for Weekly Workers (Operators, Masons)",
          "View attendance history per person",
          "Add notes — leave reason, machine breakdown, etc.",
        ],
        howToUse: [
          "Select date (defaults to today)",
          "Tick P (Present) or A (Absent) for each person",
          "Add notes if needed",
          "Click 'Save Attendance'",
          "To view history: select person from dropdown at top",
        ],
        outputSeenAt: [
          "Attendance history table per person",
          "Reports → Staff Salaries — salary calculated from attendance days",
          "Reports → Logs — attendance shows in activity timeline",
        ],
        recordStoredIn: "Attendance database → linked to workers",
        navPath: "More → General → Attendance",
        routePath: "/attendance",
      },
    ],
  },
  {
    id: "transport",
    title: "Transport Management",
    icon: Truck,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    features: [
      {
        title: "Transport Entry (Vehicle Trips)",
        whatItDoes: [
          "Record RD Vehicle trips — track diesel cost and other expenses",
          "Record Vendor Vehicle trips — track rental income",
          "Track: loads count, material, brick type, quantity, location",
          "Auto-sync to Cash Book (optional)",
        ],
        howToUse: [
          "Click 'New Transport Entry'",
          "Choose RD Vehicle or Vendor Vehicle",
          "Select vehicle, enter driver/vendor, loads, costs",
          "Add material, brick type, quantity, location info",
          "Check 'Sync to Cash Book' if you want auto cash entry",
          "Click 'Confirm Entry'",
        ],
        outputSeenAt: [
          "Transport Activity Log table",
          "Summary cards — Loads, Expense, Income, Net Cost",
          "Cash Book — if sync was enabled",
          "Transport Reports — analytics with date filters",
          "Tipper Ledger — tipper data appears there",
        ],
        recordStoredIn: "Transport entries database. Cash Book if synced.",
        navPath: "More → Transport → Transport Entry",
        routePath: "/transport",
      },
      {
        title: "Fleets & EMI",
        whatItDoes: [
          "Manage all vehicles — Company and Vendor type",
          "Schedule EMI payments with due dates",
          "Record EMI payments with auto Cash Book sync",
          "Track overdue EMIs",
        ],
        howToUse: [
          "Add Vehicle: click 'Add Vehicle' → fill details → Save",
          "Schedule EMI: click 'Schedule EMI' → select vehicle, amount, due date → Save",
          "Pay EMI: click 'Pay EMI Now' on pending EMI → fill payment details → Confirm",
        ],
        outputSeenAt: [
          "Fleet Management tab — all vehicles",
          "EMI Tracking tab — pending, paid, overdue EMIs",
          "Cash Book — EMI payment appears if synced",
          "Dashboard — reminders for upcoming EMIs",
        ],
        recordStoredIn: "Vehicle database + EMI database. Cash Book if synced.",
        navPath: "More → Transport → Vehicles",
        routePath: "/transport/vehicles",
      },
    ],
  },
  {
    id: "mason-ledger",
    title: "Mason Ledger",
    icon: Hammer,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    features: [
      {
        title: "Mason Work Tracking",
        whatItDoes: [
          "Auto-tracks mason work from production entries",
          "Shows: Mason Name, Machine/Site, Brick Type, Bricks Count, Rate, Total Amount",
          "Shows material consumption — Powder, Cement, Fly Ash",
          "Shows advance balance per mason",
        ],
        howToUse: [
          "Data appears automatically when you assign Mason workers in Daily Entry",
          "Use date range filters to view specific period",
          "Search by mason name, site, or brick type",
        ],
        outputSeenAt: ["Mason work cards with brick count, rate, and earnings"],
        recordStoredIn: "Calculated from Production records where worker role = Mason",
        navPath: "More → Ledgers → Mason Ledger",
        routePath: "/mason-ledger",
      },
    ],
  },
  {
    id: "tipper-ledger",
    title: "Tipper Ledger",
    icon: ClipboardList,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    features: [
      {
        title: "Tipper Load Tracking",
        whatItDoes: [
          "Track tipper vehicle loads and deliveries",
          "Shows: Company/Vendor, Vehicle, Loads, Brick Type, Quantity, Location, Rate, Amount",
        ],
        howToUse: [
          "Data appears automatically from Transport Entry",
          "Use date range filters and search to find specific entries",
        ],
        outputSeenAt: ["Tipper entry cards with load details and financials"],
        recordStoredIn: "Transport entries database (tipper-related entries)",
        navPath: "More → Transport → Tipper Ledger",
        routePath: "/tipper-ledger",
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    iconColor: "text-gray-600",
    iconBg: "bg-gray-100",
    features: [
      {
        title: "App Configuration",
        whatItDoes: [
          "Machines — Add/remove production machines",
          "Brick Types — Add/remove brick sizes (6 inch, 8 inch, etc.)",
          "Raw Materials — Manage cement, fly ash, powder stock",
          "Material Config — Set material consumption per 1000 bricks",
          "Staff Management — Add/edit workers with roles, rates, payment type",
          "Configure Driver daily rate and Mason per-brick rates",
        ],
        howToUse: [
          "Go to Settings and find the section you need",
          "Click + button to add new items",
          "Click edit/toggle to modify existing items",
        ],
        outputSeenAt: [
          "Daily Entry — machines and brick types appear in dropdowns",
          "Reports — rates used for salary and wage calculations",
          "All sections — workers appear in selection dropdowns",
        ],
        recordStoredIn: "Settings database — machines, brick types, workers, materials",
        navPath: "More → General → Settings",
        routePath: "/settings",
      },
    ],
  },
];

const quickRefData = [
  { action: "Daily production", enterAt: "Entry page", seenAt: "Dashboard, Summary, Stocks, Wages" },
  { action: "Client payment", enterAt: "Cash Book or Client Ledger", seenAt: "Cash Book, Client Ledger, Client Mgmt" },
  { action: "Worker advance", enterAt: "Cash Book or Advance Ledger", seenAt: "Cash Book, Advance Ledger, Wages" },
  { action: "Staff salary", enterAt: "Reports → Staff Salaries", seenAt: "Reports, Cash Book" },
  { action: "New order", enterAt: "Client Management", seenAt: "Client Mgmt, History, Dashboard" },
  { action: "Dispatch", enterAt: "Client Mgmt → Edit → DISPATCHED", seenAt: "Client History, Dashboard, Stocks" },
  { action: "Transport trip", enterAt: "Transport Entry", seenAt: "Transport Log, Reports, Tipper Ledger" },
  { action: "EMI payment", enterAt: "Fleets & EMI → Pay EMI", seenAt: "EMI Tracking, Cash Book" },
  { action: "Attendance", enterAt: "Attendance page", seenAt: "Staff Salaries, Logs" },
  { action: "Expense", enterAt: "Cash Book (Money OUT)", seenAt: "Cash Book, Reports, Dashboard" },
  { action: "Brick return", enterAt: "Client Ledger → Add Return", seenAt: "Client Ledger, Stocks" },
];

const HelpGuidePage = () => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [showQuickRef, setShowQuickRef] = useState(false);

  const toggleSection = (id: string) => {
    setExpandedSection(prev => prev === id ? null : id);
    setExpandedFeature(null);
  };

  const toggleFeature = (id: string) => {
    setExpandedFeature(prev => prev === id ? null : id);
  };

  return (
    <MobileFormLayout title="App Guide" subtitle="Complete feature guide — tap any section to learn more">

      {/* Quick Reference Toggle */}
      <button
        onClick={() => setShowQuickRef(!showQuickRef)}
        className="w-full p-3.5 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between mb-4 active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <HelpCircle className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Quick Reference Table</p>
            <p className="text-[10px] text-muted-foreground">Where to enter → Where output is seen</p>
          </div>
        </div>
        {showQuickRef ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {showQuickRef && (
        <div className="mb-5 bg-card border border-border/50 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-primary/5 px-3 py-2 border-b border-border/50">
            <div className="grid grid-cols-3 gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-wider">
              <span>Action</span>
              <span>Where to Enter</span>
              <span>Output Seen At</span>
            </div>
          </div>
          <div className="divide-y divide-border/30">
            {quickRefData.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 px-3 py-2.5 text-[11px]">
                <span className="font-bold text-foreground">{row.action}</span>
                <span className="text-muted-foreground">{row.enterAt}</span>
                <span className="text-primary font-medium">{row.seenAt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-2 pb-8">
        {sections.map((section) => {
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden transition-all">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-3.5 flex items-center gap-3 active:bg-secondary/30 transition-colors"
              >
                <div className={`h-10 w-10 rounded-xl ${section.iconBg} flex items-center justify-center shrink-0`}>
                  <section.icon className={`h-5 w-5 ${section.iconColor}`} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-foreground">{section.title}</p>
                  <p className="text-[10px] text-muted-foreground">{section.features.length} feature{section.features.length > 1 ? "s" : ""}</p>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-primary shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {/* Expanded Features */}
              {isExpanded && (
                <div className="border-t border-border/50 bg-secondary/5 animate-in fade-in slide-in-from-top-2 duration-200">
                  {section.features.map((feature, fi) => {
                    const featureId = section.id + "-" + fi;
                    const isFeatureExpanded = expandedFeature === featureId;

                    return (
                      <div key={fi} className="border-b border-border/30 last:border-0">
                        {/* Feature title */}
                        <button
                          onClick={() => toggleFeature(featureId)}
                          className="w-full px-4 py-3 flex items-center justify-between active:bg-secondary/30 transition-colors"
                        >
                          <p className="text-[13px] font-semibold text-foreground text-left">{feature.title}</p>
                          {isFeatureExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        </button>

                        {/* Feature details */}
                        {isFeatureExpanded && (
                          <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-200">
                            {/* What it does */}
                            <div>
                              <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-1.5">What it does</p>
                              <ul className="space-y-1">
                                {feature.whatItDoes.map((item, j) => (
                                  <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                    <span className="text-primary mt-1 shrink-0">-</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* How to use */}
                            <div>
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1.5">How to use</p>
                              <ol className="space-y-1">
                                {feature.howToUse.map((step, j) => (
                                  <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold shrink-0 w-4 text-right">{j + 1}.</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Output seen at */}
                            <div>
                              <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1.5">Where output is seen</p>
                              <ul className="space-y-1">
                                {feature.outputSeenAt.map((item, j) => (
                                  <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                    <span className="text-amber-600 mt-0.5 shrink-0">&#x2794;</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Record stored */}
                            <div className="p-2.5 bg-secondary/30 rounded-xl">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Record stored in</p>
                              <p className="text-[11px] text-foreground font-medium">{feature.recordStoredIn}</p>
                            </div>

                            {/* Navigate button */}
                            <button
                              onClick={() => navigate(feature.routePath)}
                              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 active:scale-[0.98] transition-all"
                            >
                              Go to {feature.title.split("(")[0].trim()} <ArrowRight className="h-3.5 w-3.5" />
                            </button>

                            {/* Nav path */}
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                              <p className="text-[10px] text-muted-foreground italic">{feature.navPath}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MobileFormLayout>
  );
};

export default HelpGuidePage;
