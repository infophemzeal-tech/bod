'use server';

import { createClient } from '@/lib/supabase/server';

export type TrackingResult = {
  tracking_number: string;
  status: string;
  destination: string;
  ship_date: string;
  weight_kg: number;
};

export async function trackShipment(
  trackingNumber: string,
  recipientName: string
): Promise<{ success: boolean; data?: TrackingResult; error?: string }> {
  if (!trackingNumber.trim() || !recipientName.trim()) {
    return { success: false, error: 'Enter both your tracking number and recipient name.' };
  }

  // Uses the regular (cookie-aware) client — works fine for anonymous
  // visitors too. The RPC itself is what's grant-restricted to anon/authenticated.
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('track_shipment', {
      p_tracking_number: trackingNumber,
      p_recipient_name: recipientName,
    })
    .single();

  if (error || !data) {
    return {
      success: false,
      error: "We couldn't find a shipment matching that tracking number and recipient name. Double-check both and try again.",
    };
  }

  return { success: true, data: data as TrackingResult };
}