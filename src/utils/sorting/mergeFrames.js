// mergeFrames — pure {line, state} mapping for merge sort's PseudoState panel.
//
// The merge-sort step generator (`getMergeSortStepsWithStats`) already emits a
// 1-based `line` index into `PSEUDO_CODE.mergeSort` plus rich `metadata`
// (recursion range, the two halves, the merge cursors leftCursor/rightCursor,
// the output index, the moved element). This module turns one of those steps
// into a frame that conforms to THE FRAME CONTRACT documented in
// common/PlaybackEngine/PseudoState.jsx:
//
//   { line: number (0-based), state: [{ id, label, value, active? }], highlight }
//
// Keeping the mapping here (pure, React-free) means the executing MERGE/recurse
// line and the live i / j / output-index readout can be unit-tested without
// rendering anything — the pattern Phase 1b topics follow for trace generators.

const NIL = '—';

/**
 * mergeStepToPseudoFrame — map one merge-sort step to a PseudoState frame.
 *
 * @param {object} step  a step from getMergeSortStepsWithStats().steps. Each has
 *                       `line` (1-based into PSEUDO_CODE.mergeSort) and
 *                       `metadata` describing the current phase.
 * @returns {{line:(number|null), state:Array, highlight:Array}} a conformant
 *          PseudoState frame. `line` is converted to the panel's 0-based index;
 *          `state` is an ordered, human-readable variable readout for the phase.
 */
export const mergeStepToPseudoFrame = step => {
	if (!step || typeof step !== 'object') {
		return { line: null, state: [], highlight: [] };
	}

	const meta = step.metadata || {};
	// The generator's `line` is 1-based against PSEUDO_CODE.mergeSort; the panel
	// (and PSEUDO_CODE array) is 0-based, so it already aligns as an index.
	const line = typeof step.line === 'number' ? step.line : null;

	const rangeRow = (label, range) => ({
		id: label,
		label,
		value: Array.isArray(range) ? `[${range[0]}, ${range[1]}]` : NIL,
	});

	if (meta.phase === 'dividing') {
		return {
			line,
			state: [
				rangeRow('range', meta.range),
				{
					id: 'mid',
					label: 'mid',
					value:
						Array.isArray(meta.range)
							? Math.floor((meta.range[0] + meta.range[1]) / 2)
							: NIL,
					active: true,
				},
				rangeRow('left', meta.left),
				rangeRow('right', meta.right),
			],
			highlight: Array.isArray(meta.range)
				? [meta.range[0], meta.range[1]]
				: [],
		};
	}

	if (meta.phase === 'merging') {
		const i = meta.leftCursor;
		const j = meta.rightCursor;
		const k = meta.outputIndex;
		const movedRow =
			meta.movedElement !== undefined
				? [
						{
							id: 'copied',
							label: `copy → out[${k}]`,
							value: `${meta.movedElement} (${meta.movedFrom})`,
							active: true,
						},
					]
				: [];
		const comparingRow =
			Array.isArray(meta.comparingValues) && meta.comparingValues.length === 2
				? [
						{
							id: 'cmp',
							label: 'compare',
							value: `${meta.comparingValues[0]} vs ${meta.comparingValues[1]}`,
							active: true,
						},
					]
				: [];
		return {
			line,
			state: [
				rangeRow('merge', meta.target),
				{ id: 'i', label: 'i (left)', value: i ?? NIL },
				{ id: 'j', label: 'j (right)', value: j ?? NIL },
				{ id: 'k', label: 'k (output)', value: k ?? NIL },
				...comparingRow,
				...movedRow,
			],
			highlight: [
				...(typeof i === 'number' ? [i] : []),
				...(typeof j === 'number' ? [j] : []),
			],
		};
	}

	if (meta.phase === 'completed') {
		return {
			line,
			state: [{ id: 'done', label: 'status', value: 'sorted', active: true }],
			highlight: [],
		};
	}

	// initializing / unknown — show the array size so the panel is never blank.
	return {
		line,
		state: [
			{
				id: 'n',
				label: 'n',
				value: step.stats?.arraySize ?? (step.array ? step.array.length : NIL),
			},
		],
		highlight: [],
	};
};

export default mergeStepToPseudoFrame;
