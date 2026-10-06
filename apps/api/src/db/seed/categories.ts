import type { AttributeDef, CategoryConfig, ReturnPolicy } from '@borneo/shared';

export type SeedCategory = {
  slug: string;
  name: string;
  depth: 'full' | 'template';
  /** D-81, D-83, D-89: seeded config, never derived from the slug. */
  returnPolicy: ReturnPolicy;
  attributes: AttributeDef[];
  config: CategoryConfig;
  faqs: { question: string; answer: string }[];
};

const attr = (
  key: string,
  label: string,
  type: AttributeDef['type'],
  extra: Partial<Omit<AttributeDef, 'key' | 'label' | 'type'>> = {},
): AttributeDef => ({ key, label, type, compat: false, ...extra });

const usbC = attr('connector', 'Connector', 'enum', { options: ['usb_c'], compat: true });
const alexa = attr('works_with_alexa', 'Alexa', 'bool', {
  compat: true,
  filterable: true,
  comparable: true,
});
const google = attr('works_with_google', 'Google Home', 'bool', {
  compat: true,
  filterable: true,
  comparable: true,
});
const android = attr('works_with_android', 'Android', 'bool', { compat: true });
const iphone = attr('works_with_iphone', 'iPhone', 'bool', { compat: true });

export const CASE_FITS = [
  'pulse-3',
  'pulse-4',
  'pulse-4-pro',
  'nova-2',
  'nova-3',
  'nova-3-pro',
  'nova-4',
  'apex-1',
  'apex-2',
  'apex-2-premium',
];
export const TIP_FITS = ['echo-tips-v1', 'echo-tips-v2'];
export const VACUUM_KIT_FITS = ['sweep-r1', 'sweep-r2'];

/** Launch categories (D-10). Smartphones and audio are full depth (D-13). */
export const categories: SeedCategory[] = [
  {
    slug: 'smartphones',
    name: 'Smartphones',
    depth: 'full',
    returnPolicy: 'replacementOnly',
    attributes: [
      attr('display_size_in', 'Display', 'number', { unit: 'in', comparable: true }),
      attr('refresh_rate_hz', 'Refresh rate', 'number', {
        unit: 'Hz',
        filterable: true,
        comparable: true,
      }),
      attr('chipset', 'Chipset', 'text', { comparable: true }),
      attr('ram_gb', 'RAM', 'number', { unit: 'GB', filterable: true, comparable: true }),
      attr('os', 'Software', 'text', { comparable: true }),
      attr('battery_mah', 'Battery', 'number', {
        unit: 'mAh',
        filterable: true,
        comparable: true,
      }),
      attr('charging_w', 'Wired charging', 'number', { unit: 'W', comparable: true }),
      attr('wireless_charging', 'Qi wireless charging', 'bool', { compat: true, comparable: true }),
      attr('main_camera_mp', 'Main camera', 'number', { unit: 'MP', comparable: true }),
      attr('five_g', '5G', 'bool', { filterable: true, comparable: true }),
      attr('nfc', 'NFC', 'bool', { filterable: true, comparable: true }),
      attr('esim', 'eSIM', 'bool', { comparable: true }),
      usbC,
      attr('ip_rating', 'Water and dust', 'enum', {
        options: ['IP52', 'IP54', 'IP64', 'IP68'],
        filterable: true,
        comparable: true,
      }),
      attr('weight_g', 'Weight', 'number', { unit: 'g', comparable: true }),
      /** Which Borneo cases and screen guards fit. Structured, so accessory edges are facts (D-22). */
      attr('case_fit', 'Case size', 'enum', { options: CASE_FITS }),
    ],
    config: {
      filters: ['ram_gb', 'refresh_rate_hz', 'battery_mah', 'five_g', 'nfc', 'ip_rating'],
      specGroups: [
        { label: 'Display', keys: ['display_size_in', 'refresh_rate_hz'] },
        { label: 'Performance', keys: ['chipset', 'ram_gb', 'os'] },
        { label: 'Battery', keys: ['battery_mah', 'charging_w', 'wireless_charging'] },
        { label: 'Camera', keys: ['main_camera_mp'] },
        { label: 'Connectivity', keys: ['five_g', 'nfc', 'esim', 'connector'] },
        { label: 'Build', keys: ['ip_rating', 'weight_g'] },
      ],
      compare: [
        'display_size_in',
        'refresh_rate_hz',
        'chipset',
        'ram_gb',
        'battery_mah',
        'charging_w',
        'wireless_charging',
        'main_camera_mp',
        'ip_rating',
        'weight_g',
      ],
      finder: 'phones',
    },
    faqs: [
      {
        question: 'Can I return a phone if I change my mind?',
        answer:
          'Phones are replacement only. If it arrives damaged or defective, request a replacement within 7 days of delivery.',
      },
      {
        question: 'Is there a charger in the box?',
        answer:
          'Apex phones include a 1 m USB-C cable. Chargers are sold separately for every Borneo phone.',
      },
    ],
  },
  {
    slug: 'audio',
    name: 'Audio',
    depth: 'full',
    returnPolicy: 'return',
    attributes: [
      attr('form_factor', 'Type', 'enum', {
        options: ['tws', 'neckband', 'over_ear', 'speaker'],
        filterable: true,
        comparable: true,
      }),
      attr('anc', 'Active noise cancellation', 'bool', { filterable: true, comparable: true }),
      attr('playback_hours', 'Playback', 'number', {
        unit: 'h',
        filterable: true,
        comparable: true,
      }),
      attr('case_hours', 'With case', 'number', { unit: 'h', comparable: true }),
      attr('bluetooth_version', 'Bluetooth', 'number', { compat: true, comparable: true }),
      attr('codecs', 'Codecs', 'list', {
        options: ['SBC', 'AAC', 'LDAC', 'LC3'],
        compat: true,
        comparable: true,
      }),
      attr('multipoint', 'Multipoint', 'bool', { filterable: true, comparable: true }),
      android,
      iphone,
      attr('water_resistance', 'Water resistance', 'enum', {
        options: ['IPX4', 'IPX5', 'IP55', 'IP67'],
        filterable: true,
        comparable: true,
      }),
      attr('driver_mm', 'Driver', 'number', { unit: 'mm', comparable: true }),
      usbC,
      attr('weight_g', 'Weight', 'number', { unit: 'g', comparable: true }),
      attr('tip_fit', 'Ear tip size', 'enum', { options: TIP_FITS }),
    ],
    config: {
      filters: ['form_factor', 'anc', 'playback_hours', 'multipoint', 'water_resistance'],
      specGroups: [
        { label: 'Sound', keys: ['form_factor', 'anc', 'driver_mm', 'codecs'] },
        { label: 'Battery', keys: ['playback_hours', 'case_hours'] },
        {
          label: 'Connectivity',
          keys: ['bluetooth_version', 'multipoint', 'works_with_android', 'works_with_iphone'],
        },
        { label: 'Build', keys: ['water_resistance', 'weight_g', 'connector'] },
      ],
      compare: [
        'form_factor',
        'anc',
        'playback_hours',
        'case_hours',
        'codecs',
        'multipoint',
        'water_resistance',
        'driver_mm',
        'weight_g',
      ],
      finder: 'audio',
    },
    faqs: [
      {
        question: 'Do Borneo earbuds work with iPhone?',
        answer:
          'Yes. Every Borneo earbud and headphone pairs over standard Bluetooth with Android and iPhone.',
      },
      {
        question: 'Can I return earbuds?',
        answer: 'Yes, within 7 days of delivery for any reason, in the original packaging.',
      },
    ],
  },
  {
    slug: 'wearables',
    name: 'Wearables',
    depth: 'template',
    returnPolicy: 'return',
    attributes: [
      attr('form_factor', 'Type', 'enum', {
        options: ['band', 'watch'],
        filterable: true,
        comparable: true,
      }),
      attr('display_size_in', 'Display', 'number', { unit: 'in', comparable: true }),
      attr('battery_days', 'Battery', 'number', {
        unit: 'days',
        filterable: true,
        comparable: true,
      }),
      attr('gps', 'Built-in GPS', 'bool', { filterable: true, comparable: true }),
      attr('calling', 'Bluetooth calling', 'bool', { filterable: true, comparable: true }),
      android,
      iphone,
      attr('strap_width_mm', 'Strap width', 'number', { unit: 'mm', compat: true }),
      attr('water_resistance', 'Water resistance', 'enum', {
        options: ['IP68', '5ATM'],
        comparable: true,
      }),
    ],
    config: {
      filters: ['form_factor', 'battery_days', 'gps', 'calling'],
      specGroups: [
        { label: 'Display', keys: ['form_factor', 'display_size_in'] },
        { label: 'Health and fitness', keys: ['gps', 'battery_days'] },
        { label: 'Compatibility', keys: ['works_with_android', 'works_with_iphone', 'calling'] },
        { label: 'Build', keys: ['strap_width_mm', 'water_resistance'] },
      ],
      compare: [
        'form_factor',
        'display_size_in',
        'battery_days',
        'gps',
        'calling',
        'water_resistance',
      ],
    },
    faqs: [
      {
        question: 'Do I need a Borneo phone?',
        answer:
          'No. Borneo wearables work with any Android phone or iPhone through the Borneo Fit app.',
      },
    ],
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    depth: 'template',
    returnPolicy: 'return',
    attributes: [
      attr('accessory_type', 'Type', 'enum', {
        options: [
          'charger',
          'cable',
          'wireless_charger',
          'case',
          'screen_protector',
          'ear_tips',
          'strap',
          'vacuum_kit',
        ],
        filterable: true,
        comparable: true,
      }),
      usbC,
      attr('output_w', 'Output', 'number', {
        unit: 'W',
        compat: true,
        filterable: true,
        comparable: true,
      }),
      attr('qi', 'Qi wireless charging', 'bool', { compat: true }),
      attr('cable_length_m', 'Length', 'number', { unit: 'm', comparable: true }),
      attr('fits_case', 'Fits', 'list', { options: CASE_FITS }),
      attr('fits_tips', 'Fits', 'list', { options: TIP_FITS }),
      attr('strap_width_mm', 'Strap width', 'number', { unit: 'mm', compat: true }),
      attr('fits_vacuum', 'Fits', 'list', { options: VACUUM_KIT_FITS }),
    ],
    config: {
      filters: ['accessory_type', 'output_w'],
      specGroups: [
        { label: 'Details', keys: ['accessory_type', 'connector', 'output_w', 'cable_length_m'] },
      ],
      compare: ['accessory_type', 'output_w', 'cable_length_m'],
    },
    faqs: [
      {
        question: 'Will a Borneo charger work with other phones?',
        answer: 'Yes. Borneo chargers use USB-C Power Delivery and charge any USB-C device.',
      },
    ],
  },
  {
    slug: 'smart-home',
    name: 'Smart home',
    depth: 'template',
    returnPolicy: 'return',
    attributes: [
      attr('device_type', 'Type', 'enum', {
        options: ['plug', 'bulb', 'hub', 'camera'],
        filterable: true,
        comparable: true,
      }),
      alexa,
      google,
      attr('wifi_band', 'Wi-Fi', 'enum', { options: ['2.4 GHz', 'Dual band'], comparable: true }),
      attr('needs_hub', 'Needs a hub', 'bool', { comparable: true }),
      attr('max_load_w', 'Max load', 'number', { unit: 'W', comparable: true }),
      attr('video_resolution', 'Video', 'enum', { options: ['1080p', '2K'], comparable: true }),
    ],
    config: {
      filters: ['device_type', 'works_with_alexa', 'works_with_google'],
      specGroups: [
        { label: 'Compatibility', keys: ['works_with_alexa', 'works_with_google', 'needs_hub'] },
        { label: 'Details', keys: ['device_type', 'wifi_band', 'max_load_w', 'video_resolution'] },
      ],
      compare: ['device_type', 'works_with_alexa', 'works_with_google', 'wifi_band', 'needs_hub'],
    },
    faqs: [
      {
        question: 'Do I need the Home Hub?',
        answer:
          'No. Plugs, bulbs and cameras connect straight to 2.4 GHz Wi-Fi. The hub adds routines that run offline.',
      },
    ],
  },
  {
    slug: 'tvs',
    name: 'TVs',
    depth: 'template',
    returnPolicy: 'replacementOnly',
    attributes: [
      attr('screen_size_in', 'Screen', 'number', {
        unit: 'in',
        filterable: true,
        comparable: true,
      }),
      attr('resolution', 'Resolution', 'enum', {
        options: ['Full HD', '4K'],
        filterable: true,
        comparable: true,
      }),
      attr('panel', 'Panel', 'enum', {
        options: ['LED', 'QLED', 'OLED'],
        filterable: true,
        comparable: true,
      }),
      attr('refresh_rate_hz', 'Refresh rate', 'number', { unit: 'Hz', comparable: true }),
      attr('hdmi_ports', 'HDMI ports', 'number', { comparable: true }),
      attr('dolby_vision', 'Dolby Vision', 'bool', { comparable: true }),
      attr('os', 'Software', 'text', { comparable: true }),
      alexa,
      google,
    ],
    config: {
      filters: ['screen_size_in', 'resolution', 'panel'],
      specGroups: [
        {
          label: 'Picture',
          keys: ['screen_size_in', 'resolution', 'panel', 'refresh_rate_hz', 'dolby_vision'],
        },
        { label: 'Smart', keys: ['os', 'works_with_alexa', 'works_with_google'] },
        { label: 'Connectivity', keys: ['hdmi_ports'] },
      ],
      compare: [
        'screen_size_in',
        'resolution',
        'panel',
        'refresh_rate_hz',
        'hdmi_ports',
        'dolby_vision',
      ],
    },
    faqs: [
      {
        question: 'Can I return a TV?',
        answer:
          'TVs are replacement only. If it arrives damaged or defective, request a replacement within 7 days of delivery.',
      },
    ],
  },
  {
    slug: 'robot-vacuums',
    name: 'Robot vacuums',
    depth: 'template',
    returnPolicy: 'return',
    attributes: [
      attr('suction_pa', 'Suction', 'number', { unit: 'Pa', filterable: true, comparable: true }),
      attr('mop', 'Mopping', 'bool', { filterable: true, comparable: true }),
      attr('self_empty', 'Self-emptying dock', 'bool', { filterable: true, comparable: true }),
      attr('runtime_min', 'Runtime', 'number', { unit: 'min', comparable: true }),
      attr('lidar', 'LiDAR mapping', 'bool', { comparable: true }),
      alexa,
      google,
      attr('vacuum_kit_fit', 'Care kit', 'enum', { options: VACUUM_KIT_FITS }),
    ],
    config: {
      filters: ['suction_pa', 'mop', 'self_empty'],
      specGroups: [
        { label: 'Cleaning', keys: ['suction_pa', 'mop', 'self_empty', 'runtime_min'] },
        { label: 'Smart', keys: ['lidar', 'works_with_alexa', 'works_with_google'] },
      ],
      compare: ['suction_pa', 'mop', 'self_empty', 'runtime_min', 'lidar'],
    },
    faqs: [
      {
        question: 'How often do brushes and filters need replacing?',
        answer: 'About every 3 months with daily use. The Sweep care kit has a full set.',
      },
    ],
  },
];
