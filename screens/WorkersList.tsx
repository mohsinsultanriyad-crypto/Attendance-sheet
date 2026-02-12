
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Worker, WorkerStatus } from '../types';
import { Search, Plus, Edit2, Trash2, UserCircle2, ShieldCheck, ShieldAlert, Banknote } from 'lucide-react';

const WorkersList: React.FC<{ onNavigate: (v: any) => void }> = ({ onNavigate }) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [baseHours, setBaseHours] = useState(10);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [status, setStatus] = useState<WorkerStatus>(WorkerStatus.ACTIVE);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    const data = await db.workers.toArray();
    setWorkers(data);
  };

  const resetForm = () => {
    setName('');
    setTrade('');
    setBaseHours(10);
    setMonthlySalary(0);
    setStatus(WorkerStatus.ACTIVE);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const workerData: Worker = {
      name,
      trade,
      baseHours,
      monthlySalary,
      status,
      createdAt: editingId ? (workers.find(w => w.id === editingId)?.createdAt || Date.now()) : Date.now()
    };

    if (editingId) {
      await db.workers.update(editingId, workerData);
    } else {
      await db.workers.add(workerData);
    }

    resetForm();
    setShowAddModal(false);
    loadWorkers();
  };

  const startEdit = (w: Worker) => {
    setEditingId(w.id!);
    setName(w.name);
    setTrade(w.trade || '');
    setBaseHours(w.baseHours);
    setMonthlySalary(w.monthlySalary || 0);
    setStatus(w.status);
    setShowAddModal(true);
  };

  const toggleStatus = async (w: Worker) => {
    const newStatus = w.status === WorkerStatus.ACTIVE ? WorkerStatus.INACTIVE : WorkerStatus.ACTIVE;
    await db.workers.update(w.id!, { status: newStatus });
    loadWorkers();
  };

  const deleteWorker = async (id: number) => {
    if (confirm('Delete worker? Logs will be preserved.')) {
      await db.workers.delete(id);
      loadWorkers();
    }
  };

  const getDerivedRates = (monthly: number) => {
    const daily = monthly / 30;
    const hourly = daily / 10;
    const ot = hourly * 1.5;
    return { daily, hourly, ot };
  };

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (w.trade && w.trade.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search workers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid gap-3">
        {filteredWorkers.map(w => {
          const rates = getDerivedRates(w.monthlySalary);
          return (
            <div key={w.id} className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-opacity ${w.status === WorkerStatus.INACTIVE ? 'opacity-50' : 'opacity-100'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${w.status === WorkerStatus.ACTIVE ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                <UserCircle2 size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{w.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{w.trade || 'General'} • Monthly: ₹{w.monthlySalary}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">D: {rates.daily.toFixed(0)}</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">H: {rates.hourly.toFixed(1)}</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-bold">OT: {rates.ot.toFixed(1)}/h</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleStatus(w)} className={`p-2 rounded-lg ${w.status === WorkerStatus.ACTIVE ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}>
                  {w.status === WorkerStatus.ACTIVE ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                </button>
                <button onClick={() => startEdit(w)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit2 size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-slate-900">{editingId ? 'Edit Worker' : 'Add Worker'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold p-2">Close</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="e.g. Rahul" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Trade</label>
                  <input type="text" value={trade} onChange={(e) => setTrade(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Welder" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Monthly Salary</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(parseFloat(e.target.value))} className="w-full p-3 pl-7 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="30000" required />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-blue-600 font-bold italic">Calculation Logic: Daily = Monthly/30 | Hourly = Daily/10 | OT = Hourly * 1.5</p>
              <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">
                {editingId ? 'Update Worker' : 'Save Worker'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkersList;
