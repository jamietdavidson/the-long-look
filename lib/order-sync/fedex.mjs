import {FEDEX} from './config.js';
import {resolveShipmentPackageForOrder} from './package-from-order.mjs';
import {recipientFromOrder} from './map-order.mjs';

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: FEDEX.clientId,
    client_secret: FEDEX.clientSecret,
  });

  const response = await fetch(`${FEDEX.apiUrl}/oauth/token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`FedEx OAuth failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  cachedToken = payload.access_token;
  cachedTokenExpiresAt = Date.now() + Number(payload.expires_in ?? 3600) * 1000;
  return cachedToken;
}

function shipperParty() {
  const shipper = FEDEX.shipper();
  return {
    contact: {
      personName: shipper.name,
      companyName: shipper.company,
      phoneNumber: shipper.phone,
    },
    address: {
      streetLines: [shipper.address1, shipper.address2].filter(Boolean),
      city: shipper.city,
      stateOrProvinceCode: shipper.state,
      postalCode: shipper.postal,
      countryCode: shipper.country,
    },
  };
}

/**
 * Create a FedEx shipment and return label PDF bytes + tracking number.
 * @param {Record<string, unknown>} order
 * @param {{ length?: number, width?: number, height?: number, weightLb?: number } | null} [packageOverride]
 */
export async function createFedExShipmentForOrder(order, packageOverride = null) {
  if (!FEDEX.isConfigured()) {
    return {
      skipped: true,
      reason: 'FedEx is not configured (set FEDEX_CLIENT_ID, FEDEX_CLIENT_SECRET, FEDEX_ACCOUNT_NUMBER, and shipper address env vars)',
    };
  }

  const recipient = recipientFromOrder(order);
  if (!recipient) {
    return {skipped: true, reason: 'Order has no shippable address'};
  }

  const token = await getAccessToken();
  const shipmentPackage = packageOverride ?? (await resolveShipmentPackageForOrder(order));
  const weightLb = shipmentPackage.weightLb ?? FEDEX.packageWeightLb;
  const length = shipmentPackage.length ?? FEDEX.packageLengthIn;
  const width = shipmentPackage.width ?? FEDEX.packageWidthIn;
  const height = shipmentPackage.height ?? FEDEX.packageHeightIn;

  const requestBody = {
    labelResponseOptions: 'LABEL',
    accountNumber: {value: FEDEX.accountNumber},
    requestedShipment: {
      shipper: shipperParty(),
      recipients: [recipient],
      pickupType: FEDEX.pickupType,
      serviceType: FEDEX.serviceType,
      packagingType: 'YOUR_PACKAGING',
      shippingChargesPayment: {paymentType: 'SENDER'},
      labelSpecification: {
        imageType: 'PDF',
        labelStockType: 'PAPER_4X6',
      },
      requestedPackageLineItems: [
        {
          weight: {units: 'LB', value: weightLb},
          dimensions: {
            length,
            width,
            height,
            units: 'IN',
          },
        },
      ],
    },
  };

  const response = await fetch(`${FEDEX.apiUrl}/ship/v1/shipments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json();
  if (!response.ok) {
    const detail =
      payload?.errors?.map((error) => error.message).join('; ') ??
      JSON.stringify(payload);
    throw new Error(`FedEx Ship API failed (${response.status}): ${detail}`);
  }

  const shipment = payload.output?.transactionShipments?.[0];
  const piece = shipment?.pieceResponses?.[0];
  const trackingNumber =
    piece?.trackingNumber ??
    shipment?.masterTrackingNumber ??
    shipment?.completedShipmentDetail?.masterTrackingId?.trackingNumber;

  const labelBase64 =
    piece?.packageDocuments?.[0]?.encodedLabel ??
    shipment?.pieceResponses?.[0]?.packageDocuments?.[0]?.encodedLabel;

  if (!trackingNumber || !labelBase64) {
    throw new Error('FedEx Ship API returned no tracking number or label PDF');
  }

  return {
    trackingNumber: String(trackingNumber),
    serviceType: FEDEX.serviceType,
    labelPdf: Buffer.from(labelBase64, 'base64'),
    package: {
      length,
      width,
      height,
      weightLb,
      sizeName: shipmentPackage.sizeName ?? null,
      source: shipmentPackage.source ?? 'resolved',
    },
  };
}
