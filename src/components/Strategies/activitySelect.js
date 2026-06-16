// activitySelect.js — the activity-selection greedy (the greedy that IS optimal).
//
// Given a set of activities, each {id, start, finish}, choose the LARGEST set of
// mutually compatible activities (no two overlap in time). The textbook greedy:
//
//   1. Sort the activities by FINISH time (earliest finish first).
//   2. Always take the first activity, then walk the rest in finish order, taking
//      an activity exactly when its start >= the finish of the last one taken.
//
// Picking the activity that frees the resource soonest leaves the most room for
// the rest, and an exchange argument shows this greedy is optimal (unlike greedy
// coin change, which can be beaten). This module is the pure engine: a single
// `activitySelect(activities)` returning the selected ids (in the order chosen,
// i.e. by finish time) and the count. It is unit-tested in activitySelect.test.js.
//
// Compatibility convention: two activities are compatible when one starts at or
// after the other finishes — i.e. half-open intervals [start, finish), so an
// activity finishing at t and one starting at t do NOT overlap. This matches the
// classic CLRS formulation.

/**
 * activitySelect — earliest-finish-first greedy for activity selection.
 *
 * @param {Array<{id:(string|number), start:number, finish:number}>} activities
 *        the activities to choose from. Not mutated (a copy is sorted).
 * @returns {{ selectedIds: Array<string|number>, count: number }}
 *          `selectedIds` are the chosen activities' ids in finish-time order (the
 *          order the greedy commits to them); `count` is selectedIds.length, the
 *          maximum number of mutually compatible activities.
 */
export function activitySelect(activities) {
	// Sort by finish time (earliest first). Ties broken by start, then id, so the
	// result is deterministic regardless of the caller's input order.
	const byFinish = [...activities].sort((a, b) => {
		if (a.finish !== b.finish) return a.finish - b.finish;
		if (a.start !== b.start) return a.start - b.start;
		return String(a.id) < String(b.id) ? -1 : 1;
	});

	const selectedIds = [];
	// lastFinish is the finish time of the most recently chosen activity; an
	// activity is compatible iff it starts at or after this. Start at -Infinity so
	// the very first (earliest-finishing) activity is always taken.
	let lastFinish = -Infinity;
	for (const activity of byFinish) {
		if (activity.start >= lastFinish) {
			selectedIds.push(activity.id);
			lastFinish = activity.finish;
		}
	}

	return { selectedIds, count: selectedIds.length };
}
