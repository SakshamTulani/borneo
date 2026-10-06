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
  state: string;
  /** Pincode centre, for map pins (D-184). */
  lat: number;
  lng: number;
  except?: Record<string, Service>;
}[] = [
  { pincode: '560001', city: 'Bengaluru', state: 'Karnataka', lat: 12.9763, lng: 77.6033 },
  { pincode: '560034', city: 'Bengaluru', state: 'Karnataka', lat: 12.9279, lng: 77.6271 },
  { pincode: '560102', city: 'Bengaluru', state: 'Karnataka', lat: 12.9121, lng: 77.6446 },
  { pincode: '110001', city: 'New Delhi', state: 'Delhi', lat: 28.6315, lng: 77.2167 },
  { pincode: '110017', city: 'New Delhi', state: 'Delhi', lat: 28.5355, lng: 77.21 },
  { pincode: '122001', city: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266 },
  { pincode: '201301', city: 'Noida', state: 'Uttar Pradesh', lat: 28.5706, lng: 77.3272 },
  { pincode: '400001', city: 'Mumbai', state: 'Maharashtra', lat: 18.9388, lng: 72.8354 },
  { pincode: '400076', city: 'Mumbai', state: 'Maharashtra', lat: 19.1176, lng: 72.906 },
  { pincode: '411001', city: 'Pune', state: 'Maharashtra', lat: 18.5196, lng: 73.8553 },
  { pincode: '600001', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0878, lng: 80.2785 },
  { pincode: '600040', city: 'Chennai', state: 'Tamil Nadu', lat: 13.085, lng: 80.2101 },
  { pincode: '500001', city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
  { pincode: '500081', city: 'Hyderabad', state: 'Telangana', lat: 17.4483, lng: 78.3915 },
  { pincode: '700001', city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { pincode: '380001', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { pincode: '302001', city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { pincode: '226001', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { pincode: '682001', city: 'Kochi', state: 'Kerala', lat: 9.9658, lng: 76.2421 },
  { pincode: '641001', city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  { pincode: '751001', city: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245 },
  {
    pincode: '781001',
    city: 'Guwahati',
    state: 'Assam',
    lat: 26.1445,
    lng: 91.7362,
    except: { tvs: prepaidOnly, 'robot-vacuums': prepaidOnly },
  },
  {
    pincode: '744101',
    city: 'Port Blair',
    state: 'Andaman and Nicobar Islands',
    lat: 11.6234,
    lng: 92.7265,
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
    state: 'Ladakh',
    lat: 34.1526,
    lng: 77.5771,
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

/** Known pincodes with no serviceability rows: a map pin there shows "not deliverable" (D-62). */
export const unservedPincodes = [
  { pincode: '171001', city: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
  { pincode: '795001', city: 'Imphal', state: 'Manipur', lat: 24.817, lng: 93.9368 },
];
