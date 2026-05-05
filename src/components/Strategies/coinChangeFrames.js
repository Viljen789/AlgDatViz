// Builds a frame array for the Coin Change DP walkthrough.
// Each frame represents the state of the DP table after computing one cell,
// plus the synchronized state of the greedy algorithm running on the same problem.

const computeGreedyPath = (target, coins) => {
	const sorted = [...coins].sort((a, b) => b - a);
	const choices = [];
	let remaining = target;
	let safety = 0;
	while (remaining > 0 && safety++ < 1024) {
		const coin = sorted.find(c => c <= remaining);
		if (!coin) break;
		choices.push(coin);
		remaining -= coin;
	}
	return { choices, success: remaining === 0 };
};

const idleFrame = ({ target }) => ({
	step: 0,
	dpTable: [0, ...new Array(target).fill(null)],
	activeI: null,
	predecessors: [],
	winningPredecessor: null,
	equation: null,
	greedyChoices: [],
	greedyRemaining: target,
	greedyDone: false,
	title: 'Base case',
	description: 'dp[0] = 0 — zero coins are needed to make 0¢.',
	line: 0,
	verdict: null,
});

export const buildCoinChangeFrames = ({ target, coins }) => {
	if (!Number.isFinite(target) || target < 0 || coins.length === 0) {
		return { frames: [idleFrame({ target: 0, coins: [] })], summary: null };
	}

	const dp = new Array(target + 1).fill(null);
	dp[0] = 0;

	const greedy = computeGreedyPath(target, coins);

	const frames = [idleFrame({ target, coins })];

	for (let i = 1; i <= target; i++) {
		const candidates = coins
			.filter(c => i - c >= 0 && dp[i - c] !== null)
			.map(c => ({
				coin: c,
				prevIndex: i - c,
				prevValue: dp[i - c],
				candidateValue: dp[i - c] + 1,
			}))
			.sort((a, b) => b.coin - a.coin); // Largest coin first for visual consistency.

		let value = null;
		let winning = null;
		if (candidates.length > 0) {
			const minCandidate = Math.min(...candidates.map(c => c.candidateValue));
			value = minCandidate;
			winning = candidates.find(c => c.candidateValue === minCandidate);
			dp[i] = minCandidate;
		}

		const greedyTaken = greedy.choices.slice(0, Math.min(i, greedy.choices.length));
		const greedyRemainingNow =
			target - greedyTaken.reduce((s, c) => s + c, 0);
		const greedyDone = greedyTaken.length === greedy.choices.length;

		const description =
			candidates.length === 0
				? `${i}¢ cannot be made yet — no valid predecessor`
				: candidates.length === 1
					? `Only one coin reaches ${i}¢: ${candidates[0].coin}¢ takes you back to dp[${candidates[0].prevIndex}]=${candidates[0].prevValue}.`
					: `Try every coin that fits — pick the choice that needs the fewest coins.`;

		frames.push({
			step: i,
			dpTable: [...dp],
			activeI: i,
			predecessors: candidates,
			winningPredecessor: winning,
			equation: candidates.length > 0 ? { i, candidates, winning, result: value } : null,
			greedyChoices: greedyTaken,
			greedyRemaining: greedyRemainingNow,
			greedyDone,
			title: `dp[${i}] = ${value ?? '∞'}`,
			description,
			line: candidates.length === 0 ? 2 : 5,
			verdict: null,
		});
	}

	const dpFinal = dp[target];
	const greedyFinal = greedy.success ? greedy.choices.length : null;
	const greedySafe =
		dpFinal != null && greedyFinal != null && dpFinal === greedyFinal;

	if (frames.length > 0 && dpFinal != null) {
		const last = frames[frames.length - 1];
		last.line = 7;
		if (greedyFinal == null) {
			last.verdict = `DP found ${dpFinal} coins. Greedy could not finish — no coin reaches the target from one of its commitments.`;
		} else if (greedySafe) {
			last.verdict = `Greedy and DP agreed — both found ${dpFinal} coins. The coin set is canonical for this target.`;
		} else {
			last.verdict = `Greedy committed early — found ${greedyFinal} coins. DP looked at every option — found ${dpFinal}.`;
		}
		last.greedySafe = greedySafe;
		last.greedyFinal = greedyFinal;
		last.dpFinal = dpFinal;
	}

	return {
		frames,
		summary: {
			dpFinal,
			greedyFinal,
			greedySafe,
			greedyChoices: greedy.choices,
		},
	};
};

// Frames for Climbing Stairs (n = 6). Lightly re-skinned from the existing data.
export const buildClimbingStairsFrames = (n = 6) => {
	const dp = new Array(n + 1).fill(null);
	dp[0] = 1;
	dp[1] = 1;
	const frames = [];

	frames.push({
		step: 0,
		dpTable: [...dp],
		activeI: null,
		predecessors: [],
		title: 'Base cases',
		description:
			'dp[0] = 1 (one way to stand still) and dp[1] = 1 (one move).',
		line: 0,
	});

	for (let i = 2; i <= n; i++) {
		dp[i] = dp[i - 1] + dp[i - 2];
		frames.push({
			step: i,
			dpTable: [...dp],
			activeI: i,
			predecessors: [
				{
					coin: 1,
					prevIndex: i - 1,
					prevValue: dp[i - 1],
					candidateValue: dp[i - 1],
				},
				{
					coin: 2,
					prevIndex: i - 2,
					prevValue: dp[i - 2],
					candidateValue: dp[i - 2],
				},
			],
			winningPredecessor: null, // Both contribute by addition, no min.
			equation: {
				i,
				kind: 'sum',
				terms: [
					{ index: i - 1, value: dp[i - 1] },
					{ index: i - 2, value: dp[i - 2] },
				],
				result: dp[i],
			},
			title: `dp[${i}] = ${dp[i]}`,
			description: `Reach stair ${i} from stair ${i - 1} (one step) or stair ${i - 2} (two steps).`,
			line: 3,
		});
	}

	return { frames, n };
};

// Frames for Interval Scheduling. Computes the greedy solution on a fixed set of intervals.
export const buildIntervalSchedulingFrames = (intervals) => {
	const sorted = [...intervals].sort((a, b) => a.end - b.end);
	const frames = [];
	const chosen = [];
	const rejected = [];
	let lastFinish = -Infinity;

	frames.push({
		step: 0,
		intervals: sorted.map(iv => ({ ...iv, state: 'idle' })),
		title: 'Sort by finish time',
		description:
			'For interval scheduling, the safe local choice is the activity that finishes earliest.',
		line: 0,
	});

	for (let i = 0; i < sorted.length; i++) {
		const iv = sorted[i];
		const compatible = iv.start >= lastFinish;

		if (compatible) {
			chosen.push(iv.id);
			lastFinish = iv.end;
		} else {
			rejected.push(iv.id);
		}

		frames.push({
			step: i + 1,
			intervals: sorted.map(it => ({
				...it,
				state: chosen.includes(it.id)
					? 'chosen'
					: rejected.includes(it.id)
						? 'rejected'
						: it.id === iv.id
							? 'active'
							: 'idle',
			})),
			title: compatible ? `Take ${iv.id}` : `Skip ${iv.id}`,
			description: compatible
				? `${iv.id} starts at ${iv.start} ≥ lastFinish ${lastFinish}. Compatible — take it.`
				: `${iv.id} starts at ${iv.start} < lastFinish ${lastFinish === -Infinity ? '−∞' : lastFinish - iv.end + iv.end}. Overlaps — skip.`,
			line: compatible ? 4 : 6,
			chosen: [...chosen],
			rejected: [...rejected],
			lastFinish,
		});
	}

	return { frames, sorted, chosen, rejected };
};
