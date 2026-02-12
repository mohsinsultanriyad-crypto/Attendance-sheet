import React, { useState, useEffect } from "react";
import { db } from "../../db";
import { Worker, AttendanceEntry, WorkerStatus } from "../../types";
import { calculateHours } from "../utils/timeUtils";
import { format } from "date-fns";
import { Save, AlertCircle, Calendar, Ban, History, Banknote, CheckCircle2 } from "lucide-react";
import { sheetUpsert, sheetGetAll, SheetEntry } from "../../api/sheetApi";

const AttendanceEntryScreen: React.FC<{ onNavigate: (v: any) => void; entryId?: string }> = ({
  onNavigate,
  entryId,
}) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number>(0);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [checkIn, setCheckIn] = useState("08:00 AM");
  const [checkOut, setCheckOut] = useState("06:00 PM");
  const [breakMin, setBreakMin] = useState(60);
  const [isRejectedLeave, setIsRejectedLeave] = useState(false);
  const [isApprovedLeave, setIsApprovedLeave] = useState(false);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<{ working: number; ot: number; otPay: number } | null>(null);
  const [error, setError] = useState("");
  const [isDataSuggested, setIsDataSuggested] = useState(false);

  // Keep sheet row id for edit mode
  const [sheetId, setSheetId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadWorkers();
    if (entryId) loadExistingEntryById(entryId);
  }, [entryId]);

  const loadWorkers = async () => {
    // Workers still from local DB (you can move workers to sheet later if needed)
    const data = await db.workers.where("status").equals(WorkerStatus.ACTIVE).toArray();
    setWorkers(data);
  };

  // Load from SHEET for edit mode
  const loadExistingEntryById = async (idStr: string) => {
    try {
      const rows = await sheetGetAll();
      const found = rows.find((r: any) => String(r.id) === String(idStr));
      if (found) {
        setSheetId(String(found.id));
        applySheetEntryToForm(found);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load from sheet");
    }
  };

  const applySheetEntryToForm = (entry: any) => {
    setSelectedWorkerId(Number(entry.workerId));
    setDate(String(entry.date));
    setIsRejectedLeave(Boolean(entry.isRejectedLeave));
    setIsApprovedLeave(Boolean(entry.isApprovedLeave));
    setAdvancePayment(Number(entry.advancePayment || 0));
    setNotes(String(entry.notes || ""));
    setIsDataSuggested(false);

    if (!entry.isRejectedLeave && !entry.isApprovedLeave) {
      setCheckIn(String(entry.checkIn || "08:00 AM"));
      setCheckOut(String(entry.checkOut || "06:00 PM"));
      setBreakMin(Number(entry.breakMinutes || 60));
    }
  };

  // Auto-suggestion: pull last record from SHEET (not IndexedDB)
  useEffect(() => {
    if (entryId) return;

    const checkData = async () => {
      if (selectedWorkerId === 0) return;

      try {
        const rows = await sheetGetAll();

        // existing same day
        const same = rows.find((r: any) => Number(r.workerId) === selectedWorkerId && String(r.date) === date);
        if (same) {
          setSheetId(String(same.id));
          applySheetEntryToForm(same);
          return;
        }

        // latest valid entry
        const latestValid = rows
          .filter((r: any) => Number(r.workerId) === selectedWorkerId)
          .sort((a: any, b: any) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
          .find((r: any) => !r.isRejectedLeave && !r.isApprovedLeave);

        if (latestValid) {
          setCheckIn(String(latestValid.checkIn));
          setCheckOut(String(latestValid.checkOut));
          setBreakMin(Number(latestValid.breakMinutes || 60));
          setIsRejectedLeave(false);
          setIsApprovedLeave(false);
          setAdvancePayment(0);
          setIsDataSuggested(true);
        } else {
          setCheckIn("08:00 AM");
          setCheckOut("06:00 PM");
          setBreakMin(60);
          setIsRejectedLeave(false);
          setIsApprovedLeave(false);
          setAdvancePayment(0);
          setIsDataSuggested(false);
        }
      } catch {
        // if sheet fails, keep defaults
      }
    };

    checkData();
  }, [selectedWorkerId, date, entryId]);

  useEffect(() => {
    if (isRejectedLeave || isApprovedLeave) {
      setPreview(null);
      return;
    }
    const worker = workers.find((w) => w.id === selectedWorkerId);
    if (!worker) {
      setPreview(null);
      return;
    }

    const base = worker.baseHours || 10;
    const calc = calculateHours(checkIn, checkOut, breakMin, base);

    if (calc) {
      const dailyPay = worker.monthlySalary / 30;
      const hourlyRate = dailyPay / 10;
      const otRate = hourlyRate * 1.5;
      const otPay = calc.otHours * otRate;

      setPreview({
        working: calc.workingHours,
        ot: calc.otHours,
        otPay: parseFloat(otPay.toFixed(2)),
      });
    } else {
      setPreview(null);
    }
  }, [checkIn, checkOut, breakMin, selectedWorkerId, workers, isRejectedLeave, isApprovedLeave]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedWorkerId) return setError("Please select a worker");

    const worker = workers.find((w) => w.id === selectedWorkerId);
    if (!worker) return;

    let calc = { workingHours: 0, otHours: 0 };
    let otPayValue = 0;

    if (!isRejectedLeave && !isApprovedLeave) {
      const result = calculateHours(checkIn, checkOut, breakMin, worker.baseHours);
      if (!result) return setError("Invalid time format.");
      calc = result;

      const dailyPay = worker.monthlySalary / 30;
      const hourlyRate = dailyPay / 10;
      const otRate = hourlyRate * 1.5;
      otPayValue = calc.otHours * otRate;
    }

    const payload: SheetEntry = {
      id: sheetId, // for update
      date,
      workerId: selectedWorkerId,
      checkIn: isRejectedLeave || isApprovedLeave ? "--" : checkIn,
      checkOut: isRejectedLeave || isApprovedLeave ? "--" : checkOut,
      breakMinutes: isRejectedLeave || isApprovedLeave ? 0 : breakMin,
      workingHours: calc.workingHours,
      otHours: calc.otHours,
      otPay: parseFloat(otPayValue.toFixed(2)),
      isRejectedLeave,
      isApprovedLeave,
      advancePayment: advancePayment || 0,
      notes,
      updatedAt: Date.now(),
    };

    try {
      const result = await sheetUpsert(payload);
      if (!result.ok) {
        setError(result.error || "Save failed");
        return;
      }
      onNavigate("entries");
    } catch (err: any) {
      setError(err.message || "Save failed");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-800">Attendance Log</h2>
          </div>
          {isDataSuggested && (
            <span className="flex items-center gap-1 text-[9px] text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded">
              <History size={10} /> Auto-filled
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setIsApprovedLeave(!isApprovedLeave);
              if (!isApprovedLeave) setIsRejectedLeave(false);
            }}
            className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-2 border ${
              isApprovedLeave
                ? "bg-emerald-600 border-emerald-700 text-white"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            }`}
          >
            <CheckCircle2 size={14} />
            {isApprovedLeave ? "Leave Approved" : "Mark Approved Leave"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRejectedLeave(!isRejectedLeave);
              if (!isRejectedLeave) setIsApprovedLeave(false);
            }}
            className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-2 border ${
              isRejectedLeave
                ? "bg-red-600 border-red-700 text-white"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Ban size={14} />
            {isRejectedLeave ? "Rejected Leave" : "Mark Rejected Leave"}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Worker</label>
          <select
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(parseInt(e.target.value))}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            required
          >
            <option value="0">Select Worker...</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.trade})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            required
          />
        </div>

        {!isRejectedLeave && !isApprovedLeave && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Check In</label>
                <input
                  type="text"
                  placeholder="7 AM"
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    setIsDataSuggested(false);
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Check Out</label>
                <input
                  type="text"
                  placeholder="5 PM"
                  value={checkOut}
                  onChange={(e) => {
                    setCheckOut(e.target.value);
                    setIsDataSuggested(false);
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Break (Minutes)</label>
              <select
                value={breakMin}
                onChange={(e) => setBreakMin(parseInt(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              >
                <option value="0">No Break</option>
                <option value="60">1 Hour</option>
              </select>
            </div>
          </>
        )}

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
          <label className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">
            <Banknote size={14} /> Advance Payment (₹)
          </label>
          <input
            type="number"
            value={advancePayment}
            onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)}
            className="w-full p-3 bg-white border border-amber-200 rounded-xl outline-none font-bold text-amber-900"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" rows={2} />
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition">
          <Save size={20} />
          Save Record (Shared)
        </button>
      </form>
    </div>
  );
};

export default AttendanceEntryScreen;
