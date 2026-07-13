// Builds a frame array for the Rod-Cutting DP walkthrough (CLRS §14.1, the first
// dynamic-programming learning-goal [F8] for TDT4120).
//
// Given a price table where price[i] is what a rod-piece of length i sells for,
// dp[j] = the best revenue obtainable from a rod of length j:
//   dp[j] = max over i in 1..j of ( price[i] + dp[j − i] )
// We also remember firstCut[j] = the leading piece length i that achieved the
// max, so the optimal decomposition can be reconstructed by following firstCut
// from n downward. This is textbook optimal substructure with overlapping
// subproblems — every dp[j − i] is reused across many j.
//
// Each frame carries the FRAME CONTRACT (common/PlaybackEngine/PseudoState.jsx):
// a `line` index into ROD_CUTTING_PSEUDO and an ordered `state` array. Pure and
// unit-tested in rodCuttingFrames.test.js.
//
// ROD_CUTTING_PSEUDO line indices (keep in sync with strategiesMeta.js):
//   0  dp[0] = 0
//   1  for j from 1 to n:
//   2    best = −∞
//   3    for i from 1 to j:
//   4      if price[i] + dp[j − i] > best:
//   5        best = price[i] + dp[j − i];  firstCut[j] = i
//   6    dp[j] = best
//   7  follow firstCut[] from n to read the pieces

// Reconstruct the optimal piece lengths for a rod of length n from firstCut[].
const reconstruct = (firstCut, n) => {
	const pieces = [];
	let len = n;
	let safety = 0;
	while (len > 0 && safety++ < 1024) {
		const cut = firstCut[len];
		if (!cut) break;
		pieces.push(cut);
		len -= cut;
	}
	return pieces;
};

export const buildRodCuttingFrames = ({ prices, n }) => {
	const length = Number.isFinite(n) ? n : (prices?.length ?? 0);
	// price[i] for i in 1..length; prices is given 1-indexed as prices[0]=price of
	// length 1, so price(i) = prices[i-1].
	const price = i => prices[i - 1] ?? 0;

	if (!Array.isArray(prices) || prices.length === 0 || length <= 0) {
		return {
			frames: [
				{
					step: 0,
					dpTable: [0],
					activeJ: null,
					candidates: [],
					winning: null,
					pieces: null,
					prices: prices ?? [],
					n: 0,
					title: 'No rod',
					description: 'Provide a price table and a rod length.',
					line: 0,
					state: [{ id: 'n', label: 'n', value: 0 }],
					verdict: null,
				},
			],
			summary: null,
		};
	}

	const dp = new Array(length + 1).fill(null);
	dp[0] = 0;
	const firstCut = new Array(length + 1).fill(0);

	const frames = [
		{
			step: 0,
			dpTable: [...dp],
			activeJ: null,
			candidates: [],
			winning: null,
			pieces: null,
			prices,
			n: length,
			title: 'Base case',
			description: 'dp[0] = 0 — a rod of length 0 earns nothing.',
			line: 0,
			state: [
				{ id: 'n', label: 'n (rod length)', value: length },
				{ id: 'dp0', label: 'dp[0]', value: 0, active: true },
			],
			verdict: null,
		},
	];

	for (let j = 1; j <= length; j++) {
		const candidates = [];
		for (let i = 1; i <= j; i++) {
			candidates.push({
				piece: i,
				price: price(i),
				prevIndex: j - i,
				prevValue: dp[j - i],
				candidateValue: price(i) + dp[j - i],
			});
		}
		const best = Math.max(...candidates.map(c => c.candidateValue));
		// Prefer the smallest leading piece among ties for a stable, readable cut.
		const winning = candidates.find(c => c.candidateValue === best);
		dp[j] = best;
		firstCut[j] = winning.piece;

		frames.push({
			step: j,
			dpTable: [...dp],
			activeJ: j,
			candidates,
			winning,
			pieces: null,
			prices,
			n: length,
			title: `dp[${j}] = ${best}`,
			description:
				candidates.length === 1
					? `Length ${j}: the only option is one piece of length ${j}, worth ${best}.`
					: `Length ${j}: try every leading piece i, take the best of price[i] + dp[${j}−i]. Winner: piece ${winning.piece} (+${winning.price}) then dp[${winning.prevIndex}]=${winning.prevValue}.`,
			line: 6,
			state: [
				{ id: 'j', label: 'j', value: j, active: true },
				{
					id: 'i',
					label: 'i (leading piece)',
					value: winning.piece,
				},
				{
					id: 'read',
					label: `price[${winning.piece}] + dp[${winning.prevIndex}]`,
					value: `${winning.price} + ${winning.prevValue}`,
				},
				{ id: 'best', label: `dp[${j}]`, value: best, active: true },
			],
			verdict: null,
		});
	}

	const pieces = reconstruct(firstCut, length);
	const revenue = dp[length];
	const wholeRodPrice = price(length);
	const gain = revenue - wholeRodPrice;

	frames.push({
		step: frames.length,
		dpTable: [...dp],
		activeJ: null,
		candidates: [],
		winning: null,
		pieces,
		prices,
		n: length,
		title: `Cut into ${pieces.join(' + ')}`,
		description:
			'Follow firstCut from n downward to recover the pieces that realise the optimal revenue.',
		line: 7,
		state: [
			{ id: 'rev', label: `dp[${length}] (best revenue)`, value: revenue, active: true },
			{ id: 'pieces', label: 'pieces', value: pieces.join(' + ') },
			{ id: 'whole', label: 'sell whole', value: wholeRodPrice },
		],
		verdict:
			gain > 0
				? `Cutting into ${pieces.join(' + ')} earns ${revenue} — that is ${gain} more than the ${wholeRodPrice} an uncut rod would fetch.`
				: `The uncut rod is already optimal at ${revenue} — no set of cuts does better.`,
	});

	return {
		frames,
		summary: { dp: [...dp], firstCut, pieces, revenue, wholeRodPrice, gain },
	};
};
