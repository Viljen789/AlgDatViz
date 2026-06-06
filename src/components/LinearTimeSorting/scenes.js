// The scrolly scenes that build linear-time-sorting intuition before the
// playground. One continuous argument across seven scenes:
//
//   0 bound       — every comparison sort is a decision tree…
//   1 leaves      — …with ≥ n! leaves, forcing height ≥ log2(n!) = Ω(n log n).
//   2 counting    — counting sort sidesteps it: keys ARE indices. O(n + k).
//   3 radix       — radix repeats a stable per-digit counting pass. O(d·(n+k)).
//   4 stability   — why radix NEEDS a stable subroutine (ties must be kept).
//   5 bucket      — bucket sort distributes by range; O(n) when keys spread.
//   6 assumptions — the catch: these need cooperative keys (bounded / uniform).
//
// Each scene ends with a retrieval `check` answered before scrolling on. Wrong
// answers are never punished — the explanation reveals regardless. The numbers
// are derived from the pure generators (decisionTree, stability), never
// hardcoded, so the prose and the stage stay in lock-step.

import { lowerBound } from './decisionTree.js';
import { stabilityDemo } from './stability.js';

// The canvas case: sorting three labelled items. 3! = 6, ⌈log2 6⌉ = 3.
export const TREE_LABELS = ['a', 'b', 'c'];
export const TREE_BOUND = lowerBound(TREE_LABELS.length);

// The stability demo keys (ties on 3 and 1 so reordering is visible).
export const STABILITY_KEYS = [3, 1, 3, 1];
export const STABILITY = stabilityDemo(STABILITY_KEYS);

// Counting-sort demo: a small array over a small range, so k stays tiny.
export const COUNTING_DEMO = [4, 2, 2, 0, 3, 2, 1];
const COUNTING_K = Math.max(...COUNTING_DEMO) + 1; // slots 0..max
// Which bucket (count slot) does the first value land in? (predict check)
const FIRST_VALUE = COUNTING_DEMO[0];

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
		body: `A binary tree of height h has at most 2^h leaves. To hold n! leaves it needs 2^h ≥ n!, so h ≥ log₂(n!). And log₂(n!) grows like n log n. That is the wall: no comparison sort — merge, quick, heap, anything — can beat Ω(n log n) comparisons in the worst case.`,
		check: {
			kind: 'choice',
			prompt:
				'Why can no clever comparison sort drop below Ω(n log n) in the worst case?',
			options: [
				'Comparisons are slow',
				'Its tree must have ≥ n! leaves',
				'Memory runs out',
				'Recursion is required',
			],
			answer: 'Its tree must have ≥ n! leaves',
			explanation:
				'The bound is information-theoretic, not about constants. The tree must distinguish all n! input orders, so it needs n! leaves, which forces height ≥ log₂(n!) = Ω(n log n). The only way out is to stop comparing keys to each other — which is exactly what the next three sorts do.',
		},
	},
	{
		id: 'counting',
		eyebrow: 'Counting sort',
		title: 'Use the key as an address, not a thing to compare.',
		body: `Counting sort never compares two keys. It counts how many of each value appear (one tally per value), then replays the tallies from low to high. With n items drawn from the range 0…k it costs O(n + k) — linear when k is small. No comparisons means the Ω(n log n) wall simply does not apply.`,
		check: {
			kind: 'predict',
			mode: 'numeric',
			prompt: `Counting sort reads the first value, ${FIRST_VALUE}. Which count-table slot does it increment?`,
			answer: FIRST_VALUE,
			placeholder: `0–${COUNTING_K - 1}`,
			explanation: `Slot ${FIRST_VALUE}. The value itself IS the index — count[${FIRST_VALUE}] += 1. That direct addressing is how counting sort avoids comparing: the key tells it exactly where to tally. The table has k = ${COUNTING_K} slots (values 0…${COUNTING_K - 1}); the cost O(n + k) pays for both the n reads and the k slots scanned on replay.`,
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
				'A stable pass keeps tied records in their original order, so each radix pass safely refines the previous one. An unstable pass may swap equal-key records — and once a low-significance ordering is scrambled, no later pass can recover it. That is why radix sort must use a stable subroutine (counting sort is the usual choice).',
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
