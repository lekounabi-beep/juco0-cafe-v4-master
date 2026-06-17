"use client";

import { MapPin, Clock, Phone, Instagram, ShoppingBag, ArrowUp, User, LogOut } from "lucide-react";
import { ReviewGate } from "@/components/ReviewGate";
import { MenuGrid } from "@/components/MenuGrid";
import { EspressoBackground } from "@/components/EspressoBackground";
import { CartFab } from "@/components/CartFab";
import { FavoriteSection } from "@/features/account/components/FavoriteSection";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useCart, formatEur } from "@/lib/cart-store";
import { getProfile } from "@/integrations/supabase/services/profile.service";
import { getProducts } from "@/integrations/supabase/services/product.service";
import { getStoreSettings } from "@/integrations/supabase/services/store-settings.service";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { menu, type MenuItem } from "@/data/menu";

export default function Index() {
  const { user, isAuthenticated } = useAuth();
  const { logout } = useAuthStore();
  const count = useCart((s) => s.items.reduce((sum, i) => sum + i.qty, 0));
  const subtotal = useCart((s) => s.items.reduce((sum, i) => sum + i.qty * i.price, 0));
  const [showMobileCart, setShowMobileCart] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [userInitials, setUserInitials] = useState('');
  const [menuData, setMenuData] = useState<MenuItem[]>(menu);
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
  const [loading, setLoading] = useState(true);

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
          
          setMenuData(sortedMenu);
        }
        
        setStoreSettings(settingsData);
      } catch (error) {
        console.error('Failed to load data from database:', error);
        // Fall back to static menu data
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowMobileCart(false);
      } else {
        setShowMobileCart(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const profile = await getProfile(user.id);
          if (profile && profile.full_name) {
            const names = profile.full_name.split(' ');
            const initials = names
              .map(name => name.charAt(0).toUpperCase())
              .join('')
              .slice(0, 2);
            setUserInitials(initials);
          } else if (user.email) {
            // Fallback to email initials if no full name
            const emailInitial = user.email.charAt(0).toUpperCase();
            setUserInitials(emailInitial);
          }
        } catch (error) {
          console.error('Failed to fetch profile:', error);
          if (user.email) {
            const emailInitial = user.email.charAt(0).toUpperCase();
            setUserInitials(emailInitial);
          }
        }
      };
      fetchProfile();
    } else {
      setUserInitials('');
    }
  }, [user]);

  return (
    <div className="relative min-h-screen text-foreground overflow-x-hidden">
      <EspressoBackground />

      {/* Nav */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md will-change-transform"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <motion.a 
            href="#" 
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="flex items-center gap-2"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">J</span>
            <span className="font-display text-lg font-semibold tracking-tight text-white">Juco</span>
          </motion.a>
          <nav className="hidden gap-6 text-sm text-white/70 sm:flex">
            <motion.a 
              href="#menu" 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hover:text-white transition-colors"
            >Menu</motion.a>
            <motion.a 
              href="#visit" 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hover:text-white transition-colors"
            >Visit</motion.a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <motion.a 
                  href="/account" 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  {userInitials ? (
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {userInitials}
                    </div>
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </motion.a>
                <motion.button
                  onClick={logout}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                >
                  <LogOut className="h-4 w-4" />
                </motion.button>
              </>
            ) : (
              <motion.a 
                href="/login" 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <User className="h-4 w-4" />
                Σύνδεση
              </motion.a>
            )}
            <motion.a 
              href="#visit" 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Call us
            </motion.a>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/80 backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Open today · Nafpaktos
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-6 font-display text-6xl sm:text-8xl md:text-9xl font-bold tracking-tighter text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.6)]"
          >
            Juco
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-white/80"
          >
            Fresh Juices &amp; Quality Coffee — handcrafted, every single cup.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <motion.a 
              href="#menu" 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full glass-strong px-6 py-3 text-sm font-medium text-white transition-colors"
            >
              Browse the menu
            </motion.a>
            <motion.a 
              href="#visit" 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-colors"
            >
              Order direct
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* Review Gate */}
      <div className="pb-16">
        <ReviewGate />
      </div>

      {/* Favorite Order - only for authenticated users */}
      {isAuthenticated && (
        <div className="mx-auto max-w-3xl px-4 pb-16">
          <FavoriteSection />
        </div>
      )}

      {/* Menu */}
      {!loading && <MenuGrid menuData={menuData} />}

      {/* Footer */}
      <footer id="visit" className="border-t border-white/10 bg-black/50 backdrop-blur-md">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">J</span>
              <span className="font-display text-xl font-semibold text-white">Juco</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-white/70">
              Coffee &amp; Juice Bar — Nafpaktos. Made with real fruit, real beans, real care.
            </p>
          </div>
          <div className="space-y-3 text-sm text-white/85">
            <h4 className="text-xs uppercase tracking-[0.2em] text-white/60">Visit us</h4>
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> {storeSettings.store_info.address}</p>
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 text-primary" />
              <div className="space-y-1">
                {storeSettings.business_hours && Object.entries(storeSettings.business_hours).map(([day, hours]: [string, any]) => (
                  <p key={day}>{day.charAt(0).toUpperCase() + day.slice(1)}: {hours.open} - {hours.close}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3 text-sm text-white/85">
            <h4 className="text-xs uppercase tracking-[0.2em] text-white/60">Contact</h4>
            <a href={`tel:${storeSettings.store_info.phone}`} className="flex items-start gap-2 hover:text-white">
              <Phone className="mt-0.5 h-4 w-4 text-primary" /> {storeSettings.store_info.phone}
            </a>
            {storeSettings.store_info.instagram && (
              <a href={`https://instagram.com/${storeSettings.store_info.instagram}`} target="_blank" rel="noreferrer" className="flex items-start gap-2 hover:text-white">
                <Instagram className="mt-0.5 h-4 w-4 text-primary" /> @{storeSettings.store_info.instagram}
              </a>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Juco Coffee &amp; Juice Bar · Nafpaktos
        </div>
      </footer>
      {/* Mobile Glassmorphic Cart Bar */}
      <AnimatePresence>
        {count > 0 && showMobileCart && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-inset-bottom"
          >
            <Link href="/checkout" className="block">
              <motion.div 
                whileTap={{ scale: 0.98 }}
                className="mx-4 mb-4 flex items-center justify-between gap-3 rounded-2xl glass-strong px-5 py-4 shadow-[var(--shadow-glow)] will-change-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                    <motion.span 
                      key={count}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 grid h-5 min-w-[20px] place-items-center rounded-full bg-black px-1 text-[10px] font-bold text-primary"
                    >
                      {count}
                    </motion.span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">Καλάθι</span>
                    <span className="text-xs text-white/60">{count} {count === 1 ? 'προϊόν' : 'προϊόντα'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary">{formatEur(subtotal)}</span>
                  <ArrowUp className="h-5 w-5 text-white/60" />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Cart FAB */}
      <div className="hidden md:block">
        <CartFab />
      </div>
    </div>
  );
}
