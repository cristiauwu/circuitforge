/**
 * @circuitforge/solver — Unit tests for the linear algebra module.
 */

import { describe, expect, it } from 'vitest'
import { solve, zeros, zeroVec } from './matrix.js'

describe('matrix – zeros & zeroVec', () => {
  it('creates a zero matrix of the right dimensions', () => {
    const m = zeros(3, 4)
    expect(m.length).toBe(4) // 4 columns
    for (const col of m) {
      expect(col.length).toBe(3) // 3 rows each
      for (let r = 0; r < 3; r++) expect(col[r]).toBe(0)
    }
  })

  it('creates a zero vector', () => {
    const v = zeroVec(5)
    expect(v.length).toBe(5)
    for (let i = 0; i < 5; i++) expect(v[i]).toBe(0)
  })
})

describe('matrix – solve', () => {
  it('solves a 1×1 system', () => {
    const A = zeros(1, 1)
    A[0]![0] = 5
    const b = new Float64Array([10])
    const x = solve(A, b)
    expect(x).not.toBeNull()
    expect(x![0]).toBeCloseTo(2)
  })

  it('solves a 2×2 system', () => {
    // 2x + 3y = 8
    // 4x + 1y = 6
    const A = zeros(2, 2)
    A[0]![0] = 2; A[1]![0] = 3
    A[0]![1] = 4; A[1]![1] = 1
    const b = new Float64Array([8, 6])
    const x = solve(A, b)
    expect(x).not.toBeNull()
    expect(x![0]).toBeCloseTo(1)   // x = 1
    expect(x![1]).toBeCloseTo(2)   // y = 2
  })

  it('solves a 3×3 system', () => {
    // 2x + y - z = 3
    // x + 3y + 2z = 12
    // 3x + 2y + z = 10
    // Solution: x=1, y=2, z=3 → 2+2-3=1?  No.
    // Let's compute: x=1,y=2,z=3 → 2+2-3=1≠3. Use a verified system:
    // 3x + 2y + z = 10   (3+4+3=10 ✓)
    // x + 4y + 2z = 15   (1+8+6=15 ✓)
    // 2x + y + 3z = 13   (2+2+9=13 ✓)
    const A = zeros(3, 3)
    A[0]![0] = 3; A[1]![0] = 2; A[2]![0] = 1   // row 0
    A[0]![1] = 1; A[1]![1] = 4; A[2]![1] = 2   // row 1
    A[0]![2] = 2; A[1]![2] = 1; A[2]![2] = 3   // row 2
    const b = new Float64Array([10, 15, 13])
    const x = solve(A, b)
    expect(x).not.toBeNull()
    expect(x![0]).toBeCloseTo(1)
    expect(x![1]).toBeCloseTo(2)
    expect(x![2]).toBeCloseTo(3)
  })

  it('returns null for a singular matrix', () => {
    // Two identical rows
    const A = zeros(2, 2)
    A[0]![0] = 1; A[1]![0] = 2
    A[0]![1] = 1; A[1]![1] = 2
    const b = new Float64Array([3, 3])
    expect(solve(A, b)).toBeNull()
  })

  it('handles pivoting correctly', () => {
    // First pivot is zero → needs row swap
    const A = zeros(2, 2)
    A[0]![0] = 0; A[1]![0] = 1
    A[0]![1] = 1; A[1]![1] = 0
    const b = new Float64Array([4, 3])
    const x = solve(A, b)
    expect(x).not.toBeNull()
    expect(x![0]).toBeCloseTo(3)
    expect(x![1]).toBeCloseTo(4)
  })
})
