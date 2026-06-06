// Pure, UI-free step-frame generators for the Heaps & priority-queues topic.
//
// A binary max-heap is stored flat in an array: the tree is implicit. For a node
// at 0-based index i:
//     left child  = 2i + 1
//     right child = 2i + 2
//     parent      = ⌊(i − 1) / 2⌋
// The max-heap property: every parent ≥ both of its children. The maximum is
// therefore always at index 0.
//
// These generators are deliberately React-free so the heap invariants and the
// O(n) vs O(n log n) operation counts can be unit-tested in isolation
// (heapTrace.test.js). The playground and stage only render the frames; they
// never re-derive the algorithm.
//
// FRAME CONTRACT (the {line, state} shape PseudoState consumes — see
// common/PlaybackEngine/PseudoState.jsx). Every frame additionally carries the
// heap-specific fields the dual-view stage reads:
//
//   frame = {
//     heap:        number[],   // the backing array AT this beat (cloned).
//     heapSize:    number,     // how many leading entries are "in the heap".
//     active:      number|null,// the index currently being worked on.
//     compare:     number[],   // indices being compared this beat (≤ 2).
//     swap:        number[],   // the pair swapped this beat (length 0 or 2).
//     path:        number[],   // the sift path walked so far (root→active).
//     sorted:      number[],   // indices parked as extracted/sorted (heapsort).
//     phase:       string,     // 'idle'|'compare'|'swap'|'settle'|'extract'|…
//     line:        number,     // 0-based index into the op's pseudocode.
//     title:       string,     // short headline for the beat.
//     description: string,     // one-line narration (FrameTrace).
//     comparisons: number,     // running comparison count (op-cost teaching).
//     swaps:       number,     // running swap count.
//   }

export const parentIndex = i => Math.floor((i - 1) / 2);
export const leftChild = i => 2 * i + 1;
export const rightChild = i => 2 * i + 2;

const clone = arr => arr.slice();

// Verify the max-heap property over the first `size` entries. Used by tests and
// (cheaply) by the generators' own assertions-by-construction.
export const isMaxHeap = (arr, size = arr.length) => {
	for (let i = 0; i < size; i++) {
		const l = leftChild(i);
		const r = rightChild(i);
		if (l < size && arr[l] > arr[i]) return false;
		if (r < size && arr[r] > arr[i]) return false;
	}
	return true;
};

// Shared pseudocode listings (0-based line indices match the frame `line`).
export const HEAP_PSEUDO = {
	siftDown: [
		'SiftDown(A, i, size):',
		'  largest = i',
		'  l = 2i+1;  r = 2i+2',
		'  if l < size and A[l] > A[largest]: largest = l',
		'  if r < size and A[r] > A[largest]: largest = r',
		'  if largest ≠ i:',
		'    swap A[i], A[largest]',
		'    SiftDown(A, largest, size)',
	],
	siftUp: [
		'SiftUp(A, i):',
		'  while i > 0:',
		'    p = ⌊(i-1)/2⌋',
		'    if A[i] > A[p]:',
		'      swap A[i], A[p]',
		'      i = p',
		'    else: break',
	],
	insert: [
		'Insert(A, key):',
		'  A.append(key);  i = size-1',
		'  while i > 0 and A[i] > A[⌊(i-1)/2⌋]:',
		'    swap A[i], A[⌊(i-1)/2⌋]',
		'    i = ⌊(i-1)/2⌋',
	],
	extractMax: [
		'ExtractMax(A):',
		'  max = A[0]',
		'  A[0] = A[size-1];  size -= 1',
		'  SiftDown(A, 0, size)',
		'  return max',
	],
	build: [
		'BuildMaxHeap(A):',
		'  for i = ⌊n/2⌋-1 down to 0:',
		'    SiftDown(A, i, n)',
	],
};

const baseFrame = ({
	heap,
	heapSize,
	active = null,
	compare = [],
	swap = [],
	path = [],
	sorted = [],
	phase = 'idle',
	line = 0,
	title = '',
	description = '',
	comparisons = 0,
	swaps = 0,
}) => ({
	heap: clone(heap),
	heapSize,
	active,
	compare,
	swap,
	path,
	sorted,
	phase,
	line,
	title,
	description,
	comparisons,
	swaps,
});

// ── sift-down (the heapify primitive) ──
//
// Pushes A[i] down toward the leaves until the max-heap property holds in its
// subtree. Emits a beat per comparison + swap and tracks the descent path. The
// running `counter` object is threaded through so build/extract can keep one
// cumulative op-count across many sift-downs.
const siftDownFrames = (
	arr,
	i,
	size,
	{ frames, counter, sorted = [], baseLine = 0, lead = '' }
) => {
	let current = i;
	const path = [current];
	for (;;) {
		const l = leftChild(current);
		const r = rightChild(current);
		let largest = current;

		const compare = [current];
		if (l < size) {
			counter.comparisons++;
			compare.push(l);
			if (arr[l] > arr[largest]) largest = l;
		}
		if (r < size) {
			counter.comparisons++;
			compare.push(r);
			if (arr[r] > arr[largest]) largest = r;
		}

		frames.push(
			baseFrame({
				heap: arr,
				heapSize: size,
				active: current,
				compare,
				path,
				sorted,
				phase: 'compare',
				line: baseLine + 4,
				title: `${lead}Compare node ${current} with its children`,
				description:
					compare.length > 1
						? `Children at ${l}${r < size ? ` and ${r}` : ''}. Largest of the three is index ${largest}.`
						: `Node ${current} is a leaf — nothing below it.`,
				comparisons: counter.comparisons,
				swaps: counter.swaps,
			})
		);

		if (largest === current) {
			frames.push(
				baseFrame({
					heap: arr,
					heapSize: size,
					active: current,
					path,
					sorted,
					phase: 'settle',
					line: baseLine + 5,
					title: `${lead}Heap property holds at ${current}`,
					description: `A[${current}] ≥ both children, so it stops sinking.`,
					comparisons: counter.comparisons,
					swaps: counter.swaps,
				})
			);
			break;
		}

		[arr[current], arr[largest]] = [arr[largest], arr[current]];
		counter.swaps++;
		path.push(largest);
		frames.push(
			baseFrame({
				heap: arr,
				heapSize: size,
				active: largest,
				swap: [current, largest],
				path,
				sorted,
				phase: 'swap',
				line: baseLine + 6,
				title: `${lead}Swap ${current} ↔ ${largest}`,
				description: `A[${current}] was smaller than its child; sink it down to ${largest}.`,
				comparisons: counter.comparisons,
				swaps: counter.swaps,
			})
		);
		current = largest;
	}
};

// ── sift-up (the insert primitive) ──
const siftUpFrames = (arr, start, { frames, counter, baseLine = 0 }) => {
	let i = start;
	const path = [i];
	while (i > 0) {
		const p = parentIndex(i);
		counter.comparisons++;
		frames.push(
			baseFrame({
				heap: arr,
				heapSize: arr.length,
				active: i,
				compare: [i, p],
				path: [...path],
				phase: 'compare',
				line: baseLine + 2,
				title: `Compare ${i} with parent ${p}`,
				description: `A[${i}] = ${arr[i]} vs parent A[${p}] = ${arr[p]}.`,
				comparisons: counter.comparisons,
				swaps: counter.swaps,
			})
		);
		if (arr[i] <= arr[p]) {
			frames.push(
				baseFrame({
					heap: arr,
					heapSize: arr.length,
					active: i,
					path: [...path],
					phase: 'settle',
					line: baseLine + 6,
					title: `Heap property holds at ${i}`,
					description: `A[${i}] ≤ its parent, so it stops rising.`,
					comparisons: counter.comparisons,
					swaps: counter.swaps,
				})
			);
			break;
		}
		[arr[i], arr[p]] = [arr[p], arr[i]];
		counter.swaps++;
		path.push(p);
		frames.push(
			baseFrame({
				heap: arr,
				heapSize: arr.length,
				active: p,
				swap: [i, p],
				path: [...path],
				phase: 'swap',
				line: baseLine + 4,
				title: `Swap ${i} ↔ ${p}`,
				description: `A[${i}] was larger than its parent; bubble it up to ${p}.`,
				comparisons: counter.comparisons,
				swaps: counter.swaps,
			})
		);
		i = p;
	}
};

// ── Build-Max-Heap (bottom-up; O(n)) ──
export const buildMaxHeapTrace = input => {
	const arr = clone(input);
	const n = arr.length;
	const counter = { comparisons: 0, swaps: 0 };
	const frames = [];

	frames.push(
		baseFrame({
			heap: arr,
			heapSize: n,
			phase: 'idle',
			line: 0,
			title: 'Start: an arbitrary array',
			description:
				'Treat the array as a complete binary tree. Leaves are already trivially heaps.',
		})
	);

	const firstInternal = Math.floor(n / 2) - 1;
	for (let i = firstInternal; i >= 0; i--) {
		frames.push(
			baseFrame({
				heap: arr,
				heapSize: n,
				active: i,
				phase: 'visit',
				line: 1,
				title: `Heapify subtree rooted at ${i}`,
				description: `Sift node ${i} down. Everything below it is already a heap, so one descent fixes the whole subtree.`,
				comparisons: counter.comparisons,
				swaps: counter.swaps,
			})
		);
		siftDownFrames(arr, i, n, { frames, counter, baseLine: 1 });
	}

	frames.push(
		baseFrame({
			heap: arr,
			heapSize: n,
			phase: 'done',
			line: 0,
			title: 'Max-heap built',
			description: `The maximum is now at index 0. Bottom-up took ${counter.comparisons} comparisons / ${counter.swaps} swaps — O(n), not O(n log n).`,
			comparisons: counter.comparisons,
			swaps: counter.swaps,
		})
	);

	return {
		frames,
		finalHeap: arr,
		comparisons: counter.comparisons,
		swaps: counter.swaps,
	};
};

// ── Insert (append + sift-up; O(log n)) ──
export const insertTrace = ({ heap, key }) => {
	const arr = clone(heap);
	const counter = { comparisons: 0, swaps: 0 };
	const frames = [];

	arr.push(key);
	const start = arr.length - 1;
	frames.push(
		baseFrame({
			heap: arr,
			heapSize: arr.length,
			active: start,
			path: [start],
			phase: 'append',
			line: 1,
			title: `Append ${key} at index ${start}`,
			description:
				'Add the new key at the end — the next free leaf — then bubble it up to its place.',
			comparisons: counter.comparisons,
			swaps: counter.swaps,
		})
	);

	siftUpFrames(arr, start, { frames, counter, baseLine: 1 });

	frames.push(
		baseFrame({
			heap: arr,
			heapSize: arr.length,
			phase: 'done',
			line: 0,
			title: `Inserted ${key}`,
			description: `Heap property restored in ${counter.swaps} swaps — at most ⌊log₂ n⌋ levels, so O(log n).`,
			comparisons: counter.comparisons,
			swaps: counter.swaps,
		})
	);

	return {
		frames,
		finalHeap: arr,
		comparisons: counter.comparisons,
		swaps: counter.swaps,
	};
};

// ── Extract-max (swap root with last, shrink, sift-down; O(log n)) ──
export const extractMaxTrace = ({ heap }) => {
	const arr = clone(heap);
	const counter = { comparisons: 0, swaps: 0 };
	const frames = [];
	const size = arr.length;

	if (size === 0) {
		return { frames: [], finalHeap: arr, max: null, comparisons: 0, swaps: 0 };
	}

	const max = arr[0];
	frames.push(
		baseFrame({
			heap: arr,
			heapSize: size,
			active: 0,
			compare: [0],
			phase: 'extract',
			line: 1,
			title: `Maximum is A[0] = ${max}`,
			description: 'The root of a max-heap is always the largest element.',
		})
	);

	const last = size - 1;
	if (last > 0) {
		[arr[0], arr[last]] = [arr[last], arr[0]];
		counter.swaps++;
	}
	frames.push(
		baseFrame({
			heap: arr,
			heapSize: size,
			active: 0,
			swap: last > 0 ? [0, last] : [],
			sorted: [last],
			phase: 'replace',
			line: 2,
			title: 'Move the last leaf to the root, shrink',
			description: `Promote A[${last}] to the root and drop the heap size to ${last}. The old max sits parked at the end.`,
			comparisons: counter.comparisons,
			swaps: counter.swaps,
		})
	);

	const newSize = last;
	if (newSize > 1) {
		frames.push(
			baseFrame({
				heap: arr,
				heapSize: newSize,
				active: 0,
				sorted: [last],
				phase: 'visit',
				line: 3,
				title: 'Sift the new root down',
				description: 'It is probably too small for the root — sink it until the heap property holds again.',
				comparisons: counter.comparisons,
				swaps: counter.swaps,
			})
		);
		siftDownFrames(arr, 0, newSize, {
			frames,
			counter,
			sorted: [last],
			baseLine: 3 - 1, // map siftDown's internal lines into extract's body
			lead: '',
		});
	}

	frames.push(
		baseFrame({
			heap: arr,
			heapSize: newSize,
			sorted: [last],
			phase: 'done',
			line: 4,
			title: `Extracted ${max}`,
			description: `Returned the max in ${counter.comparisons} comparisons — one root-to-leaf descent, O(log n).`,
			comparisons: counter.comparisons,
			swaps: counter.swaps,
		})
	);

	return {
		frames,
		finalHeap: arr.slice(0, newSize),
		max,
		comparisons: counter.comparisons,
		swaps: counter.swaps,
	};
};

// ── E1: Build-Max-Heap (O(n)) vs inserting n elements one-by-one (O(n log n)) ──
//
// Runs both strategies on the SAME multiset and returns their real comparison +
// swap counts so the asymptotic gap is a measured fact, not a claim. This is the
// snubletråd the topic must defuse.
export const compareBuildVsInsert = input => {
	// Strategy A: bottom-up Build-Max-Heap on the whole array at once.
	const build = buildMaxHeapTrace(input);

	// Strategy B: start empty, insert each element, sifting up every time.
	const counterB = { comparisons: 0, swaps: 0 };
	let heap = [];
	for (const key of input) {
		const arr = clone(heap);
		arr.push(key);
		// Inline sift-up sharing counterB so the totals accumulate.
		let i = arr.length - 1;
		while (i > 0) {
			const p = parentIndex(i);
			counterB.comparisons++;
			if (arr[i] <= arr[p]) break;
			[arr[i], arr[p]] = [arr[p], arr[i]];
			counterB.swaps++;
			i = p;
		}
		heap = arr;
	}

	return {
		n: input.length,
		build: {
			heap: build.finalHeap,
			comparisons: build.comparisons,
			swaps: build.swaps,
			operations: build.comparisons + build.swaps,
		},
		repeatedInsert: {
			heap,
			comparisons: counterB.comparisons,
			swaps: counterB.swaps,
			operations: counterB.comparisons + counterB.swaps,
		},
	};
};

// ── Live state rows for PseudoState (pure; unit-tested) ──
//
// Maps one playback frame onto the {id,label,value,active?} rows PseudoState
// renders beside the pseudocode, surfacing the machine's real values: the active
// index, its parent / children indices (the 2i+1, 2i+2 arithmetic), the heap
// size, and the running comparison / swap counts.
export const buildStateRows = frame => {
	if (!frame) return [];
	const i = frame.active;
	const hasActive = typeof i === 'number' && i >= 0;
	const phase = frame.phase;

	const rows = [
		{
			id: 'i',
			label: 'i (active)',
			value: hasActive ? i : '—',
			active: phase === 'visit' || phase === 'append' || phase === 'extract',
		},
		{
			id: 'parent',
			label: 'parent ⌊(i-1)/2⌋',
			value: hasActive && i > 0 ? parentIndex(i) : '—',
			active: phase === 'compare' && frame.compare?.length === 2,
		},
		{
			id: 'children',
			label: 'children 2i+1, 2i+2',
			value: hasActive ? `${leftChild(i)}, ${rightChild(i)}` : '—',
			active: phase === 'compare' && (frame.compare?.length ?? 0) > 1,
		},
		{
			id: 'size',
			label: 'heap size',
			value: frame.heapSize ?? '—',
			active: phase === 'replace',
		},
		{
			id: 'comparisons',
			label: 'comparisons',
			value: frame.comparisons ?? 0,
			active: phase === 'compare',
		},
		{
			id: 'swaps',
			label: 'swaps',
			value: frame.swaps ?? 0,
			active: phase === 'swap',
		},
	];

	return rows;
};

export const HEAP_OP_BUILDERS = {
	insert: insertTrace,
	extractMax: extractMaxTrace,
	build: ({ heap }) => buildMaxHeapTrace(heap),
};

// Dispatch a single operation against a live heap, returning frames + the new
// committed heap so the playground can chain operations.
export const buildOperationTrace = (operation, args) => {
	switch (operation) {
		case 'insert':
			return insertTrace(args);
		case 'extractMax':
			return extractMaxTrace(args);
		case 'build':
			return buildMaxHeapTrace(args.heap);
		default:
			return { frames: [], finalHeap: args.heap };
	}
};
