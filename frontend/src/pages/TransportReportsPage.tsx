import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Download, 
  Filter, 
  Calendar, 
  Truck, 
  IndianRupee, 
  FileText,
  Loader2,
  ChevronDown
} from "lucide-react";
import { transportApi } from "@/api/transport.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const TransportReportsPage = () => {
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [vehicleId, setVehicleId] = useState("all");
  const [transportType, setTransportType] = useState("all");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["transport-entries-report", startDate, endDate, vehicleId, transportType],
    queryFn: () => transportApi.getEntries({ 
      startDate, 
      endDate, 
      vehicleId: vehicleId === "all" ? undefined : vehicleId,
      transportType: transportType === "all" ? undefined : transportType
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ["transport-summary-report", startDate, endDate],
    queryFn: () => transportApi.getSummary({ startDate, endDate }),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["transport-vehicles"],
    queryFn: () => transportApi.getVehicles(),
  });

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Transport Reports
          </h1>
          <p className="text-muted-foreground mt-1">Analytics and financial performance tracking</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl gap-2 font-bold text-xs uppercase tracking-tight h-11 border-primary/20">
            <FileText className="h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" className="rounded-xl gap-2 font-bold text-xs uppercase tracking-tight h-11 border-primary/20">
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Report Filters */}
      <Card className="rounded-2xl border-primary/10 shadow-xl bg-background/50 backdrop-blur-sm">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Date</label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 rounded-xl bg-background border-primary/10"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">End Date</label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 rounded-xl bg-background border-primary/10"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vehicle</label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="h-10 rounded-xl bg-background border-primary/10">
                <SelectValue placeholder="All Vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>{v.vehicleNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type</label>
            <Select value={transportType} onValueChange={setTransportType}>
              <SelectTrigger className="h-10 rounded-xl bg-background border-primary/10">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="RD_VEHICLE">RD Vehicle</SelectItem>
                <SelectItem value="VENDOR_VEHICLE">Vendor Vehicle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Loads</span>
            <Truck className="h-4 w-4 text-primary opacity-40" />
          </div>
          <div className="text-3xl font-black">{summary?.totalLoads || 0}</div>
        </div>
        <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Total Expense</span>
            <IndianRupee className="h-4 w-4 text-rose-500 opacity-40" />
          </div>
          <div className="text-3xl font-black text-rose-600">₹ {(summary?.totalExpense || 0).toLocaleString()}</div>
        </div>
        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Total Income</span>
            <IndianRupee className="h-4 w-4 text-emerald-500 opacity-40" />
          </div>
          <div className="text-3xl font-black text-emerald-600">₹ {(summary?.totalIncome || 0).toLocaleString()}</div>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Cost</span>
            <BarChart3 className="h-4 w-4 text-slate-400 opacity-40" />
          </div>
          <div className="text-3xl font-black text-white">₹ {(summary?.netCost || 0).toLocaleString()}</div>
        </div>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-xl overflow-hidden bg-background/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/50">
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Vehicle</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Loads</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Expense</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-10" />
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                    No entries found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((item: any) => (
                  <TableRow key={item.id} className="border-border/50 hover:bg-muted/20 transition-colors">
                    <TableCell className="font-bold">{format(new Date(item.date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-bold text-primary">{item.vehicle.vehicleNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-md text-[10px] font-black">
                        {item.transportType === "RD_VEHICLE" ? "RD" : "VENDOR"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold">{item.loads}</TableCell>
                    <TableCell className="text-right text-rose-500 font-bold">
                      {item.expenseAmount > 0 ? `₹ ${item.expenseAmount.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell className="text-right text-emerald-500 font-bold">
                      {item.incomeAmount > 0 ? `₹ ${item.incomeAmount.toLocaleString()}` : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransportReportsPage;
