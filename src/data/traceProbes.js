// traceProbes — the SHARED read-off layer for trace-step exam probes.
//
// THE IDEA (council #6). Every other exam part asks for a TERMINAL artifact (the
// final dist[], the post-build heap, the MST weight). But the trace generators
// already emit the "why" mid-run: each step frame carries the active vertex, the
// current dist map, the accept/skip decision. So we FREEZE a frame as the question
// and grade the next DECISION against the frame stream itself. The canvas state at
// step k becomes the prompt; the answer is whatever the algorithm does at step k+1.
//
// THE DERIVATION CONTRACT (why this stays honest + un-memorizable).
//   • The frozen state shown to the learner is frames[freezeIndex] VERBATIM — the
//     generator's real state, not a hand-built picture. We never assert anything the
//     frame does not already hold.
//   • The graded answer is read off frames[decisionIndex] (the NEXT decision frame)
//     of the SAME generator — never typed. So a probe's key can only ever be what
//     the algorithm actually does next.
//   • freezeIndex = decisionIndex − 1 deliberately: the frame just before the next
//     decision is the state the algorithm makes that decision FROM (all of the prior
//     step's relaxations / considerations are already applied). Freezing the decision
//     frame itself would show stale tentative values (e.g. Dijkstra settles B, but
//     B's out-edges have not relaxed A down yet), which would be a lie. Freezing the
//     frame before the next decision is the honest "what does it see right now".
//
// PURE + GENERATOR-AGNOSTIC. These helpers take a trace's `frames` array and a
// field accessor; they never re-implement an algorithm. examSets.js (fixed bank),
// examInstances.js (seeded bank), and examSets.test.js (the guardrail) all import
// the SAME helpers, so the read-off logic lives in exactly one place — and the
// guardrail re-derives a probe's answer the identical way the bank built it.

// The indices of every frame whose `phase` is in `phases` (a Set or array). These
// are an algorithm's DECISION beats: 'settle' for Dijkstra (a vertex is finalized),
// 'extract' for the one-frontier traversals (a vertex leaves the frontier).
export const decisionFrameIndices = (frames, phases) => {
	const want = Array.isArray(phases) ? new Set(phases) : phases;
	const out = [];
	frames.forEach((f, i) => {
		if (want.has(f.phase)) out.push(i);
	});
	return out;
};

// Build ONE trace-step probe from a finished trace.
//
//   frames        the generator's frame array.
//   phases        the decision phase(s) (e.g. ['settle'] or ['extract']).
//   decisionField the frame field naming the vertex chosen on a decision beat
//                 ('active' for Dijkstra/Bellman, 'current' for one-frontier).
//   ordinal       WHICH decision to probe, 1-based among the decision frames AFTER
//                 the first one (ordinal 1 = the 2nd decision overall). The first
//                 decision has no meaningful "frozen prior state" to reason from, so
//                 ordinal starts at the second decision. The frozen frame is the one
//                 immediately BEFORE that decision frame; the answer is that decision
//                 frame's `decisionField`.
//
// Returns { freezeIndex, decisionIndex, frozen, answer } or null if the trace has
// too few decisions for the requested ordinal. `frozen` is the frame object itself
// (the caller stores a shallow copy in the check); `answer` is the next-chosen
// vertex id (a string).
export const buildTraceProbe = (frames, { phases, decisionField, ordinal }) => {
	const decisions = decisionFrameIndices(frames, phases);
	// We need at least (ordinal + 1) decisions: one to sit before the probe and the
	// probed decision itself. ordinal is 1-based among "decisions after the first".
	const decisionIndex = decisions[ordinal];
	if (decisionIndex === undefined || decisionIndex < 1) return null;
	const freezeIndex = decisionIndex - 1;
	const frozen = frames[freezeIndex];
	const answer = frames[decisionIndex][decisionField];
	if (frozen === undefined || answer == null) return null;
	return { freezeIndex, decisionIndex, frozen, answer };
};

// The remaining-undecided vertices at a frozen Dijkstra/traversal beat, sorted, with
// the correct answer guaranteed present. These are the honest option set for a
// "which vertex next?" probe: a learner chooses among the vertices NOT yet settled /
// visited. `settledField` names the cumulative-settled array on the frozen frame
// ('settled' for Dijkstra, 'visited' for one-frontier).
export const undecidedOptions = (frozen, allIds, settledField, answer) => {
	const done = new Set(frozen[settledField] || []);
	const remaining = allIds.filter(id => !done.has(id)).sort();
	// The answer is an unsettled vertex by construction, but guard defensively so the
	// option list always contains the key (the guardrail also checks this invariant).
	if (!remaining.includes(answer)) remaining.push(answer);
	return remaining.sort();
};

// ── Dijkstra: "which vertex does Dijkstra settle next?" ──────────────────────
//
// dijkstraTrace emits a 'settle' frame each time it finalizes a vertex. We freeze
// the beat just before the 2nd-or-later settle (the dist map + settled set as the
// algorithm sees them at that ExtractMin) and the answer is the next settled vertex.
//
//   run      the dijkstraTrace result ({ frames }).
//   allIds   every vertex id (for the option set), e.g. ['A','B','C','D','S'].
//   ordinal  which settle to probe (1 = the 2nd settle). Default 2 (the 3rd settle),
//            which is past the trivial source-then-nearest opening.
//
// Returns { frozen, answer, options } or null if the run is too short.
export const dijkstraSettleProbe = (run, allIds, ordinal = 2) => {
	const probe = buildTraceProbe(run.frames, {
		phases: ['settle'],
		decisionField: 'active',
		ordinal,
	});
	if (!probe) return null;
	const options = undecidedOptions(
		probe.frozen,
		allIds,
		'settled',
		probe.answer
	);
	return { frozen: probe.frozen, answer: probe.answer, options };
};

// ── One-frontier BFS: "which vertex does BFS dequeue next?" ──────────────────
//
// genericTraverse (discipline 'fifo') emits an 'extract' frame each time a vertex
// leaves the queue. We freeze the beat just before the 2nd-or-later extract (the
// queue contents + visited set as they stand) and the answer is the next extracted
// vertex — for a FIFO queue, the front of the frozen frontier.
//
//   run      the genericTraverse result ({ frames }).
//   allIds   every vertex id (for the option set).
//   ordinal  which extract to probe (1 = the 2nd extract). Default 1 (the 2nd
//            extract), where the queue already holds more than one waiting vertex so
//            the FIFO choice is non-trivial.
//
// Returns { frozen, answer, options } or null.
export const bfsDequeueProbe = (run, allIds, ordinal = 1) => {
	const probe = buildTraceProbe(run.frames, {
		phases: ['extract'],
		decisionField: 'current',
		ordinal,
	});
	if (!probe) return null;
	const options = undecidedOptions(
		probe.frozen,
		allIds,
		'visited',
		probe.answer
	);
	return { frozen: probe.frozen, answer: probe.answer, options };
};
