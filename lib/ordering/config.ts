import "server-only";
import { deliveryZones } from "../restaurant";
import type { CheckoutConfig } from "./types";

/**
 * ONLY delivery-fee configuration, in euro cents, in the PDF's area order.
 * Phase 1: enforce each area's minimum, with no additional delivery surcharge.
 * Change the corresponding value here when the restaurant supplies delivery fees.
 * Pickup is always free. The browser receives this configuration via the API.
 */
const deliveryFeeCents = [0, 0, 0, 0, 0, 0, 0, 0] as const;

export function checkoutConfig(): CheckoutConfig {
  return { zones: deliveryZones.map((zone, index) => ({
    id: `zone-${index + 1}`, towns: zone.towns, minimum: zone.minimum,
    fee: deliveryFeeCents[index] / 100,
  })) };
}
