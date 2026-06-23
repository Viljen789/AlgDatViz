// growthRates — the single source of truth for the growth-rate race. The same
// functions the FoundationsStage plots (scene 4, the race) and the same functions
// the `race` scene's predict check derives its answer from, so the picture and the
// quiz can never disagree about which class tops the chart.
//
// Each entry is { label, f, colorVar }: f(n) is the (unscaled) operation count for
// that class at input size n, and colorVar names the curve's stroke colour. The
// stage caps + rescales these for drawing; the cost model itself lives here, pure.
//
// Ordered the way the stage draws them (fastest-growing first, so steeper curves
// paint behind the gentler ones). The race window runs n = 1 … RACE_NMAX; RACE_NMAX
// is the right edge of the plot, where the classes have pulled fully apart.

export const RACE_NMAX = 22;

export const GROWTH_RATES = [
	{ label: 'O(2ⁿ)', f: n => 2 ** n, colorVar: 'var(--color-error)' },
	{ label: 'O(n²)', f: n => n * n, colorVar: 'var(--topic-hashing)' },
	{ label: 'O(n log n)', f: n => n * Math.log2(n), colorVar: 'var(--brand)' },
	{ label: 'O(n)', f: n => n, colorVar: 'var(--topic-sorting)' },
	{
		label: 'O(log n)',
		f: n => Math.max(Math.log2(n), 0),
		colorVar: 'var(--topic-graphs)',
	},
	{ label: 'O(1)', f: () => 1, colorVar: 'var(--color-text-muted)' },
];

/**
 * The class whose curve is highest at input size n — i.e. the one that visibly
 * tops the race plot at that point. Derived by evaluating every class's f(n) and
 * taking the maximum, so it is read off the exact same functions the stage draws.
 * Returns the class's label (e.g. 'O(2ⁿ)').
 */
export function fastestGrowingAt(n = RACE_NMAX) {
	let winner = GROWTH_RATES[0];
	for (const rate of GROWTH_RATES) {
		if (rate.f(n) > winner.f(n)) winner = rate;
	}
	return winner.label;
}
