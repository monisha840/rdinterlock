import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/api/payments.api';
import { toast } from 'sonner';
import { X, Loader2, IndianRupee, CreditCard, Banknote, FileText } from 'lucide-react';
import { ActionButton } from './ActionButton';
import { format } from 'date-fns';

interface SalaryPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: {
    id: string;
    name: string;
    role: string;
    netPayable: number;
    paymentType?: string;
  };
  onSuccess?: () => void;
}

export const SalaryPaymentModal: React.FC<SalaryPaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  worker,
  onSuccess 
}) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(worker.netPayable.toString());
  const [method, setMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const paymentMutation = useMutation({
    mutationFn: () => paymentsApi.createStaffPayment({
      personId: worker.id,
      role: worker.role,
      amount: parseFloat(amount),
      paymentType: worker.paymentType || 'SALARY',
      method,
      date,
      note
    }),
    onSuccess: () => {
      toast.success('Salary Paid Successfully');
      queryClient.invalidateQueries({ queryKey: ['salary-report'] });
      queryClient.invalidateQueries({ queryKey: ['worker-wages'] });
      queryClient.invalidateQueries({ queryKey: ['cashbook-entries'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error('Payment Failed', { description: error.message });
    }
  });

  if (!isOpen) return null;

  const handlePayFull = () => {
    setAmount(worker.netPayable.toString());
  };

  const isInvalid = parseFloat(amount) <= 0 || parseFloat(amount) > worker.netPayable || isNaN(parseFloat(amount));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-background rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-border/50">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground relative">
          <button 
            onClick={onClose} 
            className="absolute right-6 top-6 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl">
              {worker.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-black">{worker.name}</h2>
              <p className="text-sm opacity-80 font-bold uppercase tracking-widest">{worker.role}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="p-4 bg-secondary/30 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-1">Max Payable</p>
              <p className="text-2xl font-black text-foreground">₹{worker.netPayable.toLocaleString()}</p>
            </div>
            <button 
              onClick={handlePayFull}
              className="px-4 py-2 bg-primary/10 text-primary text-xs font-black rounded-xl hover:bg-primary/20 transition-all active:scale-95"
            >
              PAY FULL
            </button>
          </div>

          <div className="space-y-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2">
                <IndianRupee className="h-3 w-3" /> Amount to Pay
              </label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-14 bg-secondary/50 border-none rounded-2xl px-5 text-xl font-black focus:ring-4 ring-primary/20 transition-all outline-none text-foreground"
              />
              {parseFloat(amount) > worker.netPayable && (
                <p className="text-[10px] text-destructive font-bold uppercase mt-1 animate-pulse">
                  Error: Amount exceeds pending balance!
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2">
                <CreditCard className="h-3 w-3" /> Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'UPI', 'Bank Transfer'] as const).map((m) => {
                  const Icon = m === 'Cash' ? Banknote : m === 'UPI' ? CreditCard : FileText;
                  return (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                        method === m 
                          ? 'bg-primary border-primary text-primary-foreground shadow-lg' 
                          : 'bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50'
                      }`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-[10px] font-bold">{m}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Note */}
            <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase mb-1.5 block">Payment Date</label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-12 bg-secondary/50 border-none rounded-xl px-4 text-xs font-bold outline-none ring-primary/20 focus:ring-2"
                  />
               </div>
               <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase mb-1.5 block">Notes (Optional)</label>
                  <input 
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Month ends"
                    className="w-full h-12 bg-secondary/50 border-none rounded-xl px-4 text-xs font-bold outline-none ring-primary/20 focus:ring-2"
                  />
               </div>
            </div>
          </div>

          {/* Action */}
          <ActionButton 
            label={paymentMutation.isPending ? "Processing..." : `Confirm Payment of ₹${parseFloat(amount || '0').toLocaleString()}`}
            icon={paymentMutation.isPending ? Loader2 : IndianRupee}
            variant="success"
            size="lg"
            className="w-full h-16 text-lg shadow-xl"
            disabled={isInvalid || paymentMutation.isPending}
            onClick={() => paymentMutation.mutate()}
          />
        </div>
      </div>
    </div>
  );
};
