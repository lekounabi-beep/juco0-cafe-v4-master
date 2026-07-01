"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { MenuGrid } from "@/components/MenuGrid";
import { getAdminMenuData, saveAdminMenuChanges } from "@app/actions/admin-menu";
import type { StoreSettings } from "@/integrations/supabase/services/store-settings.service";
import { Save, Clock, MapPin, Edit2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { menu, type MenuItem } from "@/data/menu";
import { toast } from "sonner";
import { AdminContentContainer } from "@/features/admin/components/AdminContentContainer";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { ADMIN_SECTION, getAdminSectionFromSearch } from "@/features/admin/utils/admin-shell";
import { NotificationSettingsSection } from "@/features/notifications/components/NotificationSettingsSection";

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  business_hours: {
    monday: { open: "07:00", close: "21:00" },
    tuesday: { open: "07:00", close: "21:00" },
    wednesday: { open: "07:00", close: "21:00" },
    thursday: { open: "07:00", close: "21:00" },
    friday: { open: "07:00", close: "21:00" },
    saturday: { open: "07:00", close: "21:00" },
    sunday: { open: "07:00", close: "21:00" },
  },
  store_info: {
    address: "Nafpaktos, Greece",
    phone: "+30 26340 00000",
    instagram: "@juco.nafpaktos",
  },
};

function sortMenuLikeStatic(items: MenuItem[]): MenuItem[] {
  return [...items].sort((a, b) => {
    const indexA = menu.findIndex((m) => m.name === a.name);
    const indexB = menu.findIndex((m) => m.name === b.name);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

export default function AdminMenuPage() {
  const searchParams = useSearchParams();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const section = getAdminSectionFromSearch("/admin/menu", searchParams.get("section"));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminMenuData();

      if (!result.success) {
        toast.error(result.error);
        setMenuItems(menu);
        setStoreSettings(DEFAULT_STORE_SETTINGS);
        return;
      }

      if (result.products.length > 0) {
        const convertedMenu: MenuItem[] = result.products.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          description: p.description ?? "",
          category: p.category,
          image: p.image ?? "",
          sort_order: p.sort_order,
          is_available: p.is_available,
        }));
        setMenuItems(sortMenuLikeStatic(convertedMenu));
      } else {
        setMenuItems(menu.map((item) => ({ ...item, is_available: true })));
      }

      setStoreSettings(result.storeSettings);
    } catch (error) {
      console.error("Failed to load admin menu data:", error);
      toast.error("Failed to load menu data");
      setMenuItems(menu);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleEdit = (index: number, updatedItem: MenuItem) => {
    setMenuItems((prev) => prev.map((item, i) => (i === index ? updatedItem : item)));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const result = await saveAdminMenuChanges({
        products: menuItems.map((item, index) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          description: item.description || null,
          category: item.category,
          image: item.image || null,
          sort_order: item.sort_order ?? index,
          is_available: item.is_available !== false,
        })),
        business_hours: storeSettings.business_hours,
        store_info: storeSettings.store_info,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setHasChanges(false);
      toast.success(
        `Αποθηκεύτηκε (${result.updated} ενημερώσεις, ${result.inserted} νέα προϊόντα)`,
      );
      await loadData();
    } catch (error) {
      console.error("Failed to save changes:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleHoursChange = (day: string, field: "open" | "close", value: string) => {
    setStoreSettings((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day as keyof StoreSettings["business_hours"]],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleInfoChange = (field: keyof StoreSettings["store_info"], value: string) => {
    setStoreSettings((prev) => ({
      ...prev,
      store_info: {
        ...prev.store_info,
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  return (
    <>
      {section === ADMIN_SECTION.PRODUCTS && (
        <>
          <AdminContentContainer className="py-8">
            <AdminPageHeader
              title="Products"
              description="Διαχειρίσου το menu, τις κατηγορίες και τη διαθεσιμότητα προϊόντων με την υπάρχουσα ροή επεξεργασίας."
              actions={
                <div className="ml-auto">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      hasChanges ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {hasChanges ? "Unsaved Changes" : "All Saved"}
                  </span>
                </div>
              }
            />
          </AdminContentContainer>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-white/60">Loading menu...</div>
            </div>
          ) : (
            <MenuGrid editable={true} onEdit={handleEdit} menuData={menuItems} />
          )}
        </>
      )}

      {section === ADMIN_SECTION.SETTINGS && (
        <AdminContentContainer className="py-8">
          <AdminPageHeader
            title="Settings"
            description="Ρύθμισε τα στοιχεία του καταστήματος και το ωράριο λειτουργίας χωρίς να αλλάξει το υπάρχον save flow."
            actions={
              <div className="ml-auto">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    hasChanges ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"
                  }`}
                >
                  {hasChanges ? "Unsaved Changes" : "All Saved"}
                </span>
              </div>
            }
          />

          <div className="mb-6">
            <h2 className="mb-4 text-2xl font-semibold text-white">Store Settings</h2>

            <div className="glass mb-4 rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-white">Business Hours</h3>
                </div>
                <button
                  onClick={() => setEditingHours(!editingHours)}
                  className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/15"
                >
                  {editingHours ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(storeSettings.business_hours).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-4 text-sm">
                    <span className="w-24 capitalize text-white/70">{day}</span>
                    {editingHours ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => handleHoursChange(day, "open", e.target.value)}
                          className="rounded border border-white/20 bg-white/10 px-2 py-1 text-white"
                        />
                        <span className="text-white/50">-</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => handleHoursChange(day, "close", e.target.value)}
                          className="rounded border border-white/20 bg-white/10 px-2 py-1 text-white"
                        />
                      </div>
                    ) : (
                      <span className="text-white">
                        {hours.open} - {hours.close}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-white">Store Info</h3>
                </div>
                <button
                  onClick={() => setEditingInfo(!editingInfo)}
                  className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/15"
                >
                  {editingInfo ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                </button>
              </div>
              <div className="space-y-3">
                {(
                  [
                    ["address", "Address"],
                    ["phone", "Phone"],
                    ["instagram", "Instagram"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center gap-4 text-sm">
                    <span className="w-24 text-white/70">{label}</span>
                    {editingInfo ? (
                      <input
                        type="text"
                        value={storeSettings.store_info[field]}
                        onChange={(e) => handleInfoChange(field, e.target.value)}
                        className="flex-1 rounded border border-white/20 bg-white/10 px-2 py-1 text-white"
                      />
                    ) : (
                      <span className="text-white">{storeSettings.store_info[field]}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass mt-4 rounded-2xl p-4 sm:p-5">
              <NotificationSettingsSection compact className="border-0 bg-transparent p-0" />
            </div>
          </div>
        </AdminContentContainer>
      )}

      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 right-4 z-50 md:bottom-8 md:right-8"
          >
            <button
              onClick={() => void handleSaveAll()}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
