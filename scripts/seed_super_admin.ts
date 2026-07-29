import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPER_ADMIN_EMAIL = 'admin@kopaalert.com';
const SUPER_ADMIN_PASSWORD = '!stan#2026';
const SUPER_ADMIN_NAME = 'Super Admin';

async function seedSuperAdmin() {
  console.log('⚡ Seeding KopaAlert Super Admin account...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. Check if super admin profile exists in public.users
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', SUPER_ADMIN_EMAIL)
    .maybeSingle();

  if (existingUser) {
    console.log(`✅ Super admin user record already exists in public.users: ${existingUser.id}`);
    
    // Ensure role is super_admin
    if (existingUser.role !== 'super_admin') {
      await supabase
        .from('users')
        .update({ role: 'super_admin' })
        .eq('id', existingUser.id);
      console.log('✅ Updated existing user role to super_admin.');
    }
    return;
  }

  // 2. Check if auth user exists
  const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
  let authUser = authUsers?.find(u => u.email === SUPER_ADMIN_EMAIL);

  if (!authUser) {
    console.log(`Creating auth account for ${SUPER_ADMIN_EMAIL}...`);
    const { data: newAuth, error: createError } = await supabase.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: SUPER_ADMIN_NAME }
    });

    if (createError || !newAuth.user) {
      console.error('❌ Failed to create Auth user:', createError?.message);
      process.exit(1);
    }
    authUser = newAuth.user;
    console.log(`✅ Created auth user with ID: ${authUser.id}`);
  } else {
    // Update password to ensure it matches !stan#2026
    await supabase.auth.admin.updateUserById(authUser.id, {
      password: SUPER_ADMIN_PASSWORD,
      email_confirm: true
    });
    console.log(`✅ Updated password for auth user ID: ${authUser.id}`);
  }

  // 3. Upsert into public.users
  const { error: profileError } = await supabase
    .from('users')
    .upsert({
      id: authUser.id,
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      role: 'super_admin',
      business_id: null
    });

  if (profileError) {
    console.error('❌ Failed to upsert public.users profile:', profileError.message);
    process.exit(1);
  }

  console.log('🎉 Super Admin account seeded successfully!');
  console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
  console.log(`Password: ${SUPER_ADMIN_PASSWORD}`);
}

seedSuperAdmin();
