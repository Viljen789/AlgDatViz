// stability — the pure model behind the stable-vs-unstable side-by-side.
//
// A sort is STABLE if records that compare equal keep their original relative
// order. This matters for two reasons taught here:
//
//   1. It is observable: sort records by a key that has ties, and a stable sort
//      preserves the input order of the tied records while an unstable sort may
//      reorder them.
//   2. It is load-bearing for radix sort: LSD radix sorts by one digit at a
//      time, least-significant first. Each per-digit pass MUST be stable, or the
//      ordering established by the earlier (less significant) digits is
//      destroyed. This module proves that by running an LSD radix pass twice —
//      once with a stable per-digit subroutine, once with an unstable one — and
//      showing the unstable variant produces a wrong final order.
//
// Everything is pure (no React) and unit-tested. Records are { key, tag } where
// `key` is what we sort on and `tag` is a stable identity (its input position),
// so we can SEE whether equal-key records kept their order.

// label(record) — a short display string, e.g. "5a" (key 5, original slot a).
export const label = rec => `${rec.key}${rec.tag}`;

// makeRecords(keys) — attach a tag (a, b, c, …) by input position so ties are
// visually distinguishable. [3,1,3] -> [{3,a},{1,b},{3,c}].
export const makeRecords = keys =>
	keys.map((key, i) => ({ key, tag: String.fromCharCode(97 + i) }));

// stableSortByKey — a stable sort: equal keys keep their input order. We achieve
// stability explicitly by breaking ties on the original index, so the result is
// deterministic and provably stable regardless of the engine's Array.sort.
export const stableSortByKey = records =>
	records
		.map((rec, i) => ({ rec, i }))
		.sort((p, q) => p.rec.key - q.rec.key || p.i - q.i)
		.map(({ rec }) => rec);

// unstableSortByKey — a deliberately unstable sort: equal keys are reversed
// relative to input order. This is a faithful stand-in for any comparison sort
// (e.g. heapsort, quicksort) that does not guarantee stability — it lets us show
// a concrete reordering of tied records.
export const unstableSortByKey = records =>
	records
		.map((rec, i) => ({ rec, i }))
		// Tie-break on the NEGATIVE index → equal keys come out reversed.
		.sort((p, q) => p.rec.key - q.rec.key || q.i - p.i)
		.map(({ rec }) => rec);

// arrangesEqualKeysInInputOrder — true iff, for every group of equal keys, the
// records appear in their original (tag) order. This is the operational
// definition of stability applied to a result.
export const preservesInputOrder = (input, result) => {
	const orderOfTag = new Map(input.map((rec, i) => [rec.tag, i]));
	const byKey = new Map();
	for (const rec of result) {
		const seen = byKey.get(rec.key) || [];
		seen.push(orderOfTag.get(rec.tag));
		byKey.set(rec.key, seen);
	}
	for (const seq of byKey.values()) {
		for (let i = 1; i < seq.length; i += 1) {
			if (seq[i] < seq[i - 1]) return false;
		}
	}
	return true;
};

// stabilityDemo — the side-by-side payload: the same input sorted two ways, plus
// which equal-key pairs got reordered by the unstable variant.
export const stabilityDemo = keys => {
	const input = makeRecords(keys);
	const stable = stableSortByKey(input);
	const unstable = unstableSortByKey(input);
	return {
		input,
		stable,
		unstable,
		stablePreserves: preservesInputOrder(input, stable),
		unstablePreserves: preservesInputOrder(input, unstable),
	};
};

// ── Radix-needs-stability proof ──────────────────────────────────────────────
//
// Run one LSD radix sort over two-digit numbers, choosing the per-digit
// subroutine. `stableSubroutine = true` uses a stable counting pass; `false`
// uses the unstable variant. With the unstable subroutine the final array is
// NOT fully sorted, which is the whole point.

const digitAt = (value, place) => Math.floor(value / 10 ** place) % 10;

// Stable counting sort by a single digit `place`, on plain numbers.
const stableCountingByDigit = (values, place) => {
	const indexed = values.map((value, i) => ({ value, i }));
	return indexed
		.sort((a, b) => digitAt(a.value, place) - digitAt(b.value, place) || a.i - b.i)
		.map(({ value }) => value);
};

// Unstable counting sort by a single digit — ties reversed.
const unstableCountingByDigit = (values, place) => {
	const indexed = values.map((value, i) => ({ value, i }));
	return indexed
		.sort((a, b) => digitAt(a.value, place) - digitAt(b.value, place) || b.i - a.i)
		.map(({ value }) => value);
};

/**
 * radixWithSubroutine — run LSD radix over two-digit numbers, recording each
 * per-digit pass, with a chosen (stable / unstable) per-digit subroutine.
 *
 * @param {number[]} values  the numbers to sort (two-digit recommended).
 * @param {boolean}  stableSubroutine  use a stable per-digit pass when true.
 * @returns {{
 *   passes: [{ place, label, before, after }],
 *   result: number[],
 *   sorted: boolean    // is the FINAL array actually in non-decreasing order?
 * }}
 */
export const radixWithSubroutine = (values, stableSubroutine) => {
	const maxDigits = Math.max(
		1,
		...values.map(v => String(Math.abs(v)).length)
	);
	const passSort = stableSubroutine
		? stableCountingByDigit
		: unstableCountingByDigit;
	const passes = [];
	let current = values.slice();
	for (let place = 0; place < maxDigits; place += 1) {
		const before = current.slice();
		current = passSort(current, place);
		passes.push({
			place,
			label: place === 0 ? 'ones' : place === 1 ? 'tens' : `10^${place}`,
			before,
			after: current.slice(),
		});
	}
	const sorted = current.every(
		(v, i) => i === 0 || current[i - 1] <= v
	);
	return { passes, result: current, sorted };
};

export default stabilityDemo;
