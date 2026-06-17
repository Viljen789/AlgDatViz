// tableDoubling — simulate a dynamic array (Table-Insert with table-doubling) and
// count the work, so the amortized-O(1) story can be DERIVED, not asserted.
//
// THE MODEL (CLRS ch.17, the classic dynamic-table example). Start at capacity 1.
// Inserting an element into a full table allocates a NEW buffer of double the old
// capacity and COPIES every element currently stored into it, then inserts. So the
// per-insert cost is 1 (storing the new element) plus, on a resize, the count of
// elements copied (the OLD size). Across n inserts the copies form a geometric sum
//   1 + 2 + 4 + … + 2^(k-1)  (the capacities just before each doubling),
// which is < 2n, so the total work n + copies is < 3n — i.e. Θ(1) amortized per
// insert, even though the single insert that triggers the last resize is Θ(n).
//
// Pure and deterministic: tableDoubling(n) depends only on n.
//
//   tableDoubling(n) → {
//     copies,    // total element copies summed over every resize (Σ of old sizes)
//     resizes,   // number of doublings performed
//     totalCost, // total work = n inserts (cost 1 each) + copies; always < 3n
//     capacity,  // final capacity after the n-th insert
//   }
//
// Worked example (n = 5): capacities climb 1 → 2 → 4 → 8, resizing at sizes 1, 2, 4,
// so copies = 1 + 2 + 4 = 7, resizes = 3, totalCost = 5 + 7 = 12, capacity = 8.

export function tableDoubling(n) {
	if (!Number.isInteger(n) || n < 0) {
		throw new RangeError(`tableDoubling: n must be a non-negative integer (got ${n})`);
	}

	let capacity = n === 0 ? 0 : 1; // an empty table allocates nothing yet
	let size = 0;
	let copies = 0;
	let resizes = 0;

	for (let i = 0; i < n; i += 1) {
		if (size === capacity) {
			// Table is full: double the buffer and copy every stored element over.
			copies += size; // copy the OLD size elements (0 on the very first insert)
			capacity = capacity === 0 ? 1 : capacity * 2;
			resizes += 1;
		}
		size += 1; // the insert itself: one unit of work
	}

	return {
		copies,
		resizes,
		totalCost: n + copies, // n inserts at cost 1 each, plus all the copying
		capacity,
	};
}
