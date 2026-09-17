'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = [
  'Received',
  'Processing',
  'In Transit',
  'Arrived',
  'Ready for Pickup',
  'Delivered',
];

export async function updateShipmentStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  // Mirrors the RLS policy "Admin and Manager can update shipments" —
  // this check is a UX shortcut (clearer error, no round trip), the DB
  // still enforces it regardless.
  try {
    await requireRole(['Admin', 'Manager']);
  } catch {
    return { success: false, error: 'Not authorized' };
  }

  if (!VALID_STATUSES.includes(status)) {
    return { success: false, error: 'Invalid status' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('shipments')
    .update({ status })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Doesn't navigate anywhere — just marks the dashboard's cached data stale
  // so the summary stats are correct on the next full load/filter change.
  revalidatePath('/');
  return { success: true };
}