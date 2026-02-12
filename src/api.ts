// src/api/sheetApi.ts

export const SHEET_API_URL =
  "https://script.google.com/macros/s/AKfycbx58KR1RU_HtUl8IkVlH5Gehzss_112Ur2GfGFTtYxVQ86eJzsKZvYdd68OG4wDAwmmeQ/exec";

export type SheetEntry = {
  id?: string;
  date: string;
  workerId: number;
  checkIn: string;
  checkOut: string;
  breakMinutes: number;
  workingHours: number;
  otHours: number;
  otPay?: number;
  isRejectedLeave: boolean;
  isApprovedLeave: boolean;
  advancePayment: number;
  notes: string;
  updatedAt: number;
};

export async function sheetGetAll(): Promise<any[]> {
  // NOTE: Apps Script sometimes blocks GET due to CORS;
  // if GET gives issue, we can switch to POST action="list"
  const res = await fetch(SHEET_API_URL, { method: "GET" });
  const data = await res.json();
  return data.rows || [];
}

export async function sheetUpsert(entry: SheetEntry): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  return res.json();
}

export async function sheetDelete(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id }),
  });
  return res.json();
}
