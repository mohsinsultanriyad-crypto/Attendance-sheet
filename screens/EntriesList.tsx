
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { AttendanceEntry, Worker } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Edit3, Trash2, ChevronLeft, ChevronRight, CalendarDays, Ban, CheckCircle2 } from 'lucide-react';

const EntriesList: React.FC<{ onNavigate: (view: any, param?: string) => void }> = ({ onNavigate }) => {
  const [entries, setEntries] = useState<(AttendanceEntry & { workerName?: string })[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    const allWorkers = await db.workers.toArray();
    setWorkers(allWorkers);

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const allEntries = await db.entries.reverse().sortBy('date');
    const filtered = allEntries.filter(e => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start, end });
    }).map(e => ({
      ...e,
      workerName: allWorkers.find(w => w.id === e.workerId)?.name || 'Unknown Worker'
    }));

    setEntries(filtered);
  };

  const deleteEntry = async (id: number) => {
    if (confirm('Delete this entry?')) {
      await db.entries.delete(id);
      loadData();
    }
  };

  const handlePrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const totalHours = entries.reduce((acc, curr) => acc + curr.workingHours, 0);
  const totalOT = entries.reduce((acc, curr) => acc + curr.otHours, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected Month</span>
          <span className="font-black text-slate-900">{format(currentMonth, 'MMMM yyyy')}</span>
        </div>
        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtered Hours</span>
          <span className="text-xl font-black">{totalHours.toFixed(2)}h</span>
        </div>
        <div className="bg-blue-600 text-white p-4 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Filtered OT</span>
          <span className="text-xl font-black">{totalOT.toFixed(2)}h</span>
        </div>
      </div>

      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CalendarDays size={48} className="mx-auto mb-2 opacity-20" />
            <p className="font-medium">No entries for this month.</p>
          </div>
        ) : (
          entries.map(e => (
            <div key={e.id} className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 ${e.isRejectedLeave ? 'border-l-4 border-l-red-500' : e.isApprovedLeave ? 'border-l-4 border-l-emerald-500' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-tighter mb-1">
                    {format(parseISO(e.date), 'EEE, MMM d, yyyy')}
                  </div>
                  <h3 className="font-black text-slate-900">{e.workerName}</h3>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => onNavigate('add-entry', e.id!.toString())}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => deleteEntry(e.id!)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                {e.isRejectedLeave ? (
                    <div className="flex-1 bg-red-50 text-red-700 p-2 rounded-lg border border-red-100 flex items-center gap-2">
                        <Ban size={14} /> REJECTED LEAVE (Money Cut)
                    </div>
                ) : e.isApprovedLeave ? (
                    <div className="flex-1 bg-emerald-50 text-emerald-700 p-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                        <CheckCircle2 size={14} /> APPROVED LEAVE (No Cut)
                    </div>
                ) : (
                    <>
                        <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-slate-400 mr-2">SHIFTS:</span>
                          <span className="text-slate-700">{e.checkIn} → {e.checkOut}</span>
                        </div>
                        <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-100">
                          {e.workingHours}h
                        </div>
                    </>
                )}
                {e.otHours > 0 && !e.isRejectedLeave && !e.isApprovedLeave && (
                  <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-100">
                    OT {e.otHours}h
                  </div>
                )}
              </div>
              
              {e.notes && (
                <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">"{e.notes}"</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EntriesList;
