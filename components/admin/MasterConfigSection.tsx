'use client';

import React, { useState, useEffect } from 'react';
import { SiteForecourtEditor } from '@/components/admin/SiteForecourtEditor';
import { forecourtSummary, hasForecourtConfig } from '@/lib/forecourt';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { 
  Building2, 
  Fuel, 
  Gauge, 
  Layers, 
  Cpu, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { 
  Site, 
  FuelProduct, 
  AtgBrandConfig, 
  DispenserBrandConfig, 
  HardwareMasterConfig, 
  SystemThresholdSettings 
} from '@/lib/types';
import { 
  getAllSites, 
  saveAllSites,
  saveSite, 
  deleteSite,
  getAllProducts, 
  saveProduct, 
  deleteProduct,
  getAllAtgBrands, 
  saveAtgBrand, 
  deleteAtgBrand,
  getAllDispenserBrands, 
  saveDispenserBrand, 
  deleteDispenserBrand,
  getAllHardwareConfigs, 
  saveHardwareConfig, 
  deleteHardwareConfig,
  getSystemSettings, 
  saveSystemSettings 
} from '@/lib/storage';
import { 
  fetchSitesApi, 
  createSiteApi, 
  updateSiteApi, 
  deleteSiteApi,
  fetchMasterConfigApi, 
  saveMasterConfigApi,
  deleteMasterConfigItemApi,
  cleanDummyDataApi
} from '@/lib/api-client';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

type ConfigSubTab = 'sites' | 'products' | 'atg' | 'dispensers' | 'hardware' | 'settings';

export const MasterConfigSection: React.FC = () => {
  const [subTab, setSubTab] = useState<ConfigSubTab>('sites');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [sites, setSites] = useState<Site[]>(() => getAllSites());
  /** SPBU whose pump / nozzle / tank setup is being edited */
  const [forecourtSite, setForecourtSite] = useState<Site | null>(null);
  const [products, setProducts] = useState<FuelProduct[]>(() => getAllProducts());
  const [atgBrands, setAtgBrands] = useState<AtgBrandConfig[]>(() => getAllAtgBrands());
  const [dispenserBrands, setDispenserBrands] = useState<DispenserBrandConfig[]>(() => getAllDispenserBrands());
  const [hardwareConfigs, setHardwareConfigs] = useState<HardwareMasterConfig[]>(() => getAllHardwareConfigs());
  const [systemSettings, setSystemSettings] = useState<SystemThresholdSettings>(() => getSystemSettings());

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FuelProduct | null>(null);

  const [isAtgModalOpen, setIsAtgModalOpen] = useState(false);
  const [editingAtg, setEditingAtg] = useState<AtgBrandConfig | null>(null);

  const [isDispenserModalOpen, setIsDispenserModalOpen] = useState(false);
  const [editingDispenser, setEditingDispenser] = useState<DispenserBrandConfig | null>(null);

  const [isHwModalOpen, setIsHwModalOpen] = useState(false);
  const [editingHw, setEditingHw] = useState<HardwareMasterConfig | null>(null);

  const [isCleaningDummy, setIsCleaningDummy] = useState(false);
  const feedback = useFeedback();

  const handleExecuteCleanDummy = async () => {
    const ok = await feedback.confirm({
      title: 'Bersihkan Data Dummy?',
      message: 'Seluruh tiket gangguan, jadwal PM, dan Berita Acara akan dihapus dari database. Master data SPBU, akun pengguna, produk BBM, dan brand ATG tetap aman.',
      confirmLabel: 'Ya, Bersihkan',
      danger: true,
    });
    if (!ok) return;
    setIsCleaningDummy(true);
    try {
      const res = await cleanDummyDataApi();
      if (res.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pertamina_pm_all_reports_v1', JSON.stringify([]));
          localStorage.setItem('pertamina_pm_tickets_v1', JSON.stringify([]));
          localStorage.setItem('pertamina_pm_plans_v1', JSON.stringify([]));
          localStorage.setItem('pertamina_pm_dummy_cleared', 'true');
        }
        await feedback.notify({ variant: 'success', title: 'Data Dummy Dibersihkan', message: res.message || 'Seluruh data dummy berhasil dibersihkan. Halaman akan dimuat ulang.' });
        window.location.reload();
      } else if ((res as any).code !== 'UNAUTHENTICATED') {
        feedback.notify({ variant: (res as any).code === 'FORBIDDEN' ? 'forbidden' : 'error', title: 'Gagal Membersihkan Data', message: res.message || 'Gagal membersihkan data dummy.' });
      }
    } catch (err: any) {
      feedback.notify({ variant: 'error', title: 'Gagal Membersihkan Data', message: err.message || 'Gagal membersihkan data dummy.' });
    } finally {
      setIsCleaningDummy(false);
    }
  };

  // Form states for Site
  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [siteRegional, setSiteRegional] = useState('Pertamina International Timor, S.A.');
  const [sitePic, setSitePic] = useState('');

  // Form states for Product
  const [prodCode, setProdCode] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodOctane, setProdOctane] = useState('');
  const [prodColor, setProdColor] = useState('#2563EB');
  const [prodCapacity, setProdCapacity] = useState(20000);
  const [prodPrice, setProdPrice] = useState(1.20);
  const [prodStatus, setProdStatus] = useState<'Aktif' | 'Non-aktif'>('Aktif');
  const [prodNotes, setProdNotes] = useState('');

  // Form states for ATG
  const [atgBrandName, setAtgBrandName] = useState('');
  const [atgModel, setAtgModel] = useState('');
  const [atgProtocol, setAtgProtocol] = useState('');
  const [atgPort, setAtgPort] = useState(10001);
  const [atgBaud, setAtgBaud] = useState('9600 8-N-1');
  const [atgWater, setAtgWater] = useState(true);
  const [atgTemp, setAtgTemp] = useState(true);
  const [atgStatus, setAtgStatus] = useState<'Aktif' | 'Non-aktif'>('Aktif');
  const [atgNotes, setAtgNotes] = useState('');

  // Form states for Dispenser
  const [dspBrand, setDspBrand] = useState('');
  const [dspModel, setDspModel] = useState('');
  const [dspProtocol, setDspProtocol] = useState('');
  const [dspMaxNozzles, setDspMaxNozzles] = useState(6);
  const [dspPulse, setDspPulse] = useState('10:1');
  const [dspStatus, setDspStatus] = useState<'Aktif' | 'Non-aktif'>('Aktif');
  const [dspNotes, setDspNotes] = useState('');

  // Form states for Hardware
  const [hwCategory, setHwCategory] = useState<HardwareMasterConfig['category']>('POS');
  const [hwBrandModel, setHwBrandModel] = useState('');
  const [hwSpecs, setHwSpecs] = useState('');
  const [hwFirmware, setHwFirmware] = useState('');
  const [hwStatus, setHwStatus] = useState<'Aktif' | 'Non-aktif'>('Aktif');

  // Load from Turso on mount
  useEffect(() => {
    let isMounted = true;
    const loadFromCloud = async () => {
      setIsLoading(true);
      try {
        const [cloudSites, cloudConfig] = await Promise.all([
          fetchSitesApi(),
          fetchMasterConfigApi(),
        ]);

        if (isMounted) {
          if (cloudSites && cloudSites.length > 0) {
            setSites(cloudSites);
          }
          if (cloudConfig && cloudConfig.success) {
            if (cloudConfig.products?.length > 0) setProducts(cloudConfig.products);
            if (cloudConfig.atgBrands?.length > 0) setAtgBrands(cloudConfig.atgBrands);
            if (cloudConfig.dispenserBrands?.length > 0) setDispenserBrands(cloudConfig.dispenserBrands);
            if (cloudConfig.hardwareConfigs?.length > 0) setHardwareConfigs(cloudConfig.hardwareConfigs);
            if (cloudConfig.settings) setSystemSettings(cloudConfig.settings);
          }
        }
      } catch (err) {
        console.warn('Gagal sinkron master config:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadFromCloud();
    return () => { isMounted = false; };
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    feedback.notify(
      type === 'success'
        ? { variant: 'success', title: 'Berhasil', message: text }
        : { variant: 'warning', title: 'Periksa Kembali', message: text }
    );
  };

  // ----------------------------------------------------
  // Handlers for SPBU / Sites
  // ----------------------------------------------------
  const handleOpenAddSite = () => {
    setEditingSite(null);
    setSiteCode('');
    setSiteName('');
    setSiteLocation('');
    setSiteRegional('Pertamina International Timor, S.A.');
    setSitePic('');
    setIsSiteModalOpen(true);
  };

  const handleOpenEditSite = (site: Site) => {
    setEditingSite(site);
    setSiteCode(site.site_code);
    setSiteName(site.site_name);
    setSiteLocation(site.location);
    setSiteRegional(site.regional);
    setSitePic(site.contact_person);
    setIsSiteModalOpen(true);
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteCode.trim() || !siteName.trim()) {
      showFeedback('error', 'Kode SPBU dan Nama SPBU wajib diisi.');
      return;
    }

    if (editingSite) {
      const updated: Site = {
        ...editingSite,
        site_code: siteCode.trim(),
        site_name: siteName.trim(),
        location: siteLocation.trim(),
        regional: siteRegional.trim(),
        contact_person: sitePic.trim(),
      };
      const res = await feedback.run(() => updateSiteApi(updated), {
        pending: 'Menyimpan ke server...',
        success: { title: 'Data Berhasil Disimpan', message: `Data SPBU ${updated.site_name} berhasil diperbarui.` },
        error: { title: 'Gagal Menyimpan Data', message: 'Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.' },
      });
      if (!res.success) return;
      saveSite(updated);
      setSites(prev => prev.map(s => s.id === updated.id ? updated : s));
      setIsSiteModalOpen(false);
    } else {
      const nextId = sites.length > 0 ? Math.max(...sites.map(s => s.id)) + 1 : 1;
      const created: Site = {
        id: nextId,
        site_code: siteCode.trim(),
        site_name: siteName.trim(),
        location: siteLocation.trim(),
        regional: siteRegional.trim(),
        contact_person: sitePic.trim(),
      };
      const res = await feedback.run(() => createSiteApi(created), {
        pending: 'Menyimpan ke server...',
        success: { title: 'Data Berhasil Disimpan', message: `SPBU baru ${created.site_name} berhasil ditambahkan.` },
        error: { title: 'Gagal Menyimpan Data', message: 'Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.' },
      });
      if (!res.success) return;
      saveSite(created);
      setSites(prev => [...prev, created]);
      setIsSiteModalOpen(false);
    }
  };

  const handleDeleteSite = async (siteId: number, siteName: string) => {
    if (await feedback.confirm({ title: 'Konfirmasi Hapus', message: `Hapus SPBU "${siteName}" secara permanen dari sistem?` + ' Tindakan ini tidak dapat dibatalkan.', confirmLabel: 'Ya, Hapus', danger: true })) {
      const res = await feedback.run(() => deleteSiteApi(siteId), {
        pending: 'Menghapus data...',
        success: { title: 'Data Berhasil Dihapus', message: `SPBU ${siteName} berhasil dihapus.` },
        error: { title: 'Gagal Menghapus Data', message: 'Data masih tersimpan di server.' },
      });
      if (!res.success) return;
      deleteSite(siteId);
      setSites(prev => prev.filter(s => s.id !== siteId));
    }
  };

  // ----------------------------------------------------
  // Handlers for Fuel Products
  // ----------------------------------------------------
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdCode('');
    setProdName('');
    setProdOctane('');
    setProdColor('#2563EB');
    setProdCapacity(20000);
    setProdPrice(1.20);
    setProdStatus('Aktif');
    setProdNotes('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: FuelProduct) => {
    setEditingProduct(prod);
    setProdCode(prod.code);
    setProdName(prod.name);
    setProdOctane(prod.octane_cetane);
    setProdColor(prod.badge_color);
    setProdCapacity(prod.default_capacity_liters);
    setProdPrice(prod.price_usd_per_liter);
    setProdStatus(prod.status);
    setProdNotes(prod.notes || '');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodCode.trim() || !prodName.trim()) {
      showFeedback('error', 'Kode dan Nama Produk BBM wajib diisi.');
      return;
    }

    const item: FuelProduct = {
      id: editingProduct ? editingProduct.id : `PRD-${Date.now()}`,
      code: prodCode.trim().toUpperCase(),
      name: prodName.trim(),
      octane_cetane: prodOctane.trim(),
      badge_color: prodColor,
      default_capacity_liters: Number(prodCapacity) || 20000,
      price_usd_per_liter: Number(prodPrice) || 1.0,
      status: prodStatus,
      notes: prodNotes.trim() || undefined,
    };

    const res = await feedback.run(() => saveMasterConfigApi('product', { item }), {

      pending: 'Menyimpan ke server...',

      success: { title: 'Data Berhasil Disimpan', message: `Produk BBM ${item.name} berhasil disimpan.` },

      error: { title: 'Gagal Menyimpan Data', message: 'Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.' },

    });

    if (!res.success) return;

    saveProduct(item);
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === item.id ? item : p));
    } else {
      setProducts(prev => [...prev, item]);
    }
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = async (prodId: string, prodName: string) => {
    if (await feedback.confirm({ title: 'Konfirmasi Hapus', message: `Hapus produk "${prodName}" dari katalog?` + ' Tindakan ini tidak dapat dibatalkan.', confirmLabel: 'Ya, Hapus', danger: true })) {
      const res = await feedback.run(() => deleteMasterConfigItemApi('product', prodId), {
        pending: 'Menghapus data...',
        success: { title: 'Data Berhasil Dihapus', message: `Produk BBM ${prodName} dihapus.` },
        error: { title: 'Gagal Menghapus Data', message: 'Data masih tersimpan di server.' },
      });
      if (!res.success) return;
      deleteProduct(prodId);
      setProducts(prev => prev.filter(p => p.id !== prodId));
    }
  };

  // ----------------------------------------------------
  // Handlers for ATG Brands
  // ----------------------------------------------------
  const handleOpenAddAtg = () => {
    setEditingAtg(null);
    setAtgBrandName('');
    setAtgModel('');
    setAtgProtocol('');
    setAtgPort(10001);
    setAtgBaud('9600 8-N-1');
    setAtgWater(true);
    setAtgTemp(true);
    setAtgStatus('Aktif');
    setAtgNotes('');
    setIsAtgModalOpen(true);
  };

  const handleOpenEditAtg = (atg: AtgBrandConfig) => {
    setEditingAtg(atg);
    setAtgBrandName(atg.brand_name);
    setAtgModel(atg.model_series);
    setAtgProtocol(atg.protocol);
    setAtgPort(atg.default_port);
    setAtgBaud(atg.baud_rate);
    setAtgWater(atg.support_water_detection);
    setAtgTemp(atg.support_temperature_comp);
    setAtgStatus(atg.status);
    setAtgNotes(atg.notes || '');
    setIsAtgModalOpen(true);
  };

  const handleSaveAtg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atgBrandName.trim() || !atgModel.trim()) {
      showFeedback('error', 'Brand dan Model ATG wajib diisi.');
      return;
    }

    const item: AtgBrandConfig = {
      id: editingAtg ? editingAtg.id : `ATG-${Date.now()}`,
      brand_name: atgBrandName.trim(),
      model_series: atgModel.trim(),
      protocol: atgProtocol.trim() || 'Serial RS-232 / TCP-IP',
      default_port: Number(atgPort) || 10001,
      baud_rate: atgBaud.trim(),
      support_water_detection: atgWater,
      support_temperature_comp: atgTemp,
      status: atgStatus,
      notes: atgNotes.trim() || undefined,
    };

    const res = await feedback.run(() => saveMasterConfigApi('atg', { item }), {

      pending: 'Menyimpan ke server...',

      success: { title: 'Data Berhasil Disimpan', message: `Brand ATG ${item.brand_name} ${item.model_series} berhasil disimpan.` },

      error: { title: 'Gagal Menyimpan Data', message: 'Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.' },

    });

    if (!res.success) return;

    saveAtgBrand(item);
    if (editingAtg) {
      setAtgBrands(prev => prev.map(a => a.id === item.id ? item : a));
    } else {
      setAtgBrands(prev => [...prev, item]);
    }
    setIsAtgModalOpen(false);
  };

  const handleDeleteAtg = async (atgId: string, label: string) => {
    if (await feedback.confirm({ title: 'Konfirmasi Hapus', message: `Hapus konfigurasi ATG "${label}"?` + ' Tindakan ini tidak dapat dibatalkan.', confirmLabel: 'Ya, Hapus', danger: true })) {
      const res = await feedback.run(() => deleteMasterConfigItemApi('atg', atgId), {
        pending: 'Menghapus data...',
        success: { title: 'Data Berhasil Dihapus', message: `ATG ${label} berhasil dihapus.` },
        error: { title: 'Gagal Menghapus Data', message: 'Data masih tersimpan di server.' },
      });
      if (!res.success) return;
      deleteAtgBrand(atgId);
      setAtgBrands(prev => prev.filter(a => a.id !== atgId));
    }
  };

  // ----------------------------------------------------
  // Handlers for Dispensers
  // ----------------------------------------------------
  const handleOpenAddDispenser = () => {
    setEditingDispenser(null);
    setDspBrand('');
    setDspModel('');
    setDspProtocol('');
    setDspMaxNozzles(6);
    setDspPulse('10:1');
    setDspStatus('Aktif');
    setDspNotes('');
    setIsDispenserModalOpen(true);
  };

  const handleOpenEditDispenser = (dsp: DispenserBrandConfig) => {
    setEditingDispenser(dsp);
    setDspBrand(dsp.brand_name);
    setDspModel(dsp.series_model);
    setDspProtocol(dsp.interface_protocol);
    setDspMaxNozzles(dsp.max_nozzles);
    setDspPulse(dsp.pulse_ratio);
    setDspStatus(dsp.status);
    setDspNotes(dsp.notes || '');
    setIsDispenserModalOpen(true);
  };

  const handleSaveDispenser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dspBrand.trim() || !dspModel.trim()) {
      showFeedback('error', 'Brand dan Seri Dispenser wajib diisi.');
      return;
    }

    const item: DispenserBrandConfig = {
      id: editingDispenser ? editingDispenser.id : `DSP-${Date.now()}`,
      brand_name: dspBrand.trim(),
      series_model: dspModel.trim(),
      interface_protocol: dspProtocol.trim() || 'Two-Wire Current Loop',
      max_nozzles: Number(dspMaxNozzles) || 6,
      pulse_ratio: dspPulse.trim(),
      status: dspStatus,
      notes: dspNotes.trim() || undefined,
    };

    const res = await feedback.run(() => saveMasterConfigApi('dispenser', { item }), {

      pending: 'Menyimpan ke server...',

      success: { title: 'Data Berhasil Disimpan', message: `Brand Dispenser ${item.brand_name} berhasil disimpan.` },

      error: { title: 'Gagal Menyimpan Data', message: 'Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.' },

    });

    if (!res.success) return;

    saveDispenserBrand(item);
    if (editingDispenser) {
      setDispenserBrands(prev => prev.map(d => d.id === item.id ? item : d));
    } else {
      setDispenserBrands(prev => [...prev, item]);
    }
    setIsDispenserModalOpen(false);
  };

  const handleDeleteDispenser = async (dspId: string, label: string) => {
    if (await feedback.confirm({ title: 'Konfirmasi Hapus', message: `Hapus konfigurasi Dispenser "${label}"?` + ' Tindakan ini tidak dapat dibatalkan.', confirmLabel: 'Ya, Hapus', danger: true })) {
      const res = await feedback.run(() => deleteMasterConfigItemApi('dispenser', dspId), {
        pending: 'Menghapus data...',
        success: { title: 'Data Berhasil Dihapus', message: `Dispenser ${label} berhasil dihapus.` },
        error: { title: 'Gagal Menghapus Data', message: 'Data masih tersimpan di server.' },
      });
      if (!res.success) return;
      deleteDispenserBrand(dspId);
      setDispenserBrands(prev => prev.filter(d => d.id !== dspId));
    }
  };

  // ----------------------------------------------------
  // Handlers for Hardware
  // ----------------------------------------------------
  const handleOpenAddHw = () => {
    setEditingHw(null);
    setHwCategory('POS');
    setHwBrandModel('');
    setHwSpecs('');
    setHwFirmware('');
    setHwStatus('Aktif');
    setIsHwModalOpen(true);
  };

  const handleOpenEditHw = (hw: HardwareMasterConfig) => {
    setEditingHw(hw);
    setHwCategory(hw.category);
    setHwBrandModel(hw.brand_model);
    setHwSpecs(hw.specs_description);
    setHwFirmware(hw.default_os_firmware || '');
    setHwStatus(hw.status);
    setIsHwModalOpen(true);
  };

  const handleSaveHw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwBrandModel.trim() || !hwSpecs.trim()) {
      showFeedback('error', 'Nama Model Hardware dan Spesifikasi wajib diisi.');
      return;
    }

    const item: HardwareMasterConfig = {
      id: editingHw ? editingHw.id : `HW-${Date.now()}`,
      category: hwCategory,
      brand_model: hwBrandModel.trim(),
      specs_description: hwSpecs.trim(),
      default_os_firmware: hwFirmware.trim() || undefined,
      status: hwStatus,
    };

    const res = await feedback.run(() => saveMasterConfigApi('hardware', { item }), {

      pending: 'Menyimpan ke server...',

      success: { title: 'Data Berhasil Disimpan', message: `Hardware ${item.brand_model} berhasil disimpan.` },

      error: { title: 'Gagal Menyimpan Data', message: 'Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.' },

    });

    if (!res.success) return;

    saveHardwareConfig(item);
    if (editingHw) {
      setHardwareConfigs(prev => prev.map(h => h.id === item.id ? item : h));
    } else {
      setHardwareConfigs(prev => [...prev, item]);
    }
    setIsHwModalOpen(false);
  };

  const handleDeleteHw = async (hwId: string, label: string) => {
    if (await feedback.confirm({ title: 'Konfirmasi Hapus', message: `Hapus hardware "${label}"?` + ' Tindakan ini tidak dapat dibatalkan.', confirmLabel: 'Ya, Hapus', danger: true })) {
      const res = await feedback.run(() => deleteMasterConfigItemApi('hardware', hwId), {
        pending: 'Menghapus data...',
        success: { title: 'Data Berhasil Dihapus', message: `Hardware ${label} berhasil dihapus.` },
        error: { title: 'Gagal Menghapus Data', message: 'Data masih tersimpan di server.' },
      });
      if (!res.success) return;
      deleteHardwareConfig(hwId);
      setHardwareConfigs(prev => prev.filter(h => h.id !== hwId));
    }
  };

  // ----------------------------------------------------
  // Handlers for Global System Settings
  // ----------------------------------------------------
  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await feedback.run(() => saveMasterConfigApi('settings', { settings: systemSettings }), {
      pending: 'Menyimpan ke server...',
      success: { title: 'Data Berhasil Disimpan', message: 'Konfigurasi Parameter Sistem berhasil disimpan.' },
      error: { title: 'Gagal Menyimpan Data', message: 'Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.' },
    });
    if (!res.success) return;
    saveSystemSettings(systemSettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Feedback Alert */}
      {feedbackMsg && (
        <div 
          role="alert"
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in-50 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* Sub-tabs Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-1.5 flex overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => setSubTab('sites')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            subTab === 'sites' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Data SPBU ({sites.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('products')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            subTab === 'products' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Fuel className="w-4 h-4" />
          <span>Produk BBM ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('atg')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            subTab === 'atg' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Brand ATG ({atgBrands.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('dispensers')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            subTab === 'dispensers' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Dispenser ({dispenserBrands.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('hardware')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            subTab === 'hardware' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Hardware & POS ({hardwareConfigs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('settings')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            subTab === 'settings' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Parameter Sistem</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* SUB-TAB 1: DATA SPBU / SITES */}
      {/* ==================================================== */}
      {subTab === 'sites' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-base font-extrabold text-[#0B2545]">Master Data Site SPBU Pertamina</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola jaringan SPBU Pertamina International Timor, S.A., lokasi, kode site, dan kontak PWS pengawas.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddSite}
              className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah SPBU Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <div 
                key={site.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                      {site.site_code}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">ID #{site.id}</span>
                  </div>

                  <h4 className="text-sm font-extrabold text-[#0B2545] leading-snug">
                    {site.site_name}
                  </h4>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Lokasi / Alamat:</span>
                      <p className="font-medium text-slate-800">{site.location}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Regional:</span>
                      <p className="font-medium text-slate-700">{site.regional}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">PIC / Pengawas (PWS):</span>
                      <p className="font-semibold text-slate-900">{site.contact_person}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Forecourt &amp; ATG:</span>
                      {hasForecourtConfig(site) ? (
                        <p className="font-semibold text-emerald-800">
                          {forecourtSummary(site.forecourt)}
                          {(site.forecourt?.dispenser_brand || site.forecourt?.atg_brand) && (
                            <span className="block text-[11px] font-medium text-slate-600">
                              {[site.forecourt?.dispenser_brand, site.forecourt?.atg_brand].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="font-semibold text-amber-700">Belum dikonfigurasi — teknisi harus menambah pump/tangki manual</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setForecourtSite(site)}
                    className="min-h-[40px] px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-200"
                  >
                    <Fuel className="w-3.5 h-3.5" />
                    <span>Forecourt &amp; ATG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditSite(site)}
                    className="min-h-[40px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSite(site.id, site.site_name)}
                    className="min-h-[40px] px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 2: PRODUK BBM */}
      {/* ==================================================== */}
      {subTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-base font-extrabold text-[#0B2545]">Master Katalog Produk BBM Pertamina</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasi jenis BBM, RON/Cetane number, kapasitas tangki standar, dan harga jual resmi di Timor Leste.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddProduct}
              className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk BBM</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Kode & Warna</th>
                    <th className="p-3.5">Nama Produk</th>
                    <th className="p-3.5">Oktan / Cetane</th>
                    <th className="p-3.5">Kapasitas Default</th>
                    <th className="p-3.5">Harga / Liter</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs flex-shrink-0"
                            style={{ backgroundColor: p.badge_color }}
                          />
                          <span className="font-mono font-bold text-slate-900">{p.code}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {p.name}
                        {p.notes && <span className="block text-[11px] font-normal text-slate-500">{p.notes}</span>}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700">{p.octane_cetane}</td>
                      <td className="p-3.5 font-mono text-slate-800">
                        {p.default_capacity_liters.toLocaleString()} L
                      </td>
                      <td className="p-3.5 font-bold text-emerald-700">
                        ${p.price_usd_per_liter.toFixed(2)} USD
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          p.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(p)}
                            className="min-h-[36px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="min-h-[36px] px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 rounded text-xs font-bold transition-colors border border-red-200"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 3: BRAND ATG */}
      {/* ==================================================== */}
      {subTab === 'atg' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-base font-extrabold text-[#0B2545]">Master Brand & Protokol ATG (Automatic Tank Gauge)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar konsol ATG tangki pendam yang didukung di SPBU Pertamina (Veeder-Root, OPW, Franklin, Enraf).
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddAtg}
              className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Brand ATG</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {atgBrands.map((a) => (
              <div 
                key={a.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#0B2545]">
                      {a.brand_name}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      a.status === 'Aktif'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {a.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-[#0B2545] leading-snug">
                    {a.model_series}
                  </h4>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Protokol Komunikasi:</span>
                      <p className="font-semibold text-slate-800 font-mono text-[11px]">{a.protocol}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Default Port:</span>
                        <p className="font-mono text-slate-900 font-bold">{a.default_port}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Baud Rate:</span>
                        <p className="font-mono text-slate-900">{a.baud_rate}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-slate-700">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${a.support_water_detection ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Deteksi Air</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-700">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${a.support_temperature_comp ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Kompensasi Suhu</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditAtg(a)}
                    className="min-h-[40px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAtg(a.id, `${a.brand_name} ${a.model_series}`)}
                    className="min-h-[40px] px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 4: BRAND DISPENSER */}
      {/* ==================================================== */}
      {subTab === 'dispensers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-base font-extrabold text-[#0B2545]">Master Brand Dispenser & Interface Forecourt</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasi dispenser BBM pompa pulau SPBU (Gilbarco, Tatsuno, Wayne, Tokheim) dan interface protocol loop box.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddDispenser}
              className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Brand Dispenser</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dispenserBrands.map((d) => (
              <div 
                key={d.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-900 border border-red-200">
                      {d.brand_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{d.pulse_ratio}</span>
                  </div>

                  <h4 className="text-sm font-extrabold text-[#0B2545] leading-snug">
                    {d.series_model}
                  </h4>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Interface Loop Box:</span>
                      <p className="font-semibold text-slate-800 font-mono text-[11px]">{d.interface_protocol}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Kapasitas Maksimal Nozzle:</span>
                      <p className="font-bold text-slate-900">{d.max_nozzles} Nozzle per dispenser</p>
                    </div>
                    {d.notes && (
                      <div className="pt-1 text-[11px] text-slate-500 italic">
                        {d.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditDispenser(d)}
                    className="min-h-[40px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDispenser(d.id, `${d.brand_name} ${d.series_model}`)}
                    className="min-h-[40px] px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 5: HARDWARE & POS MASTER */}
      {/* ==================================================== */}
      {subTab === 'hardware' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-base font-extrabold text-[#0B2545]">Master Perangkat POS, EDC, Printer & UPS</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Katalog hardware baku POS PINSYST, mesin EDC perbankan, thermal printer struk, dan sistem catu daya UPS.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddHw}
              className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Master Hardware</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hardwareConfigs.map((h) => (
              <div 
                key={h.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      h.category === 'POS' ? 'bg-purple-100 text-purple-900 border-purple-200' :
                      h.category === 'EDC' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                      h.category === 'PRINTER' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' :
                      'bg-amber-100 text-amber-900 border-amber-200'
                    }`}>
                      {h.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">{h.status}</span>
                  </div>

                  <h4 className="text-sm font-extrabold text-[#0B2545] leading-snug">
                    {h.brand_model}
                  </h4>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Spesifikasi Teknis:</span>
                      <p className="font-medium text-slate-800">{h.specs_description}</p>
                    </div>
                    {h.default_os_firmware && (
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">OS / Firmware Default:</span>
                        <p className="font-mono text-slate-900 text-[11px]">{h.default_os_firmware}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditHw(h)}
                    className="min-h-[40px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHw(h.id, h.brand_model)}
                    className="min-h-[40px] px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 6: PARAMETER & TOLERANSI SISTEM */}
      {/* ==================================================== */}
      {subTab === 'settings' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSystemSettings} className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-[#0B2545]">Konfigurasi Batas Toleransi Teknis & Kebijakan PM</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Parameter standar kelistrikan, toleransi keselamatan instalasi forecourt, dan identitas resmi perusahaan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-200">
                1. Standar Kelistrikan & Grounding
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ambang Batas Maksimal Grounding (Neutral-Ground)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={systemSettings.max_grounding_volts}
                    onChange={(e) => setSystemSettings({ ...systemSettings, max_grounding_volts: parseFloat(e.target.value) || 2.0 })}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">Volt (V)</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Standar IT Pertamina: Tegangan neutral ke ground wajib &lt; 2.0 V untuk mencegah kerusakan motherboard POS.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batas Bawah Voltase UPS
                  </label>
                  <input
                    type="number"
                    required
                    value={systemSettings.min_ups_volts}
                    onChange={(e) => setSystemSettings({ ...systemSettings, min_ups_volts: parseFloat(e.target.value) || 210 })}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batas Atas Voltase UPS
                  </label>
                  <input
                    type="number"
                    required
                    value={systemSettings.max_ups_volts}
                    onChange={(e) => setSystemSettings({ ...systemSettings, max_ups_volts: parseFloat(e.target.value) || 235 })}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Interval Rutin Preventive Maintenance
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={systemSettings.pm_routine_interval_days}
                    onChange={(e) => setSystemSettings({ ...systemSettings, pm_routine_interval_days: parseInt(e.target.value, 10) || 14 })}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">Hari</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Nilai default: 14 hari (Siklus Dwi-Mingguan).
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-200">
                2. Identitas Organisasi & Helpdesk
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Resmi Entitas Perusahaan
                </label>
                <input
                  type="text"
                  required
                  value={systemSettings.company_name}
                  onChange={(e) => setSystemSettings({ ...systemSettings, company_name: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Yurisdiksi Negara
                  </label>
                  <input
                    type="text"
                    required
                    value={systemSettings.country_jurisdiction}
                    onChange={(e) => setSystemSettings({ ...systemSettings, country_jurisdiction: e.target.value })}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mata Uang Transaksi
                  </label>
                  <input
                    type="text"
                    required
                    value={systemSettings.official_currency}
                    onChange={(e) => setSystemSettings({ ...systemSettings, official_currency: e.target.value })}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Helpdesk IT Central
                </label>
                <input
                  type="email"
                  required
                  value={systemSettings.helpdesk_email}
                  onChange={(e) => setSystemSettings({ ...systemSettings, helpdesk_email: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Telepon Darurat SPBU
                </label>
                <input
                  type="text"
                  required
                  value={systemSettings.emergency_phone}
                  onChange={(e) => setSystemSettings({ ...systemSettings, emergency_phone: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
            <button
              type="submit"
              className="min-h-[44px] px-6 py-2.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Parameter Sistem</span>
            </button>
          </div>
        </form>

        {/* Zona Khusus: Pembersihan Data Dummy Transaksional */}
        <div className="bg-red-50/70 rounded-xl border border-red-200 p-5 mt-6 space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0 border border-red-300">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="text-sm font-extrabold text-red-950">
                Pembersihan Data Dummy Transaksional (Reset Data Sampel Operasional)
              </h4>
              <p className="text-xs text-red-800 leading-relaxed">
                Tindakan ini akan menghapus seluruh data tiket kendala pengujian, jadwal PM sampel, dan arsip Berita Acara dummy dari database Turso & cache browser. <strong>Master data penting seperti Akun Pengguna (RBAC), Daftar SPBU Timor Leste, Produk BBM, Brand ATG, dan Dispenser akan tetap aman dan utuh dipertahankan.</strong>
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExecuteCleanDummy}
                  disabled={isCleaningDummy}
                  className="min-h-[42px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isCleaningDummy ? 'Sedang Membersihkan Database...' : 'Bersihkan Seluruh Data Dummy Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: ADD / EDIT SITE */}
      {/* ==================================================== */}
      {isSiteModalOpen && (
        <ModalPortal><div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-[#0B2545] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold">
                  {editingSite ? 'Edit Data SPBU' : 'Tambah Site SPBU Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSiteModalOpen(false)}
                className="text-slate-300 hover:text-white text-xs font-bold px-2 py-1"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveSite} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Site SPBU (Contoh: PITL-006)
                </label>
                <input
                  type="text"
                  required
                  value={siteCode}
                  onChange={(e) => setSiteCode(e.target.value)}
                  placeholder="PITL-006"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap SPBU
                </label>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="SPBU Pertamina Timor Ermera Hub"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat & Lokasi
                </label>
                <input
                  type="text"
                  required
                  value={siteLocation}
                  onChange={(e) => setSiteLocation(e.target.value)}
                  placeholder="Estrada Principal Gleno, Ermera, Timor Leste"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Regional Operasional
                </label>
                <input
                  type="text"
                  required
                  value={siteRegional}
                  onChange={(e) => setSiteRegional(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kontak Person PIC / Pengawas (PWS)
                </label>
                <input
                  type="text"
                  required
                  value={sitePic}
                  onChange={(e) => setSitePic(e.target.value)}
                  placeholder="Antonio Gusmao (+670 7711 2233)"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSiteModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan SPBU</span>
                </button>
              </div>
            </form>
          </div>
        </div></ModalPortal>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: ADD / EDIT PRODUCT */}
      {/* ==================================================== */}
      {isProductModalOpen && (
        <ModalPortal><div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-[#0B2545] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold">
                  {editingProduct ? 'Edit Master Produk BBM' : 'Tambah Produk BBM Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-300 hover:text-white text-xs font-bold px-2 py-1"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Produk (Contoh: PTX)
                  </label>
                  <input
                    type="text"
                    required
                    value={prodCode}
                    onChange={(e) => setProdCode(e.target.value)}
                    placeholder="PTX"
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Warna Indikator Tangki
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={prodColor}
                      onChange={(e) => setProdColor(e.target.value)}
                      className="w-11 h-11 p-1 bg-white border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={prodColor}
                      onChange={(e) => setProdColor(e.target.value)}
                      className="w-full min-h-[44px] px-2 py-1 text-xs font-mono border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Produk
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Pertamax (RON 92)"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Oktan / Cetane
                  </label>
                  <input
                    type="text"
                    required
                    value={prodOctane}
                    onChange={(e) => setProdOctane(e.target.value)}
                    placeholder="RON 92"
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kapasitas Tangki (L)
                  </label>
                  <input
                    type="number"
                    required
                    value={prodCapacity}
                    onChange={(e) => setProdCapacity(parseInt(e.target.value, 10) || 20000)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga USD/L
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(parseFloat(e.target.value) || 1.20)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  value={prodNotes}
                  onChange={(e) => setProdNotes(e.target.value)}
                  placeholder="Standar bahan bakar mesin bensin"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Produk</span>
                </button>
              </div>
            </form>
          </div>
        </div></ModalPortal>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: ADD / EDIT ATG */}
      {/* ==================================================== */}
      {isAtgModalOpen && (
        <ModalPortal><div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-[#0B2545] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold">
                  {editingAtg ? 'Edit Brand ATG' : 'Tambah Brand ATG Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAtgModalOpen(false)}
                className="text-slate-300 hover:text-white text-xs font-bold px-2 py-1"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveAtg} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand Manufacturer
                  </label>
                  <input
                    type="text"
                    required
                    value={atgBrandName}
                    onChange={(e) => setAtgBrandName(e.target.value)}
                    placeholder="Veeder-Root"
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seri / Model Konsol
                  </label>
                  <input
                    type="text"
                    required
                    value={atgModel}
                    onChange={(e) => setAtgModel(e.target.value)}
                    placeholder="TLS-450 Plus"
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Protokol Komunikasi Data
                </label>
                <input
                  type="text"
                  required
                  value={atgProtocol}
                  onChange={(e) => setAtgProtocol(e.target.value)}
                  placeholder="Veeder-Root Serial / Ethernet TCP"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Port
                  </label>
                  <input
                    type="number"
                    required
                    value={atgPort}
                    onChange={(e) => setAtgPort(parseInt(e.target.value, 10) || 10001)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Baud Rate
                  </label>
                  <input
                    type="text"
                    required
                    value={atgBaud}
                    onChange={(e) => setAtgBaud(e.target.value)}
                    placeholder="9600 8-N-1"
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={atgWater}
                    onChange={(e) => setAtgWater(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Dukung Sensor Air Tangki</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={atgTemp}
                    onChange={(e) => setAtgTemp(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Dukung Sensor Suhu BBM</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAtgModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan ATG</span>
                </button>
              </div>
            </form>
          </div>
        </div></ModalPortal>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: ADD / EDIT DISPENSER */}
      {/* ==================================================== */}
      {isDispenserModalOpen && (
        <ModalPortal><div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-[#0B2545] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold">
                  {editingDispenser ? 'Edit Brand Dispenser' : 'Tambah Brand Dispenser'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDispenserModalOpen(false)}
                className="text-slate-300 hover:text-white text-xs font-bold px-2 py-1"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveDispenser} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand Dispenser
                  </label>
                  <input
                    type="text"
                    required
                    value={dspBrand}
                    onChange={(e) => setDspBrand(e.target.value)}
                    placeholder="Gilbarco Veeder-Root"
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seri / Model
                  </label>
                  <input
                    type="text"
                    required
                    value={dspModel}
                    onChange={(e) => setDspModel(e.target.value)}
                    placeholder="Encore 500S"
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Interface Loop Protocol
                </label>
                <input
                  type="text"
                  required
                  value={dspProtocol}
                  onChange={(e) => setDspProtocol(e.target.value)}
                  placeholder="Gilbarco Two-Wire Current Loop"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Maksimal Nozzle
                  </label>
                  <input
                    type="number"
                    required
                    value={dspMaxNozzles}
                    onChange={(e) => setDspMaxNozzles(parseInt(e.target.value, 10) || 6)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rasio Pulser (Pulse Ratio)
                  </label>
                  <input
                    type="text"
                    required
                    value={dspPulse}
                    onChange={(e) => setDspPulse(e.target.value)}
                    placeholder="10:1"
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDispenserModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Dispenser</span>
                </button>
              </div>
            </form>
          </div>
        </div></ModalPortal>
      )}

      {/* ==================================================== */}
      {/* MODAL 5: ADD / EDIT HARDWARE */}
      {/* ==================================================== */}
      {isHwModalOpen && (
        <ModalPortal><div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-[#0B2545] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold">
                  {editingHw ? 'Edit Master Hardware' : 'Tambah Hardware Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHwModalOpen(false)}
                className="text-slate-300 hover:text-white text-xs font-bold px-2 py-1"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveHw} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Perangkat
                </label>
                <select
                  value={hwCategory}
                  onChange={(e) => setHwCategory(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                >
                  <option value="POS">POS Terminal & PC Kasir</option>
                  <option value="EDC">Mesin EDC Perbankan</option>
                  <option value="PRINTER">Printer Thermal Struk</option>
                  <option value="UPS">Sistem UPS & Catu Daya</option>
                  <option value="NETWORK">Perangkat Jaringan & Router</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brand & Nama Model
                </label>
                <input
                  type="text"
                  required
                  value={hwBrandModel}
                  onChange={(e) => setHwBrandModel(e.target.value)}
                  placeholder="Advantech UTC-520 Touch POS"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Spesifikasi Teknis
                </label>
                <textarea
                  rows={2}
                  required
                  value={hwSpecs}
                  onChange={(e) => setHwSpecs(e.target.value)}
                  placeholder="Intel Core i3, 8GB DDR4, 256GB SSD, IP65 Front Panel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  OS / Firmware Default
                </label>
                <input
                  type="text"
                  value={hwFirmware}
                  onChange={(e) => setHwFirmware(e.target.value)}
                  placeholder="Windows 10 IoT Enterprise LTSC"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHwModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Hardware</span>
                </button>
              </div>
            </form>
          </div>
        </div></ModalPortal>
      )}

      {forecourtSite && (
        <SiteForecourtEditor
          site={forecourtSite}
          onClose={() => setForecourtSite(null)}
          onSaved={(forecourt) => {
            const next = sites.map((x) => (x.id === forecourtSite.id ? { ...x, forecourt } : x));
            setSites(next);
            saveAllSites(next);
            setForecourtSite(null);
          }}
        />
      )}
    </div>
  );
};

