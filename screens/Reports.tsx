
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Worker, AttendanceEntry } from '../types';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { Download, ChevronLeft, ChevronRight, Wallet, Clock, Ban, Banknote, CheckCircle2 } from 'lucide-react';

const Reports: React.FC = () => {
  const [tab, setTab] = useState<'monthly' | 'worker'>('monthly');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    const [wData, eData] = await Promise.all([
      db.workers.toArray(),
      db.entries.toArray()
    ]);
    setWorkers(wData);
    setEntries(eData);
  };

  const handlePrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const exportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || '')).join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.click();
  };

  const renderMonthlyReport = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const monthlyStats = workers.map(w => {
      const wEntries = entries.filter(e => {
        const d = parseISO(e.date);
        return e.workerId === w.id && isWithinInterval(d, { start, end });
      });

      const totalOTPay = wEntries.reduce((a, b) => a + (b.otPay || 0), 0);
      const totalAdvance = wEntries.reduce((a, b) => a + (b.advancePayment || 0), 0);
      const rejectedLeavesCount = wEntries.filter(e => e.isRejectedLeave).length;
      
      const dailyPay = w.monthlySalary / 30;
      const leaveDeduction = rejectedLeavesCount * dailyPay;
      
      // FORMULA: Final = Base + OT - Deduction - Advance
      const finalSalary = w.monthlySalary + totalOTPay - leaveDeduction - totalAdvance;

      return {
        'Worker Name': w.name,
        'Base Salary': w.monthlySalary.toFixed(2),
        'OT Pay': totalOTPay.toFixed(2),
        'Leave Deduct': leaveDeduction.toFixed(2),
        'Advances': totalAdvance.toFixed(2),
        'Final Salary': finalSalary.toFixed(2)
      };
    }).filter(s => parseFloat(s['Final Salary']) > 0 || parseFloat(s['OT Pay']) > 0 || parseFloat(s['Advances']) > 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-slate-800">Final Payroll</h2>
          <button onClick={() => exportCSV(monthlyStats, `Payroll_${format(currentMonth, 'MMM_yyyy')}`)} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Worker</th>
                <th className="p-3 text-right">Add/Sub</th>
                <th className="p-3 text-right">Advance</th>
                <th className="p-3 text-right">Final Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyStats.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No active records for this month</td></tr>
              ) : (
                monthlyStats.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">
                      <div>{row['Worker Name']}</div>
                      <div className="text-[8px] text-slate-400 font-medium">B: {row['Base Salary']}</div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="text-emerald-600 font-bold">+{row['OT Pay']}</div>
                      {parseFloat(row['Leave Deduct']) > 0 && <div className="text-red-500 font-bold">-{row['Leave Deduct']}</div>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="text-amber-600 font-bold">₹{row['Advances']}</div>
                    </td>
                    <td className="p-3 text-right font-black text-blue-700 text-sm">₹{row['Final Salary']}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderWorkerReport = () => {
    if (!selectedWorkerId) {
      return (
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Select Worker</label>
          <select onChange={(e) => setSelectedWorkerId(parseInt(e.target.value))} className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none shadow-sm">
            <option value="">Choose a worker...</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      );
    }

    const worker = workers.find(w => w.id === selectedWorkerId);
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    const wEntries = entries.filter(e => {
        const d = parseISO(e.date);
        return e.workerId === selectedWorkerId && isWithinInterval(d, { start, end });
    }).sort((a,b) => b.date.localeCompare(a.date));
    
    const totalWorkingHours = wEntries.reduce((a, b) => a + (b.workingHours || 0), 0);
    const totalOTHours = wEntries.reduce((a, b) => a + (b.otHours || 0), 0);
    const totalOTEarned = wEntries.reduce((a, b) => a + (b.otPay || 0), 0);
    const totalAdvances = wEntries.reduce((a, b) => a + (b.advancePayment || 0), 0);
    const rejectedLeavesCount = wEntries.filter(e => e.isRejectedLeave).length;
    const approvedLeavesCount = wEntries.filter(e => e.isApprovedLeave).length;
    
    const dailyPay = (worker?.monthlySalary || 0) / 30;
    const leaveDeduction = rejectedLeavesCount * dailyPay;
    const finalCalculated = (worker?.monthlySalary || 0) + totalOTEarned - leaveDeduction - totalAdvances;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <button onClick={() => setSelectedWorkerId(null)} className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-3 py-2 rounded-lg">
                <ChevronLeft size={14} /> Change Worker
            </button>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{format(currentMonth, 'MMMM yyyy')}</span>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black">{worker?.name}</h2>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Audit Report</p>
            </div>
            <Wallet className="text-blue-400" size={32} />
          </div>
          <div className="bg-blue-600 p-5 rounded-2xl text-center shadow-inner">
            <div className="text-[10px] text-blue-200 font-black uppercase tracking-widest mb-1">Final Monthly Payable</div>
            <div className="text-3xl font-black">₹{finalCalculated.toFixed(2)}</div>
            <div className="text-[9px] text-blue-100 font-medium mt-1 opacity-80">Formula: Base + OT - (Deductions + Advances)</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-blue-500" />
                <span className="text-[10px] text-slate-500 font-black uppercase">Hours Log</span>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Working:</span>
                    <span className="text-sm font-black text-slate-900">{totalWorkingHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-1 mt-1">
                    <span className="text-[10px] text-slate-400">OT:</span>
                    <span className="text-sm font-black text-emerald-600">{totalOTHours.toFixed(1)}h</span>
                </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <Ban size={16} className="text-red-500" />
                <span className="text-[10px] text-slate-500 font-black uppercase">Leaves</span>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Approved:</span>
                    <span className="text-sm font-black text-emerald-600">{approvedLeavesCount} d</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-1 mt-1">
                    <span className="text-[10px] text-slate-400">Rejected:</span>
                    <span className="text-sm font-black text-red-600">{rejectedLeavesCount} d</span>
                </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Daily Breakdown</h3>
          {wEntries.map(e => (
            <div key={e.id} className={`p-4 rounded-2xl border flex justify-between items-center shadow-sm transition-all ${e.isRejectedLeave ? 'bg-red-50 border-red-100' : e.isApprovedLeave ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-400">{format(parseISO(e.date), 'EEE, MMM d')}</div>
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    {e.isRejectedLeave ? <><Ban size={10} className="text-red-500" /> REJECTED LEAVE</> : 
                     e.isApprovedLeave ? <><CheckCircle2 size={10} className="text-emerald-500" /> APPROVED LEAVE</> : 
                     `${e.checkIn} → ${e.checkOut}`}
                </div>
                {e.advancePayment > 0 && (
                    <div className="text-[9px] font-black text-amber-600 mt-1 flex items-center gap-1">
                        <Banknote size={10} /> ADVANCE: ₹{e.advancePayment}
                    </div>
                )}
              </div>
              <div className="text-right flex flex-col items-end">
                {e.isRejectedLeave ? (
                  <div className="text-red-600 font-black text-xs">-{dailyPay.toFixed(0)} Deduct</div>
                ) : e.isApprovedLeave ? (
                  <div className="text-emerald-600 font-black text-xs">OK (No Cut)</div>
                ) : (
                  <>
                    <div className="text-slate-900 font-black text-[10px]">{e.workingHours}h Regular</div>
                    {e.otHours > 0 && <div className="text-emerald-600 font-black text-[10px]">+{e.otHours}h OT</div>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button onClick={() => setTab('monthly')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition ${tab === 'monthly' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Payroll Summary</button>
        <button onClick={() => setTab('worker')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition ${tab === 'worker' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Worker Audit</button>
      </div>

      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 mb-4 shadow-sm">
        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-50 rounded text-slate-500"><ChevronLeft size={20}/></button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Reporting Period</span>
            <span className="font-black text-sm text-slate-800">{format(currentMonth, 'MMMM yyyy')}</span>
        </div>
        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-50 rounded text-slate-500"><ChevronRight size={20}/></button>
      </div>

      {tab === 'monthly' ? renderMonthlyReport() : renderWorkerReport()}
    </div>
  );
};

export default Reports;
