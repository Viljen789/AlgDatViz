// quickFrames — pure {line, state, highlight} mapping for quicksort's PseudoState
// panel, mirroring mergeFrames.js. It turns one frame from getQuickSortFrames()
// into a frame conforming to THE FRAME CONTRACT in
// common/PlaybackEngine/PseudoState.jsx:
//
//   { line: number (0-based), state: [{ id, label, value, active? }], highlight }
//
// Keeping the mapping here (pure, React-free) lets the executing pseudocode line
// and the live i / j / pivot readout be unit-tested without rendering anything —
// the same discipline the merge-sort lesson follows.
//
// Line indices below are 0-based into PSEUDO_CODE.quickSort:
//   0 function quickSort(array, low, high)
//   1   if low < high:
//   2     pivot_index = partition(array, low, high)
//   3     quickSort(array, low, pivot_index - 1)
//   4     quickSort(array, pivot_index + 1, high)
//   5
//   6 function partition(array, low, high)
//   7   pivot = array[high]
//   8   i = low - 1
//   9   for j from low to high-1:
//  10     if array[j] < pivot:
//  11       i++
//  12       swap(array[i], array[j])
//  13   swap(array[i+1], array[high])
//  14   return i+1 (pivot_index)

const NIL = '—';

const rangeRow = (id, label, range) => ({
	id,
	label,
	value: Array.isArray(range) ? `[${range[0]}, ${range[1]}]` : NIL,
});

/**
 * quickStepToPseudoFrame — map one getQuickSortFrames() frame to a PseudoState
 * frame: the executing partition line plus the live pointer/pivot readout.
 *
 * @param {object} frame a frame from getQuickSortFrames().frames.
 * @returns {{line:(number|null), state:Array, highlight:Array}}
 */
export const quickStepToPseudoFrame = frame => {
	if (!frame || typeof frame !== 'object') {
		return { line: null, state: [], highlight: [] };
	}

	const { phase } = frame;
	const arr = Array.isArray(frame.array) ? frame.array : [];
	const pivotVal =
		typeof frame.pivotIndex === 'number' ? arr[frame.pivotIndex] : undefined;

	// Highlight the two pointers wherever they exist.
	const highlight = [
		...(typeof frame.i === 'number' && frame.i >= 0 ? [frame.i] : []),
		...(typeof frame.j === 'number' ? [frame.j] : []),
	];

	const pointerRows = () => [
		rangeRow('range', 'range', frame.range),
		{
			id: 'pivot',
			label: 'pivot',
			value: pivotVal !== undefined ? `${pivotVal} @ ${frame.pivotIndex}` : NIL,
			active: phase === 'pivot' || phase === 'place',
		},
		{ id: 'i', label: 'i (boundary)', value: frame.i ?? NIL },
		{ id: 'j', label: 'j (scan)', value: frame.j ?? NIL },
	];

	switch (phase) {
		case 'pivot':
			return { line: 7, state: pointerRows(), highlight };
		case 'compare':
			return {
				line: 10,
				state: [
					...pointerRows(),
					{
						id: 'cmp',
						label: 'compare',
						value:
							Array.isArray(frame.compared) && pivotVal !== undefined
								? `${arr[frame.compared[0]]} < ${pivotVal}? ${frame.less ? 'yes' : 'no'}`
								: NIL,
						active: true,
					},
				],
				highlight,
			};
		case 'swap': {
			// The final pivot swap sits the pivot past the boundary (j === range high);
			// inner swaps pull a small value inside the boundary (j < range high).
			const isPivotSwap =
				Array.isArray(frame.range) && frame.j === frame.range[1];
			return {
				line: isPivotSwap ? 13 : 12,
				state: [
					...pointerRows(),
					{
						id: 'swap',
						label: 'swap',
						value: Array.isArray(frame.swapped)
							? `${frame.swapped[0]} ↔ ${frame.swapped[1]}`
							: NIL,
						active: true,
					},
				],
				highlight: Array.isArray(frame.swapped) ? frame.swapped : highlight,
			};
		}
		case 'place':
			return {
				line: 14,
				state: [
					rangeRow('range', 'range', frame.range),
					{
						id: 'placed',
						label: 'pivot final',
						value:
							pivotVal !== undefined
								? `${pivotVal} @ ${frame.pivotIndex}`
								: NIL,
						active: true,
					},
					rangeRow('left', 'recurse left', frame.subranges?.left),
					rangeRow('right', 'recurse right', frame.subranges?.right),
				],
				highlight:
					typeof frame.pivotIndex === 'number' ? [frame.pivotIndex] : [],
			};
		case 'locked':
			return {
				line: 1,
				state: [
					rangeRow('range', 'range', frame.range),
					{
						id: 'base',
						label: 'base case',
						value: 'size ≤ 1, sorted',
						active: true,
					},
				],
				highlight: Array.isArray(frame.range) ? [frame.range[0]] : [],
			};
		case 'done':
			return {
				line: null,
				state: [{ id: 'done', label: 'status', value: 'sorted', active: true }],
				highlight: [],
			};
		case 'init':
		default:
			return {
				line: null,
				state: [{ id: 'n', label: 'n', value: arr.length || NIL }],
				highlight: [],
			};
	}
};

export default quickStepToPseudoFrame;
