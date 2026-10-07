/**
 * Sample product photos (D-180): Unsplash photos hotlinked by id, chosen to avoid visible
 * third-party logos. Placeholders only; real Borneo photography replaces them before launch.
 * The web app adds size parameters per use, so URLs are stored without a query string.
 */
const UNSPLASH = 'https://images.unsplash.com/';

/** Lead photo first. Every listed product needs at least one (checked by `seedIssues`). */
const photoIds: Record<string, string[]> = {
  // Smartphones
  'pulse-3': ['photo-1629494893504-d41e26a02631', 'photo-1585060544812-6b45742d762f'],
  'pulse-4': ['photo-1693822845595-862bacc31cf9', 'photo-1691256676376-357c3aa66c89'],
  'pulse-4-pro': ['photo-1695973057042-300f5fabd862', 'photo-1752218804008-f72b9a51ddde'],
  'nova-2': ['photo-1695973056909-67189edc1c9e', 'photo-1722834228772-01d16b9bf83b'],
  'nova-3': ['photo-1627542557169-5ed71c66ed85', 'photo-1754650840537-dec1e9bc9714'],
  'nova-3-pro': ['photo-1736191550786-46a46aa47394'],
  'nova-4': ['photo-1695973056925-0d065f12befd', 'photo-1784407097298-759eb54e8aeb'],
  'apex-1': ['photo-1695048064952-44b984f2af6d'],
  'apex-2': ['photo-1694123535847-ffc09315f588', 'photo-1694198336071-c599932f1f56'],
  'apex-2-premium': ['photo-1694462250245-73721af92b59'],
  // Audio
  'echo-buds-1': ['photo-1632200004922-bc18602c79fc', 'photo-1648447267722-77cb7cf4c292'],
  'echo-buds-2': ['photo-1755182529034-189a6051faae'],
  'echo-buds-2-pro': ['photo-1706289835533-3cb1956beeb3', 'photo-1698244244114-b0eb90869056'],
  'echo-max-1': ['photo-1583394838336-acd977736f90', 'photo-1599669454699-248893623440'],
  'echo-max-2': ['photo-1638803782506-d975a6809f43', 'photo-1505740420928-5e560c06d30e'],
  'echo-band-1': ['photo-1632247541401-3d4a8d516595', 'photo-1583343894790-5cff219de28a'],
  'boom-mini': ['photo-1547052178-7f2c5a20c332', 'photo-1507878566509-a0dbe19677a5'],
  'boom-2': ['photo-1674303324806-7018a739ed11', 'photo-1582978571763-2d039e56f0c3'],
  // Wearables
  'fit-band-2': ['photo-1575311373937-040b8e1fd5b6', 'photo-1579721840641-7d0e67f1204e'],
  'watch-s1': ['photo-1660844817855-3ecc7ef21f12'],
  'watch-s2': ['photo-1523275335684-37898b6baf30', 'photo-1624028410567-153ec3d47059'],
  'watch-s2-pro': ['photo-1676554565987-524692127b1a', 'photo-1553545204-4f7d339aa06a'],
  // Accessories
  'charger-33w': ['photo-1770417999483-e5a313b33468', 'photo-1579675397338-7a83f91a51e7'],
  'charger-67w-gan': ['photo-1709236709044-159f627b7971', 'photo-1586254116648-d33e0fada133'],
  'cable-usb-c-1m': ['photo-1711056823627-64e9089d4a82', 'photo-1615086169217-83e1c06c9f4f'],
  'cable-usb-c-2m': ['photo-1595756630452-736bc8ef3693', 'photo-1766976898196-227348d60914'],
  'wireless-pad-15w': ['photo-1591290619618-904f6dd935e3', 'photo-1606077095660-726118e877fd'],
  'case-pulse-4': ['photo-1535469145415-8e49c30eae75', 'photo-1535157412991-2ef801c1748b'],
  'case-nova-3': ['photo-1525226456211-24affe06d7dc', 'photo-1658301504135-333ce9845418'],
  'case-apex-2': ['photo-1654588301119-7e23237ace60', 'photo-1625641936123-59d5bcc1edb8'],
  'glass-apex-2': ['photo-1583291023438-41cef6453b1f'],
  'tips-echo-v2': ['photo-1632835746204-22f652dac3af'],
  'strap-20mm': ['photo-1787386543061-3e5e5ba01acb', 'photo-1787386543051-e2fb5374bb60'],
  'strap-22mm': ['photo-1787386543071-00c7058835bb', 'photo-1787386543100-9cd53a76fc2f'],
  'sweep-care-kit': ['photo-1746645524501-95a70be74752', 'photo-1687443044772-0bfc335d6739'],
  // Smart home
  'smart-plug-16a': ['photo-1730967844913-29eb5cae5f34'],
  'smart-bulb-9w': ['photo-1532007271951-c487760934ae', 'photo-1641113403042-0b6f6e5e0a35'],
  'home-hub-1': ['photo-1511842745775-b366af36db2a', 'photo-1519558260268-cde7e03a0152'],
  'cam-indoor-2k': ['photo-1715869618915-a7bf6608d4c3', 'photo-1728971975421-50f3dc9663a4'],
  // TVs
  'vista-43': ['photo-1567690187548-f07b1d7bf5a9', 'photo-1586024486164-ce9b3d87e09f'],
  'vista-55-qled': ['photo-1521607630287-ee2e81ad3ced', 'photo-1595935736128-db1f0a261263'],
  'vista-65-oled': ['photo-1697457643599-77b5d074121f', 'photo-1761330439671-a7f20c285c5e'],
  // Robot vacuums
  'sweep-r1': ['photo-1558317374-067fb5f30001', 'photo-1558317374-24793bc9f2fb'],
  'sweep-r2': ['photo-1653990480360-31a12ce9723e', 'photo-1757478558431-f26ac85dd0fe'],
  'sweep-r2-pro': ['photo-1762500824321-de3c2f316156', 'photo-1765970101376-4d5153f56e81'],
};

export const productPhotos: Record<string, string[]> = Object.fromEntries(
  Object.entries(photoIds).map(([slug, ids]) => [slug, ids.map((id) => `${UNSPLASH}${id}`)]),
);
