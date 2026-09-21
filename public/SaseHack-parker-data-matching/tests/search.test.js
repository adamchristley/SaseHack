/*
 * Tests for discount search. The plan's acceptance: a misspelled brand still
 * returns the right brand, and a nonsense query returns an empty list.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchDiscounts, featuredDiscounts, categories } from '../src/lib/search.js'

const data = [
  { id: 1, brand: 'Spotify', aliases: ['spotify premium'], category: 'streaming', is_active: true, is_featured: true, popularity: 100 },
  { id: 2, brand: 'Chipotle', aliases: ['chipotle mexican grill'], category: 'food', is_active: true, is_featured: false, popularity: 20 },
  { id: 3, brand: 'Adobe', aliases: ['adobe cc', 'creative cloud', 'photoshop'], category: 'software', is_active: true, is_featured: true, popularity: 90 },
  { id: 4, brand: 'Dead Co', aliases: [], category: 'retail', is_active: false, is_featured: true, popularity: 5 },
]

test('typo still finds the right brand: "spottify" -> Spotify', () => {
  const r = searchDiscounts(data, 'spottify')
  assert.equal(r[0].brand, 'Spotify')
})

test('typo still finds the right brand: "chipotel" -> Chipotle', () => {
  const r = searchDiscounts(data, 'chipotel')
  assert.equal(r[0].brand, 'Chipotle')
})

test('alias resolves: "creative cloud" -> Adobe', () => {
  const r = searchDiscounts(data, 'creative cloud')
  assert.equal(r[0].brand, 'Adobe')
})

test('partial input works: "spot" surfaces Spotify', () => {
  const r = searchDiscounts(data, 'spot')
  assert.ok(r.some((d) => d.brand === 'Spotify'))
})

test('nonsense query returns an empty list', () => {
  assert.deepEqual(searchDiscounts(data, 'zzxqwvk'), [])
})

test('blank query returns empty (caller shows featured instead)', () => {
  assert.deepEqual(searchDiscounts(data, '   '), [])
})

test('featured excludes inactive rows and sorts by popularity', () => {
  const f = featuredDiscounts(data)
  assert.deepEqual(f.map((d) => d.brand), ['Spotify', 'Adobe']) // popularity 100 > 90; Dead Co inactive
})

test('categories counts only active rows', () => {
  const c = categories(data)
  const cats = Object.fromEntries(c.map((x) => [x.category, x.count]))
  assert.equal(cats.retail, undefined) // Dead Co is inactive
  assert.equal(cats.streaming, 1)
})
