// quickselectTrace — a pure, React-free trace of RANDOMIZED-SELECT (CLRS §9.2),
// run DETERMINISTICALLY so its output is reproducible and unit-derivable.
//
// WHY THIS FILE EXISTS
//   The app teaches quicksort's PARTITION (see ../../utils/sorting/quickPartitionFrames.js
//   and ./scenes.js) but has zero coverage of SELECTION / order statistics, which
//   recent exams test directly (worst-case running time of Randomized-Select; what
//   problem Randomized-Select(A,1,n,i) solves; partition behaviour). This generator
//   gives the /exam bank a DERIVED answer key for a quickselect set: nothing here is
//   hand-typed — examSets.js calls this and reads the i-th order statistic, the array
//   after the first partition, and the pivot's landing index straight off the result.
//
// THE PARTITION (Lomuto, pivot = the LAST element) — IDENTICAL to the lesson's
// quicksort, so a student sees the same partition they already learned:
//   i marks the boundary: everything in [lo .. i] is < pivot. j sweeps lo..hi-1.
//   When A[j] < pivot, advance i and swap A[i] <-> A[j]. After the sweep, swap
//   A[i+1] <-> A[hi] so the pivot lands at index i+1 — its FINAL sorted position.
//   PARTITION returns i+1.
//
// RANDOMIZED-SELECT(A, p, r, i) — DETERMINIZED.
//   CLRS randomizes the pivot for its expected-Θ(n) guarantee. We instead always
//   pick the last element as the pivot (the same deterministic choice the lesson's
//   quicksort makes), purely so the trace is reproducible and testable. The control
//   flow is exactly RANDOMIZED-SELECT: partition once, let q be the pivot's index
//   and k = q - p + 1 the pivot's RANK within A[p..r]; if i == k the pivot IS the
//   answer; if i < k recurse left; else recurse right with i adjusted by k.
//
// INDEX & RANK CONVENTIONS (documented because the exam prompts cite them):
//   • Arrays are 0-BASED everywhere (matching quickPartitionFrames.js). So
//     `firstPartition.pivotFinalIndex` and `selectedIndex` are 0-based indices into
//     the SORTED array, and `pivots`/`firstPartition.array` use 0-based positions.
//   • `i` (the rank requested) is 1-BASED: i = 1 is the minimum, i = n is the
//     maximum — the standard "i-th smallest / i-th order statistic" convention.
//   The single 0-based↔1-based bridge is k = q - p + 1 inside the recursion below.
//
// The generator is deterministic and side-effect free: same (input, i) → same
// result, every time. That is what makes it unit-testable and exam-derivable.

const clone = a => a.slice();

// Lomuto PARTITION over A[lo..hi] in place; pivot = A[hi]. Returns the pivot's
// final index (the boundary i+1). Mirrors quickPartitionFrames.js exactly.
function partition(A, lo, hi) {
	const pivot = A[hi];
	let i = lo - 1;
	for (let j = lo; j < hi; j++) {
		if (A[j] < pivot) {
			i++;
			[A[i], A[j]] = [A[j], A[i]];
		}
	}
	[A[i + 1], A[hi]] = [A[hi], A[i + 1]];
	return i + 1;
}

/**
 * quickselectTrace — run a deterministic RANDOMIZED-SELECT for the i-th smallest.
 *
 * @param {number[]} input  the array to select from (NOT mutated).
 * @param {number}   i      the rank to select, 1-BASED (1 = min, n = max).
 * @returns {{
 *   pivots: number[],
 *   firstPartition: { array: number[], pivotFinalIndex: number },
 *   selected: number,
 *   selectedIndex: number,
 *   frames: Array<{ array:number[], range:[number,number], pivotValue:number,
 *                   pivotFinalIndex:number, pivotRank:number, requested:number,
 *                   decision:'found'|'left'|'right' }>
 * }}
 *   • pivots: the pivot VALUE chosen at each recursion level, in order.
 *   • firstPartition.array: the whole array AFTER the very first PARTITION (a fresh
 *     copy); firstPartition.pivotFinalIndex: where that first pivot landed (0-based).
 *   • selected: the i-th smallest value — the RANDOMIZED-SELECT return value.
 *   • selectedIndex: that value's final position in the sorted array (0-based) =
 *     i - 1 (exposed for convenience / cross-checking).
 *   • frames: one entry per PARTITION the recursion performs (cheap to produce).
 */
export function quickselectTrace(input, i) {
	const A = Array.isArray(input) ? clone(input) : [];
	const n = A.length;

	const pivots = [];
	const frames = [];
	let firstPartition = null;

	// RANDOMIZED-SELECT(A, p, r, rank) with a deterministic last-element pivot.
	// `rank` is 1-based within the CURRENT subarray A[p..r].
	const select = (p, r, rank) => {
		if (p === r) {
			// Base case: a single element is the rank-1 (only) order statistic here.
			return p;
		}
		const pivotValue = A[r];
		pivots.push(pivotValue);
		const q = partition(A, p, r); // pivot's final index (0-based)
		const k = q - p + 1; // pivot's RANK within A[p..r] (1-based)

		if (firstPartition === null) {
			firstPartition = { array: clone(A), pivotFinalIndex: q };
		}

		let decision;
		if (rank === k) decision = 'found';
		else if (rank < k) decision = 'left';
		else decision = 'right';

		frames.push({
			array: clone(A),
			range: [p, r],
			pivotValue,
			pivotFinalIndex: q,
			pivotRank: k,
			requested: rank,
			decision,
		});

		if (decision === 'found') return q;
		if (decision === 'left') return select(p, q - 1, rank);
		// rank > k: the answer is in the right side; drop the k already-passed ranks.
		return select(q + 1, r, rank - k);
	};

	let selectedIndex = -1;
	let selected;
	if (n > 0 && i >= 1 && i <= n) {
		selectedIndex = select(0, n - 1, i); // 0-based final index of the answer
		selected = A[selectedIndex];
	}

	return {
		pivots,
		firstPartition: firstPartition ?? {
			array: clone(A),
			pivotFinalIndex: -1,
		},
		selected,
		selectedIndex,
		frames,
	};
}

export default quickselectTrace;
