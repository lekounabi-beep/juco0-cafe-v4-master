'use server';

import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { revalidatePath } from 'next/cache';

export async function createDriver(formData: {
  email: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
}) {
  try {
    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return { error: 'Service role key not configured. Please check environment variables.' };
    }
    
    // Check if user exists in auth
    console.log('Checking if user exists in auth...');
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      throw userError;
    }
    
    console.log('Found users:', users?.length);
    const existingUser = users?.find((u: any) => u.email === formData.email);
    
    if (!existingUser) {
      console.log('User not found with email:', formData.email);
      return { error: 'Ο χρήστης δεν υπάρχει. Πρέπει να κάνει login πρώτα.' };
    }
    
    console.log('Found user:', existingUser.id);
    
    // Check if driver already exists
    console.log('Checking if driver already exists...');
    const { data: existingDriver, error: checkError } = await supabaseAdmin
      .from('drivers' as any)
      .select('*')
      .eq('user_id', existingUser.id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing driver:', checkError);
      // PGRST116 is "not found", which is expected if driver doesn't exist
    }
    
    if (existingDriver) {
      console.log('Driver already exists');
      return { error: 'Ο driver υπάρχει ήδη.' };
    }
    
    // Create driver record
    console.log('Creating driver record...');
    const { error: driverError } = await supabaseAdmin
      .from('drivers' as any)
      .insert({
        user_id: existingUser.id,
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        vehicle_type: formData.vehicle_type,
        availability_status: 'offline',
        total_deliveries: 0,
        is_active: true,
      } as any);
    
    if (driverError) {
      console.error('Error creating driver:', driverError);
      throw driverError;
    }
    
    console.log('Driver created successfully');
    revalidatePath('/admin');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error creating driver:', error);
    return { error: `Αποτυχία δημιουργίας driver: ${error.message || 'Unknown error'}` };
  }
}
