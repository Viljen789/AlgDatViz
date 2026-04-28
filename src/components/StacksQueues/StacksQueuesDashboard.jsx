import { ArrowDownToLine, ArrowUpFromLine, Eye, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import LearningPanel from '../../common/LearningPanel/LearningPanel.jsx';
import styles from './StacksQueuesDashboard.module.css';

const INITIAL_STACK = ['call()', 'parse()', 'eval()'];
const INITIAL_QUEUE = ['A', 'B', 'C'];
const VALUE_POOL = ['D', 'E', 'F', 'G', 'H', 'I', 'J'];

const CONTENT = {
	stack: {
		name: 'Stack',
		category: 'Linear data structure',
		summary:
			'Stacks are last-in, first-out containers: the newest item is the first one removed.',
		intuition:
			'A stack behaves like a pile of plates or a call stack. You only touch the top, so push, pop, and peek are constant-time operations.',
		strategy: [
			'Push adds a value to the top.',
			'Pop removes the top value.',
			'Peek reads the top without removing it.',
			'Only the most recent item is accessible directly.',
		],
		complexity: {
			time: { average: 'O(1)', worst: 'O(1)' },
			space: { worst: 'O(n)' },
			variables: [{ symbol: 'n', label: 'stored items' }],
			why: [
				'The top pointer tells the structure where to read or write.',
				'No scan is needed for push, pop, or peek.',
				'Memory grows with the number of stored values.',
			],
		},
		tradeoffs: {
			useWhen: [
				'You need undo, backtracking, recursion, parsing, or depth-first behavior.',
				'The newest unfinished task should run next.',
			],
			watchOut: [
				'You cannot efficiently access the bottom or middle.',
				'Deep recursion can overflow a program call stack.',
			],
		},
		legend: [
			{ label: 'Top item', color: 'var(--color-accent-blue)' },
			{ label: 'Removed item', color: 'var(--color-accent-orange)' },
			{ label: 'Stored items', color: 'var(--color-border-strong)' },
		],
		compareCards: [
			{
				label: 'Order rule',
				title: 'LIFO',
				text: 'Last item in is the first item out.',
			},
			{
				label: 'Graph flavor',
				title: 'DFS-like',
				text: 'Stacks naturally chase the newest branch first.',
			},
		],
		pseudocode: [
			'push(x):',
			'  top = top + 1',
			'  data[top] = x',
			'pop():',
			'  value = data[top]',
			'  top = top - 1',
			'  return value',
		],
		conceptChecks: [
			{
				question: 'Why does a stack fit undo?',
				answer:
					'The last action is the first one you usually want to reverse, which matches LIFO order.',
			},
		],
	},
	queue: {
		name: 'Queue',
		category: 'Linear data structure',
		summary:
			'Queues are first-in, first-out containers: the oldest waiting item is served first.',
		intuition:
			'A queue behaves like a line at a counter. Enqueue adds to the rear, while dequeue removes from the front.',
		strategy: [
			'Enqueue adds a value to the rear.',
			'Dequeue removes the front value.',
			'Peek reads the front without removing it.',
			'The structure preserves arrival order.',
		],
		complexity: {
			time: { average: 'O(1)', worst: 'O(1)' },
			space: { worst: 'O(n)' },
			variables: [{ symbol: 'n', label: 'stored items' }],
			why: [
				'Front and rear pointers avoid shifting items.',
				'Each operation touches one end of the queue.',
				'Memory grows with waiting items.',
			],
		},
		tradeoffs: {
			useWhen: [
				'You need scheduling, buffering, BFS, or fair first-come-first-served behavior.',
				'Older work should be processed before newer work.',
			],
			watchOut: [
				'Removing from the front of a plain array can be O(n) if items shift.',
				'Queues do not prioritize important items unless upgraded to a priority queue.',
			],
		},
		legend: [
			{ label: 'Front item', color: 'var(--color-accent-green)' },
			{ label: 'Rear item', color: 'var(--color-accent-blue)' },
			{ label: 'Dequeued item', color: 'var(--color-accent-orange)' },
		],
		compareCards: [
			{
				label: 'Order rule',
				title: 'FIFO',
				text: 'First item in is the first item out.',
			},
			{
				label: 'Graph flavor',
				title: 'BFS-like',
				text: 'Queues naturally process nodes layer by layer.',
			},
		],
		pseudocode: [
			'enqueue(x):',
			'  data[rear] = x',
			'  rear = rear + 1',
			'dequeue():',
			'  value = data[front]',
			'  front = front + 1',
			'  return value',
		],
		conceptChecks: [
			{
				question: 'Why does BFS use a queue?',
				answer:
					'The queue processes all nodes discovered earlier before nodes discovered later, preserving layers.',
			},
		],
	},
};

const makeTrace = (mode, action, items, result) => {
	const isStack = mode === 'stack';
	const access = isStack ? items[items.length - 1] : items[0];
	return {
		title: action,
		text: result || `${CONTENT[mode].name} has ${items.length} item${items.length === 1 ? '' : 's'}.`,
		steps: [
			{
				label: isStack ? 'Accessible end' : 'Front / rear',
				text: isStack
					? `Top is ${access || 'empty'}.`
					: `Front is ${items[0] || 'empty'}, rear is ${items[items.length - 1] || 'empty'}.`,
			},
			{
				label: 'Order rule',
				text: isStack ? 'LIFO: newest item leaves first.' : 'FIFO: oldest item leaves first.',
			},
		],
	};
};

const StacksQueuesDashboard = () => {
	const [mode, setMode] = useState('stack');
	const [stack, setStack] = useState(INITIAL_STACK);
	const [queue, setQueue] = useState(INITIAL_QUEUE);
	const [nextIndex, setNextIndex] = useState(0);
	const [lastAction, setLastAction] = useState('Ready');
	const [lastRemoved, setLastRemoved] = useState('');

	const items = mode === 'stack' ? stack : queue;
	const content = CONTENT[mode];
	const accent = mode === 'stack' ? 'var(--color-accent-blue)' : 'var(--color-accent-green)';

	const trace = useMemo(
		() =>
			makeTrace(
				mode,
				lastAction,
				items,
				lastRemoved ? `Removed ${lastRemoved}. Watch which end changed.` : ''
			),
		[mode, lastAction, items, lastRemoved]
	);

	const getNextValue = () => {
		const value = VALUE_POOL[nextIndex % VALUE_POOL.length];
		setNextIndex(index => index + 1);
		return value;
	};

	const handleAdd = () => {
		const value = getNextValue();
		setLastRemoved('');
		if (mode === 'stack') {
			setStack(current => [...current, value]);
			setLastAction(`Push ${value}`);
		} else {
			setQueue(current => [...current, value]);
			setLastAction(`Enqueue ${value}`);
		}
	};

	const handleRemove = () => {
		setLastRemoved('');
		if (mode === 'stack') {
			const removed = stack[stack.length - 1];
			setLastRemoved(removed || '');
			setLastAction(removed ? `Pop ${removed}` : 'Stack is empty');
			if (removed) setStack(current => current.slice(0, -1));
		} else {
			const removed = queue[0];
			setLastRemoved(removed || '');
			setLastAction(removed ? `Dequeue ${removed}` : 'Queue is empty');
			if (removed) setQueue(current => current.slice(1));
		}
	};

	const handlePeek = () => {
		const value = mode === 'stack' ? stack[stack.length - 1] : queue[0];
		setLastRemoved('');
		setLastAction(value ? `Peek ${value}` : `${content.name} is empty`);
	};

	const handleReset = () => {
		setStack(INITIAL_STACK);
		setQueue(INITIAL_QUEUE);
		setNextIndex(0);
		setLastRemoved('');
		setLastAction('Reset examples');
	};

	return (
		<div className={styles.dashboard}>
			<section className={styles.workbench}>
				<div className={styles.controlBand}>
					<div className={styles.titleBlock}>
						<strong>Stacks & queues laboratory</strong>
						<span>Same O(1) operations, opposite ordering rules</span>
					</div>

					<div className={styles.modeSwitch}>
						<button
							type="button"
							className={mode === 'stack' ? styles.modeActive : ''}
							onClick={() => {
								setMode('stack');
								setLastRemoved('');
								setLastAction('Switched to stack');
							}}
						>
							Stack
						</button>
						<button
							type="button"
							className={mode === 'queue' ? styles.modeActive : ''}
							onClick={() => {
								setMode('queue');
								setLastRemoved('');
								setLastAction('Switched to queue');
							}}
						>
							Queue
						</button>
					</div>

					<div className={styles.actionRow}>
						<button type="button" onClick={handleAdd}>
							<ArrowDownToLine size={16} />
							{mode === 'stack' ? 'Push' : 'Enqueue'}
						</button>
						<button type="button" onClick={handleRemove}>
							<ArrowUpFromLine size={16} />
							{mode === 'stack' ? 'Pop' : 'Dequeue'}
						</button>
						<button type="button" onClick={handlePeek}>
							<Eye size={16} />
							Peek
						</button>
						<button type="button" onClick={handleReset} title="Reset examples">
							<RotateCcw size={16} />
						</button>
					</div>
				</div>

				<div className={styles.visualGrid}>
					<div className={`${styles.structureCard} ${mode === 'stack' ? styles.focused : ''}`}>
						<div className={styles.structureHeader}>
							<strong>Stack</strong>
							<span>LIFO</span>
						</div>
						<div className={styles.stackView}>
							{stack
								.slice()
								.reverse()
								.map((item, index) => (
									<div
										key={`${item}-${index}`}
										className={`${styles.stackItem} ${index === 0 ? styles.activeItem : ''}`}
									>
										<span>{item}</span>
										{index === 0 && <small>top</small>}
									</div>
								))}
						</div>
					</div>

					<div className={`${styles.structureCard} ${mode === 'queue' ? styles.focused : ''}`}>
						<div className={styles.structureHeader}>
							<strong>Queue</strong>
							<span>FIFO</span>
						</div>
						<div className={styles.queueView}>
							{queue.map((item, index) => (
								<div
									key={`${item}-${index}`}
									className={`${styles.queueItem} ${
										index === 0 || index === queue.length - 1 ? styles.activeItem : ''
									}`}
								>
									<span>{item}</span>
									<small>
										{index === 0
											? 'front'
											: index === queue.length - 1
												? 'rear'
												: ''}
									</small>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			<aside className={styles.lessonPanel}>
				<LearningPanel content={content} trace={trace} accent={accent} />
			</aside>
		</div>
	);
};

export default StacksQueuesDashboard;
