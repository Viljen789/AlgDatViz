// The scrolly scenes that build linear-time-sorting intuition before the
// playground. One continuous argument across seven scenes:
//
//   0 bound       — every comparison sort is a decision tree…
//   1 leaves      — …with ≥ n! leaves, forcing height ≥ log2(n!) = Ω(n log n).
//   2 counting    — counting sort sidesteps it: tally, accumulate into final
//                   positions, place from the input right-to-left. Stable. O(n+k).
//   3 radix       — radix repeats a stable per-digit counting pass. O(d·(n+k)).
//   4 stability   — why radix NEEDS a stable subroutine (ties must be kept).
//   5 bucket      — bucket sort distributes by range; O(n) when keys spread.
//   6 assumptions — the catch: these need cooperative keys (bounded / uniform).
//
// Each scene ends with a retrieval `check` answered before scrolling on. Wrong
// answers are never punished — the explanation reveals regardless. The numbers
// are derived from the pure generators (decisionTree, stability), never
// hardcoded, so the prose and the stage stay in lock-step.

import { factorial, log2Factorial, lowerBound } from './decisionTree.js';
import { stabilityDemo } from './stability.js';

// The canvas case: sorting three labelled items. 3! = 6, ⌈log2 6⌉ = 3.
export const TREE_LABELS = ['a', 'b', 'c'];
export const TREE_BOUND = lowerBound(TREE_LABELS.length);

// A small concrete n for the Θ(n log n) sandwich in the 'leaves' scene. n = 8
// keeps n! exact (40320) and gives clean halves (n/2 = 4). All numbers below are
// derived from the pure helpers, never hardcoded.
export const LEAVES_N = 8;
const LEAVES_FACT = factorial(LEAVES_N); // 8! = 40320
const LEAVES_LOG2 = log2Factorial(LEAVES_N); // log2(8!) ≈ 15.30
const LEAVES_FLOOR = Math.floor(LEAVES_LOG2); // ⌊log2(8!)⌋ = 15
const LEAVES_MIN_CMP = Math.ceil(LEAVES_LOG2); // ⌈log2(8!)⌉ = 16 worst-case comparisons
// Sandwich endpoints: (n/2)·log2(n/2) ≤ log2(n!) ≤ n·log2(n).
const SANDWICH_LO = (LEAVES_N / 2) * Math.log2(LEAVES_N / 2); // 4·log2 4 = 8
const SANDWICH_HI = LEAVES_N * Math.log2(LEAVES_N); // 8·log2 8 = 24

// The stability demo keys (ties on 3 and 1 so reordering is visible).
export const STABILITY_KEYS = [3, 1, 3, 1];
export const STABILITY = stabilityDemo(STABILITY_KEYS);

// Counting-sort demo: a small array over a small range, so k stays tiny.
export const COUNTING_DEMO = [4, 2, 2, 0, 3, 2, 1];
const COUNTING_K = Math.max(...COUNTING_DEMO) + 1; // slots 0..max

// The placement step, derived (never hardcoded) from the demo so the prose, the
// check, and the stage agree. We tally counts, turn them into a CUMULATIVE
// (prefix-sum) array, then place each input element by scanning the INPUT array
// right-to-left, writing it at C[value] and decrementing C[value].
//
//   value v:        0  1  2  3  4
//   count[v]:       1  1  3  1  1
//   cumulative[v]:  1  2  5  6  7   (C[v] = number of keys <= v)
//
// 1-indexed output positions 1..n. The cumulative C[v] is the final 1-indexed
// position of the LAST occurrence of value v. We feature value 2 (it has ties,
// so the right-to-left scan and the decrement actually matter).
const COUNTING_COUNTS = (() => {
	const c = new Array(COUNTING_K).fill(0);
	COUNTING_DEMO.forEach(v => (c[v] += 1));
	return c;
})();
export const COUNTING_CUMULATIVE = (() => {
	const cum = COUNTING_COUNTS.slice();
	for (let v = 1; v < cum.length; v += 1) cum[v] += cum[v - 1];
	return cum;
})();
// The value we trace through placement: the first input value, 4 (here also the
// max, so its last copy lands at the very end — easy to verify by eye).
const PLACE_VALUE = COUNTING_DEMO[0];
// 1-indexed final position of the LAST occurrence of PLACE_VALUE = C[PLACE_VALUE].
const PLACE_POSITION = COUNTING_CUMULATIVE[PLACE_VALUE];

export const SCENES = [
	{
		id: 'bound',
		eyebrow: 'The comparison lower bound',
		title: 'Every comparison sort is a tree of yes/no questions.',
		body: `If a sort only learns about its input by asking "is A[i] < A[j]?", its whole behaviour is a binary decision tree: each node is one comparison, each branch a yes/no answer, each leaf a final order. To sort ${TREE_LABELS.length} items it must reach ${TREE_BOUND.leaves} different leaves — one per possible order.`,
		check: {
			kind: 'numeric',
			prompt: `Sorting 3 distinct items, what is the minimum number of comparisons a comparison sort needs in the worst case?`,
			answer: TREE_BOUND.minComparisons,
			placeholder: 'a whole number',
			explanation: `${TREE_BOUND.minComparisons}. There are 3! = ${TREE_BOUND.leaves} possible orders, so the tree needs ${TREE_BOUND.leaves} leaves. A binary tree of height h holds at most 2^h leaves; 2² = 4 < ${TREE_BOUND.leaves} is too few, but 2³ = 8 ≥ ${TREE_BOUND.leaves} works. So the height — the worst-case comparison count — is ⌈log₂ ${TREE_BOUND.leaves}⌉ = ${TREE_BOUND.minComparisons}.`,
		},
	},
	{
		id: 'leaves',
		eyebrow: 'Ω(n log n)',
		title: 'n! leaves force a tall tree.',
		body: `A binary tree of height h has at most 2^h leaves. To hold n! leaves it needs 2^h ≥ n!, so h ≥ log₂(n!). That log₂(n!) is Θ(n log n), squeezed from both sides. Drop the smaller half of the factors: n! ≥ (n/2)^(n/2), so log₂(n!) ≥ (n/2)·log₂(n/2) = Ω(n log n). Inflate every factor to n: n! ≤ n^n, so log₂(n!) ≤ n·log₂ n = O(n log n). The two bounds meet, so log₂(n!) = Θ(n log n). That is the wall: no comparison sort (merge, quick, heap, anything) can beat Ω(n log n) comparisons in the worst case.`,
		check: {
			kind: 'numeric',
			prompt: `For n = ${LEAVES_N}, the sandwich gives ${SANDWICH_LO} ≤ log₂(${LEAVES_N}!) ≤ ${SANDWICH_HI}. The true value is log₂(${LEAVES_FACT}) ≈ ${LEAVES_LOG2.toFixed(2)}. What is ⌊log₂(${LEAVES_N}!)⌋?`,
			answer: LEAVES_FLOOR,
			placeholder: `${SANDWICH_LO}–${SANDWICH_HI}`,
			explanation: `⌊log₂(${LEAVES_N}!)⌋ = ${LEAVES_FLOOR}, and it sits inside the sandwich: (n/2)·log₂(n/2) = ${SANDWICH_LO} ≤ ${LEAVES_LOG2.toFixed(2)} ≤ ${SANDWICH_HI} = n·log₂ n. Since the tree height must satisfy h ≥ log₂(${LEAVES_N}!), any comparison sort needs at least ⌈log₂(${LEAVES_N}!)⌉ = ${LEAVES_MIN_CMP} comparisons to sort ${LEAVES_N} distinct items in the worst case. Both endpoints scale as n log n, so the minimum is Θ(n log n): tightening or loosening the constant cannot escape it. The only way out is to stop comparing keys, which is exactly what the next three sorts do.`,
		},
	},
	{
		id: 'counting',
		eyebrow: 'Counting sort',
		title: 'Count, accumulate into positions, then place.',
		body: `Counting sort never compares two keys. First it tallies how many of each value appear (count[v]). Then it accumulates those counts into a running total, so count[v] becomes the number of keys ≤ v: the final position of the last value v. Then it walks the INPUT right to left, placing each element at count[value] in the output and decrementing count[value]. Walking right to left while decrementing keeps equal keys in their input order, so the sort is stable and carries each element (and its satellite data) intact. With n items over the range 0…k it costs O(n + k).`,
		check: {
			kind: 'predict',
			mode: 'numeric',
			prompt: `Counts are tallied and turned cumulative, so count[${PLACE_VALUE}] = ${PLACE_POSITION}. Scanning the input right to left, the last ${PLACE_VALUE} is reached. Into which output position (1-indexed) does it go?`,
			answer: PLACE_POSITION,
			placeholder: `1–${COUNTING_DEMO.length}`,
			explanation: `Position ${PLACE_POSITION}. After the cumulative pass count[${PLACE_VALUE}] holds the number of keys ≤ ${PLACE_VALUE}, which is exactly where the last ${PLACE_VALUE} belongs: output[count[${PLACE_VALUE}]] = ${PLACE_VALUE}. Then count[${PLACE_VALUE}] is decremented to ${PLACE_POSITION - 1}, so the next ${PLACE_VALUE} encountered (if any) lands just before it. Scanning right to left and decrementing is what keeps tied keys in input order, which is why this pass is stable. That stability is what radix will rely on.`,
		},
	},
	{
		id: 'radix',
		eyebrow: 'Radix sort',
		title: 'Sort by one digit at a time — least significant first.',
		body: `When keys are too wide for one big count table, radix sort sorts by each digit position instead, least-significant to most-significant, using a stable counting pass per digit. With d digits over n items it costs O(d·(n + k)) — still linear in n when d and k are bounded.`,
		check: {
			kind: 'choice',
			prompt: 'In which order does LSD radix sort process the digit positions?',
			options: [
				'Most significant first',
				'Least significant first',
				'Largest value first',
				'Any order works',
			],
			answer: 'Least significant first',
			misconceptions: {
				'Most significant first':
					'You reasoned that the biggest digit matters most, but starting there splits the data into buckets you must then sort recursively. LSD radix avoids that by letting each later, more-significant pass refine the order the earlier ones set.',
				'Largest value first':
					'You sorted by magnitude of the whole key, not by digit position. Radix never compares values; it processes fixed digit positions, and it starts at the least-significant one.',
				'Any order works':
					'You assumed the passes are independent, but they are not. Only least-significant-first lets each stable pass preserve and refine the previous ordering; reorder the passes and earlier work is overwritten.',
			},
			explanation:
				'Least-significant digit (LSD) first. Each pass refines the order set by the previous, less-significant passes — but only if each pass is STABLE, so ties from earlier passes are preserved. That requirement is the whole point of the next scene.',
		},
	},
	{
		id: 'stability',
		eyebrow: 'Stability',
		title: 'Radix only works if each pass is stable.',
		body: `A sort is stable if equal keys keep their input order. Sort these records by key: the stable sort keeps tied records in their original order; the unstable one reorders them. Radix relies on this — if a per-digit pass reorders equal digits, the order won by earlier digits is destroyed and the final array comes out wrong.`,
		check: {
			kind: 'classify',
			prompt:
				'Sort records that share a key. Which sort preserves their input order, and which may scramble it?',
			items: [
				{ id: 'stable', label: 'Stable per-digit pass' },
				{ id: 'unstable', label: 'Unstable per-digit pass' },
			],
			categories: [
				{ id: 'keeps', label: 'Keeps ties in order' },
				{ id: 'breaks', label: 'May reorder ties' },
			],
			answer: { stable: 'keeps', unstable: 'breaks' },
			explanation:
				'A stable pass keeps tied records in their original order, so each radix pass safely refines the previous one. An unstable pass may swap equal-key records, and once a low-significance ordering is scrambled, no later pass can recover it. That is why radix sort must use a stable subroutine: counting sort qualifies precisely because its place-from-cumulative pass (input scanned right to left, counts decremented) leaves tied keys in input order.',
		},
	},
	{
		id: 'bucket',
		eyebrow: 'Bucket sort',
		title: 'Scatter by range, sort each small bucket, gather.',
		body: `Bucket sort distributes keys into m buckets by their range, sorts each (small) bucket, then concatenates. When the keys are spread uniformly, each bucket holds about n/m items and the total work is O(n). If they clump into one bucket, it degrades toward the cost of the inner sort — so distribution quality matters.`,
		check: {
			kind: 'choice',
			prompt: 'When does bucket sort achieve its expected O(n) running time?',
			options: [
				'Always',
				'When keys are uniformly distributed',
				'When the array is already sorted',
				'When there are few buckets',
			],
			answer: 'When keys are uniformly distributed',
			misconceptions: {
				Always:
					'You treated linear time as guaranteed, but it is only an average-case expectation. Skewed keys can pile into one bucket and drag the sort down to its inner sort cost, O(n²) with insertion sort.',
				'When the array is already sorted':
					'You confused presortedness with even spread. A sorted but tightly clustered array still lands mostly in one bucket; what bucket sort needs is keys spread across the range, not in order.',
				'When there are few buckets':
					'You reasoned fewer buckets means less overhead, but it means each bucket holds more items, so the inner sort dominates. Linear time needs about n buckets so each stays small, plus a uniform spread to fill them evenly.',
			},
			explanation:
				'Bucket sort is fast in expectation when keys spread evenly, so each bucket stays small (≈ n/m). Skewed input that piles everything into one bucket reduces it to the inner sort\'s cost — O(n²) with insertion sort in the worst case. The linear time is an average-case assumption, not a guarantee.',
		},
	},
	{
		id: 'assumptions',
		eyebrow: 'The catch',
		title: 'Linear time is rented, not owned.',
		body: `None of these beat comparison sorts in general — they trade generality for assumptions about the keys. Counting needs a bounded range k; radix needs a bounded digit width d and a stable pass; bucket needs a roughly uniform spread. When the keys cooperate, you get O(n). When they do not, comparison sorts (and their Ω(n log n) guarantee) win.`,
		check: {
			kind: 'classify',
			prompt: 'Match each linear-time sort to the key assumption it relies on.',
			items: [
				{ id: 'counting', label: 'Counting sort' },
				{ id: 'radix', label: 'Radix sort' },
				{ id: 'bucket', label: 'Bucket sort' },
			],
			categories: [
				{ id: 'range', label: 'Small value range k' },
				{ id: 'digits', label: 'Bounded digits + stable pass' },
				{ id: 'uniform', label: 'Uniform distribution' },
			],
			answer: {
				counting: 'range',
				radix: 'digits',
				bucket: 'uniform',
			},
			explanation:
				'Counting sort is O(n + k), so it needs a small range k. Radix sort is O(d·(n + k)), so it needs bounded digit width d and a stable per-digit pass. Bucket sort is O(n) in expectation only when keys spread uniformly across the buckets. Break the assumption and the linear time is gone.',
		},
	},
];
