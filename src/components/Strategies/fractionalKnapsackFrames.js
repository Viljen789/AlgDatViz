// Builds a frame array for the Fractional Knapsack greedy walkthrough — the
// continuous knapsack of TDT4120 learning-goal [G3] (CLRS §15.2). Unlike the 0/1
// version, an item may be taken in part, and THAT is exactly why greedy works
// here: sort by value-per-weight and keep taking the densest item, splitting the
// last one to fill the bag. An exchange argument proves the greedy choice is safe
// — swapping any taken weight for denser weight never lowers the total.
//
// Each frame carries the FRAME CONTRACT (common/PlaybackEngine/PseudoState.jsx):
// a `line` index into FRACTIONAL_KNAPSACK_PSEUDO and an ordered `state` array.
// Pure and unit-tested in fractionalKnapsackFrames.test.js.
//
// FRACTIONAL_KNAPSACK_PSEUDO line indices (keep in sync with strategiesMeta.js):
//   0  sort items by value / weight, descending
//   1  remaining = W;  total = 0
//   2  for each item in ratio order:
//   3    if item.weight <= remaining:
//   4      take all of it;  total += value;  remaining −= weight
//   5    else:
//   6      f = remaining / item.weight        // take a fraction
//   7      total += f · value;  remaining = 0;  stop
//   8  return total

const round2 = x => Math.round(x * 100) / 100;

export const buildFractionalKnapsackFrames = ({ items, capacity }) => {
	const list = (items || []).filter(
		it => it && Number.isFinite(it.weight) && it.weight > 0 && Number.isFinite(it.value)
	);
	const W = Number.isFinite(capacity) ? capacity : 0;

	if (list.length === 0 || W <= 0) {
		return {
			frames: [
				{
					step: 0,
					items: [],
					capacity: W,
					remaining: W,
					total: 0,
					activeIndex: null,
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

	// Sort by density (value/weight) descending; stable tiebreak by name/index.
	const sorted = list
		.map((it, idx) => ({
			...it,
			name: it.name ?? `#${idx + 1}`,
			ratio: it.value / it.weight,
		}))
		.sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name));

	// Each render carries the per-item display state.
	const baseStates = sorted.map(it => ({
		name: it.name,
		weight: it.weight,
		value: it.value,
		ratio: round2(it.ratio),
		status: 'pending',
		fraction: 0,
	}));

	const snapshot = states => states.map(s => ({ ...s }));

	const frames = [
		{
			step: 0,
			items: snapshot(baseStates),
			capacity: W,
			remaining: W,
			total: 0,
			activeIndex: null,
			title: 'Sort by density',
			description:
				'Order items by value ÷ weight, densest first — the greedy ranking.',
			line: 0,
			state: [
				{ id: 'cap', label: 'capacity W', value: W },
				{
					id: 'order',
					label: 'ratio order',
					value: sorted.map(it => it.name).join(' ≥ '),
					active: true,
				},
			],
			verdict: null,
		},
	];

	const states = snapshot(baseStates);
	let remaining = W;
	let total = 0;
	let stopped = false;

	for (let k = 0; k < sorted.length; k++) {
		const it = sorted[k];
		if (stopped) {
			states[k].status = 'skipped';
			frames.push({
				step: frames.length,
				items: snapshot(states),
				capacity: W,
				remaining,
				total: round2(total),
				activeIndex: k,
				title: `Skip ${it.name}`,
				description: `The bag is full — no room left for ${it.name}.`,
				line: 2,
				state: [
					{ id: 'item', label: 'item', value: it.name },
					{ id: 'remaining', label: 'remaining', value: 0 },
					{ id: 'total', label: 'total value', value: round2(total) },
				],
				verdict: null,
			});
			continue;
		}

		if (it.weight <= remaining) {
			remaining -= it.weight;
			total += it.value;
			states[k].status = 'taken';
			states[k].fraction = 1;
			frames.push({
				step: frames.length,
				items: snapshot(states),
				capacity: W,
				remaining,
				total: round2(total),
				activeIndex: k,
				title: `Take all of ${it.name}`,
				description: `${it.name} (w=${it.weight}) fits whole — add ${it.value}, ${remaining} capacity left.`,
				line: 4,
				state: [
					{ id: 'item', label: 'item', value: `${it.name} (ratio ${round2(it.ratio)})` },
					{ id: 'remaining', label: 'remaining', value: remaining, active: true },
					{ id: 'total', label: 'total value', value: round2(total), active: true },
				],
				verdict: null,
			});
		} else {
			const f = remaining / it.weight;
			const gained = f * it.value;
			total += gained;
			states[k].status = 'fraction';
			states[k].fraction = f;
			frames.push({
				step: frames.length,
				items: snapshot(states),
				capacity: W,
				remaining: 0,
				total: round2(total),
				activeIndex: k,
				title: `Take ${Math.round(f * 100)}% of ${it.name}`,
				description: `Only ${remaining} capacity left and ${it.name} weighs ${it.weight} — take the fraction ${remaining}/${it.weight} for ${round2(gained)} value, filling the bag.`,
				line: 7,
				state: [
					{ id: 'item', label: 'item', value: it.name },
					{ id: 'frac', label: 'fraction f', value: `${remaining}/${it.weight}`, active: true },
					{ id: 'total', label: 'total value', value: round2(total), active: true },
				],
				verdict: null,
			});
			remaining = 0;
			stopped = true;
		}
	}

	const usedWeight = W - remaining;
	frames.push({
		step: frames.length,
		items: snapshot(states),
		capacity: W,
		remaining,
		total: round2(total),
		activeIndex: null,
		title: `Total value = ${round2(total)}`,
		description:
			'Greedy by density is provably optimal for the fractional problem — the bag is full of the best value per unit weight.',
		line: 8,
		state: [
			{ id: 'total', label: 'total value', value: round2(total), active: true },
			{ id: 'weight', label: 'weight used', value: `${round2(usedWeight)}/${W}` },
		],
		verdict: `Greedy fills the bag for ${round2(total)} value — optimal, because fractions let the densest items always be used first. The same trick FAILS for 0/1 knapsack, where an item cannot be split.`,
	});

	return { frames, summary: { sorted, total: round2(total), usedWeight, states: snapshot(states) } };
};
