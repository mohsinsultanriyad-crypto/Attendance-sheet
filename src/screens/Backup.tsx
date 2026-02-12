
import React, { useState } from 'react';
import { db } from '../../db';
import { Download, Upload, AlertTriangle, CheckCircle2, Database } from 'lucide-react';

const Backup: React.FC = () => {
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const downloadBackup = async () => {
    const workers = await db.workers.toArray();
    const entries = await db.entries.toArray();
    
    const data = {
      version: 1,
      timestamp: Date.now(),
      workers,
      entries
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus({ type: 'success', msg: 'Backup downloaded successfully.' });
  };

  const restoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('This will MERGE the imported data with current data. Existing IDs might conflict. Are you sure?')) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.workers) await db.workers.bulkAdd(data.workers);
        if (data.entries) await db.entries.bulkAdd(data.entries);
        setStatus({ type: 'success', msg: 'Restore completed successfully!' });
      } catch (err: any) {
        setStatus({ type: 'error', msg: 'Invalid backup file format.' });
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = async () => {
    if (confirm('DANGER: This will permanently delete ALL workers and attendance entries. This cannot be undone. Are you absolutely sure?')) {
      await db.workers.clear();
      await db.entries.clear();
      setStatus({ type: 'success', msg: 'All data has been cleared.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-slate-900 mb-2">
          <Database className="text-blue-600" size={24} />
          <h2 className="text-xl font-black">Data Management</h2>
        </div>

        {status && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {status.msg}
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={downloadBackup}
            className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Download size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-900">Download Backup</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Export everything to JSON</p>
              </div>
            </div>
          </button>

          <label className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition cursor-pointer">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Upload size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-900">Restore Data</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Import from JSON file</p>
              </div>
            </div>
            <input type="file" accept=".json" onChange={restoreBackup} className="hidden" />
          </label>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button 
            onClick={clearAllData}
            className="w-full flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition group"
          >
            <AlertTriangle size={20} />
            <span className="font-bold text-sm">Clear All Local Data</span>
          </button>
          <p className="mt-2 text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
            This affects this device only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Backup;
