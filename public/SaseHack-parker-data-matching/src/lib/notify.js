
import emailjs from '@emailjs/browser'
import { loadAlertedIds, saveAlertedIds } from './userData.js'

const EMAILJS_SERVICE_ID = 'service_jgo8b9q'
const EMAILJS_TEMPLATE_ID = 'template_y77jnxk'
const EMAILJS_PUBLIC_KEY = 'ExEkrCqyuoB1iQ0yB'


export const GOOD_DISCOUNT_MIN_SAVINGS = 100 // dollars/year

export function isGoodDiscount(discount) {
  return (discount.est_annual_savings || 0) >= GOOD_DISCOUNT_MIN_SAVINGS
}


export async function sendGoodMatchEmail({ toEmail, kind, name, detail, link }) {
  if (!toEmail) return
  if (EMAILJS_SERVICE_ID.startsWith('YOUR_')) {
    console.warn('EmailJS is not configured yet — see the setup comment at the top of notify.js')
    return
  }
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: toEmail,
        subject: `New ${kind} worth a look: ${name}`,
        item_name: name,
        item_detail: detail,
        item_link: link || '',
      },
      { publicKey: EMAILJS_PUBLIC_KEY }
    )
  } catch (err) {
    console.error('EMAIL SEND ERROR:', err)
  }
}


export async function alertNewGoodDiscounts(discounts, uid, toEmail) {
  const alerted = await loadAlertedIds(uid)
  let changed = false
  for (const d of discounts) {
    const alertId = `discount:${d.id}`
    if (isGoodDiscount(d) && !alerted.has(alertId)) {
      await sendGoodMatchEmail({
        toEmail,
        kind: 'discount',
        name: d.brand,
        detail: `${d.summary} — up to $${d.est_annual_savings}/year`,
        link: d.source_url,
      })
      alerted.add(alertId)
      changed = true
    }
  }
  if (changed) await saveAlertedIds(uid, alerted)
}


export async function alertNewGoodScholarships(goodMatches, uid, toEmail) {
  const alerted = await loadAlertedIds(uid)
  let changed = false
  for (const m of goodMatches) {
    const alertId = `scholarship:${m.scholarship.id}`
    if (!alerted.has(alertId)) {
      await sendGoodMatchEmail({
        toEmail,
        kind: 'scholarship',
        name: m.scholarship.name,
        detail: m.reasons.join('; '),
        link: m.scholarship.source_url,
      })
      alerted.add(alertId)
      changed = true
    }
  }
  if (changed) await saveAlertedIds(uid, alerted)
}