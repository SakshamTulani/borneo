import type { AttributeDef, CategoryConfig, ReturnPolicy } from '@borneo/shared';

export type SeedCategory = {
  slug: string;
  name: string;
  depth: 'full' | 'template';
  /** D-81, D-83, D-89: seeded config, never derived from the slug. */
  returnPolicy: ReturnPolicy;
  /** Invoice tax (D-209). Demo placeholders: confirm with an accountant before launch. */
  tax: { hsnCode: string; gstRateBps: number };
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

const usbC = attr('connector', 'Connector', 'enum', {
  options: ['usb_c'],
  optionLabels: { usb_c: 'USB-C' },
  compat: true,
});
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
    tax: { hsnCode: '8517', gstRateBps: 1800 },
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
      homeEntry: 'helpMeChoose',
      explainers: [
        {
          title: 'Refresh rate',
          body: 'How many times a second the screen redraws. 120 Hz makes scrolling and games look smoother than 60 Hz, and uses a little more battery.',
        },
        {
          title: 'RAM',
          body: 'Working memory. 8 GB keeps more apps open in the background without reloading; 6 GB is plenty for messaging, UPI and streaming.',
        },
        {
          title: 'Battery and charging',
          body: 'mAh is how much the battery holds; watts is how fast it can charge. A 5,000 mAh phone usually lasts a full day of mixed use.',
        },
        {
          title: 'Water and dust ratings',
          body: 'IP54 shrugs off splashes and rain. IP68 survives being dropped in water. The higher the rating, the more it can take.',
        },
      ],
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
          'No. Chargers are sold separately for every Borneo phone. Any USB-C charger works; the wired charging speed in Specs is the most the phone takes.',
      },
    ],
  },
  {
    slug: 'audio',
    tax: { hsnCode: '8518', gstRateBps: 1800 },
    name: 'Audio',
    depth: 'full',
    returnPolicy: 'return',
    attributes: [
      attr('form_factor', 'Type', 'enum', {
        options: ['tws', 'neckband', 'over_ear', 'speaker'],
        optionLabels: {
          tws: 'True wireless',
          neckband: 'Neckband',
          over_ear: 'Over-ear',
          speaker: 'Speaker',
        },
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
      homeEntry: 'helpMeChoose',
      explainers: [
        {
          title: 'Active noise cancellation (ANC)',
          body: 'Microphones listen to the noise around you and cancel it out. It makes trains, flights and busy offices much quieter.',
        },
        {
          title: 'Multipoint',
          body: 'Stays connected to two devices at once, so a call on your phone comes through while you watch something on your laptop.',
        },
        {
          title: 'Codecs: AAC and LDAC',
          body: 'How music travels over Bluetooth. AAC suits iPhone and most Android phones; LDAC carries more detail on Android phones that support it.',
        },
        {
          title: 'Water resistance',
          body: 'IPX4 handles sweat and light rain, IPX5 a strong splash, IP67 a dunk. Pick IPX5 or better for workouts.',
        },
      ],
    },
    faqs: [
      {
        question: 'Do Borneo audio products work with iPhone?',
        answer:
          'Yes. Every Borneo earbud, neckband, headphone and speaker pairs over Bluetooth with Android phones and iPhone. LDAC hi-res audio needs an Android phone that supports LDAC.',
      },
      {
        question: 'Can I return audio products?',
        answer: 'Yes, within 7 days of delivery, for any reason.',
      },
    ],
  },
  {
    slug: 'wearables',
    tax: { hsnCode: '8517', gstRateBps: 1800 },
    name: 'Wearables',
    depth: 'template',
    returnPolicy: 'return',
    attributes: [
      attr('form_factor', 'Type', 'enum', {
        options: ['band', 'watch'],
        optionLabels: { band: 'Band', watch: 'Watch' },
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
        answer: 'No. Every Borneo band and watch works with Android phones and iPhone.',
      },
    ],
  },
  {
    slug: 'accessories',
    tax: { hsnCode: '8504', gstRateBps: 1800 },
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
        optionLabels: {
          charger: 'Charger',
          cable: 'Cable',
          wireless_charger: 'Wireless charger',
          case: 'Case',
          screen_protector: 'Screen protector',
          ear_tips: 'Ear tips',
          strap: 'Strap',
          vacuum_kit: 'Vacuum kit',
        },
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
      homeEntry: 'buildYourSetup',
    },
    faqs: [
      {
        question: 'Do Borneo accessories fit other brands?',
        answer:
          'Chargers and cables are USB-C and work with any USB-C phone or earbuds. Straps fit any watch with the same strap width. Cases, screen glass, ear tips and the Sweep care kit fit only the Borneo models listed under Fits.',
      },
    ],
  },
  {
    slug: 'smart-home',
    tax: { hsnCode: '8517', gstRateBps: 1800 },
    name: 'Smart home',
    depth: 'template',
    returnPolicy: 'return',
    attributes: [
      attr('device_type', 'Type', 'enum', {
        options: ['plug', 'bulb', 'hub', 'camera'],
        optionLabels: { plug: 'Smart plug', bulb: 'Smart bulb', hub: 'Hub', camera: 'Camera' },
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
      homeEntry: 'buildYourSetup',
    },
    faqs: [
      {
        question: 'Do I need the Home Hub?',
        answer:
          'No. The smart plug, smart bulb and indoor camera connect straight to 2.4 GHz Wi-Fi without a hub.',
      },
    ],
  },
  {
    slug: 'tvs',
    tax: { hsnCode: '8528', gstRateBps: 1800 },
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
    tax: { hsnCode: '8508', gstRateBps: 1800 },
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
        answer:
          'About every 3 months with daily use. The Sweep care kit has a full set and fits every Sweep.',
      },
    ],
  },
];
