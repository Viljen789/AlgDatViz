// Builds a frame array for the Longest-Common-Subsequence DP walkthrough
// (CLRS §14.4, the second dynamic-programming learning-goal [F8] for TDT4120).
//
// dp[i][j] = length of the LCS of the prefixes X[1..i] and Y[1..j]:
//   if X[i] == Y[j]:  dp[i][j] = dp[i−1][j−1] + 1        (extend the match — diagonal)
//   else:             dp[i][j] = max(dp[i−1][j], dp[i][j−1])  (drop a char — up or left)
// The border (i = 0 or j = 0) is all zeros. After the table is full, a traceback
// from dp[m][n] toward dp[0][0] recovers an actual longest subsequence: a diagonal
// step on a match emits that character. Every cell depends only on three already-
// computed neighbours — overlapping subproblems in two dimensions.
//
// Each frame carries the FRAME CONTRACT (common/PlaybackEngine/PseudoState.jsx):
// a `line` index into LCS_PSEUDO and an ordered `state` array. Pure and unit-
// tested in lcsFrames.test.js.
//
// LCS_PSEUDO line indices (keep in sync with strategiesMeta.js):
//   0  dp[i][0] = dp[0][j] = 0        // empty prefix → no subsequence
//   1  for i from 1 to m:
//   2    for j from 1 to n:
//   3      if X[i] == Y[j]:
//   4        dp[i][j] = dp[i−1][j−1] + 1
//   5      else:
//   6        dp[i][j] = max(dp[i−1][j], dp[i][j−1])
//   7  trace back from dp[m][n] to read the subsequence

const toChars = s =>
	typeof s === 'string' ? s.split('') : Array.isArray(s) ? s : [];

const cloneGrid = grid => grid.map(row => [...row]);

export const buildLcsFrames = ({ x, y }) => {
	const X = toChars(x);
	const Y = toChars(y);
	const m = X.length;
	const n = Y.length;

	if (m === 0 || n === 0) {
		return {
			frames: [
				{
					step: 0,
					X,
					Y,
					grid: [[0]],
					active: null,
					match: null,
					chosenSource: null,
					tracePath: null,
					lcs: '',
					title: 'Empty input',
					description: 'Provide two non-empty strings.',
					line: 0,
					state: [{ id: 'len', label: 'LCS length', value: 0 }],
					verdict: null,
				},
			],
			summary: null,
		};
	}

	// dp is (m+1) x (n+1); border already zero.
	const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

	const frames = [
		{
			step: 0,
			X,
			Y,
			grid: cloneGrid(dp),
			active: null,
			match: null,
			chosenSource: null,
			tracePath: null,
			lcs: '',
			title: 'Border = 0',
			description:
				'An empty prefix shares no subsequence — the top row and left column are all 0.',
			line: 0,
			state: [
				{ id: 'm', label: '|X|', value: m },
				{ id: 'n', label: '|Y|', value: n },
				{ id: 'border', label: 'dp[i][0] = dp[0][j]', value: 0, active: true },
			],
			verdict: null,
		},
	];

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const match = X[i - 1] === Y[j - 1];
			let chosenSource;
			if (match) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
				chosenSource = 'diag';
			} else if (dp[i - 1][j] >= dp[i][j - 1]) {
				dp[i][j] = dp[i - 1][j];
				chosenSource = 'up';
			} else {
				dp[i][j] = dp[i][j - 1];
				chosenSource = 'left';
			}

			const description = match
				? `X[${i}]=${X[i - 1]} matches Y[${j}]=${Y[j - 1]} → extend the diagonal: dp[${i - 1}][${j - 1}] + 1 = ${dp[i][j]}.`
				: `${X[i - 1]} ≠ ${Y[j - 1]} → carry the better of up (${dp[i - 1][j]}) and left (${dp[i][j - 1]}) = ${dp[i][j]}.`;

			frames.push({
				step: frames.length,
				X,
				Y,
				grid: cloneGrid(dp),
				active: { i, j },
				match,
				chosenSource,
				tracePath: null,
				lcs: '',
				title: `dp[${i}][${j}] = ${dp[i][j]}`,
				description,
				line: match ? 4 : 6,
				state: [
					{
						id: 'cell',
						label: `dp[${i}][${j}]`,
						value: dp[i][j],
						active: true,
					},
					{
						id: 'chars',
						label: `X[${i}] vs Y[${j}]`,
						value: `${X[i - 1]} ${match ? '=' : '≠'} ${Y[j - 1]}`,
					},
					{
						id: 'src',
						label: 'from',
						value:
							chosenSource === 'diag'
								? `↖ ${dp[i - 1][j - 1]} + 1`
								: chosenSource === 'up'
									? `↑ ${dp[i - 1][j]}`
									: `← ${dp[i][j - 1]}`,
					},
				],
				verdict: null,
			});
		}
	}

	// Traceback from (m, n).
	const path = [];
	const lcsChars = [];
	let i = m;
	let j = n;
	let safety = 0;
	while (i > 0 && j > 0 && safety++ < 4096) {
		path.push({ i, j });
		if (X[i - 1] === Y[j - 1]) {
			lcsChars.push(X[i - 1]);
			i -= 1;
			j -= 1;
		} else if (dp[i - 1][j] >= dp[i][j - 1]) {
			i -= 1;
		} else {
			j -= 1;
		}
	}
	const lcs = lcsChars.reverse().join('');
	const length = dp[m][n];

	frames.push({
		step: frames.length,
		X,
		Y,
		grid: cloneGrid(dp),
		active: null,
		match: null,
		chosenSource: null,
		tracePath: path,
		lcs,
		title: `LCS = "${lcs}"`,
		description:
			'Trace back from the bottom-right: a diagonal step on a match emits a character; otherwise follow the larger neighbour.',
		line: 7,
		state: [
			{ id: 'len', label: 'LCS length', value: length, active: true },
			{ id: 'lcs', label: 'one LCS', value: `"${lcs}"` },
		],
		verdict: `The longest common subsequence has length ${length}: "${lcs}". Characters need not be adjacent — only in order, in both strings.`,
	});

	return { frames, summary: { dp: cloneGrid(dp), lcs, length, path } };
};
