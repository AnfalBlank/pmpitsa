/** Helpers linking an SPBU's forecourt configuration to the PM form. */
import type { NozzleItem, PMReport, Site, SiteForecourtConfig, TankItem } from './types';

export function hasForecourtConfig(site?: Site | null): site is Site & { forecourt: SiteForecourtConfig } {
  const f = site?.forecourt;
  return !!f && (f.pumps.length > 0 || f.tanks.length > 0 || !!f.atg_brand || !!f.dispenser_brand);
}

export function forecourtSummary(f?: SiteForecourtConfig): string {
  if (!f) return 'Belum dikonfigurasi';
  const nozzles = f.pumps.reduce((n, p) => n + p.nozzles.length, 0);
  const parts = [`${f.pumps.length} pump`, `${nozzles} nozzle`, `${f.tanks.length} tangki`];
  return parts.join(' · ');
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Builds the Forecourt part of a BA from the SPBU configuration: every pump /
 * nozzle / tank is listed with status "B" so the technician only changes what
 * has a finding. Values already entered for the same pump+nozzle / tank are kept.
 */
export function applySiteForecourt(report: PMReport, site: Site): PMReport {
  if (!hasForecourtConfig(site)) return report;
  const cfg = site.forecourt;
  const prev = report.forecourt;
  // Keep what the technician already entered for the same pump/nozzle or tank,
  // as long as it belongs to this SPBU (never carry values from another SPBU)
  const sameSite = prev?.config_site_id === site.id || (prev?.config_site_id === undefined && report.site_id === site.id);

  const nozzles: NozzleItem[] = [];
  for (const p of cfg.pumps) {
    for (const n of p.nozzles) {
      const old = sameSite ? prev.nozzles.find((x) => x.pump_number === p.pump_number && x.nozzle_number === n.nozzle_number) : undefined;
      nozzles.push({
        id: old?.id || uid('NZ'),
        pump_number: p.pump_number,
        nozzle_number: n.nozzle_number,
        product_name: n.product_name || old?.product_name || '',
        status: old?.status || 'B',
        meter_reading: old?.meter_reading || '',
        notes: old?.notes,
      });
    }
  }

  const tanks: TankItem[] = cfg.tanks.map((t) => {
    const old = sameSite ? prev.tanks.find((x) => x.tank_number === t.tank_number) : undefined;
    return {
      id: old?.id || uid('TNK'),
      tank_number: t.tank_number,
      product_name: t.product_name,
      capacity_liters: t.capacity_liters,
      level_sensor_status: old?.level_sensor_status || 'B',
      water_sensor_status: old?.water_sensor_status || 'B',
      temp_sensor_status: old?.temp_sensor_status || 'B',
      notes: old?.notes,
    };
  });

  return {
    ...report,
    forecourt: {
      ...prev,
      atg_brand: cfg.atg_brand || prev.atg_brand,
      dispenser_brand: cfg.dispenser_brand || prev.dispenser_brand,
      nozzles,
      tanks,
      dispenser_count: cfg.pumps.length,
      total_nozzles: nozzles.length,
      config_site_id: site.id,
      config_version: cfg.updated_at || '',
    },
  };
}

/** True when this draft's forecourt is not (or no longer) the SPBU's current configuration. */
export function needsSiteForecourt(report: PMReport, site?: Site | null): boolean {
  if (!hasForecourtConfig(site)) return false;
  const f = report.forecourt;
  return f?.config_site_id !== site.id || (f?.config_version || '') !== (site.forecourt.updated_at || '');
}
