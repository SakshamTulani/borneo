/**
 * Sample product photos (D-180): Unsplash photos hotlinked by id, chosen to avoid visible
 * third-party logos. Placeholders only; real Borneo photography replaces them before launch.
 * The web app adds size parameters per use, so URLs are stored without a query string.
 */
const UNSPLASH = 'https://images.unsplash.com/';

/** Lead photo first. Every listed product needs at least one (checked by `seedIssues`). */
const photoIds: Record<string, string[]> = {
  // Smartphones
  'pulse-3': ['photo-1585060544812-6b45742d762f'],
  'pulse-4': ['photo-1693822845595-862bacc31cf9', 'photo-1691256676376-357c3aa66c89'],
  'pulse-4-pro': ['photo-1752218804008-f72b9a51ddde', 'photo-1576082712285-cf3fd8b3be17'],
  'nova-2': ['photo-1722834228772-01d16b9bf83b'],
  'nova-3': ['photo-1754650840537-dec1e9bc9714', 'photo-1585513827509-4ab827d891b6'],
  'nova-3-pro': ['photo-1758186342771-b36aa21f8494', 'photo-1655627617149-d811dc052d16'],
  'nova-4': ['photo-1784407097298-759eb54e8aeb', 'photo-1623824204241-f851d3bcfaf5'],
  'apex-1': ['photo-1695048064952-44b984f2af6d'],
  'apex-2': ['photo-1787484496631-23d544f497de', 'photo-1603812188420-da2c28a47cd4'],
  'apex-2-premium': ['photo-1784407082880-7614c3597fd2', 'photo-1511140973288-19bf21d7e771'],
  // Audio
  'echo-buds-1': ['photo-1648447267722-77cb7cf4c292', 'photo-1578319439584-104c94d37305'],
  'echo-buds-2': ['photo-1783890848500-426732ee5a11', 'photo-1783890848515-c0dc28b25ef2'],
  'echo-buds-2-pro': ['photo-1789359033543-5202ed2439a9', 'photo-1789359033560-73495540a5c1'],
  'echo-max-1': ['photo-1599669454699-248893623440', 'photo-1583394838336-acd977736f90'],
  'echo-max-2': ['photo-1638803782506-d975a6809f43', 'photo-1505740420928-5e560c06d30e'],
  'echo-band-1': ['photo-1744591433649-28069739f80b', 'photo-1589100957896-84589df16b9b'],
  'boom-mini': ['photo-1507878566509-a0dbe19677a5'],
  'boom-2': ['photo-1616029832310-d07b9d4f1d0a'],
  // Wearables
  'fit-band-2': ['photo-1575311373937-040b8e1fd5b6', 'photo-1575054092299-4a300e7a2511'],
  'watch-s1': ['photo-1694837449886-80df7fe6024e', 'photo-1610991138614-0d4d78ac6de8'],
  'watch-s2': ['photo-1772983069620-43a502c2784f', 'photo-1704942968209-6c1e05ef3f95'],
  'watch-s2-pro': ['photo-1697490057407-34c996cab84f', 'photo-1788459689176-ff366a6db205'],
  // Accessories
  'charger-33w': ['photo-1579675397338-7a83f91a51e7'],
  'charger-67w-gan': ['photo-1762341123204-b4c3e04e6e93'],
  'cable-usb-c-1m': ['photo-1621717731333-7f7fa49fc86d'],
  'cable-usb-c-2m': ['photo-1610056494249-5d7f111cf78f'],
  'wireless-pad-15w': ['photo-1575543419095-0b090628213f', 'photo-1575543419900-b3482ff8e69e'],
  'case-pulse-4': ['photo-1535157412991-2ef801c1748b'],
  'case-nova-3': ['photo-1625641936232-d5803c299111'],
  'case-apex-2': ['photo-1625641936123-59d5bcc1edb8', 'photo-1705041053164-da04bcbc7c12'],
  'glass-apex-2': ['photo-1744487347423-dbe5b265652c'],
  'tips-echo-v2': ['photo-1789359033489-54b9c5cd6103'],
  'strap-20mm': ['photo-1787386543239-c7df1e76d91c', 'photo-1787386543100-9cd53a76fc2f'],
  'strap-22mm': ['photo-1787386543193-245d8fba77d2', 'photo-1787386543111-2f16f0905452'],
  'sweep-care-kit': ['photo-1603618090561-412154b4bd1b'],
  // Smart home
  'smart-plug-16a': ['photo-1610056494052-6a4f83a8368c', 'photo-1623949676892-0e88eea8f940'],
  'smart-bulb-9w': ['photo-1532007271951-c487760934ae', 'photo-1641113403042-0b6f6e5e0a35'],
  'home-hub-1': ['photo-1511842745775-b366af36db2a', 'photo-1519558260268-cde7e03a0152'],
  'cam-indoor-2k': ['photo-1549109926-58f039549485', 'photo-1495714096525-285e85481946'],
  // TVs
  'vista-43': ['photo-1597406462637-eb560874d1f8', 'photo-1715868664091-be70dfc64369'],
  'vista-55-qled': ['photo-1595935736128-db1f0a261263', 'photo-1560169897-fc0cdbdfa4d5'],
  'vista-65-oled': ['photo-1593784991251-92ded75ea290', 'photo-1761330439671-a7f20c285c5e'],
  // Robot vacuums
  'sweep-r1': ['photo-1558317374-24793bc9f2fb', 'photo-1558317374-067fb5f30001'],
  'sweep-r2': ['photo-1653990480360-31a12ce9723e', 'photo-1757478558372-43c94b3268bb'],
  'sweep-r2-pro': ['photo-1762500824321-de3c2f316156', 'photo-1762859731349-c9ff2808b672'],
};

export const productPhotos: Record<string, string[]> = Object.fromEntries(
  Object.entries(photoIds).map(([slug, ids]) => [slug, ids.map((id) => `${UNSPLASH}${id}`)]),
);
