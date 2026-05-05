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
