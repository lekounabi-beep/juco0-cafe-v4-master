# Juco Cafe - Online Ordering System

## Τι μπορεί να κάνει το site μας

Το Juco Cafe είναι ένα πλήρες σύστημα ηλεκτρονικής παραγγελίας για καφέ με τις εξής δυνατότητες:

### Για Πελάτες
- **Προβολή Μενού**: Εμφάνιση όλων των προϊόντων οργανωμένων σε κατηγορίες (καφέδες, ροφήματα, χυμοί, smoothies, snacks, κλπ)
- **Αναζήτηση**: Εύκολη αναζήτηση προϊόντων με category navigation
- **Καλάθι**: Προσθήκη προϊόντων στο καλάθι και διαχείριση ποσοτήτων
- **Guest Checkout**: Παραγγελία χωρίς εγγραφή
- **Εγγραφή & Login**: Εγγραφή με email ή Google OAuth
- **Αποθήκευση Προφίλ**: Διαχείριση προσωπικών στοιχείων και διευθύνσεων
- **Αγαπημένες Παραγγελίες**: Αποθήκευση και επαναφορά αγαπημένων παραγγελιών
- **Ιστορικό Παραγγελιών**: Προβολή προηγούμενων παραγγελιών
- **Πολλαπλές Μέθοδοι Πληρωμής**: Πληρωμή με κάρτα ή pickup στο κατάστημα
- **Real-time Updates**: Άμεση ενημέρωση κατάστασης παραγγελίας

### Για Διαχειριστές
- **Admin Dashboard**: Πλήρης διαχείριση του μενού
- **Επεξεργασία Προϊόντων**: Προσθήκη, τροποποίηση, διαγραφή προϊόντων
- **Διαχείριση Κατηγοριών**: Οργάνωση προϊόντων ανά κατηγορία
- **Επεξεργασία Ωραρίου**: Ρύθμιση ωρών λειτουργίας ανά ημέρα
- **Διαχείριση Παραγγελιών**: Προβολή και διαχείριση όλων των παραγγελιών
- **Ανάλυση Δεδομένων**: Στατιστικά παραγγελιών και πελατών

### Τεχνικά Χαρακτηριστικά
- **Next.js 15**: Modern React framework με App Router
- **Supabase**: Backend database, authentication, και real-time subscriptions
- **Tailwind CSS**: Modern styling με custom theme
- **TypeScript**: Type-safe development
- **Responsive Design**: Πλήρως responsive για mobile, tablet, desktop
- **Google Maps**: Ενσωματωμένος χάρτης για τοποθεσία
- **Google OAuth**: Social login integration

## Installation

```bash
npm install
npm run dev
```

## Environment Variables

Δημιουργήστε ένα `.env.local` αρχείο με τα εξής:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```
