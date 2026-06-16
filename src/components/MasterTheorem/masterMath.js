// Master Theorem math — the single source of truth for the recurrence analysis
// shared by the scrolly stage and the playground. Everything here is pure so it
// can be memoized freely and unit-tested in isolation.
//
// We solve recurrences of the form
//
//     T(n) = a · T(n / b) + f(n),   with  f(n) = Θ(n^d · log^k n)
//
// by comparing the leaf-growth exponent  c = log_b(a)  against the combine-work
// exponent  d. The dominant side of the recursion tree decides the case.

// Round-trip-safe pretty printing for the small rationals we deal with.
export const formatNumber = value => {
	if (Number.isInteger(value)) return String(value);
	return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

// n^value as a readable monospace term ("1", "n", "n^1.58", …).
export const formatPower = value => {
	if (Math.abs(value) < 0.001) return '1';
	if (Math.abs(value - 1) < 0.001) return 'n';
	return `n^${formatNumber(value)}`;
};

// Trailing " log^k n" factor for f(n) / the Case-2 result.
export const formatLog = k => {
	if (k === 0) return '';
	if (k === 1) return ' log n';
	return ` log^${k} n`;
};

// Worked example recurrences students will recognise from the course.
export const EXAMPLES = [
	{ label: 'Merge sort', a: 2, b: 2, d: 1, k: 0 },
	{ label: 'Binary search', a: 1, b: 2, d: 0, k: 0 },
	{ label: 'Karatsuba', a: 3, b: 2, d: 1, k: 0 },
	{ label: 'Strassen', a: 7, b: 2, d: 2, k: 0 },
	{ label: 'Balanced', a: 4, b: 2, d: 2, k: 1 },
];

const TOLERANCE = 0.04;

/**
 * analyseRecurrence — classify a recurrence into one of the three cases.
 * Returns the leaf exponent, the per-level work ratio, the dominant side, a
 * Θ result string, and a plain-language explanation. `caseId` is 1 | 2 | 3 and
 * `dominant` is 'leaves' | 'levels' | 'root', which the stage uses to colour the
 * winning side without ever inventing its own colours.
 */
export const analyseRecurrence = ({ a, b, d, k }) => {
	const critical = Math.log(a) / Math.log(b); // c = log_b(a)
	const diff = d - critical;
	const ratio = a / b ** d; // work multiplier between adjacent levels

	if (diff < -TOLERANCE) {
		return {
			caseId: 1,
			name: 'Case 1',
			tone: 'The leaves win',
			dominant: 'leaves',
			result: `Θ(${formatPower(critical)})`,
			explanation:
				'The recursion multiplies subproblems faster than the combine work shrinks, so the bottom of the tree holds the most work.',
			critical,
			ratio,
		};
	}

	if (diff > TOLERANCE) {
		return {
			caseId: 3,
			name: 'Case 3',
			tone: 'Root work wins',
			dominant: 'root',
			result: `Θ(${formatPower(d)}${formatLog(k)})`,
			explanation:
				'The combine work grows faster than the leaves multiply, so almost all the work happens near the top of the tree.',
			critical,
			ratio,
		};
	}

	return {
		caseId: 2,
		name: 'Case 2',
		tone: 'Every level ties',
		dominant: 'levels',
		result: `Θ(${formatPower(d)}${formatLog(k + 1)})`,
		explanation:
			'Each level costs about the same, so the log n levels of the tree multiply that shared cost.',
		critical,
		ratio,
	};
};

/**
 * buildLevels — the recursion tree, one row per depth. At each level there are
 * a^level calls, each over a subproblem of size n / b^level, and the relative
 * work compared to the root is ratio^level. `width` is a 0–100 value for a bar
 * chart, normalised so the busiest level fills the track.
 */
export const buildLevels = ({ a, b, d }, depth = 6) => {
	const ratio = a / b ** d;
	const levels = Array.from({ length: depth + 1 }, (_, level) => ({
		level,
		nodes: a ** level,
		subproblem: level === 0 ? 'n' : `n/${formatNumber(b ** level)}`,
		relativeWork: ratio ** level,
	}));
	const maxWork = Math.max(...levels.map(l => l.relativeWork), 1);
	return levels.map(level => ({
		...level,
		width: Math.max(6, (level.relativeWork / maxWork) * 100),
	}));
};

/**
 * recurrenceShape — the recursion-tree *silhouette* a recurrence makes, so a
 * stage can re-shape itself per case instead of hard-coding one tree. Every
 * field is derived from the same `analyseRecurrence` / `buildLevels` the prose
 * cites, so the picture can never disagree with the verdict.
 *
 *   profile       'bottom-heavy' (leaves win, work grows down the tree)
 *                 'even'         (every level ties)
 *                 'top-heavy'    (root wins, work shrinks down the tree)
 *   dominantLevel the level index carrying the most work: `treeDepth` when the
 *                 leaves win, 0 when the root wins, null on a tie. Read off the
 *                 same per-level work, so it tracks `dominant` exactly.
 *   treeDepth     a legibility-capped depth for the *dot* tree: a^level nodes
 *                 stays structurally honest, but a high branching factor a is
 *                 drawn over fewer levels so the bottom row does not overflow.
 *   workDepth     a deeper cap for the per-level work *bars* (rows, not dots, so
 *                 they can afford more levels and let the slope read clearly).
 *   levels        buildLevels(params, workDepth) — the per-level work profile.
 *
 * @param {{a,b,d,k}} params  the recurrence parameters.
 * @param {{maxTreeDepth?:number, maxLeafNodes?:number, workDepth?:number}} [opts]
 */
export const recurrenceShape = (params, opts = {}) => {
	const { maxTreeDepth = 3, maxLeafNodes = 10, minWorkDepth = 3 } = opts;
	const { a } = params;
	const analysis = analyseRecurrence(params);

	// Keep the bottom row legible: with branching a, the deepest level we can
	// draw without exceeding maxLeafNodes is floor(log_a(maxLeafNodes)). a = 1
	// never branches, so it always gets the full maxTreeDepth rows.
	const branchCap =
		a <= 1 ? maxTreeDepth : Math.floor(Math.log(maxLeafNodes) / Math.log(a));
	const treeDepth = Math.max(1, Math.min(maxTreeDepth, branchCap));

	// The work bars are rows, not dots, so a wide tree (small treeDepth) can still
	// chart enough levels for its slope to read. Match the tree depth when that is
	// already deep enough, else extend to minWorkDepth purely for the bars.
	const workDepth = Math.max(treeDepth, minWorkDepth);

	const profile =
		analysis.dominant === 'leaves'
			? 'bottom-heavy'
			: analysis.dominant === 'root'
				? 'top-heavy'
				: 'even';

	// The level whose work bar is widest, read off the same per-level work the
	// verdict uses: deepest level when leaves win, root when root wins, none on a
	// tie. By construction this can never disagree with `dominant`.
	const dominantLevel =
		analysis.dominant === 'leaves'
			? workDepth
			: analysis.dominant === 'root'
				? 0
				: null;

	return {
		caseId: analysis.caseId,
		name: analysis.name,
		dominant: analysis.dominant,
		result: analysis.result,
		profile,
		dominantLevel,
		treeDepth,
		workDepth,
		ratio: analysis.ratio,
		levels: buildLevels(params, workDepth),
	};
};

// The pseudocode the recursion-tree walk is synced against. The frame generator
// below emits a `line` index into this array per step (see PseudoState's frame
// contract), so the executing line is highlighted in lockstep with the readout.
export const RECURSION_PSEUDOCODE = [
	'MASTER(a, b, f)',
	'  c = log_b(a)                 // leaf-growth exponent',
	'  for level i = 0, 1, 2, …',
	'    nodes  = a^i               // calls at this level',
	'    size   = n / b^i           // subproblem size',
	'    work_i = (a / b^d)^i       // work, relative to root',
	'  compare c with d             // the deciding comparison',
	'  return Θ(result)',
];

/**
 * buildRecursionFrames — a pure PseudoState frame generator for the recursion
 * tree. It walks the tree level by level (frame i unfolds level i), reporting a
 * live state readout — current level, node count a^i, subproblem size n/b^i, and
 * the per-level work (a/b^d)^i relative to the root — then closes with the
 * deciding comparison and the Master-Theorem verdict.
 *
 * Conforms to THE FRAME CONTRACT (PlaybackEngine/PseudoState.jsx): each frame is
 * { line, state:[{id,label,value,active?}], highlight:[level] }. Kept pure so it
 * is unit-tested without React (masterMath.test.js) and memoized freely.
 *
 * @param {{a,b,d,k}} params  the recurrence parameters.
 * @param {number}    depth   how many levels to unfold (default 6).
 * @returns {Array<{line:number,state:Array,highlight:number[]}>} frames.
 */
export const buildRecursionFrames = (params, depth = 6) => {
	const { d } = params;
	const analysis = analyseRecurrence(params);
	const levels = buildLevels(params, depth);
	const cValue = formatNumber(analysis.critical);

	// A frame per unfolded level: highlight the comparison row that this level's
	// work feeds (leaves grow with c, root work with d).
	const levelFrames = levels.map(level => ({
		line: level.level === 0 ? 1 : 2,
		state: [
			{ id: 'level', label: 'level i', value: level.level, active: true },
			{ id: 'nodes', label: 'nodes a^i', value: formatNumber(level.nodes) },
			{ id: 'size', label: 'size n/b^i', value: level.subproblem },
			{
				id: 'work',
				label: 'work (a/b^d)^i',
				value: `${formatNumber(level.relativeWork)}×`,
			},
			{ id: 'c', label: 'c = log_b a', value: cValue },
			{ id: 'd', label: 'd', value: formatNumber(d) },
		],
		highlight: [level.level],
	}));

	// Closing frame: the comparison resolves to one of the three cases.
	const sign = analysis.caseId === 1 ? '>' : analysis.caseId === 3 ? '<' : '=';
	const verdictFrame = {
		line: 6,
		state: [
			{ id: 'c', label: 'c = log_b a', value: cValue },
			{ id: 'd', label: 'd', value: formatNumber(d) },
			{
				id: 'compare',
				label: 'compare',
				value: `c ${sign} d`,
				active: true,
			},
			{ id: 'case', label: 'case', value: analysis.name },
			{ id: 'result', label: 'result', value: analysis.result, active: true },
		],
		highlight: [],
	};

	return [...levelFrames, verdictFrame];
};
