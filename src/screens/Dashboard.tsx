
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { format, startOfMonth, endOfMonth, subDays, isWithinInterval, parseISO } from 'date-fns';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  Zap, 
  PlusCircle, 
  BarChart3,
  FileText,
  UserCheck,
  Award,
  ArrowRight,
  Coffee
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TopOTWorker {
  id: number;
  name: string;
  otHours: number;
  trade?: string;
}

interface Stats {
  todayWorking: number;
  todayOT: number;
  todayPresent: number;
  todayOnLeave: number;
  monthWorking: number;
  monthOT: number;
  workerCount: number;
}

const Dashboard: React.FC<{ onNavigate: (view: any) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState<Stats>({
    todayWorking: 0,
    todayOT: 0,
    todayPresent: 0,
    todayOnLeave: 0,
    monthWorking: 0,
    monthOT: 0,
    workerCount: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topOTWorkers, setTopOTWorkers] = useState<TopOTWorker[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startMonth = startOfMonth(new Date());
    const endMonth = endOfMonth(new Date());

    const [allEntries, allWorkers] = await Promise.all([
      db.entries.toArray(),
      db.workers.toArray()
    ]);

    const todayEntries = allEntries.filter(e => e.date === today);
    const monthEntries = allEntries.filter(e => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start: startMonth, end: endMonth });
    });

    const calculateTotals = (list: any[]) => list.reduce((acc, curr) => ({
      working: acc.working + (curr.workingHours || 0),
      ot: acc.ot + (curr.otHours || 0)
    }), { working: 0, ot: 0 });

    const todayTotals = calculateTotals(todayEntries);
    const monthTotals = calculateTotals(monthEntries);
    
    const presentCount = todayEntries.filter(e => !e.isRejectedLeave && !e.isApprovedLeave).length;
    const leaveCount = todayEntries.filter(e => e.isRejectedLeave || e.isApprovedLeave).length;

    setStats({
      todayWorking: todayTotals.working,
      todayOT: todayTotals.ot,
      todayPresent: presentCount,
      todayOnLeave: leaveCount,
      monthWorking: monthTotals.working,
      monthOT: monthTotals.ot,
      workerCount: allWorkers.length
    });

    const otMap: Record<number, number> = {};
    monthEntries.forEach(e => {
      if (e.otHours > 0) {
        otMap[e.workerId] = (otMap[e.workerId] || 0) + e.otHours;
      }
    });

    const sortedOT = Object.entries(otMap)
      .map(([id, hours]) => {
        const worker = allWorkers.find(w => w.id === parseInt(id));
        return {
          id: parseInt(id),
          name: worker?.name || 'Unknown',
          otHours: hours,
          trade: worker?.trade
        };
      })
      .sort((a, b) => b.otHours - a.otHours)
      .slice(0, 5);

    setTopOTWorkers(sortedOT);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayEntries = allEntries.filter(e => e.date === dateStr);
      const dayTotals = calculateTotals(dayEntries);
      return {
        name: format(d, 'EEE'),
        hours: parseFloat((dayTotals.working + dayTotals.ot).toFixed(1)),
        date: dateStr
      };
    }).reverse();
    setChartData(last7Days);
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-lg shadow-blue-200 col-span-2 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserCheck size={16} className="text-blue-200" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Attendance Today</span>
            </div>
            <div className="text-3xl font-black">{stats.todayPresent} <span className="text-sm font-bold opacity-60">Working</span></div>
            <div className="flex items-center gap-1 mt-1 text-blue-200 text-[10px] font-bold">
                <Coffee size={10} /> {stats.todayOnLeave} on Leave
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-1">Total Hours</div>
            <div className="text-2xl font-black">{(stats.todayWorking + stats.todayOT).toFixed(1)}h</div>
            <div className="text-[10px] font-bold text-blue-200">inc. {stats.todayOT}h OT</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-emerald-500" size={18} />
            <span className="text-[10px] font-black text-slate-400 uppercase">Monthly Hrs</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{(stats.monthWorking + stats.monthOT).toFixed(0)}h</div>
          <div className="text-[10px] font-bold text-emerald-600 mt-1">Regular Work</div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="text-amber-500" size={18} />
            <span className="text-[10px] font-black text-slate-400 uppercase">Monthly OT</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.monthOT.toFixed(0)}h</div>
          <div className="text-[10px] font-bold text-amber-600 mt-1">Extra Overtime</div>
        </div>
      </section>

      <section className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={18} />
            <h2 className="font-black text-slate-800 text-sm">Working Pattern</h2>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Last 7 Days</span>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
              />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]} barSize={24}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 6 ? '#2563eb' : '#e2e8f0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="text-yellow-400" size={20} />
            <h2 className="font-black text-sm uppercase tracking-wider">Top OT Performers</h2>
          </div>
          <span className="text-[9px] font-bold text-slate-500 uppercase">{format(new Date(), 'MMMM')}</span>
        </div>
        <div className="space-y-3">
          {topOTWorkers.length > 0 ? topOTWorkers.map((w, idx) => (
            <div key={w.id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-xs">
                  #{idx + 1}
                </div>
                <div>
                  <div className="text-xs font-black">{w.name}</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase">{w.trade || 'General'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-emerald-400">{w.otHours.toFixed(1)}h</div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Overtime</div>
              </div>
            </div>
          )) : (
            <div className="text-center py-4 text-slate-500 text-xs font-medium italic">No overtime recorded this month yet.</div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => onNavigate('add-entry')}
          className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition shadow-sm active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <PlusCircle size={20} />
          </div>
          <div className="text-left">
            <span className="block text-xs font-black text-slate-800">New Entry</span>
            <span className="block text-[9px] font-bold text-slate-400 uppercase">Daily Log</span>
          </div>
        </button>
        <button 
          onClick={() => onNavigate('reports')}
          className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition shadow-sm active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <FileText size={20} />
          </div>
          <div className="text-left">
            <span className="block text-xs font-black text-slate-800">Reports</span>
            <span className="block text-[9px] font-bold text-slate-400 uppercase">Payroll</span>
          </div>
        </button>
      </section>

      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
            <Users size={20} />
          </div>
          <div>
            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Workforce</div>
            <div className="text-lg font-black text-slate-800">{stats.workerCount} Registered</div>
          </div>
        </div>
        <button onClick={() => onNavigate('workers')} className="p-2 text-slate-400 hover:text-blue-600 transition">
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
