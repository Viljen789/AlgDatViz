// sqFrames — pure frame generators for the Stacks & Queues playground.
//
// Given the starting contents and an ordered op-log, these build a replayable
// timeline of frames that conform to THE FRAME CONTRACT documented in
// PlaybackEngine/PseudoState.jsx:
//
//   frame = { line, state, highlight }   // + viz extras (items, narration, op)
//
// where `line` is a 0-based index into the mode's pseudocode, `state` is the
// live variable readout (stack: top index + size; queue: front + rear + size)
// and `highlight` carries the cell index the canvas should glow.
//
// They are deliberately UI-free so the stepping logic is unit-testable without
// React. The playground reads `items`/`narration`/`op` for the canvas while
// PseudoState reads `line`/`state`; one timeline drives both, perfectly synced.

import { SQ_MODES, SQ_PSEUDO } from './stacksQueuesMeta.js';

// Line indices into SQ_PSEUDO.stack — the pseudocode lines each op executes.
//   0 push(x):        3 (blank)       6   top = top - 1
//   1   top = top+1   4 pop():        7   return value
//   2   data[top]=x   5   value=...
const STACK_LINE = { add: 2, removeValue: 5, removeDec: 6 };
// Line indices into SQ_PSEUDO.queue.
//   0 enqueue(x):     3 (blank)       6   front = front+1
//   1   data[rear]=x  4 dequeue():    7   return value
//   2   rear=rear+1   5   value=...
const QUEUE_LINE = { add: 1, removeValue: 5, removeInc: 6 };

// Live variable rows for the current contents. Stack tracks the single moving
// pointer (top); queue tracks the two pointers (front, rear).
const stackState = (items, active) => [
	{ id: 'top', label: 'top', value: items.length - 1, active },
	{ id: 'size', label: 'size', value: items.length },
];

const queueState = (items, active) => [
	{ id: 'front', label: 'front', value: items.length === 0 ? '—' : 0, active },
	{
		id: 'rear',
		label: 'rear',
		value: items.length === 0 ? '—' : items.length - 1,
		active,
	},
	{ id: 'size', label: 'size', value: items.length },
];

// The opening frame for a mode: the starting structure, no op executed yet.
export const sqInitialFrame = (mode, initialItems) => {
	const items = [...initialItems];
	const m = SQ_MODES[mode];
	return {
		op: 'init',
		items,
		line: null,
		state: mode === 'stack' ? stackState(items) : queueState(items),
		highlight: null,
		narration:
			mode === 'stack'
				? 'Stack ready. Push to place a value on top, pop to lift it back off.'
				: 'Queue ready. Enqueue to add at the rear, dequeue to serve from the front.',
		// Kept for callers that label by mode (e.g. empty messages).
		modeName: m.name,
	};
};

// Apply a single op to the previous frame, returning the next frame. Pure: it
// never mutates `prev`. An unknown / impossible op yields a no-op frame so the
// timeline stays append-only and the cursor logic stays simple.
export const sqNextFrame = (mode, prev, op) => {
	const items = prev.items;
	const m = SQ_MODES[mode];

	if (op.type === 'add') {
		const next = [...items, op.value];
		if (mode === 'stack') {
			return {
				op: 'add',
				items: next,
				line: STACK_LINE.add,
				state: stackState(next, true),
				highlight: next.length - 1,
				narration: `Pushed ${op.value} onto the top. The pile grows upward.`,
			};
		}
		return {
			op: 'add',
			items: next,
			line: QUEUE_LINE.add,
			state: queueState(next, true),
			highlight: next.length - 1,
			narration: `Enqueued ${op.value} at the rear. The line grows backward.`,
		};
	}

	if (op.type === 'remove') {
		if (items.length === 0) {
			return {
				op: 'noop',
				items: [],
				line: null,
				state: mode === 'stack' ? stackState([]) : queueState([]),
				highlight: null,
				narration: `${m.name} is empty — nothing to ${m.removeLabel.toLowerCase()}.`,
			};
		}
		if (mode === 'stack') {
			const removed = items[items.length - 1];
			const next = items.slice(0, -1);
			return {
				op: 'remove',
				items: next,
				line: STACK_LINE.removeDec,
				state: stackState(next, true),
				highlight: null,
				narration: `Popped ${removed} from the top. Last in, first out.`,
			};
		}
		const removed = items[0];
		const next = items.slice(1);
		return {
			op: 'remove',
			items: next,
			line: QUEUE_LINE.removeInc,
			state: queueState(next, true),
			highlight: null,
			narration: `Dequeued ${removed} from the front. First in, first out.`,
		};
	}

	if (op.type === 'peek') {
		if (items.length === 0) {
			return {
				op: 'noop',
				items: [],
				line: null,
				state: mode === 'stack' ? stackState([]) : queueState([]),
				highlight: null,
				narration: `${m.name} is empty — nothing to peek at.`,
			};
		}
		const peekIdx = mode === 'stack' ? items.length - 1 : 0;
		const value = items[peekIdx];
		return {
			op: 'peek',
			items: [...items],
			line: mode === 'stack' ? STACK_LINE.removeValue : QUEUE_LINE.removeValue,
			state: mode === 'stack' ? stackState(items) : queueState(items),
			highlight: peekIdx,
			narration:
				mode === 'stack'
					? `Top of stack is ${value}. Peek reads it without removing — structure unchanged.`
					: `Front of queue is ${value}. Peek reads it without removing — structure unchanged.`,
		};
	}

	// Unknown op — stay put.
	return {
		...prev,
		op: 'noop',
		line: null,
	};
};

/**
 * sqFrames — build the full conformant timeline for a mode + op-log.
 *
 * @param {'stack'|'queue'} mode
 * @param {string[]} initialItems  the starting contents (front/bottom first).
 * @param {Array<{type:'add'|'remove'|'peek', value?:string}>} ops  the op-log.
 * @returns {Array<object>} frames per THE FRAME CONTRACT (+ viz extras).
 */
export const sqFrames = (mode, initialItems = [], ops = []) => {
	const frames = [sqInitialFrame(mode, initialItems)];
	for (const op of ops) {
		frames.push(sqNextFrame(mode, frames[frames.length - 1], op));
	}
	return frames;
};

// Re-export so callers can import the pseudocode alongside the generator.
export { SQ_PSEUDO };

export default sqFrames;
