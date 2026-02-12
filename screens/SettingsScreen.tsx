
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Info } from 'lucide-react';

const SettingsScreen: React.FC = () => {
  const [baseHours, setBaseHours] = useState(10);
  const [breakMin, setBreakMin] = useState(60);

  useEffect(() => {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setBaseHours(parsed.baseHours);
      setBreakMin(parsed.breakMin);
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('app_settings', JSON.stringify({ baseHours, breakMin }));
    alert('Settings updated!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="text-slate-600" size={24} />
          <h2 className="text-xl font-black text-slate-900">System Defaults</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Default Base Hours</label>
            <input 
              type="number"
              value={baseHours}
              onChange={(e) => setBaseHours(parseInt(e.target.value))}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Default Break (Min)</label>
            <input 
              type="number"
              value={breakMin}
              onChange={(e) => setBreakMin(parseInt(e.target.value))}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <button 
            onClick={saveSettings}
            className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-black transition uppercase tracking-widest text-sm"
          >
            Update Defaults
          </button>
        </div>
      </div>

      <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl space-y-2">
        <div className="flex items-center gap-2 text-blue-700 font-black text-sm">
          <Info size={18} /> About Offline Storage
        </div>
        <p className="text-xs text-blue-600 leading-relaxed font-medium">
          All data is stored locally in your browser's IndexedDB. It will remain safe as long as you don't clear your browser's site data or uninstall the PWA. 
          <br/><br/>
          Use the <strong>Backup</strong> tool regularly to keep a copy of your records on your device or cloud.
        </p>
      </div>
    </div>
  );
};

export default SettingsScreen;
