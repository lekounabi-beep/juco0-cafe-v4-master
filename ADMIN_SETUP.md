# Admin Dashboard Setup Instructions

## Overview
The Admin Dashboard allows you to edit the menu, business hours, and store information directly from the website.

## Setup Steps

### 1. Run Database Migration
Run the migration file to create the necessary tables:
```sql
-- Run this in Supabase SQL Editor or via CLI
-- File: supabase/migrations/20260616100000_create_products_table.sql
```

### 2. Generate Supabase Types
After running the migration, generate the TypeScript types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/integrations/supabase/types/database.types.ts
```

### 3. Create Storage Bucket for Product Images
In Supabase Dashboard:
1. Go to Storage
2. Create a new bucket named `product-images`
3. Make it public
4. Add RLS policies to allow authenticated users to upload

### 4. Fix TypeScript Errors
After generating types, remove the `@ts-ignore` comments from:
- `src/integrations/supabase/services/product.service.ts`
- `src/integrations/supabase/services/store-settings.service.ts`

### 5. Access Admin Dashboard
Navigate to `/admin/menu` to access the menu editor.

## Features

### Store Settings
- **Business Hours**: Edit opening/closing times for each day
- **Store Info**: Edit name, address, phone, Instagram handle

### Product Management
- **Inline Editing**: Click edit icons to change product names, prices, and descriptions
- **Image Upload**: Hover over product images to see camera icon for uploading new images
- **Auto-save**: Changes are tracked and can be saved with the floating "Save Changes" button

## Notes
- The admin dashboard requires authentication
- Changes are saved to the database immediately upon clicking "Save Changes"
- Image uploads use Supabase Storage
