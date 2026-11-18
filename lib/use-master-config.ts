'use client';

/**
 * Master data (BBM products, ATG & dispenser brands) shared by the PM form and
 * the SPBU configuration. Cached in memory + localStorage, refreshed from
 * /api/config once per page load.
 */
import { useEffect, useState } from 'react';
import type { AtgBrandConfig, DispenserBrandConfig, FuelProduct } from './types';
import { fetchMasterConfigApi } from './api-client';
import { DEFAULT_ATG_BRANDS, DEFAULT_DISPENSER_BRANDS, DEFAULT_FUEL_PRODUCTS } from './sample-data';

export interface MasterData {
  products: FuelProduct[];
  atgBrands: AtgBrandConfig[];
  dispenserBrands: DispenserBrandConfig[];
}

const KEY = 'pertamina_pm_master_v1';
let memory: MasterData | null = null;
let inflight: Promise<MasterData | null> | null = null;
const listeners = new Set<(m: MasterData) => void>();

function initial(): MasterData {
  if (memory) return memory;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return (memory = JSON.parse(raw));
    } catch {}
  }
  return { products: DEFAULT_FUEL_PRODUCTS, atgBrands: DEFAULT_ATG_BRANDS, dispenserBrands: DEFAULT_DISPENSER_BRANDS };
}

export function refreshMasterData(): Promise<MasterData | null> {
  if (!inflight) {
    inflight = fetchMasterConfigApi()
      .then((res) => {
        if (!res.success) return null;
        const m: MasterData = {
          products: res.products?.length ? res.products : DEFAULT_FUEL_PRODUCTS,
          atgBrands: res.atgBrands?.length ? res.atgBrands : DEFAULT_ATG_BRANDS,
          dispenserBrands: res.dispenserBrands?.length ? res.dispenserBrands : DEFAULT_DISPENSER_BRANDS,
        };
        memory = m;
        try {
          localStorage.setItem(KEY, JSON.stringify(m));
        } catch {}
        listeners.forEach((l) => l(m));
        return m;
      })
      .finally(() => {
        setTimeout(() => (inflight = null), 30_000);
      });
  }
  return inflight;
}

export function useMasterData(): MasterData {
  const [data, setData] = useState<MasterData>(initial);
  useEffect(() => {
    listeners.add(setData);
    refreshMasterData();
    return () => {
      listeners.delete(setData);
    };
  }, []);
  return data;
}

export const activeOnly = <T extends { status: string }>(list: T[]) => list.filter((x) => x.status === 'Aktif');
export const productLabel = (p: FuelProduct) => p.name;
export const atgLabel = (b: AtgBrandConfig) => [b.brand_name, b.model_series].filter(Boolean).join(' ');
export const dispenserLabel = (b: DispenserBrandConfig) => [b.brand_name, b.series_model].filter(Boolean).join(' ');
