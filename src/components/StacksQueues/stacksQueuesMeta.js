export const SQ_MODES = {
	stack: {
		name: 'Stack',
		acronym: 'LIFO',
		oneLine:
			'Last in, first out. The newest item is the first one removed — like a pile of plates.',
		complexity: 'O(1) for push, pop, peek',
		addLabel: 'Push',
		removeLabel: 'Pop',
		addPhrase: 'place on top',
		removePhrase: 'lift from top',
	},
	queue: {
		name: 'Queue',
		acronym: 'FIFO',
		oneLine:
			'First in, first out. The oldest waiting item is served first — like a line at a counter.',
		complexity: 'O(1) for enqueue, dequeue, peek',
		addLabel: 'Enqueue',
		removeLabel: 'Dequeue',
		addPhrase: 'add at the rear',
		removePhrase: 'remove at the front',
	},
};

// The collapsible cheat-sheet shown in the topic hero. Pure data; rendered by
// TopicTemplate's CheatSheet. One key idea, the two disciplines side by side,
// the shared O(1) cost, and where each one shows up in real algorithms.
export const CHEAT_SHEET = {
	keyIdea:
		'A stack and a queue add at one end; the only difference is the end you remove from. Stack removes where it added (the top → LIFO); queue removes from the opposite end (the front → FIFO).',
	sections: [
		{
			title: 'The two disciplines',
			items: [
				{
					term: 'Stack · LIFO',
					def: 'Last in, first out. push adds at the top, pop removes from the same top. Reverses order.',
				},
				{
					term: 'Queue · FIFO',
					def: 'First in, first out. enqueue adds at the rear, dequeue removes from the front. Preserves order.',
				},
			],
		},
		{
			title: 'Cost',
			items: [
				{
					term: 'All operations',
					def: 'push, pop, enqueue, dequeue and peek are O(1) — only an end pointer (top, or front/rear) ever moves.',
				},
			],
		},
		{
			title: 'Where each shows up',
			items: [
				{
					term: 'Stack',
					def: 'Depth-first search, undo histories, the function call stack, expression evaluation.',
				},
				{
					term: 'Queue',
					def: 'Breadth-first search, task scheduling, buffering and any first-come-first-served pipeline.',
				},
			],
		},
	],
};

export const SQ_PSEUDO = {
	stack: [
		'push(x):',
		'  top = top + 1',
		'  data[top] = x',
		'',
		'pop():',
		'  value = data[top]',
		'  top = top - 1',
		'  return value',
	],
	queue: [
		'enqueue(x):',
		'  data[rear] = x',
		'  rear = rear + 1',
		'',
		'dequeue():',
		'  value = data[front]',
		'  front = front + 1',
		'  return value',
	],
};
