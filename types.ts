
export enum WorkerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export interface Worker {
  id?: number;
  name: string;
  baseHours: number;
  trade?: string;
  monthlySalary: number; // New primary input
  status: WorkerStatus;
  createdAt: number;
}

export interface AttendanceEntry {
  id?: number;
  date: string; // YYYY-MM-DD
  workerId: number;
  checkIn: string;
  checkOut: string;
  breakMinutes: number;
  workingHours: number;
  otHours: number;
  otPay: number;       // Calculated: otHours * ((monthlySalary/30)/10 * 1.5)
  isRejectedLeave: boolean; // Deducts 1 day pay
  isApprovedLeave: boolean; // No deduction, zero hours
  advancePayment: number; // Advance taken on this day
  notes?: string;
  updatedAt: number;
}

export interface Settings {
  defaultBaseHours: number;
  defaultBreakMinutes: number;
  roundingDecimals: number;
}
