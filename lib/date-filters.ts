export type PeriodFilterKey = 
  | 'ALL' 
  | 'TODAY' 
  | 'LAST_7_DAYS' 
  | 'THIS_MONTH' 
  | 'LAST_MONTH' 
  | 'THIS_YEAR' 
  | 'CUSTOM';

export interface DateFilterState {
  period: PeriodFilterKey;
  customFrom: string;
  customTo: string;
}

export const PERIOD_OPTIONS: { value: PeriodFilterKey; label: string }[] = [
  { value: 'ALL', label: 'Semua Periode' },
  { value: 'TODAY', label: 'Hari Ini' },
  { value: 'LAST_7_DAYS', label: '7 Hari Terakhir' },
  { value: 'THIS_MONTH', label: 'Bulan Ini' },
  { value: 'LAST_MONTH', label: 'Bulan Lalu' },
  { value: 'THIS_YEAR', label: 'Tahun Ini' },
  { value: 'CUSTOM', label: 'Rentang Tanggal Khusus...' },
];

/**
 * Normalizes a date string or timestamp into a YYYY-MM-DD string
 */
export function normalizeDateToYMD(dateInput: string | Date | undefined | null): string | null {
  if (!dateInput) return null;
  try {
    if (typeof dateInput === 'string') {
      // If already in YYYY-MM-DD prefix
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}

/**
 * Checks whether a given date matches the period criteria
 */
export function isDateInPeriod(
  dateInput: string | Date | undefined | null,
  period: PeriodFilterKey,
  customFrom?: string,
  customTo?: string
): boolean {
  if (period === 'ALL') return true;

  const ymd = normalizeDateToYMD(dateInput);
  if (!ymd) return false;

  const now = new Date();
  const todayYMD = normalizeDateToYMD(now)!;

  if (period === 'TODAY') {
    return ymd === todayYMD;
  }

  if (period === 'LAST_7_DAYS') {
    const target = new Date(ymd + 'T00:00:00');
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return target >= sevenDaysAgo && target <= endOfToday;
  }

  if (period === 'THIS_MONTH') {
    const curYearMonth = todayYMD.substring(0, 7);
    return ymd.startsWith(curYearMonth);
  }

  if (period === 'LAST_MONTH') {
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = lastMonthDate.getFullYear();
    const m = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
    const lastMonthYM = `${y}-${m}`;
    return ymd.startsWith(lastMonthYM);
  }

  if (period === 'THIS_YEAR') {
    const curYear = todayYMD.substring(0, 4);
    return ymd.startsWith(curYear);
  }

  if (period === 'CUSTOM') {
    if (customFrom && ymd < customFrom) return false;
    if (customTo && ymd > customTo) return false;
    return true;
  }

  return true;
}

