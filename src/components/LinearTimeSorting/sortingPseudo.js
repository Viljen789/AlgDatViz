// sortingPseudo — the pure {line, state} bridge for the linear-time-sort
// playground.
//
// The comparison-free sorts already exist as pure step-generators in
// src/utils/sorting/algorithms/* (counting / radix / bucket). They emit a rich
// `metadata` per step but were authored for the old sorting sandbox's bespoke
// views. This module does NOT re-implement any sort. It maps an existing step's
// metadata onto:
//
//   • the executing pseudocode line (an index into the matching PSEUDO[] array),
//   • a live variable-state readout (the rows PseudoState renders).
//
// It is pure and unit-tested, so the synced pseudocode/state in the playground
// is verified without React. The playground feeds these into the shared
// PlaybackEngine + PseudoState (same contract as every other topic).

// ── Pseudocode listings (display only; the generators are the source of truth) ──

export const COUNTING_PSEUDO = [
	'COUNTING-SORT(A, k)',
	'  let count[0..k] = 0',
	'  for each x in A:',
	'    count[x] = count[x] + 1',
	'  i = 0',
	'  for v = 0 to k:',
	'    while count[v] > 0:',
	'      A[i] = v;  i = i + 1;  count[v] = count[v] - 1',
];

export const RADIX_PSEUDO = [
	'RADIX-SORT(A, d)',
	'  for place = least significant to most:',
	'    distribute A into 10 digit-buckets',
	'    stable-collect buckets back into A',
	'  // each pass is a STABLE counting sort',
	'  // by one digit',
];

export const BUCKET_PSEUDO = [
	'BUCKET-SORT(A)',
	'  create m empty buckets spanning the range',
	'  for each x in A:',
	'    bucket[ floor(m·x / (max+1)) ].push(x)',
	'  for each bucket:',
	'    insertion-sort the bucket',
	'    concatenate it onto the output',
];

export const PSEUDO_BY_ALGORITHM = {
	counting: COUNTING_PSEUDO,
	radix: RADIX_PSEUDO,
	bucket: BUCKET_PSEUDO,
};

const row = (id, label, value, active = false) => ({ id, label, value, active });

// ── Per-algorithm metadata → {line, state} ──────────────────────────────────

const countingFrame = meta => {
	const { phase, activeValue, activeSlot, outputIndex, k, usedValues } = meta;
	if (phase === 'counting') {
		return {
			line: 3, // count[x] = count[x] + 1
			state: [
				row('phase', 'phase', 'count frequencies'),
				row('k', 'k (range)', k),
				row('x', 'reading x', activeValue, true),
				row('slot', 'count[x] slot', activeSlot, true),
			],
		};
	}
	if (phase === 'reconstructing') {
		return {
			line: 7, // A[i] = v …
			state: [
				row('phase', 'phase', 'replay counts'),
				row('v', 'value v', activeValue, true),
				row('i', 'output i', outputIndex, true),
				row('k', 'k (range)', k),
			],
		};
	}
	if (phase === 'completed') {
		return {
			line: null,
			state: [
				row('phase', 'phase', 'done'),
				row('k', 'k (range)', k),
				row('used', 'values used', usedValues),
			],
		};
	}
	return {
		line: 1, // let count[0..k] = 0
		state: [row('phase', 'phase', 'allocate count[0..k]'), row('k', 'k (range)', k)],
	};
};

const radixFrame = meta => {
	const {
		phase,
		pass,
		totalPasses,
		placeLabel,
		currentDigit,
		activeValue,
	} = meta;
	const passRow = row('pass', 'pass', `${pass} / ${totalPasses}`);
	const placeRow = row('place', 'digit place', placeLabel);
	if (phase === 'distributing') {
		return {
			line: 2, // distribute into 10 digit-buckets
			state: [
				row('phase', 'phase', 'distribute'),
				passRow,
				placeRow,
				row('x', 'reading x', activeValue, true),
				row('digit', 'its digit', currentDigit, true),
			],
		};
	}
	if (phase === 'collecting' || phase === 'writing') {
		return {
			line: 3, // stable-collect back into A
			state: [
				row('phase', 'phase', 'stable collect'),
				passRow,
				placeRow,
				row('x', 'placing x', activeValue, true),
			],
		};
	}
	if (phase === 'pass-complete') {
		return {
			line: 1, // for place = …
			state: [row('phase', 'phase', `${placeLabel} pass done`), passRow, placeRow],
		};
	}
	if (phase === 'completed') {
		return {
			line: null,
			state: [row('phase', 'phase', 'done'), row('passes', 'passes', totalPasses)],
		};
	}
	return {
		line: 0,
		state: [row('phase', 'phase', 'start'), passRow],
	};
};

const bucketFrame = meta => {
	const {
		phase,
		bucketCount,
		targetBucket,
		currentBucket,
		activeValue,
		distributionQuality,
		skewRatio,
	} = meta;
	const mRow = row('m', 'buckets m', bucketCount);
	if (phase === 'distributing') {
		const hasTarget = typeof targetBucket === 'number';
		return {
			line: hasTarget ? 3 : 1, // push into bucket / create buckets
			state: [
				row('phase', 'phase', 'distribute'),
				mRow,
				row('x', 'reading x', activeValue, true),
				row('to', '→ bucket', hasTarget ? targetBucket : '—', hasTarget),
			],
		};
	}
	if (phase === 'sorting') {
		return {
			line: 5, // insertion-sort the bucket
			state: [
				row('phase', 'phase', 'sort a bucket'),
				mRow,
				row('b', 'bucket', currentBucket, true),
				row('skew', 'skew', skewRatio ? skewRatio.toFixed(2) : '—'),
			],
		};
	}
	if (phase === 'collecting') {
		return {
			line: 6, // concatenate onto the output
			state: [
				row('phase', 'phase', 'concatenate'),
				mRow,
				row('b', 'bucket', currentBucket, true),
				row('x', 'writing x', activeValue, true),
			],
		};
	}
	if (phase === 'completed') {
		return {
			line: null,
			state: [
				row('phase', 'phase', 'done'),
				mRow,
				row('quality', 'distribution', distributionQuality || '—'),
			],
		};
	}
	return { line: 0, state: [row('phase', 'phase', 'start'), mRow] };
};

const FRAME_BY_ALGORITHM = {
	counting: countingFrame,
	radix: radixFrame,
	bucket: bucketFrame,
};

/**
 * stepToPseudoFrame — map one sorting step's metadata to a {line, state} frame.
 *
 * @param {string} algorithm 'counting' | 'radix' | 'bucket'.
 * @param {object} step      a step from the matching getXStepsWithStats(), i.e.
 *                           { metadata, ... }. Tolerates a null/empty step.
 * @returns {{line: number|null, state: Array}} a PseudoState-conformant frame.
 */
export const stepToPseudoFrame = (algorithm, step) => {
	const map = FRAME_BY_ALGORITHM[algorithm];
	if (!map) return { line: null, state: [] };
	const meta = (step && step.metadata) || {};
	return map(meta);
};

export default stepToPseudoFrame;
