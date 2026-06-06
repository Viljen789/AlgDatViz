// The scrolly scenes that build intuition for the two simplest "what to do
// next" disciplines — LIFO (stack) and FIFO (queue) — before the playground
// hands control to the student.
//
// Each scene carries a `check`: a small comprehension question answered inline
// before scrolling on. Wrong answers are never punished — the explanation
// reveals regardless of correctness, so every attempt teaches.
//
// The stage (StacksQueuesStage) reads `activeScene` to switch between the stack
// pile, the queue lane, and the side-by-side traversal comparison. The fixed
// example data below keeps the visuals and the checks in lockstep.

// The four values that arrive, in order, in both the stack and the queue.
export const SEQUENCE = ['A', 'B', 'C', 'D'];

export const SCENES = [
	{
		id: 'why',
		eyebrow: 'The question',
		title: 'Every algorithm has to decide: what do I do next?',
		body: 'When work piles up, you need a rule for which piece to handle first. A stack and a queue are the two simplest rules — and the only real difference between them is which end you remove from.',
		check: {
			kind: 'choice',
			prompt:
				'What is the one thing that separates a stack from a queue?',
			options: ['Where you add', 'Where you remove', 'The values stored'],
			answer: 'Where you remove',
			explanation:
				'Both add at one end. The difference is the removal end: a stack removes from the same end it adds to (the top), while a queue removes from the opposite end (the front). That single choice changes everything downstream.',
		},
	},
	{
		id: 'stack',
		eyebrow: 'Stack · LIFO',
		title: 'A stack is last in, first out. Add and remove both touch the top.',
		body: 'Push A, B, C, D and they sit in a pile. Pop, and D — the newest — leaves first. Like a stack of plates: you take the one you just put down. Push and pop are both O(1) because only the top ever moves.',
		check: {
			kind: 'choice',
			prompt:
				'You push A, then B, then C, then D onto a stack. Which value does the next pop return?',
			options: ['A', 'B', 'C', 'D'],
			answer: 'D',
			explanation:
				'Last in, first out. D was pushed last, so it sits on top and pops first. The order out is D, C, B, A — the exact reverse of the order in. A stack reverses.',
		},
	},
	{
		id: 'queue',
		eyebrow: 'Queue · FIFO',
		title: 'A queue is first in, first out. Add at the rear, remove at the front.',
		body: 'Enqueue A, B, C, D and they form a line. Dequeue, and A — the oldest — is served first. Like a line at a counter: fair, in arrival order. Two pointers, front and rear, each move one way, so every operation stays O(1).',
		check: {
			kind: 'choice',
			prompt:
				'You enqueue A, then B, then C, then D into a queue. Which value does the next dequeue return?',
			options: ['A', 'B', 'C', 'D'],
			answer: 'A',
			explanation:
				'First in, first out. A arrived first and waited at the front, so it leaves first. The order out is A, B, C, D — arrival order preserved. A queue keeps order; a stack reverses it.',
		},
	},
	{
		id: 'traversal',
		eyebrow: 'Where it matters',
		title: 'Swap the discipline and a graph search changes shape entirely.',
		body: 'Hold pending nodes in a stack and the search dives deep down one branch first — depth-first. Hold them in a queue and it spreads outward in layers — breadth-first. Same neighbors, same graph; only the removal rule differs.',
		check: {
			kind: 'choice',
			prompt:
				'Which data structure makes a graph search explore in expanding layers (breadth-first)?',
			options: ['Stack', 'Queue'],
			answer: 'Queue',
			explanation:
				'A queue serves the oldest pending node first, so a whole layer is explored before the next one begins — that is breadth-first search. A stack serves the newest pending node, plunging down one branch before backtracking — that is depth-first search. The container is the algorithm.',
		},
	},
];
