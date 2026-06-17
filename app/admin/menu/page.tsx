"use client";

import { useState, useEffect } from "react";
import { MenuGrid } from "@/components/MenuGrid";
import { EspressoBackground } from "@/components/EspressoBackground";
import { getProducts, bulkUpdateProducts } from "@/integrations/supabase/services/product.service";
import { getStoreSettings, updateBusinessHours, updateStoreInfo } from "@/integrations/supabase/services/store-settings.service";
import { revalidateMenu } from "../../actions/revalidate";
import { Save, ArrowLeft, Clock, MapPin, Phone, Instagram, Edit2, Check, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { menu, type MenuItem } from "@/data/menu";

export default function AdminMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState<any>({
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
      name: "Juco",
      address: "Nafpaktos, Greece",
      phone: "+30 26340 00000",
      instagram: "@juco.nafpaktos",
    }
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, settingsData] = await Promise.all([
          getProducts(),
          getStoreSettings(),
        ]);
        
        if (productsData && productsData.length > 0) {
          // Convert database products to MenuItem format
          const convertedMenu: MenuItem[] = productsData.map((p: any) => ({
            name: p.name,
            price: p.price,
            description: p.description,
            category: p.category,
            image: p.image,
            sort_order: p.sort_order,
          }));
          
          // Sort products to match the exact order in menu.ts
          const sortedMenu = convertedMenu.sort((a, b) => {
            const indexA = menu.findIndex(m => m.name === a.name);
            const indexB = menu.findIndex(m => m.name === b.name);
            return indexA - indexB;
          });
          
          setMenuItems(sortedMenu);
        } else {
          // Fall back to static menu data if no products in database
          setMenuItems(menu);
        }
        
        setStoreSettings(settingsData);
      } catch (error) {
        console.error('Failed to load data from database:', error);
        // Fall back to static menu data
        setMenuItems(menu);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleEdit = (index: number, updatedItem: MenuItem) => {
    setMenuItems(menuItems.map((item, i) => 
      i === index ? updatedItem : item
    ));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Get existing products from database to get their UUIDs
      const existingProducts = await getProducts();
      const productMap = new Map(existingProducts.map(p => [p.name, p.id]));
      
      // Separate products into updates and inserts
      const updates: Array<{ id: string; changes: any }> = [];
      const inserts: Array<any> = [];
      
      menuItems.forEach((item, index) => {
        const productId = productMap.get(item.name);
        if (productId) {
          // Product exists, update it
          updates.push({
            id: productId,
            changes: {
              name: item.name,
              price: item.price,
              description: item.description,
              category: item.category,
              image: item.image,
              sort_order: index, // Preserve sort order
            }
          });
        } else {
          // Product doesn't exist, insert it
          inserts.push({
            name: item.name,
            price: item.price,
            description: item.description,
            category: item.category,
            image: item.image,
            sort_order: index, // Set sort order based on position
          });
        }
      });
      
      console.log('Updating products:', updates);
      console.log('Inserting products:', inserts);
      
      // Save updates to database
      if (updates.length > 0) {
        try {
          await bulkUpdateProducts(updates);
          console.log('Products updated successfully');
        } catch (productError) {
          console.error('Failed to update products:', productError);
          throw new Error(`Failed to update products: ${JSON.stringify(productError)}`);
        }
      }
      
      // Insert new products to database
      if (inserts.length > 0) {
        try {
          const { createProduct } = await import('@/integrations/supabase/services/product.service');
          for (const insert of inserts) {
            await createProduct(insert);
          }
          console.log('Products inserted successfully');
        } catch (insertError) {
          console.error('Failed to insert products:', insertError);
          throw new Error(`Failed to insert products: ${JSON.stringify(insertError)}`);
        }
      }
      
      // Update store settings if changed
      if (storeSettings) {
        try {
          await updateBusinessHours(storeSettings.business_hours);
          console.log('Business hours saved successfully');
        } catch (hoursError) {
          console.error('Failed to save business hours:', hoursError);
          throw new Error(`Failed to save business hours: ${JSON.stringify(hoursError)}`);
        }
        
        try {
          await updateStoreInfo(storeSettings.store_info);
          console.log('Store info saved successfully');
        } catch (infoError) {
          console.error('Failed to save store info:', infoError);
          throw new Error(`Failed to save store info: ${JSON.stringify(infoError)}`);
        }
      }

      setHasChanges(false);
      
      // Revalidate the main menu cache to show updated data
      await revalidateMenu();
      
      alert('Changes saved successfully! The main menu will be updated.');
      
      // Reload the page to refresh the admin menu with new settings
      window.location.reload();
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert(`Failed to save changes: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleHoursChange = (day: string, field: 'open' | 'close', value: string) => {
    setStoreSettings({
      ...storeSettings,
      business_hours: {
        ...storeSettings.business_hours,
        [day]: {
          ...storeSettings.business_hours[day],
          [field]: value
        }
      }
    });
    setHasChanges(true);
  };

  const handleInfoChange = (field: string, value: string) => {
    setStoreSettings({
      ...storeSettings,
      store_info: {
        ...storeSettings.store_info,
        [field]: value
      }
    });
    setHasChanges(true);
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/admin" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-semibold text-white">Admin Menu Editor</h1>
          <div className="ml-auto">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${hasChanges ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>
              {hasChanges ? 'Unsaved Changes' : 'All Saved'}
            </span>
          </div>
        </div>
      </header>

      {/* Menu Grid with Edit Mode */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-white/60">Loading menu...</div>
        </div>
      ) : (
        <MenuGrid editable={true} onEdit={handleEdit} menuData={menuItems} />
      )}

      {/* Store Settings Section */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Store Settings</h2>
          
          {/* Business Hours */}
          <div className="glass rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">Business Hours</h3>
              </div>
              <button
                onClick={() => setEditingHours(!editingHours)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
              >
                {editingHours ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              </button>
            </div>
            <div className="space-y-2">
                {Object.entries(storeSettings.business_hours).map(([day, hours]: [string, any]) => (
                  <div key={day} className="flex items-center gap-4 text-sm">
                    <span className="w-24 text-white/70 capitalize">{day}</span>
                    {editingHours ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                        />
                        <span className="text-white/50">-</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                        />
                      </div>
                    ) : (
                      <span className="text-white">{hours.open} - {hours.close}</span>
                    )}
                  </div>
                ))}
              </div>
          </div>

          {/* Store Info */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">Store Info</h3>
              </div>
              <button
                onClick={() => setEditingInfo(!editingInfo)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
              >
                {editingInfo ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              </button>
            </div>
            <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-24 text-white/70">Name</span>
                  {editingInfo ? (
                    <input
                      type="text"
                      value={storeSettings.store_info.name}
                      onChange={(e) => handleInfoChange('name', e.target.value)}
                      className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                    />
                  ) : (
                    <span className="text-white">{storeSettings.store_info.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-24 text-white/70">Address</span>
                  {editingInfo ? (
                    <input
                      type="text"
                      value={storeSettings.store_info.address}
                      onChange={(e) => handleInfoChange('address', e.target.value)}
                      className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                    />
                  ) : (
                    <span className="text-white">{storeSettings.store_info.address}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-24 text-white/70">Phone</span>
                  {editingInfo ? (
                    <input
                      type="text"
                      value={storeSettings.store_info.phone}
                      onChange={(e) => handleInfoChange('phone', e.target.value)}
                      className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                    />
                  ) : (
                    <span className="text-white">{storeSettings.store_info.phone}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-24 text-white/70">Instagram</span>
                  {editingInfo ? (
                    <input
                      type="text"
                      value={storeSettings.store_info.instagram}
                      onChange={(e) => handleInfoChange('instagram', e.target.value)}
                      className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                    />
                  ) : (
                    <span className="text-white">{storeSettings.store_info.instagram}</span>
                  )}
                </div>
              </div>
          </div>
        </div>
      </section>

      {/* Floating Save Button */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 bg-primary px-6 py-3 rounded-full text-white font-semibold shadow-[var(--shadow-glow)] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    </div>
  );
}
