const API_URL = "PASTE_YOUR_APPS_SCRIPT_WEBAPP_URL_HERE";

export type EntryRow = {
  date: string;
  worker: string;
  checkIn: string;
  checkOut: string;
  baseHours: number;
  workingHours: number;
  otHours: number;
  createdAt: string;
};

export async function fetchEntries(): Promise<EntryRow[]> {
  const res = await fetch(API_URL, { method: "GET" });
  const data = await res.json();
  return data.rows || [];
}

export async function addEntry(payload: {
  date: string;
  worker: string;
  checkIn: string;
  checkOut: string;
  baseHours?: number;
}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}
