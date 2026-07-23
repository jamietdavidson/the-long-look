import {SHIPPING_AUTOMATION} from './config.js';

/**
 * Return a skipped result when shipping automation is disabled, otherwise null.
 * @param {Record<string, unknown>} [context]
 */
export function shippingAutomationSkipped(context = {}) {
  if (SHIPPING_AUTOMATION.isEnabled()) return null;
  return {
    action: 'skipped',
    reason: SHIPPING_AUTOMATION.disabledReason,
    ...context,
  };
}
