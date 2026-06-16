// quickPartitionFrames — a pure, React-free frame generator for the Quicksort
// lesson Stage. It records the Lomuto partition HONESTLY, frame by frame, so the
// visualization can only show what the algorithm actually does.
//
// WHY A DEDICATED GENERATOR (vs algorithms/quickSort.js)
//   The sandbox generator (getQuickSortStepsWithStats) emits enough to drive the
//   bar view, but it does NOT expose the two sweeping pointers (i, j), the active
//   sub-range being partitioned, or the recursion sub-ranges as structured
//   metadata — exactly the things the lesson must visualize (two pointers
//   sweeping, the pivot snapping home, the recursion forking into two sides). So
//   the lesson owns this generator; the sandbox keeps its own. Both are Lomuto
//   with the pivot = last element, so they agree on every comparison and swap.
//
// THE PARTITION (Lomuto, pivot = arr[high])
//   i marks the boundary: everything in (low .. i] is < pivot. j sweeps low..high-1.
//   When arr[j] < pivot, advance i and swap arr[i] <-> arr[j] (pulling the small
//   value left of the boundary). After the sweep, swap arr[i+1] <-> arr[high] so
//   the pivot lands at index i+1 — its FINAL sorted position. Return i+1.
//
// FRAME CONTRACT (one entry per emitted frame)
//   {
//     array:    number[]            // the array AT THIS FRAME (a fresh copy)
//     phase:    'init' | 'pivot' | 'compare' | 'swap' | 'place' | 'locked' | 'done'
//     range:    [lo, hi] | null     // the sub-range currently being partitioned
//     pivotIndex: number | null     // index of the pivot value during a partition
//     i:        number | null       // the boundary pointer (last < pivot)
//     j:        number | null       // the scanning pointer
//     compared: [a, b] | null       // the two indices being compared this frame
//     swapped:  [a, b] | null       // the two indices swapped this frame
//     less:     boolean | null      // was arr[j] < pivot on a 'compare' frame
//     locked:   number[]            // indices already in their FINAL sorted slot
//     subranges: { left: [lo,hi]|null, right: [lo,hi]|null } | null
//                                   // on a 'place'/'locked' frame: the two sides
//                                   // recursion will descend into next
//     stats:    { comparisons, swaps, arraySize }
//     caption:  string              // a one-line, present-tense narration
//   }
//
// The generator is deterministic and side-effect free: same input array → same
// frames, every time. That is what makes it unit-testable and replayable.

const clone = a => a.slice();

const rangeOrNull = (lo, hi) => (lo <= hi ? [lo, hi] : null);

/**
 * getQuickSortFrames — produce the full frame list for partition-driven
 * quicksort over `input`.
 *
 * @param {number[]} input  the array to sort (not mutated).
 * @returns {{ frames: Array, sorted: number[], comparisons: number, swaps: number }}
 *          `frames` is the replayable timeline; `sorted` is the final array;
 *          the counts are the totals across the whole sort.
 */
export function getQuickSortFrames(input) {
	const arr = Array.isArray(input) ? clone(input) : [];
	const n = arr.length;
	const frames = [];
	const locked = new Set();

	let comparisons = 0;
	let swaps = 0;

	const stats = () => ({ comparisons, swaps, arraySize: n });

	const push = frame => {
		frames.push({
			array: clone(arr),
			range: null,
			pivotIndex: null,
			i: null,
			j: null,
			compared: null,
			swapped: null,
			less: null,
			locked: Array.from(locked).sort((a, b) => a - b),
			subranges: null,
			stats: stats(),
			...frame,
		});
	};

	push({
		phase: 'init',
		caption:
			n > 0
				? 'An unsorted range. Quicksort will pick a pivot and split around it.'
				: 'Empty range — nothing to sort.',
	});

	// Lomuto partition with full instrumentation. Returns the pivot's final index.
	const partition = (lo, hi) => {
		const pivotValue = arr[hi];
		push({
			phase: 'pivot',
			range: [lo, hi],
			pivotIndex: hi,
			i: lo - 1,
			caption: `Pivot is the last value (${pivotValue}). Sweep the rest; keep a boundary i for values below the pivot.`,
		});

		let i = lo - 1;
		for (let j = lo; j < hi; j++) {
			comparisons++;
			const less = arr[j] < pivotValue;
			push({
				phase: 'compare',
				range: [lo, hi],
				pivotIndex: hi,
				i,
				j,
				compared: [j, hi],
				less,
				caption: less
					? `${arr[j]} < ${pivotValue}: it belongs left of the boundary.`
					: `${arr[j]} ≥ ${pivotValue}: leave it on the right, advance only the scan.`,
			});

			if (less) {
				i++;
				if (i !== j) {
					swaps++;
					const a = arr[i];
					const b = arr[j];
					[arr[i], arr[j]] = [arr[j], arr[i]];
					push({
						phase: 'swap',
						range: [lo, hi],
						pivotIndex: hi,
						i,
						j,
						swapped: [i, j],
						caption: `Swap ${a} and ${b} so the small value sits just inside the boundary.`,
					});
				}
				// When i === j the element is already in place; advancing i is enough
				// and no swap frame is emitted (honest: the algorithm does no write).
			}
		}

		// Drop the pivot into the gap right after the boundary: its final position.
		const dest = i + 1;
		if (dest !== hi) {
			swaps++;
			const a = arr[dest];
			const b = arr[hi];
			[arr[dest], arr[hi]] = [arr[hi], arr[dest]];
			push({
				phase: 'swap',
				range: [lo, hi],
				pivotIndex: hi,
				i,
				j: hi,
				swapped: [dest, hi],
				caption: `Sweep done. Swap the pivot ${b} past the boundary, exchanging it with ${a}.`,
			});
		}

		locked.add(dest);
		push({
			phase: 'place',
			range: [lo, hi],
			pivotIndex: dest,
			i,
			subranges: {
				left: rangeOrNull(lo, dest - 1),
				right: rangeOrNull(dest + 1, hi),
			},
			caption: `Pivot ${arr[dest]} is home at index ${dest} — final position. Recurse left and right of it.`,
		});

		return dest;
	};

	const quicksort = (lo, hi) => {
		if (lo > hi) return;
		if (lo === hi) {
			// A single element is trivially sorted — lock it, no comparisons made.
			if (!locked.has(lo)) {
				locked.add(lo);
				push({
					phase: 'locked',
					range: [lo, hi],
					subranges: { left: null, right: null },
					caption: `A one-element range (${arr[lo]}) is already sorted.`,
				});
			}
			return;
		}
		const p = partition(lo, hi);
		quicksort(lo, p - 1);
		quicksort(p + 1, hi);
	};

	quicksort(0, n - 1);

	// Mark everything sorted on the closing frame (covers any index a base case
	// never explicitly locked, e.g. the very last single-element tail).
	for (let k = 0; k < n; k++) locked.add(k);
	push({
		phase: 'done',
		caption: 'Every pivot is in its final place. The whole range is sorted.',
	});

	return { frames, sorted: clone(arr), comparisons, swaps };
}

export default getQuickSortFrames;
