import { NextResponse } from 'next/server';

import { generateDailyReminders } from '@/lib/supabase/notifications';

export async function POST() {
  try {
    const generated = await generateDailyReminders();

    return NextResponse.json({
      success: true,
      message: 'Debt reminders generated successfully.',
      remindersGenerated: generated,
    });
  } catch (error) {
    console.error('Generate Reminders Error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate reminders.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return POST();
}