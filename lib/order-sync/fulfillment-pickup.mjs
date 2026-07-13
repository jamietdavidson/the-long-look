import {AIRTABLE, PICKUP_SCHEDULE} from './config.js';
import {
  airtableRequest,
  getFulfillmentRecord,
  updateFulfillmentRecord,
} from './airtable.mjs';
import {
  computeNextPickupSlot,
  formatPickupName,
  parseAirtableDate,
  pickupSlotKey,
} from './pickup-schedule.mjs';

function pickupsTablePath() {
  return `/${AIRTABLE.baseId}/${AIRTABLE.pickupsTableId}`;
}

function isPickupCompleted(record) {
  const pf = AIRTABLE.pickupFields;
  const fields = record?.fields ?? {};
  const status = fields[pf.status];
  if (status === AIRTABLE.pickupStatus.confirmed) return true;

  const when = parseAirtableDate(fields[pf.when]);
  return when != null && when.getTime() <= Date.now();
}

function sortPickupsByWhen(records) {
  const pf = AIRTABLE.pickupFields;
  return [...records].sort((left, right) => {
    const leftAt = parseAirtableDate(left.fields?.[pf.when])?.getTime() ?? Infinity;
    const rightAt = parseAirtableDate(right.fields?.[pf.when])?.getTime() ?? Infinity;
    return leftAt - rightAt;
  });
}

/** Pickups with a future scheduled time that have not been marked confirmed. */
export async function listUpcomingPickups($) {
  const pf = AIRTABLE.pickupFields;
  const formula = `IS_AFTER({${pf.when}}, NOW())`;
  const params = new URLSearchParams({
    filterByFormula: formula,
    pageSize: '100',
  });

  const records = [];
  let offset = null;

  do {
    if (offset) params.set('offset', offset);
    const response = await airtableRequest($, {
      path: `${pickupsTablePath()}?${params}`,
    });
    records.push(...(response.records ?? []));
    offset = response.offset ?? null;
  } while (offset);

  return sortPickupsByWhen(records).filter((record) => !isPickupCompleted(record));
}

export async function findPickupBySlotKey($, slotKey) {
  const upcoming = await listUpcomingPickups($);
  for (const record of upcoming) {
    const when = parseAirtableDate(record.fields?.[AIRTABLE.pickupFields.when]);
    if (!when) continue;
    if (pickupSlotKey(when, PICKUP_SCHEDULE.timeZone) === slotKey) {
      return record;
    }
  }
  return null;
}

export async function createPickupRecord($, when) {
  const pf = AIRTABLE.pickupFields;
  const fields = {
    [pf.when]: when.toISOString(),
    [pf.status]: AIRTABLE.pickupStatus.scheduled,
    [pf.notes]: formatPickupName(when, PICKUP_SCHEDULE.timeZone),
  };

  const response = await airtableRequest($, {
    method: 'post',
    path: pickupsTablePath(),
    data: {records: [{fields}]},
  });

  return response.records?.[0] ?? null;
}

/**
 * Return the earliest upcoming pickup, creating the next Tue/Fri afternoon slot if needed.
 */
export async function findOrCreateNextPickup($) {
  const upcoming = await listUpcomingPickups($);
  if (upcoming.length > 0) {
    return upcoming[0];
  }

  const slot = computeNextPickupSlot(new Date(), PICKUP_SCHEDULE);
  const slotKey = pickupSlotKey(slot, PICKUP_SCHEDULE.timeZone);
  const existing = await findPickupBySlotKey($, slotKey);
  if (existing) return existing;

  const created = await createPickupRecord($, slot);
  if (!created) {
    throw new Error('Failed to create Pickups row in Airtable');
  }
  return created;
}

function fulfillmentNeedsPickup(record) {
  const ff = AIRTABLE.fulfillmentFields;
  const fields = record?.fields ?? {};
  return (
    fields[ff.status] === AIRTABLE.fulfillmentStatus.pickupRequested &&
    !(Array.isArray(fields[ff.pickup]) && fields[ff.pickup].length > 0)
  );
}

/** Fulfillments ready to link to the next pickup (Status = Pickup Requested, no Pickup yet). */
export async function listFulfillmentsNeedingPickup($) {
  const ff = AIRTABLE.fulfillmentFields;
  const formula = `AND({${ff.status}} = "${AIRTABLE.fulfillmentStatus.pickupRequested}", {${ff.pickup}} = BLANK())`;
  const params = new URLSearchParams({
    filterByFormula: formula,
    pageSize: '100',
  });

  const records = [];
  let offset = null;

  do {
    if (offset) params.set('offset', offset);
    const response = await airtableRequest($, {
      path: `/${AIRTABLE.baseId}/${AIRTABLE.fulfillmentsTableId}?${params}`,
    });
    records.push(...(response.records ?? []));
    offset = response.offset ?? null;
  } while (offset);

  return records;
}

/**
 * Link a fulfillment to the next upcoming pickup, creating that pickup if needed.
 * @param {string} fulfillmentRecordId
 */
export async function linkFulfillmentToPickup(fulfillmentRecordId) {
  const $ = {};
  const fulfillment = await getFulfillmentRecord($, fulfillmentRecordId);
  if (!fulfillment) {
    throw new Error(`Fulfillment record not found: ${fulfillmentRecordId}`);
  }

  if (!fulfillmentNeedsPickup(fulfillment)) {
    const ff = AIRTABLE.fulfillmentFields;
    const fields = fulfillment.fields ?? {};
    const linkedPickupId = fields[ff.pickup]?.[0] ?? null;
    return {
      action: 'skipped',
      fulfillmentRecordId,
      reason: linkedPickupId
        ? 'Fulfillment already linked to a pickup'
        : 'Fulfillment is not Pickup Requested',
      pickupRecordId: linkedPickupId,
    };
  }

  const pickup = await findOrCreateNextPickup($);
  const ff = AIRTABLE.fulfillmentFields;
  const pf = AIRTABLE.pickupFields;

  await updateFulfillmentRecord($, fulfillmentRecordId, {
    [ff.pickup]: [pickup.id],
  });

  const when = parseAirtableDate(pickup.fields?.[pf.when]);

  return {
    action: 'linked',
    fulfillmentRecordId,
    pickupRecordId: pickup.id,
    pickupLabel: pickup.fields?.[pf.notes] ?? formatPickupName(when, PICKUP_SCHEDULE.timeZone),
    scheduledAt: when?.toISOString() ?? null,
  };
}
