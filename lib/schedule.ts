/** Scheduling helpers shared by the schedule UI and the plans API. */
import type { MaintenancePlan, PMReport, TechDivision, WorkType } from './types';
import { reportStatus } from './report-status';

/** Division that performs a work type; null = any technician (CM). */
export function planDivision(type: WorkType): TechDivision | null {
  if (type === 'MECHANICAL_PM' || type === 'MECHANICAL_CHECK') return 'TEKNIK';
  if (type === 'PREVENTIVE_MAINTENANCE' || type === 'QUICK_CHECK') return 'IT';
  return null;
}

/** A BA counts as scheduled when a plan of the same SPBU & type is within this many days. */
export const PLAN_MATCH_DAYS = 7;

const dayDiff = (a: string, b: string) => Math.abs(Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 86400000;

/** Submitted BA that were done without an Admin schedule. */
export function unscheduledReports(reports: PMReport[], plans: MaintenancePlan[]): PMReport[] {
  return reports.filter((r) => {
    if (reportStatus(r) === 'DRAFT' || !r.execution_date) return false;
    return !plans.some(
      (p) => p.site_id === r.site_id && p.plan_type === r.work_type && !!p.scheduled_date && dayDiff(p.scheduled_date, r.execution_date) <= PLAN_MATCH_DAYS
    );
  });
}
