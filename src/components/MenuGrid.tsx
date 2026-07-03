import { useMemo, useState, type CSSProperties } from "react";
import { Plus, Minus, ShoppingBag, Edit2, Check, X, Save } from "lucide-react";
import { menu, type MenuItem } from "@/data/menu";
import { productImages } from "@/data/productImages";
import { useCart } from "@/lib/cart-store";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// Category-based fallback photos (Unsplash CDN, stable IDs).
// Used when a Wolt image URL fails to load — keeps the grid visually intact.
const FALLBACKS: Record<string, string[]> = {
  ΚΑΦΕΔΕΣ: [
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=70&auto=format&fit=crop",
  ],
  "ΡΟΦΗΜΑΤΑ ΣΟΚΟΛΑΤΑΣ": [
    "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542990253-a781e04c0082?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=600&q=70&auto=format&fit=crop",
  ],
  "ΦΥΣΙΚΟΙ ΧΥΜΟΙ": [
    "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&q=70&auto=format&fit=crop",
  ],
  SMOOTHIES: [
    "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1638176067000-9e2ff6a3a8d9?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=600&q=70&auto=format&fit=crop",
  ],
  MILKSHAKES: [
    "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1626202378086-7c3e9f0c2f1c?w=600&q=70&auto=format&fit=crop",
  ],
  SNACKS: [
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=600&q=70&auto=format&fit=crop",
  ],
};
const GENERIC_FALLBACK =
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=70&auto=format&fit=crop";

function pickFallback(category: string, i: number): string {
  const pool = FALLBACKS[category];
  if (!pool || pool.length === 0) return GENERIC_FALLBACK;
  return pool[i % pool.length];
}

function formatPrice(p: number) {
  return p > 0 ? `${p.toFixed(2).replace(".", ",")} €` : "—";
}

function Card({
  item,
  i,
  editable = false,
  onEdit,
}: {
  item: MenuItem;
  i: number;
  editable?: boolean;
  onEdit?: (index: number, item: MenuItem) => void;
}) {
  const productPhoto = productImages[item.name];
  const fallback = pickFallback(item.category, i);
  const initial = item.image || productPhoto || fallback;
  const [src, setSrc] = useState<string>(initial);
  const [triedFallback, setTriedFallback] = useState(initial !== item.image);
  const [imageError, setImageError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editField, setEditField] = useState<"name" | "price" | "description" | null>(null);

  const qty = useCart((s) => s.items.find((it) => it.name === item.name)?.qty ?? 0);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  const disabled = item.price <= 0;
  const cartImage =
    productPhoto || (item.image && !item.image.includes("wolt.com") ? item.image : undefined);

  const handleImageError = () => {
    if (!triedFallback) {
      setTriedFallback(true);
      setSrc(productPhoto || fallback);
    } else {
      setImageError(true);
    }
  };

  const handleEdit = (field: "name" | "price" | "description") => {
    setEditField(field);
    setEditValue(field === "price" ? item.price.toString() : item[field] || "");
    setEditing(true);
  };

  const handleSave = () => {
    if (onEdit && editField) {
      const updatedItem = { ...item };
      if (editField === "price") {
        updatedItem.price = parseFloat(editValue);
      } else {
        updatedItem[editField] = editValue;
      }
      onEdit(i, updatedItem);
    }
    setEditing(false);
    setEditField(null);
    setEditValue("");
  };

  const handleCancel = () => {
    setEditing(false);
    setEditField(null);
    setEditValue("");
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
      className="group flex flex-col overflow-hidden rounded-2xl glass shadow-[var(--shadow-soft)] will-change-transform"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div
        className={`relative aspect-[4/3] overflow-hidden ${productPhoto ? "bg-transparent" : "bg-black/40"}`}
      >
        {!imageError ? (
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="relative h-full w-full"
          >
            <Image
              src={src}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
              onError={handleImageError}
              className={`will-change-transform ${productPhoto ? "object-cover" : "object-cover"}`}
            />
          </motion.div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/40">
            <ShoppingBag className="h-12 w-12 text-white/30" />
          </div>
        )}
        <div className="absolute top-3 right-3 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground shadow-lg">
          {formatPrice(item.price)}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          {editable && editing && editField === "name" ? (
            <div className="flex-1 flex gap-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                autoFocus
              />
              <button onClick={handleSave} className="p-1 bg-green-500/20 text-green-400 rounded">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={handleCancel} className="p-1 bg-red-500/20 text-red-400 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-base font-semibold leading-snug text-white">{item.name}</h3>
              {editable && (
                <button
                  onClick={() => handleEdit("name")}
                  className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>
        {item.description && (
          <div className="mt-1">
            {editable && editing && editField === "description" ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                  autoFocus
                />
                <button onClick={handleSave} className="p-1 bg-green-500/20 text-green-400 rounded">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={handleCancel} className="p-1 bg-red-500/20 text-red-400 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="line-clamp-2 text-sm text-white/60">{item.description}</p>
                {editable && (
                  <button
                    onClick={() => handleEdit("description")}
                    className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white flex-shrink-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {editable && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() =>
                onEdit?.(i, {
                  ...item,
                  is_available: item.is_available === false,
                })
              }
              className={`w-full rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                item.is_available === false
                  ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  : "bg-green-500/20 text-green-300 hover:bg-green-500/30"
              }`}
            >
              {item.is_available === false
                ? "Μη διαθέσιμο — πάτα για ενεργοποίηση"
                : "Διαθέσιμο — πάτα για απενεργοποίηση"}
            </button>
          </div>
        )}
        <div className="mt-4">
          {editable ? (
            editing && editField === "price" ? (
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                  autoFocus
                />
                <button onClick={handleSave} className="p-1 bg-green-500/20 text-green-400 rounded">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={handleCancel} className="p-1 bg-red-500/20 text-red-400 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white/70">{formatPrice(item.price)}</span>
                <button
                  onClick={() => handleEdit("price")}
                  className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )
          ) : qty === 0 ? (
            <motion.button
              type="button"
              disabled={disabled}
              onClick={() =>
                add({
                  name: item.name,
                  price: item.price,
                  image: cartImage,
                  category: item.category,
                })
              }
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:cursor-not-allowed disabled:opacity-50 will-change-transform"
            >
              <ShoppingBag className="h-4 w-4" /> Προσθήκη
            </motion.button>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/15 px-2 py-1.5">
              <motion.button
                type="button"
                onClick={() => setQty(item.name, qty - 1)}
                whileTap={{ scale: 0.9 }}
                className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90 will-change-transform"
                aria-label="Μείωση"
              >
                <Minus className="h-4 w-4" />
              </motion.button>
              <motion.span
                key={qty}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="font-semibold text-white"
              >
                {qty}
              </motion.span>
              <motion.button
                type="button"
                onClick={() =>
                  add({
                    name: item.name,
                    price: item.price,
                    image: cartImage,
                    category: item.category,
                  })
                }
                whileTap={{ scale: 0.9 }}
                className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90 will-change-transform"
                aria-label="Προσθήκη"
              >
                <Plus className="h-4 w-4" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function MenuGrid({
  editable = false,
  onEdit,
  menuData = menu,
}: {
  editable?: boolean;
  onEdit?: (index: number, item: MenuItem) => void;
  menuData?: MenuItem[];
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();

    for (const m of menuData) {
      if (!map.has(m.category)) map.set(m.category, []);
      map.get(m.category)!.push(m);
    }

    // Don't sort items within categories - preserve database order (as in menu.ts)

    // Use the exact category order from the static menu
    const categoryOrder = [
      "ΚΑΦΕΔΕΣ",
      "ΡΟΦΗΜΑΤΑ ΣΟΚΟΛΑΤΑΣ",
      "ΡΟΦΗΜΑΤΑ",
      "ΦΥΣΙΚΟΙ ΧΥΜΟΙ",
      "ΦΥΣΙΚΟΙ ΧΥΜΟΙ ΑΝΑΜΕΙΚΤΟΙ",
      "SMOOTHIES",
      "MILKSHAKES",
      "SNACKS",
      "ΜΠΑΡΕΣ ΠΡΩΤΕΪ́ΝΗΣ",
      "ΚΑΦΕΚΟΠΤΕΙΟ ESPRESSO",
      "ΚΑΦΕΚΟΠΤΕΙΟ ΦΙΛΤΡΟΥ",
      "ΚΑΦΕΚΟΠΤΕΙΟ ΕΛΛΗΝΙΚΟΣ",
      "ΚΑΦΕΚΟΠΤΕΙΟ ΚΑΨΟΥΛΕΣ NESPRESSO",
      "ΧΥΜΟΙ",
      "ICED TEA",
      "ΑΝΑΨΥΚΤΙΚΑ",
    ];

    // Filter to only include categories that exist in the data
    const sortedCategories = categoryOrder.filter((cat) => map.has(cat));

    // Add any remaining categories that aren't in the predefined order
    const remainingCategories = Array.from(map.keys()).filter(
      (cat) => !categoryOrder.includes(cat),
    );

    const finalOrder = [...sortedCategories, ...remainingCategories];

    // Return categories in the sorted order
    const sortedEntries = finalOrder.map((cat) => [cat, map.get(cat)!] as [string, MenuItem[]]);
    return sortedEntries;
  }, [menuData]);

  const [active, setActive] = useState<string>("");

  return (
    <section id="menu" className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-white/60">
          {editable ? "Admin Menu Editor" : "Our menu"}
        </p>
        <h2 className="mt-2 text-3xl sm:text-5xl font-semibold text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.5)]">
          {editable ? "Edit Menu Items" : "Made fresh, every day"}
        </h2>
      </div>

      {/* Category pills - Show in both modes */}
      <div className="sticky top-[57px] z-20 -mx-4 mb-10 overflow-x-auto overflow-y-hidden bg-black/40 px-4 py-3 backdrop-blur-md border-y border-white/10 will-change-transform touch-pan-x custom-scrollbar">
        <div className="flex gap-3 whitespace-nowrap">
          {grouped.map(([cat]) => (
            <motion.a
              key={cat}
              href={`#cat-${encodeURIComponent(cat)}`}
              onClick={() => setActive(cat)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-5 py-2.5 text-sm font-medium uppercase tracking-wider transition-all will-change-transform rounded-full ${
                active === cat
                  ? "text-white shadow-lg"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
              style={
                active === cat
                  ? ({
                      backgroundColor: "#16a34a !important",
                      boxShadow: "0 10px 15px -3px rgba(22, 163, 74, 0.25) !important",
                    } as CSSProperties)
                  : undefined
              }
            >
              {cat}
            </motion.a>
          ))}
        </div>
      </div>

      {/* Menu Grid - Grouped by category in both modes */}
      <div className="space-y-20">
        {grouped.map(([cat, items]) => (
          <motion.div
            key={cat}
            id={`cat-${encodeURIComponent(cat)}`}
            className="scroll-mt-28"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8 flex items-end justify-between gap-4">
              <h3 className="text-2xl sm:text-3xl font-semibold text-white">{cat}</h3>
              <div className="h-px flex-1 bg-white/15" />
              <span className="text-sm text-white/55">{items.length} items</span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((it) => {
                const actualIndex = menuData.findIndex((m) => m.name === it.name);
                return (
                  <Card
                    key={it.name + actualIndex}
                    item={it}
                    i={actualIndex}
                    editable={editable}
                    onEdit={onEdit}
                  />
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
