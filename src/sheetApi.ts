// src/sheetApi.ts

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

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("API returned non-JSON response: " + text.slice(0, 120));
  }
}

// ✅ RELIABLE LIST (POST)
export async function sheetGetAll(): Promise<any[]> {
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "list" }),
  });
  const data = await safeJson(res);
  return data.rows || [];
}

export async function sheetUpsert(entry: SheetEntry): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  return safeJson(res);
}

export async function sheetDelete(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id }),
  });
  return safeJson(res);
}
