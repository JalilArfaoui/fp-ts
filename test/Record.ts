import * as assert from 'assert'
import * as R from '../src/Record'
import { semigroupSum, getLastSemigroup, getFirstSemigroup } from '../src/Semigroup'
import { monoidString } from '../src/Monoid'
import { identity } from '../src/function'
import { option, some, none, Option, getOrElse } from '../src/Option'
import { eqNumber } from '../src/Eq'
import { array, zip } from '../src/Array'
import { left, right } from '../src/Either'
import * as I from '../src/Identity'
import { showString } from '../src/Show'

const p = (n: number) => n > 2

const noPrototype = Object.create(null)

describe('Record', () => {
  it('getMonoid', () => {
    const d1 = { k1: 1, k2: 3 }
    const d2 = { k2: 2, k3: 4 }
    const M = R.getMonoid(semigroupSum)
    assert.deepStrictEqual(M.concat(d1, d2), { k1: 1, k2: 5, k3: 4 })
    assert.strictEqual(M.concat(d1, M.empty), d1)
    assert.strictEqual(M.concat(M.empty, d2), d2)
    assert.strictEqual(M.concat(d1, {}), d1)
  })

  it('map', () => {
    const d1 = { k1: 1, k2: 2 }
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(R.map(double)(d1), { k1: 2, k2: 4 })
  })

  it('record.map', () => {
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(R.record.map({ a: 1, b: 2 }, double), { a: 2, b: 4 })
  })

  it('reduce', () => {
    const d1 = { k1: 'a', k2: 'b' }
    assert.strictEqual(R.record.reduce(d1, '', (b, a) => b + a), 'ab')
    const d2 = { k2: 'b', k1: 'a' }
    assert.strictEqual(R.record.reduce(d2, '', (b, a) => b + a), 'ab')
  })

  it('foldMap', () => {
    const foldMap = R.record.foldMap(monoidString)
    const x1 = { a: 'a', b: 'b' }
    const f1 = identity
    assert.strictEqual(foldMap(x1, f1), 'ab')
  })

  it('reduceRight', () => {
    const reduceRight = R.record.reduceRight
    const x1 = { a: 'a', b: 'b' }
    const init1 = ''
    const f1 = (a: string, acc: string) => acc + a
    assert.strictEqual(reduceRight(x1, init1, f1), 'ba')
  })

  it('traverse', () => {
    assert.deepStrictEqual(
      R.traverse(option)((n: number) => (n <= 2 ? some(n) : none))({ k1: 1, k2: 2 }),
      some({ k1: 1, k2: 2 })
    )
    assert.deepStrictEqual(R.traverse(option)((n: number) => (n >= 2 ? some(n) : none))({ k1: 1, k2: 2 }), none)
  })

  it('sequence', () => {
    const sequence = R.sequence(option)
    const x1 = { k1: some(1), k2: some(2) }
    assert.deepStrictEqual(sequence(x1), some({ k1: 1, k2: 2 }))
    const x2 = { k1: none, k2: some(2) }
    assert.deepStrictEqual(sequence(x2), none)
  })

  it('getEq', () => {
    assert.strictEqual(R.getEq(eqNumber).equals({ a: 1 }, { a: 1 }), true)
    assert.strictEqual(R.getEq(eqNumber).equals({ a: 1 }, { a: 2 }), false)
    assert.strictEqual(R.getEq(eqNumber).equals({ a: 1 }, { b: 1 }), false)
    assert.strictEqual(R.getEq(eqNumber).equals(noPrototype, { b: 1 }), false)
  })

  it('lookup', () => {
    assert.deepStrictEqual(R.lookup('a')({ a: 1 }), some(1))
    assert.deepStrictEqual(R.lookup('b')({ a: 1 }), none)
    assert.deepStrictEqual(R.lookup('b')(noPrototype), none)
  })

  it('fromFoldable', () => {
    const First = getFirstSemigroup<number>()
    assert.deepStrictEqual(R.fromFoldable(First, array)([['a', 1]]), { a: 1 })
    assert.deepStrictEqual(R.fromFoldable(First, array)([['a', 1], ['a', 2]]), {
      a: 1
    })
    const Last = getLastSemigroup<number>()
    assert.deepStrictEqual(R.fromFoldable(Last, array)([['a', 1], ['a', 2]]), {
      a: 2
    })
  })

  it('toArray', () => {
    assert.deepStrictEqual(R.toArray({ a: 1, b: 2 }), [['a', 1], ['b', 2]])
    assert.deepStrictEqual(R.toArray({ b: 2, a: 1 }), [['a', 1], ['b', 2]])
  })

  it('toUnfoldable', () => {
    assert.deepStrictEqual(R.toUnfoldable(array)({ a: 1 }), [['a', 1]])
  })

  it('traverseWithIndex', () => {
    const d1 = { k1: 1, k2: 2 }
    const t1 = R.traverseWithIndex(option)((k, n: number): Option<number> => (k !== 'k1' ? some(n) : none))(d1)
    assert.deepStrictEqual(t1, none)
    const t2 = R.traverseWithIndex(option)((): Option<number> => none)(R.empty)
    assert.strictEqual(getOrElse((): Record<string, number> => R.empty)(t2), R.empty)
  })

  it('size', () => {
    assert.strictEqual(R.size({}), 0)
    assert.strictEqual(R.size({ a: 1 }), 1)
  })

  it('isEmpty', () => {
    assert.strictEqual(R.isEmpty({}), true)
    assert.strictEqual(R.isEmpty({ a: 1 }), false)
  })

  it('insert', () => {
    assert.deepStrictEqual(R.insert('a', 1)({}), { a: 1 })
    assert.deepStrictEqual(R.insert('c', 3)({ a: 1, b: 2 }), { a: 1, b: 2, c: 3 })
    // should return the same reference if the value is already there
    const x = { a: 1 }
    assert.strictEqual(R.insert('a', 1)(x), x)
  })

  it('remove', () => {
    assert.deepStrictEqual(R.remove('a')({ a: 1, b: 2 }), { b: 2 })
    // should return the same reference if the key is missing
    const x = { a: 1 }
    assert.strictEqual(R.remove('b')(x), x)
    assert.strictEqual(R.remove('b')(noPrototype), noPrototype)
  })

  it('pop', () => {
    assert.deepStrictEqual(R.pop('a')({ a: 1, b: 2 }), some([1, { b: 2 }]))
    assert.deepStrictEqual(R.pop('c')({ a: 1, b: 2 }), none)
  })

  it('compact', () => {
    assert.deepStrictEqual(R.record.compact({ foo: none, bar: some(123) }), { bar: 123 })
  })

  it('separate', () => {
    assert.deepStrictEqual(R.record.separate({ foo: left(123), bar: right(123) }), {
      left: { foo: 123 },
      right: { bar: 123 }
    })
  })

  it('filter', () => {
    const d = { a: 1, b: 3 }
    assert.deepStrictEqual(R.record.filter(d, p), { b: 3 })

    // refinements
    const isNumber = (u: string | number): u is number => typeof u === 'number'
    const y: Record<string, string | number> = { a: 1, b: 'foo' }
    const actual = R.record.filter(y, isNumber)
    assert.deepStrictEqual(actual, { a: 1 })

    assert.strictEqual(R.record.filter(y, _ => true), y)

    const x = Object.assign(Object.create({ c: true }), { a: 1, b: 'foo' })
    assert.deepStrictEqual(R.record.filter(x, isNumber), { a: 1 })

    assert.strictEqual(R.record.filter(noPrototype, isNumber), noPrototype)
  })

  it('filterMap', () => {
    const f = (n: number) => (p(n) ? some(n + 1) : none)
    assert.deepStrictEqual(R.record.filterMap({}, f), {})
    assert.deepStrictEqual(R.record.filterMap({ a: 1, b: 3 }, f), { b: 4 })
  })

  it('partition', () => {
    assert.deepStrictEqual(R.record.partition({}, p), { left: {}, right: {} })
    assert.deepStrictEqual(R.record.partition({ a: 1, b: 3 }, p), {
      left: { a: 1 },
      right: { b: 3 }
    })
  })

  it('partitionMap', () => {
    const f = (n: number) => (p(n) ? right(n + 1) : left(n - 1))
    assert.deepStrictEqual(R.record.partitionMap({}, f), { left: {}, right: {} })
    assert.deepStrictEqual(R.record.partitionMap({ a: 1, b: 3 }, f), {
      left: { a: 0 },
      right: { b: 4 }
    })
  })

  it('wither', () => {
    const witherIdentity = R.record.wither(I.identity)
    const f = (n: number) => I.identity.of(p(n) ? some(n + 1) : none)
    assert.deepStrictEqual(witherIdentity({}, f), I.identity.of<Record<string, number>>({}))
    assert.deepStrictEqual(witherIdentity({ a: 1, b: 3 }, f), I.identity.of({ b: 4 }))
  })

  it('wilt', () => {
    const wiltIdentity = R.record.wilt(I.identity)
    const f = (n: number) => I.identity.of(p(n) ? right(n + 1) : left(n - 1))
    assert.deepStrictEqual(wiltIdentity({}, f), I.identity.of({ left: {}, right: {} }))
    assert.deepStrictEqual(wiltIdentity({ a: 1, b: 3 }, f), I.identity.of({ left: { a: 0 }, right: { b: 4 } }))
  })

  it('reduceWithIndex', () => {
    const d1 = { k1: 'a', k2: 'b' }
    assert.strictEqual(R.reduceWithIndex('', (k, b, a) => b + k + a)(d1), 'k1ak2b')
    const d2 = { k2: 'b', k1: 'a' }
    assert.strictEqual(R.reduceWithIndex('', (k, b, a) => b + k + a)(d2), 'k1ak2b')
  })

  it('foldMapWithIndex', () => {
    const x1 = { k1: 'a', k2: 'b' }
    assert.strictEqual(R.foldMapWithIndex(monoidString)((k, a) => k + a)(x1), 'k1ak2b')
  })

  it('reduceRightWithIndex', () => {
    const x1 = { k1: 'a', k2: 'b' }
    assert.strictEqual(R.reduceRightWithIndex('', (k, a, b) => b + k + a)(x1), 'k2bk1a')
  })

  it('every', () => {
    const x: Record<string, number> = { a: 1, b: 2 }
    const y: { [key: string]: number } = { a: 1, b: 2 }
    assert.strictEqual(R.every((n: number) => n <= 2)(x), true)
    assert.strictEqual(R.every((n: number) => n <= 1)(y), false)
  })

  it('some', () => {
    const x: Record<string, number> = { a: 1, b: 2 }
    const y: { [key: string]: number } = { a: 1, b: 2 }
    assert.strictEqual(R.some((n: number) => n <= 1)(x), true)
    assert.strictEqual(R.some((n: number) => n <= 0)(y), false)
  })

  it('elem', () => {
    assert.strictEqual(R.elem(eqNumber)(1)({ a: 1, b: 2 }), true)
    assert.strictEqual(R.elem(eqNumber)(3)({ a: 1, b: 2 }), false)
  })

  it('fromFoldableMap', () => {
    const zipObject = <K extends string, A>(keys: Array<K>, values: Array<A>): Record<K, A> =>
      R.fromFoldableMap(getLastSemigroup<A>(), array)(zip(keys, values), identity)

    assert.deepStrictEqual(zipObject(['a', 'b'], [1, 2, 3]), { a: 1, b: 2 })

    interface User {
      id: string
      name: string
    }

    const users: Array<User> = [
      { id: 'id1', name: 'name1' },
      { id: 'id2', name: 'name2' },
      { id: 'id1', name: 'name3' }
    ]

    assert.deepStrictEqual(R.fromFoldableMap(getLastSemigroup<User>(), array)(users, user => [user.id, user]), {
      id1: { id: 'id1', name: 'name3' },
      id2: { id: 'id2', name: 'name2' }
    })
  })

  it('getShow', () => {
    const S = R.getShow(showString)
    assert.strictEqual(S.show({}), `{}`)
    assert.strictEqual(S.show({ a: 'a' }), `{ "a": "a" }`)
    assert.strictEqual(S.show({ a: 'a', b: 'b' }), `{ "a": "a", "b": "b" }`)
  })

  it('singleton', () => {
    assert.deepStrictEqual(R.singleton('a', 1), { a: 1 })
  })

  it('hasOwnProperty', () => {
    const x: Record<string, number> = { a: 1 }
    assert.strictEqual(R.hasOwnProperty('a')(x), true)
    assert.strictEqual(R.hasOwnProperty('b')(x), false)
  })

  it('partitionMapWithIndex', () => {
    assert.deepStrictEqual(R.partitionMapWithIndex((k, a: number) => (a > 1 ? right(a) : left(k)))({ a: 1, b: 2 }), {
      left: { a: 'a' },
      right: { b: 2 }
    })
  })

  it('partitionWithIndex', () => {
    assert.deepStrictEqual(R.partitionWithIndex((_, a: number) => a > 1)({ a: 1, b: 2 }), {
      left: { a: 1 },
      right: { b: 2 }
    })
  })

  it('filterMapWithIndex', () => {
    assert.deepStrictEqual(R.filterMapWithIndex((_, a: number) => (a > 1 ? some(a) : none))({ a: 1, b: 2 }), { b: 2 })
  })

  it('filterWithIndex', () => {
    assert.deepStrictEqual(R.filterWithIndex((_, a: number) => a > 1)({ a: 1, b: 2 }), { b: 2 })
  })
})
