import { useState } from 'react';
import { LayoutGroup, motion as Motion, AnimatePresence } from 'framer-motion';
import StacksQueuesHero from './StacksQueuesHero/StacksQueuesHero';
import PseudocodeRail from '../../common/PseudocodeRail/PseudocodeRail';
import { SQ_MODES, SQ_PSEUDO } from './stacksQueuesMeta';
import styles from './StacksQueuesDashboard.module.css';

const INITIAL_STACK = ['call()', 'parse()', 'eval()'];
const INITIAL_QUEUE = ['A', 'B', 'C'];
const VALUE_POOL = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const TWEEN = { type: 'tween', duration: 0.34, ease: [0.16, 1, 0.3, 1] };

const StacksQueuesDashboard = () => {
	const [mode, setMode] = useState('stack');
	const [stack, setStack] = useState(INITIAL_STACK);
	const [queue, setQueue] = useState(INITIAL_QUEUE);
	const [nextIndex, setNextIndex] = useState(0);
	const [activeLine, setActiveLine] = useState(null);
	const [statusSuffix, setStatusSuffix] = useState('ready');
	const [lastResult, setLastResult] = useState(
		'Push a value to begin. Switch modes to compare LIFO and FIFO behavior.'
	);

	const m = SQ_MODES[mode];
	const items = mode === 'stack' ? stack : queue;
	const lines = SQ_PSEUDO[mode] || [];

	const getNextValue = () => {
		const value = VALUE_POOL[nextIndex % VALUE_POOL.length];
		setNextIndex(i => i + 1);
		return value;
	};

	const handleAdd = () => {
		const value = getNextValue();
		if (mode === 'stack') {
			setStack(s => [...s, value]);
			setActiveLine(2); // data[top] = x
			setLastResult(`Pushed ${value} onto the stack.`);
		} else {
			setQueue(q => [...q, value]);
			setActiveLine(1); // data[rear] = x (line 1 in SQ_PSEUDO.queue is the second line)
			setLastResult(`Enqueued ${value} at the rear.`);
		}
		setStatusSuffix(`+${value}`);
	};

	const handleRemove = () => {
		if (mode === 'stack') {
			if (!stack.length) {
				setLastResult('Stack is empty.');
				setStatusSuffix('empty');
				return;
			}
			const removed = stack[stack.length - 1];
			setStack(s => s.slice(0, -1));
			setActiveLine(5); // value = data[top]
			setLastResult(`Popped ${removed} from the top.`);
			setStatusSuffix(`-${removed}`);
		} else {
			if (!queue.length) {
				setLastResult('Queue is empty.');
				setStatusSuffix('empty');
				return;
			}
			const removed = queue[0];
			setQueue(q => q.slice(1));
			setActiveLine(5); // value = data[front]
			setLastResult(`Dequeued ${removed} from the front.`);
			setStatusSuffix(`-${removed}`);
		}
	};

	const handlePeek = () => {
		const value = mode === 'stack' ? stack[stack.length - 1] : queue[0];
		if (!value) {
			setLastResult(`${m.name} is empty.`);
			setStatusSuffix('empty');
			setActiveLine(null);
			return;
		}
		setActiveLine(null);
		setStatusSuffix(`peek ${value}`);
		setLastResult(
			mode === 'stack'
				? `Top of stack is ${value}. The pile is unchanged.`
				: `Front of queue is ${value}. The line is unchanged.`
		);
	};

	const handleReset = () => {
		setStack(INITIAL_STACK);
		setQueue(INITIAL_QUEUE);
		setNextIndex(0);
		setActiveLine(null);
		setStatusSuffix('ready');
		setLastResult('Examples reloaded.');
	};

	const handleModeChange = next => {
		setMode(next);
		setActiveLine(null);
		setStatusSuffix(`${next === 'stack' ? 'LIFO' : 'FIFO'} mode`);
		setLastResult(
			next === 'stack'
				? 'Stack mode. Push and pop both touch the top.'
				: 'Queue mode. Enqueue at the rear, dequeue at the front.'
		);
	};

	const renderStack = () => (
		<div
			className={`${styles.pane} ${mode === 'stack' ? styles.paneActive : ''}`}
		>
			<div className={styles.paneHeader}>
				<span className={styles.paneTitle}>Stack</span>
				<span className={styles.paneAcronym}>LIFO</span>
			</div>
			<LayoutGroup>
				<div className={styles.stackView}>
					<AnimatePresence initial={false}>
						{[...stack].reverse().map((item, idx, arr) => {
							const isTop = idx === 0;
							return (
								<Motion.div
									layout
									key={`${item}-${arr.length - idx}`}
									initial={{ opacity: 0, y: -16 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -16 }}
									transition={TWEEN}
									className={`${styles.stackItem} ${isTop ? styles.itemTop : ''}`}
								>
									<span className={styles.itemLabel}>{item}</span>
									{isTop && <span className={styles.itemAnchor}>top</span>}
								</Motion.div>
							);
						})}
					</AnimatePresence>
					<div className={styles.stackFloor} aria-hidden="true">
						bottom
					</div>
				</div>
			</LayoutGroup>
		</div>
	);

	const renderQueue = () => (
		<div
			className={`${styles.pane} ${mode === 'queue' ? styles.paneActive : ''}`}
		>
			<div className={styles.paneHeader}>
				<span className={styles.paneTitle}>Queue</span>
				<span className={styles.paneAcronym}>FIFO</span>
			</div>
			<LayoutGroup>
				<div className={styles.queueView}>
					<span className={styles.queueLabel}>front</span>
					<div className={styles.queueLane}>
						<AnimatePresence initial={false}>
							{queue.map((item, idx) => {
								const isFront = idx === 0;
								const isRear = idx === queue.length - 1;
								return (
									<Motion.div
										layout
										key={`${item}-${idx}-${queue.length}`}
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -20 }}
										transition={TWEEN}
										className={`${styles.queueItem} ${
											isFront ? styles.itemFront : ''
										} ${isRear ? styles.itemRear : ''}`}
									>
										<span className={styles.itemLabel}>{item}</span>
										{isFront && (
											<span className={styles.itemAnchor}>front</span>
										)}
										{isRear && !isFront && (
											<span className={styles.itemAnchor}>rear</span>
										)}
									</Motion.div>
								);
							})}
						</AnimatePresence>
					</div>
					<span className={styles.queueLabel}>rear</span>
				</div>
			</LayoutGroup>
		</div>
	);

	return (
		<div className={styles.shell}>
			<StacksQueuesHero
				mode={mode}
				onModeChange={handleModeChange}
				onAdd={handleAdd}
				onRemove={handleRemove}
				onPeek={handlePeek}
				onReset={handleReset}
				count={items.length}
				statusSuffix={statusSuffix}
			/>

			<div className={styles.body}>
				<section className={styles.canvas} aria-label="Stack and queue canvas">
					<div className={styles.canvasOverlay}>
						<span className={styles.notation}>{m.complexity}</span>
					</div>

					<div className={styles.canvasStage}>
						{mode === 'stack' ? (
							<>
								{renderStack()}
								{renderQueue()}
							</>
						) : (
							<>
								{renderQueue()}
								{renderStack()}
							</>
						)}
					</div>

					{lastResult && (
						<div className={styles.frameNote} aria-live="polite">
							<span className={styles.frameNoteLabel}>NOTE</span>
							<span className={styles.frameNoteText}>{lastResult}</span>
						</div>
					)}
				</section>

				<PseudocodeRail
					lines={lines}
					activeLine={activeLine}
					isRunning
				/>
			</div>
		</div>
	);
};

export default StacksQueuesDashboard;
