// Local product photography (white background) for items without a Wolt image.
// Keyed by exact menu item name.
import barChocolate from "@/assets/products/bar-chocolate.jpg";
import barPeanut from "@/assets/products/bar-peanut.jpg";
import barCookie from "@/assets/products/bar-cookie.jpg";
import barBerries from "@/assets/products/bar-berries.jpg";
import barBanana from "@/assets/products/bar-banana.jpg";
import barCoconut from "@/assets/products/bar-coconut.jpg";
import nespressoDecaf from "@/assets/products/nespresso-decaf.jpg";
import loux9 from "@/assets/products/loux-9-fruits.jpg";
import louxAppleCarrot from "@/assets/products/loux-apple-carrot.jpg";
import louxPeach from "@/assets/products/loux-peach.jpg";
import louxOrange from "@/assets/products/loux-orange.jpg";
import iceteaLemon from "@/assets/products/icetea-lemon.jpg";
import iceteaPeach from "@/assets/products/icetea-peach.jpg";
import iceteaBerries from "@/assets/products/icetea-berries.jpg";

export const productImages: Record<string, string> = {
  "Μπάρα Πρωτεΐνης Σοκολάτα": barChocolate.src,
  "Μπάρα Πρωτεΐνης Φυστικοβούτυρο": barPeanut.src,
  "Μπάρα Πρωτεΐνης Μπισκότο": barCookie.src,
  "Μπάρα Πρωτεΐνης Φρούτα Του Δάσους": barBerries.src,
  "Μπάρα Πρωτεΐνης Μπανάνα": barBanana.src,
  "Μπάρα Πρωτεΐνης Καρύδα": barCoconut.src,
  "Κάψουλες Nespresso Decaffeine 10 Τεμάχια": nespressoDecaf.src,
  "Λουξ Extra 9 Φρούτα 0.25 l": loux9.src,
  "Λουξ Μήλο, Καρότο και Πορτοκάλι 0.25 l": louxAppleCarrot.src,
  "Λουξ Ροδάκινο 0.25 l": louxPeach.src,
  "Λουξ Πορτοκάλι 0.25 l": louxOrange.src,
  "Λουξ Ice Tea Λεμόνι 0.5 l": iceteaLemon.src,
  "Λουξ Ice Tea Ροδάκινο 0.5 l": iceteaPeach.src,
  "Λουξ Ice Tea Κόκκινα Φρούτα 0.5 l": iceteaBerries.src,
};
