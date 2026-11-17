/**
 * @circuitforge/solver — Dense linear-algebra utilities for MNA.
 *
 * Gaussian elimination with partial pivoting on dense n×(n+1) augmented
 * matrices. Matrices are stored column-major: A[col][row] for efficient
 * column operations. For the circuits CircuitForge targets (hobbyist
 * breadboard projects), system sizes rarely exceed ~30 unknowns, so a
 * dense solver is simpler and fast enough.
 */

/** A dense matrix stored column-major: data[col][row]. */
export type Matrix = Float64Array[]

/** Create an m×n zero matrix. */
export function zeros(rows: number, cols: number): Matrix {
  const m: Matrix = new Array(cols)
  for (let c = 0; c < cols; c++) m[c] = new Float64Array(rows)
  return m
}

/** Create a length-n zero vector. */
export function zeroVec(n: number): Float64Array {
  return new Float64Array(n)
}

/**
 * Solve Ax = b via Gaussian elimination with partial pivoting.
 *
 * @param A n×n coefficient matrix (modified in-place).
 * @param b n-vector right-hand side (modified in-place).
 * @returns x  —  the solution vector, or `null` if the system is singular.
 */
export function solve(A: Matrix, b: Float64Array): Float64Array | null {
  const n = b.length
  if (A.length !== n) throw new Error(`Matrix column count ${A.length} ≠ vector length ${n}`)
  for (const col of A) {
    if (col.length !== n) throw new Error(`Matrix row count ${col.length} ≠ vector length ${n}`)
  }

  // Build augmented matrix aug[col][row]; col n is the RHS.
  const aug = zeros(n, n + 1)
  for (let c = 0; c < n; c++) {
    for (let r = 0; r < n; r++) aug[c]![r] = A[c]![r]!
  }
  for (let r = 0; r < n; r++) aug[n]![r] = b[r]!

  // Forward elimination
  for (let pivot = 0; pivot < n; pivot++) {
    // Partial pivoting: find best row
    let best = pivot
    let bestVal = Math.abs(aug[pivot]![pivot]!)
    for (let r = pivot + 1; r < n; r++) {
      const v = Math.abs(aug[pivot]![r]!)
      if (v > bestVal) {
        best = r
        bestVal = v
      }
    }
    if (bestVal < 1e-15) return null // singular

    // Swap rows `pivot` and `best` across all columns
    if (best !== pivot) {
      for (let c = pivot; c <= n; c++) {
        const tmp = aug[c]![pivot]!
        aug[c]![pivot] = aug[c]![best]!
        aug[c]![best] = tmp
      }
    }

    const diagInv = 1 / aug[pivot]![pivot]!
    for (let r = pivot + 1; r < n; r++) {
      const factor = aug[pivot]![r]! * diagInv
      if (factor === 0) continue
      for (let c = pivot; c <= n; c++) {
        const col = aug[c]!
        col[r] = (col[r] ?? 0) - factor * (col[pivot] ?? 0)
      }
    }
  }

  // Back substitution
  const x = zeroVec(n)
  for (let r = n - 1; r >= 0; r--) {
    let sum = aug[n]![r]!
    for (let c = r + 1; c < n; c++) {
      sum -= aug[c]![r]! * x[c]!
    }
    const diag = aug[r]![r]!
    if (Math.abs(diag) < 1e-15) return null
    x[r] = sum / diag
  }

  return x
}
