import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'product-images';

export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${productId}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function deleteProductImage(imageUrl: string): Promise<void> {
  try {
    const fileName = imageUrl.split('/').pop();
    if (fileName) {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([fileName]);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Failed to delete image:', error);
    // Don't throw error if deletion fails, as it's not critical
  }
}
