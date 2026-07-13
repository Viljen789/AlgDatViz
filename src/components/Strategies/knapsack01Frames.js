// Builds a frame array for the 0/1 (binary) Knapsack DP walkthrough — the
// TDT4120 learning-goal [F9], taught via the course's Appendix E. Each item is
// taken whole or not at all (no fractions — that distinguishes it from the greedy
// fractional version).
//
// dp[i][w] = best value achievable from the first i items within capacity w:
//   if weight[i] > w:  dp[i][w] = dp[i−1][w]                              (won't fit — skip)
//   else:              dp[i][w] = max( dp[i−1][w],                       (skip)
//                                      value[i] + dp[i−1][w − weight[i]] ) (take)
// The top row (no items) is all zeros. Tracing back from dp[n][W]: whenever
// dp[i][w] ≠ dp[i−1][w], item i was taken — subtract its weight and continue.
// Optimal substructure with overlapping subproblems over (item index, capacity).
//
// Each frame carries the FRAME CONTRACT (common/PlaybackEngine/PseudoState.jsx):
// a `line` index into KNAPSACK01_PSEUDO and an ordered `state` array. Pure and
// unit-tested in knapsack01Frames.test.js.
//
// KNAPSACK01_PSEUDO line indices (keep in sync with strategiesMeta.js):
//   0  dp[0][w] = 0 for all w        // no items
//   1  for i from 1 to n:
//   2    for w from 0 to W:
//   3      if weight[i] > w:
//   4        dp[i][w] = dp[i−1][w]
//   5      else:
//   6        dp[i][w] = max(dp[i−1][w], value[i] + dp[i−1][w − weight[i]])
//   7  trace back from dp[n][W] to read which items were taken

const cloneGrid = grid => grid.map(row => [...row]);

export const buildKnapsack01Frames = ({ items, capacity }) => {
	const list = (items || []).filter(
		it => it && Number.isFinite(it.weight) && Number.isFinite(it.value)
	);
	const n = list.length;
	const W = Number.isFinite(capacity) ? capacity : 0;

	if (n === 0 || W <= 0) {
		return {
			frames: [
				{
					step: 0,
					items: list,
					capacity: W,
					grid: [new Array(Math.max(1, W + 1)).fill(0)],
					active: null,
					fits: null,
					took: null,
					tracePath: null,
					chosen: [],
					title: 'Empty knapsack',
					description: 'Provide items and a positive capacity.',
					line: 0,
					state: [{ id: 'cap', label: 'capacity', value: W }],
					verdict: null,
				},
			],
			summary: null,
		};
	}

	const weight = i => list[i - 1].weight;
	const value = i => list[i - 1].value;

	const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));

	const frames = [
		{
			step: 0,
			items: list,
			capacity: W,
			grid: cloneGrid(dp),
			active: null,
			fits: null,
			took: null,
			tracePath: null,
			chosen: [],
			title: 'No items → 0',
			description:
				'With zero items the best value at every capacity is 0 — the top row.',
			line: 0,
			state: [
				{ id: 'n', label: 'items', value: n },
				{ id: 'W', label: 'capacity W', value: W },
				{ id: 'row0', label: 'dp[0][w]', value: 0, active: true },
			],
			verdict: null,
		},
	];

	for (let i = 1; i <= n; i++) {
		for (let w = 0; w <= W; w++) {
			const fits = weight(i) <= w;
			let took = false;
			if (!fits) {
				dp[i][w] = dp[i - 1][w];
			} else {
				const take = value(i) + dp[i - 1][w - weight(i)];
				const skip = dp[i - 1][w];
				if (take > skip) {
					dp[i][w] = take;
					took = true;
				} else {
					dp[i][w] = skip;
				}
			}

			const itemLabel = list[i - 1].name ?? `#${i}`;
			const description = !fits
				? `Item ${itemLabel} (w=${weight(i)}) is heavier than capacity ${w} — copy dp[${i - 1}][${w}] = ${dp[i][w]}.`
				: took
					? `Take ${itemLabel}: ${value(i)} + dp[${i - 1}][${w - weight(i)}] = ${dp[i][w]} beats skipping (${dp[i - 1][w]}).`
					: `Skip ${itemLabel}: keeping dp[${i - 1}][${w}] = ${dp[i][w]} beats taking it.`;

			frames.push({
				step: frames.length,
				items: list,
				capacity: W,
				grid: cloneGrid(dp),
				active: { i, w },
				fits,
				took,
				tracePath: null,
				chosen: [],
				title: `dp[${i}][${w}] = ${dp[i][w]}`,
				description,
				line: !fits ? 4 : 6,
				state: [
					{ id: 'item', label: 'item', value: `${itemLabel} (w${weight(i)}/v${value(i)})` },
					{ id: 'w', label: 'capacity w', value: w, active: true },
					{
						id: 'decision',
						label: 'decision',
						value: !fits ? 'too heavy' : took ? 'TAKE' : 'skip',
					},
					{ id: 'cell', label: `dp[${i}][${w}]`, value: dp[i][w], active: true },
				],
				verdict: null,
			});
		}
	}

	// Traceback.
	const path = [];
	const chosen = [];
	let i = n;
	let w = W;
	let safety = 0;
	while (i > 0 && safety++ < 4096) {
		path.push({ i, w });
		if (dp[i][w] !== dp[i - 1][w]) {
			chosen.push(i - 1); // 0-based index into list
			w -= weight(i);
		}
		i -= 1;
	}
	chosen.reverse();
	const best = dp[n][W];
	const usedWeight = chosen.reduce((acc, idx) => acc + list[idx].weight, 0);
	const chosenNames = chosen.map(idx => list[idx].name ?? `#${idx + 1}`);

	frames.push({
		step: frames.length,
		items: list,
		capacity: W,
		grid: cloneGrid(dp),
		active: null,
		fits: null,
		took: null,
		tracePath: path,
		chosen,
		title: `Best value = ${best}`,
		description:
			'Trace back from dp[n][W]: a change from the row above means that item was taken — subtract its weight and step up.',
		line: 7,
		state: [
			{ id: 'best', label: `dp[${n}][${W}]`, value: best, active: true },
			{
				id: 'items',
				label: 'take',
				value: chosenNames.length ? chosenNames.join(', ') : 'nothing',
			},
			{ id: 'weight', label: 'weight used', value: `${usedWeight}/${W}` },
		],
		verdict: `Optimal value ${best} by taking ${
			chosenNames.length ? chosenNames.join(' + ') : 'nothing'
		} (weight ${usedWeight}/${W}). Because items are indivisible, the best ratio first is NOT always right — only the table guarantees the optimum.`,
	});

	return {
		frames,
		summary: { dp: cloneGrid(dp), chosen, best, usedWeight, chosenNames },
	};
};
