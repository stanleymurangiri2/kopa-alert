import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AT_API_KEY',
  'AT_USERNAME'
];

async function runPreflight() {
  console.log('🔍 Running KopaAlert Production Preflight Verification...\n');
  let failures = 0;

  // 1. Check required Environment Variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      console.error(`❌ MISSING ENV VAR: ${envVar}`);
      failures++;
    } else {
      console.log(`✅ FOUND ENV VAR: ${envVar}`);
    }
  }

  // 2. Validate Supabase Database Connectivity & Service Key
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase URL or Service Role Key missing in environment.');
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { error } = await supabase.from('businesses').select('id').limit(1);

    if (error) {
      console.error(`❌ SUPABASE DB CONNECTIVITY FAILED: ${error.message}`);
      failures++;
    } else {
      console.log('✅ SUPABASE DB CONNECTIVITY VERIFIED');
    }
  } catch (err: any) {
    console.error(`❌ SUPABASE CONNECTION EXCEPTION: ${err.message}`);
    failures++;
  }

  console.log('\n----------------------------------------');
  if (failures > 0) {
    console.error(`🛑 PREFLIGHT FAILED WITH ${failures} ERRORS. CANCELING BUILD.`);
    process.exit(1);
  } else {
    console.log('🚀 PREFLIGHT PASSED. READY FOR PRODUCTION DEPLOYMENT.');
    process.exit(0);
  }
}

runPreflight();