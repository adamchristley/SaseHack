/*
 * SEED STARTER DATASET — student discounts.
 *
 * HONESTY / SAFETY (from the plan):
 *   - Every row is a REAL program at a REAL company with a real source_url.
 *     Nothing here is invented. If you can't open the source_url and see a
 *     student offer, delete the row.
 *   - `est_annual_savings` is deliberately CONSERVATIVE. The headline dollar
 *     figure in the pitch only counts things the user says they already pay for.
 *   - `verified_at` values below are PLACEHOLDERS. Building + running the
 *     verifier (walk every source_url, confirm it still shows a student offer,
 *     stamp the real date) is Parker's deliverable. Do that before the pitch.
 *
 * TO EXPAND: this is ~30 rows. Plan target is 120+. Adding a row = one hand-
 * filled object below, filled from the company's OWN student page. Do NOT
 * scrape UNiDAYS / Student Beans / aggregators.
 *
 * Fields mirror the plan's `discounts` + `brands` schema, flattened per the
 * frozen API contract:
 *   { brand, aliases, category, summary, value_type, value_amount,
 *     est_annual_savings, how_to_claim, verification, source_url,
 *     verified_at, is_active, is_featured, popularity }
 * verification ∈ unidays | sheerid | edu_email | manual | none
 * category     ∈ software | streaming | retail | food | transit | fitness | tech | news
 */

const PLACEHOLDER_VERIFIED = '2026-09-15' // TODO(team): replace via verifier

const d = (row) => ({
  value_type: null,
  value_amount: null,
  verification: 'manual',
  verified_at: PLACEHOLDER_VERIFIED,
  is_active: true,
  is_featured: false,
  popularity: 0,
  aliases: [],
  ...row,
})

export const discounts = [
  // ---- streaming ---------------------------------------------------------
  d({
    id: 1, brand: 'Spotify', aliases: ['spotify premium', 'spotify student'],
    category: 'streaming', is_featured: true, popularity: 100,
    summary: 'Premium Student: 50% off, includes Hulu (ad-supported)',
    value_type: 'percent', value_amount: 50, est_annual_savings: 72,
    how_to_claim: 'Verify enrollment with SheerID at spotify.com/student, then pay the student rate.',
    verification: 'sheerid',
    source_url: 'https://www.spotify.com/us/student/',
  }),
  d({
    id: 2, brand: 'YouTube Premium', aliases: ['youtube', 'youtube music'],
    category: 'streaming', is_featured: true, popularity: 78,
    summary: 'Premium Student: discounted monthly rate, ad-free + YouTube Music',
    value_type: 'percent', value_amount: 40, est_annual_savings: 60,
    how_to_claim: 'Verify student status with SheerID at youtube.com/premium/student.',
    verification: 'sheerid',
    source_url: 'https://www.youtube.com/premium/student',
  }),
  d({
    id: 3, brand: 'Hulu', aliases: ['hulu student'],
    category: 'streaming', is_featured: true, popularity: 70,
    summary: 'Student plan: $1.99/mo (ad-supported)',
    value_type: 'fixed', value_amount: 1.99, est_annual_savings: 84,
    how_to_claim: 'Verify with SheerID at hulu.com/student.',
    verification: 'sheerid',
    source_url: 'https://www.hulu.com/student',
  }),
  d({
    id: 4, brand: 'The New York Times', aliases: ['nyt', 'ny times', 'nytimes'],
    category: 'news', is_featured: false, popularity: 40,
    summary: 'Student rate: $1/week for All Access',
    value_type: 'fixed', value_amount: 1, est_annual_savings: 100,
    how_to_claim: 'Subscribe at the student rate at nytimes.com/subscription/edu.',
    verification: 'edu_email',
    source_url: 'https://www.nytimes.com/subscription/edu',
  }),

  // ---- software ----------------------------------------------------------
  d({
    id: 5, brand: 'Adobe Creative Cloud', aliases: ['adobe', 'adobe cc', 'creative cloud', 'photoshop'],
    category: 'software', is_featured: true, popularity: 92,
    summary: 'Creative Cloud All Apps for students: ~60% off first year',
    value_type: 'percent', value_amount: 60, est_annual_savings: 400,
    how_to_claim: 'Buy the student plan at adobe.com/creativecloud/buy/students.html; verify enrollment.',
    verification: 'sheerid',
    source_url: 'https://www.adobe.com/creativecloud/buy/students.html',
  }),
  d({
    id: 6, brand: 'Microsoft 365', aliases: ['office', 'office 365', 'microsoft office', 'word', 'excel'],
    category: 'software', is_featured: true, popularity: 88,
    summary: 'Office 365 Education free for students at eligible schools',
    value_type: 'free_tier', value_amount: 0, est_annual_savings: 70,
    how_to_claim: 'Sign up with your school email at microsoft.com/education/products/office.',
    verification: 'edu_email',
    source_url: 'https://www.microsoft.com/en-us/education/products/office',
  }),
  d({
    id: 7, brand: 'Notion', aliases: ['notion student'],
    category: 'software', is_featured: true, popularity: 74,
    summary: 'Free Plus plan for students and educators with a school email',
    value_type: 'free_tier', value_amount: 0, est_annual_savings: 96,
    how_to_claim: 'Add your .edu email under Settings, or sign up at notion.com/students.',
    verification: 'edu_email',
    source_url: 'https://www.notion.com/students',
  }),
  d({
    id: 8, brand: 'GitHub', aliases: ['github student', 'student developer pack'],
    category: 'software', is_featured: true, popularity: 85,
    summary: 'Student Developer Pack: dozens of dev tools free while you study',
    value_type: 'free_tier', value_amount: 0, est_annual_savings: 200,
    how_to_claim: 'Apply with proof of enrollment at education.github.com/pack.',
    verification: 'edu_email',
    source_url: 'https://education.github.com/pack',
  }),
  d({
    id: 9, brand: 'Figma', aliases: ['figma education', 'figma student'],
    category: 'software', is_featured: false, popularity: 55,
    summary: 'Free Professional plan for verified students and educators',
    value_type: 'free_tier', value_amount: 0, est_annual_savings: 144,
    how_to_claim: 'Apply for the Education plan at figma.com/education.',
    verification: 'edu_email',
    source_url: 'https://www.figma.com/education/',
  }),
  d({
    id: 10, brand: 'JetBrains', aliases: ['intellij', 'pycharm', 'jetbrains student'],
    category: 'software', is_featured: false, popularity: 50,
    summary: 'All JetBrains IDEs free with a student license',
    value_type: 'free_tier', value_amount: 0, est_annual_savings: 289,
    how_to_claim: 'Apply with your university email at jetbrains.com/community/education.',
    verification: 'edu_email',
    source_url: 'https://www.jetbrains.com/community/education/',
  }),
  d({
    id: 11, brand: 'Autodesk', aliases: ['autocad', 'fusion 360', 'autodesk education'],
    category: 'software', is_featured: false, popularity: 45,
    summary: 'Free educational access to AutoCAD, Fusion, Revit and more',
    value_type: 'free_tier', value_amount: 0, est_annual_savings: 250,
    how_to_claim: 'Get an education license at autodesk.com/education.',
    verification: 'edu_email',
    source_url: 'https://www.autodesk.com/education/edu-software/overview',
  }),
  d({
    id: 12, brand: 'Canva', aliases: ['canva education', 'canva pro'],
    category: 'software', is_featured: false, popularity: 48,
    summary: 'Canva for Education: Pro features free for eligible students',
    value_type: 'free_tier', value_amount: 0, est_annual_savings: 120,
    how_to_claim: 'Verify eligibility at canva.com/education.',
    verification: 'edu_email',
    source_url: 'https://www.canva.com/education/',
  }),

  // ---- tech / hardware ---------------------------------------------------
  d({
    id: 13, brand: 'Apple', aliases: ['apple education', 'macbook', 'ipad', 'apple store'],
    category: 'tech', is_featured: true, popularity: 90,
    summary: 'Education pricing on Mac & iPad, plus seasonal back-to-school offers',
    value_type: 'other', value_amount: null, est_annual_savings: 100,
    how_to_claim: 'Shop the Education Store at apple.com/us-hed/shop.',
    verification: 'edu_email',
    source_url: 'https://www.apple.com/us-hed/shop',
  }),
  d({
    id: 14, brand: 'Samsung', aliases: ['samsung education', 'galaxy'],
    category: 'tech', is_featured: false, popularity: 42,
    summary: 'Education Store: extra student discounts on phones, tablets, laptops',
    value_type: 'other', value_amount: null, est_annual_savings: 90,
    how_to_claim: 'Verify with UNiDAYS on the Samsung Education Store.',
    verification: 'unidays',
    source_url: 'https://www.samsung.com/us/shop/offer/student/',
  }),
  d({
    id: 15, brand: 'Dell', aliases: ['dell student', 'dell university'],
    category: 'tech', is_featured: false, popularity: 38,
    summary: 'Dell University / Member Purchase Program student discounts',
    value_type: 'other', value_amount: null, est_annual_savings: 80,
    how_to_claim: 'Shop the student store at dell.com/en-us/lp/students.',
    verification: 'edu_email',
    source_url: 'https://www.dell.com/en-us/lp/students',
  }),
  d({
    id: 16, brand: 'Best Buy', aliases: ['bestbuy', 'best buy student'],
    category: 'tech', is_featured: false, popularity: 44,
    summary: 'Student Deals hub: exclusive tech offers for students',
    value_type: 'other', value_amount: null, est_annual_savings: 60,
    how_to_claim: 'Join Best Buy Student Deals (free) at bestbuy.com/studentdeals.',
    verification: 'edu_email',
    source_url: 'https://www.bestbuy.com/site/misc/student-deals/pcmcat1564682928434.c',
  }),

  // ---- retail / apparel --------------------------------------------------
  d({
    id: 17, brand: 'Nike', aliases: ['nike student'],
    category: 'retail', is_featured: true, popularity: 82,
    summary: 'Student discount: 10% off online orders',
    value_type: 'percent', value_amount: 10, est_annual_savings: 40,
    how_to_claim: 'Verify with SheerID at checkout on nike.com.',
    verification: 'sheerid',
    source_url: 'https://www.nike.com/help/a/student-discount',
  }),
  d({
    id: 18, brand: 'Adidas', aliases: ['adidas student'],
    category: 'retail', is_featured: false, popularity: 60,
    summary: 'Student discount: 15% off (via UNiDAYS)',
    value_type: 'percent', value_amount: 15, est_annual_savings: 45,
    how_to_claim: 'Verify with UNiDAYS to unlock the code at adidas.com.',
    verification: 'unidays',
    source_url: 'https://www.adidas.com/us/students-discount',
  }),
  d({
    id: 19, brand: "Levi's", aliases: ['levis', 'levi', 'levis student'],
    category: 'retail', is_featured: false, popularity: 35,
    summary: 'Student discount: 15% off (via UNiDAYS)',
    value_type: 'percent', value_amount: 15, est_annual_savings: 30,
    how_to_claim: 'Verify with UNiDAYS at levi.com.',
    verification: 'unidays',
    source_url: 'https://www.levi.com/US/en_US/',
  }),
  d({
    id: 20, brand: 'J.Crew', aliases: ['jcrew', 'j crew'],
    category: 'retail', is_featured: false, popularity: 28,
    summary: 'Student discount: 15% off in store and online',
    value_type: 'percent', value_amount: 15, est_annual_savings: 30,
    how_to_claim: 'Show a valid student ID in store or verify online at jcrew.com.',
    verification: 'manual',
    source_url: 'https://www.jcrew.com/r/help/student-discount',
  }),

  // ---- transit -----------------------------------------------------------
  d({
    id: 21, brand: 'Amtrak', aliases: ['amtrak student'],
    category: 'transit', is_featured: true, popularity: 65,
    summary: 'Students save 15% on most rail fares',
    value_type: 'percent', value_amount: 15, est_annual_savings: 45,
    how_to_claim: 'Book with a Student Advantage discount code at amtrak.com.',
    verification: 'manual',
    source_url: 'https://www.amtrak.com/deals-discounts/everyday-discounts/student-discounts.html',
  }),
  d({
    id: 22, brand: 'Greyhound', aliases: ['greyhound student', 'road rewards'],
    category: 'transit', is_featured: false, popularity: 30,
    summary: 'Student discount on bus fares via Road Rewards',
    value_type: 'percent', value_amount: 10, est_annual_savings: 25,
    how_to_claim: 'Join Road Rewards as a student at greyhound.com.',
    verification: 'edu_email',
    source_url: 'https://www.greyhound.com/en-us/discounts',
  }),

  // ---- fitness / wellness ------------------------------------------------
  d({
    id: 23, brand: 'Headspace', aliases: ['headspace student'],
    category: 'fitness', is_featured: true, popularity: 62,
    summary: 'Student plan: about $10/year (deep discount on annual)',
    value_type: 'fixed', value_amount: 9.99, est_annual_savings: 60,
    how_to_claim: 'Verify student status at headspace.com/studentplan.',
    verification: 'sheerid',
    source_url: 'https://www.headspace.com/studentplan',
  }),

  // ---- more software (recognisable) --------------------------------------
  d({
    id: 24, brand: 'Amazon Prime', aliases: ['amazon', 'prime student', 'amazon prime student'],
    category: 'retail', is_featured: true, popularity: 95,
    summary: 'Prime Student: 6 months free, then 50% off Prime',
    value_type: 'percent', value_amount: 50, est_annual_savings: 70,
    how_to_claim: 'Sign up with a valid .edu email at amazon.com/primestudent.',
    verification: 'edu_email',
    source_url: 'https://www.amazon.com/amazonprime/student',
  }),
  d({
    id: 25, brand: 'Squarespace', aliases: ['squarespace student'],
    category: 'software', is_featured: false, popularity: 22,
    summary: 'Student discount: 50% off your first website subscription',
    value_type: 'percent', value_amount: 50, est_annual_savings: 100,
    how_to_claim: 'Verify with a .edu email; code applies to first-year plans at squarespace.com.',
    verification: 'edu_email',
    source_url: 'https://www.squarespace.com/students',
  }),
  d({
    id: 26, brand: 'LinkedIn Premium', aliases: ['linkedin', 'linkedin career'],
    category: 'software', is_featured: false, popularity: 40,
    summary: 'Free 1-year LinkedIn Premium Career via GitHub Student Pack',
    value_type: 'free_tier', value_amount: 0, est_annual_savings: 240,
    how_to_claim: 'Redeem through the GitHub Student Developer Pack.',
    verification: 'edu_email',
    source_url: 'https://education.github.com/pack',
  }),
  d({
    id: 27, brand: 'Wolfram', aliases: ['wolfram alpha', 'mathematica'],
    category: 'software', is_featured: false, popularity: 26,
    summary: 'Student pricing on Wolfram|Alpha Pro and Mathematica',
    value_type: 'percent', value_amount: 45, est_annual_savings: 60,
    how_to_claim: 'Buy the student edition at wolfram.com/wolfram-alpha/pro.',
    verification: 'edu_email',
    source_url: 'https://www.wolfram.com/wolfram-alpha/pro/',
  }),
  d({
    id: 28, brand: 'Grammarly', aliases: ['grammarly premium'],
    category: 'software', is_featured: false, popularity: 33,
    summary: 'Discounted Premium for students at participating schools',
    value_type: 'percent', value_amount: 25, est_annual_savings: 36,
    how_to_claim: 'Check availability with your school email at grammarly.com/edu.',
    verification: 'edu_email',
    source_url: 'https://www.grammarly.com/edu',
  }),
]

export default discounts
