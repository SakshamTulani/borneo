/** Warehouse order matches `Stock` tuples in products.ts. */
export const warehouses = [
  { code: 'blr', name: 'Bengaluru (Hoskote)', pincode: '562114', lat: 13.0707, lng: 77.7982 },
  { code: 'ggn', name: 'Gurugram (Bilaspur)', pincode: '122413', lat: 28.3172, lng: 76.8932 },
  { code: 'bhw', name: 'Mumbai (Bhiwandi)', pincode: '421302', lat: 19.2813, lng: 73.0483 },
] as const;

/** Longest prefix wins; "" is the national fallback (D-63). */
export const deliveryLanes: {
  warehouse: string;
  prefix: string;
  minDays: number;
  maxDays: number;
}[] = [
  { warehouse: 'blr', prefix: '', minDays: 5, maxDays: 8 },
  { warehouse: 'blr', prefix: '5', minDays: 2, maxDays: 4 },
  { warehouse: 'blr', prefix: '56', minDays: 1, maxDays: 2 },
  { warehouse: 'blr', prefix: '6', minDays: 2, maxDays: 4 },
  { warehouse: 'ggn', prefix: '', minDays: 5, maxDays: 8 },
  { warehouse: 'ggn', prefix: '1', minDays: 2, maxDays: 4 },
  { warehouse: 'ggn', prefix: '11', minDays: 1, maxDays: 2 },
  { warehouse: 'ggn', prefix: '12', minDays: 1, maxDays: 2 },
  { warehouse: 'ggn', prefix: '2', minDays: 2, maxDays: 4 },
  { warehouse: 'ggn', prefix: '3', minDays: 3, maxDays: 5 },
  { warehouse: 'ggn', prefix: '7', minDays: 4, maxDays: 6 },
  { warehouse: 'bhw', prefix: '', minDays: 5, maxDays: 8 },
  { warehouse: 'bhw', prefix: '4', minDays: 2, maxDays: 3 },
  { warehouse: 'bhw', prefix: '40', minDays: 1, maxDays: 2 },
  { warehouse: 'bhw', prefix: '41', minDays: 1, maxDays: 3 },
  { warehouse: 'bhw', prefix: '3', minDays: 2, maxDays: 4 },
];

type Service = { deliverable: boolean; codAllowed: boolean };
const prepaidOnly: Service = { deliverable: true, codAllowed: false };
const none: Service = { deliverable: false, codAllowed: false };

/**
 * Demo pincodes. Every one gets a row per category (deliverable + COD unless listed in
 * `except`). A pincode not listed here has no rows and is not deliverable (D-62).
 */
export const servicePincodes: {
  pincode: string;
  city: string;
  except?: Record<string, Service>;
}[] = [
  { pincode: '560001', city: 'Bengaluru' },
  { pincode: '560034', city: 'Bengaluru' },
  { pincode: '560102', city: 'Bengaluru' },
  { pincode: '110001', city: 'New Delhi' },
  { pincode: '110017', city: 'New Delhi' },
  { pincode: '122001', city: 'Gurugram' },
  { pincode: '201301', city: 'Noida' },
  { pincode: '400001', city: 'Mumbai' },
  { pincode: '400076', city: 'Mumbai' },
  { pincode: '411001', city: 'Pune' },
  { pincode: '600001', city: 'Chennai' },
  { pincode: '600040', city: 'Chennai' },
  { pincode: '500001', city: 'Hyderabad' },
  { pincode: '500081', city: 'Hyderabad' },
  { pincode: '700001', city: 'Kolkata' },
  { pincode: '380001', city: 'Ahmedabad' },
  { pincode: '302001', city: 'Jaipur' },
  { pincode: '226001', city: 'Lucknow' },
  { pincode: '682001', city: 'Kochi' },
  { pincode: '641001', city: 'Coimbatore' },
  { pincode: '751001', city: 'Bhubaneswar' },
  {
    pincode: '781001',
    city: 'Guwahati',
    except: { tvs: prepaidOnly, 'robot-vacuums': prepaidOnly },
  },
  {
    pincode: '744101',
    city: 'Port Blair',
    except: {
      smartphones: prepaidOnly,
      audio: prepaidOnly,
      wearables: prepaidOnly,
      accessories: prepaidOnly,
      'smart-home': prepaidOnly,
      tvs: none,
      'robot-vacuums': none,
    },
  },
  {
    pincode: '194101',
    city: 'Leh',
    except: {
      smartphones: prepaidOnly,
      audio: prepaidOnly,
      wearables: prepaidOnly,
      accessories: prepaidOnly,
      'smart-home': none,
      tvs: none,
      'robot-vacuums': none,
    },
  },
];
