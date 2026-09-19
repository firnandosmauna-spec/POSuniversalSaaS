import { useState, useEffect } from "react";
import { 
  Globe, 
  Sparkles, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Eye, 
  Building2, 
  CreditCard, 
  BarChart3, 
  LayoutDashboard, 
  Receipt, 
  ShieldCheck, 
  Check, 
  Layers, 
  DollarSign, 
  FileText, 
  HelpCircle,
  Smartphone,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  getLandingCmsContent, 
  saveLandingCmsContent, 
  resetLandingCmsContent, 
  LandingCmsContent, 
  FeatureItem, 
  StepItem, 
  PricingPlan 
} from "@/shared/utils/cmsStore";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";

export function CmsView() {
  const { user } = useAuth();
  const [cmsData, setCmsData] = useState<LandingCmsContent>(getLandingCmsContent());
  const [activeTab, setActiveTab] = useState<"hero" | "business" | "features" | "steps" | "pricing" | "footer">("hero");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBusinessType, setNewBusinessType] = useState("");

  useEffect(() => {
    const fetchCmsFromDb = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("store_settings")
          .select("cms_content")
          .eq("tenant_id", user.id)
          .maybeSingle();

        if (data && data.cms_content) {
          setCmsData(data.cms_content);
          saveLandingCmsContent(data.cms_content);
        }
      } catch (e) {
        console.error("Error fetching CMS settings from Supabase:", e);
      }
    };
    fetchCmsFromDb();
  }, [user]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      saveLandingCmsContent(cmsData);

      if (user) {
        await supabase
          .from("store_settings")
          .upsert({
            tenant_id: user.id,
            cms_content: cmsData,
            updated_at: new Date().toISOString()
          }, { onConflict: "tenant_id" });
      }

      alert("Konten Landing Page CMS berhasil disimpan!");
    } catch (e: any) {
      console.error(e);
      alert("CMS berhasil disimpan ke penyimpanan lokal!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset seluruh konten Landing Page ke standar awal pabrik?")) {
      const def = resetLandingCmsContent();
      setCmsData(def);
      alert("Konten CMS berhasil di-reset ke standar default.");
    }
  };

  // Helper updater handlers
  const updateHero = (field: keyof LandingCmsContent["hero"], val: string) => {
    setCmsData(prev => ({
      ...prev,
      hero: { ...prev.hero, [field]: val }
    }));
  };

  const updateFeaturesHeader = (field: keyof LandingCmsContent["featuresHeader"], val: string) => {
    setCmsData(prev => ({
      ...prev,
      featuresHeader: { ...prev.featuresHeader, [field]: val }
    }));
  };

  const updateFeatureItem = (index: number, field: keyof FeatureItem, val: string) => {
    setCmsData(prev => {
      const updated = [...prev.features];
      if (updated[index]) {
        updated[index] = { ...updated[index]!, [field]: val };
      }
      return { ...prev, features: updated };
    });
  };

  const updateStepsHeader = (field: keyof LandingCmsContent["stepsHeader"], val: string) => {
    setCmsData(prev => ({
      ...prev,
      stepsHeader: { ...prev.stepsHeader, [field]: val }
    }));
  };

  const updateStepItem = (index: number, field: keyof StepItem, val: string) => {
    setCmsData(prev => {
      const updated = [...prev.steps];
      if (updated[index]) {
        updated[index] = { ...updated[index]!, [field]: val };
      }
      return { ...prev, steps: updated };
    });
  };

  const updatePricingHeader = (field: keyof LandingCmsContent["pricingHeader"], val: string) => {
    setCmsData(prev => ({
      ...prev,
      pricingHeader: { ...prev.pricingHeader, [field]: val }
    }));
  };

  const updatePricingPlan = (index: number, field: keyof PricingPlan, val: any) => {
    setCmsData(prev => {
      const updated = [...prev.pricingPlans];
      if (updated[index]) {
        updated[index] = { ...updated[index]!, [field]: val };
      }
      return { ...prev, pricingPlans: updated };
    });
  };

  const updateCta = (field: keyof LandingCmsContent["ctaSection"], val: string) => {
    setCmsData(prev => ({
      ...prev,
      ctaSection: { ...prev.ctaSection, [field]: val }
    }));
  };

  const updateFooter = (field: keyof LandingCmsContent["footer"], val: string) => {
    setCmsData(prev => ({
      ...prev,
      footer: { ...prev.footer, [field]: val }
    }));
  };

  const addBusinessType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessType.trim()) return;
    setCmsData(prev => ({
      ...prev,
      businessTypes: [...prev.businessTypes, newBusinessType.trim()]
    }));
    setNewBusinessType("");
  };

  const removeBusinessType = (idx: number) => {
    setCmsData(prev => ({
      ...prev,
      businessTypes: prev.businessTypes.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Action Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center bg-brand/10 text-brand">
            <Globe className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Manajemen CMS Landing Page
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ubah seluruh teks, fitur, testimoni, dan paket harga halaman depan aplikasi secara instan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => window.open("/", "_blank")}
            className="text-xs font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <Eye className="size-4 mr-1.5" /> Lihat Landing Page
          </Button>
          <Button 
            variant="outline"
            onClick={handleReset}
            className="text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
          >
            <RotateCcw className="size-4 mr-1.5" /> Reset Default
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting} 
            className="bg-brand text-white font-bold text-xs shadow-md"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Save className="size-4 mr-1.5" />}
            Simpan CMS
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 overflow-hidden">
        {/* Navigation Sidebar CMS */}
        <div className="col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 space-y-1 overflow-y-auto">
          {[
            { id: "hero", label: "Hero Banner & Mockup", icon: Sparkles },
            { id: "business", label: "Kategori Tipe Bisnis", icon: Building2 },
            { id: "features", label: "Fitur Utama & Keunggulan", icon: Layers },
            { id: "steps", label: "Cara Kerja (3 Langkah)", icon: Check },
            { id: "pricing", label: "Paket & Skema Harga", icon: DollarSign },
            { id: "footer", label: "CTA & Teks Footer", icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full text-left px-3 py-2.5 font-bold text-xs flex items-center gap-2.5 transition-colors ${
                activeTab === tab.id
                  ? "bg-brand text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Form Editor Container */}
        <div className="col-span-1 md:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 overflow-y-auto">
          {activeTab === "hero" ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                1. Hero Banner Header Utama
              </h2>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Badge Tagline Hero</label>
                  <Input 
                    value={cmsData.hero.badgeText}
                    onChange={(e) => updateHero("badgeText", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Utama Baris 1</label>
                    <Input 
                      value={cmsData.hero.headingLine1}
                      onChange={(e) => updateHero("headingLine1", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Utama Baris 2</label>
                    <Input 
                      value={cmsData.hero.headingLine2}
                      onChange={(e) => updateHero("headingLine2", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Subtitle</label>
                  <textarea 
                    rows={3}
                    value={cmsData.hero.subtitle}
                    onChange={(e) => updateHero("subtitle", e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Teks Tombol CTA Utama</label>
                  <Input 
                    value={cmsData.hero.ctaText}
                    onChange={(e) => updateHero("ctaText", e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold uppercase text-brand mb-3">Statistik Kartu Mockup Hero</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Total Omzet (Rp)</label>
                      <Input value={cmsData.hero.mockupSalesAmount} onChange={(e) => updateHero("mockupSalesAmount", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Pertumbuhan (%)</label>
                      <Input value={cmsData.hero.mockupSalesGrowth} onChange={(e) => updateHero("mockupSalesGrowth", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Total Transaksi</label>
                      <Input value={cmsData.hero.mockupTxCount} onChange={(e) => updateHero("mockupTxCount", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Item Terjual</label>
                      <Input value={cmsData.hero.mockupItemsCount} onChange={(e) => updateHero("mockupItemsCount", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Rata-rata Order</label>
                      <Input value={cmsData.hero.mockupAvgAmount} onChange={(e) => updateHero("mockupAvgAmount", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "business" ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                2. Daftar Tipe Bisnis Yang Didukung
              </h2>

              <form onSubmit={addBusinessType} className="flex gap-2">
                <Input 
                  placeholder="Tambah Jenis Bisnis Baru (contoh: Toko Sembako)"
                  value={newBusinessType}
                  onChange={(e) => setNewBusinessType(e.target.value)}
                />
                <Button type="submit" className="bg-brand text-white font-bold text-xs shrink-0">
                  <Plus className="size-4 mr-1" /> Tambah Tag
                </Button>
              </form>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {cmsData.businessTypes.map((type, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{type}</span>
                    <button onClick={() => removeBusinessType(idx)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "features" ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                3. Section Fitur & Keunggulan
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Badge Tagline</label>
                  <Input value={cmsData.featuresHeader.badgeText} onChange={(e) => updateFeaturesHeader("badgeText", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Seksi</label>
                  <Input value={cmsData.featuresHeader.heading} onChange={(e) => updateFeaturesHeader("heading", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Subtitle</label>
                  <Input value={cmsData.featuresHeader.subtitle} onChange={(e) => updateFeaturesHeader("subtitle", e.target.value)} />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase text-brand">Kartu Fitur (6 Fitur)</h3>
                {cmsData.features.map((feat, idx) => (
                  <div key={feat.id} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand uppercase">Fitur #{idx + 1}</span>
                      <select 
                        value={feat.iconName}
                        onChange={(e) => updateFeatureItem(idx, "iconName", e.target.value)}
                        className="text-xs p-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                      >
                        <option value="Building2">Building2 (Multi-Toko)</option>
                        <option value="CreditCard">CreditCard (Pembayaran)</option>
                        <option value="BarChart3">BarChart3 (Laporan)</option>
                        <option value="LayoutDashboard">LayoutDashboard (Dasbor)</option>
                        <option value="Receipt">Receipt (Struk)</option>
                        <option value="ShieldCheck">ShieldCheck (Keamanan)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input 
                        placeholder="Judul Fitur"
                        value={feat.title}
                        onChange={(e) => updateFeatureItem(idx, "title", e.target.value)}
                      />
                      <Input 
                        placeholder="Deskripsi Singkat"
                        value={feat.description}
                        onChange={(e) => updateFeatureItem(idx, "description", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "steps" ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                4. Section Cara Kerja (3 Langkah)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Badge Tagline</label>
                  <Input value={cmsData.stepsHeader.badgeText} onChange={(e) => updateStepsHeader("badgeText", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Seksi</label>
                  <Input value={cmsData.stepsHeader.heading} onChange={(e) => updateStepsHeader("heading", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Subtitle</label>
                  <Input value={cmsData.stepsHeader.subtitle} onChange={(e) => updateStepsHeader("subtitle", e.target.value)} />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {cmsData.steps.map((step, idx) => (
                  <div key={step.id} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-bold text-brand uppercase">Langkah #{idx + 1}</span>
                    <Input 
                      placeholder="Judul Langkah"
                      value={step.title}
                      onChange={(e) => updateStepItem(idx, "title", e.target.value)}
                    />
                    <textarea 
                      rows={2}
                      placeholder="Penjelasan langkah"
                      value={step.description}
                      onChange={(e) => updateStepItem(idx, "description", e.target.value)}
                      className="w-full p-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "pricing" ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                5. Seksi Skema Paket & Harga
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Badge Tagline</label>
                  <Input value={cmsData.pricingHeader.badgeText} onChange={(e) => updatePricingHeader("badgeText", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Seksi</label>
                  <Input value={cmsData.pricingHeader.heading} onChange={(e) => updatePricingHeader("heading", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Subtitle</label>
                  <Input value={cmsData.pricingHeader.subtitle} onChange={(e) => updatePricingHeader("subtitle", e.target.value)} />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {cmsData.pricingPlans.map((plan, idx) => (
                  <div key={plan.id} className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand uppercase">Paket Langganan #{idx + 1}</span>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={plan.highlighted}
                          onChange={(e) => updatePricingPlan(idx, "highlighted", e.target.checked)}
                          className="rounded text-brand focus:ring-brand"
                        />
                        Sorot Sebagai "Paling Populer"
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Nama Paket</label>
                        <Input value={plan.name} onChange={(e) => updatePricingPlan(idx, "name", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Harga (Rp)</label>
                        <Input value={plan.price} onChange={(e) => updatePricingPlan(idx, "price", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Periode (cth: /bulan)</label>
                        <Input value={plan.period} onChange={(e) => updatePricingPlan(idx, "period", e.target.value)} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Deskripsi Paket</label>
                      <Input value={plan.description} onChange={(e) => updatePricingPlan(idx, "description", e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Fitur Terdaftar (Satu fitur per baris)</label>
                      <textarea 
                        rows={4}
                        value={plan.features.join("\n")}
                        onChange={(e) => updatePricingPlan(idx, "features", e.target.value.split("\n"))}
                        className="w-full p-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                6. Final Call-To-Action & Footer Teks
              </h2>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-brand">Final CTA Banner Bottom</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Ajakan CTA</label>
                  <Input value={cmsData.ctaSection.heading} onChange={(e) => updateCta("heading", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sub-Deskripsi CTA</label>
                  <Input value={cmsData.ctaSection.subtitle} onChange={(e) => updateCta("subtitle", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Teks Tombol CTA</label>
                  <Input value={cmsData.ctaSection.ctaText} onChange={(e) => updateCta("ctaText", e.target.value)} />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase text-brand">Area Footer Utama</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Profil Aplikasi Footer</label>
                  <textarea 
                    rows={3}
                    value={cmsData.footer.description}
                    onChange={(e) => updateFooter("description", e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Teks Hak Cipta (Copyright)</label>
                  <Input value={cmsData.footer.copyrightText} onChange={(e) => updateFooter("copyrightText", e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
