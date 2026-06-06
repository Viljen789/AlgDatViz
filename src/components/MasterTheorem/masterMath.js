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
