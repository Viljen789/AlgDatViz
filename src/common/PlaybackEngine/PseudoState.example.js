// PseudoState.example — a minimal, conformant frame generator.
//
// Reference implementation of THE FRAME CONTRACT documented in PseudoState.jsx.
// It is pure (`(input) => frame[]`) and therefore unit-testable without React,
// which is the pattern Phase 1b topics follow for their own step generators.
//
// The example traces linear search over an array for a target value, emitting a
// frame per comparison with the executing pseudocode line, a live variable-state
// readout, and a `highlight` carrying the index the stage should glow.

export const LINEAR_SEARCH_PSEUDOCODE = [
	'LINEAR-SEARCH(A, x)',
	'  for i = 0 to A.length - 1',
	'    if A[i] == x',
	'      return i',
	'  return NIL',
];

/**
 * linearSearchFrames — generate conformant PseudoState frames for a linear scan.
 *
 * @param {number[]} array  the array being searched.
 * @param {number}   target the value to find.
 * @returns {Array<{line:number, state, highlight}>} frames per the contract.
 */
export const linearSearchFrames = (array = [], target) => {
	const frames = [];
	const base = i => [
		{ id: 'i', label: 'i', value: i },
		{ id: 'x', label: 'x', value: target },
		{ id: 'n', label: 'A.length', value: array.length },
	];

	for (let i = 0; i < array.length; i += 1) {
		// Frame: at the comparison line, inspecting A[i].
		frames.push({
			line: 2,
			state: [
				...base(i),
				{ id: 'cur', label: 'A[i]', value: array[i], active: true },
			],
			highlight: [i],
		});
		if (array[i] === target) {
			// Frame: found — return i.
			frames.push({
				line: 3,
				state: [...base(i), { id: 'found', label: 'found at', value: i, active: true }],
				highlight: [i],
			});
			return frames;
		}
	}

	// Frame: exhausted the array — return NIL.
	frames.push({
		line: 4,
		state: [
			{ id: 'i', label: 'i', value: array.length },
			{ id: 'x', label: 'x', value: target },
			{ id: 'result', label: 'result', value: 'NIL', active: true },
		],
		highlight: [],
	});
	return frames;
};

export default linearSearchFrames;
