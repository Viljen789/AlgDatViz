import { Lock } from 'lucide-react';
import styles from './LessonCheck.module.css';

// StepProbeFrame — the HONEST depiction of a trace's frozen frame k.
//
// A trace-step probe ('stepProbe' check, see checkAnswer.js) freezes a generator
// frame as the question and asks for the next decision. This component renders that
// frozen frame VERBATIM — it reads the same fields the topic's own stage reads
// (dist map + settled set for Dijkstra; frontier + visited for a BFS queue) so the
// learner sees exactly the state the algorithm is at, never a re-imagined sketch.
//
// Accessibility / colour: status is never carried by hue alone. A settled vertex
// wears a lock glyph and a "settled" label; the queue front wears a "front" caption
// and a left rule. The semantic success tint is a secondary cue, not the only one.

const INF = '∞'; // ∞

// ── Dijkstra "settle next": the dist table + which vertices are settled. ──
const DijkstraSettleView = ({ frame, ids }) => {
	const order =
		Array.isArray(ids) && ids.length ? ids : Object.keys(frame.dist);
	const settled = new Set(frame.settled || []);
	return (
		<figure className={styles.probeFigure}>
			<figcaption className={styles.probeCaption}>
				Frozen state — tentative distances and the settled set
			</figcaption>
			<ul
				className={styles.probeDistRow}
				aria-label="Tentative distances by vertex"
			>
				{order.map(id => {
					const isSettled = settled.has(id);
					const d = frame.dist[id];
					return (
						<li
							key={id}
							className={`${styles.probeVertex} ${
								isSettled ? styles.probeVertexSettled : styles.probeVertexOpen
							}`}
						>
							<span className={styles.probeVertexId}>
								{id}
								{isSettled && (
									<Lock
										size={11}
										strokeWidth={2.4}
										aria-hidden="true"
										className={styles.probeLock}
									/>
								)}
							</span>
							<span className={styles.probeDist}>{d == null ? INF : d}</span>
							<span className={styles.probeVertexTag}>
								{isSettled ? 'settled' : 'open'}
							</span>
						</li>
					);
				})}
			</ul>
		</figure>
	);
};

// ── BFS "dequeue next": the visited set + the FIFO queue, front to rear. ──
const BfsDequeueView = ({ frame }) => {
	const queue = Array.isArray(frame.frontier) ? frame.frontier : [];
	const visited = Array.isArray(frame.visited) ? frame.visited : [];
	return (
		<figure className={styles.probeFigure}>
			<figcaption className={styles.probeCaption}>
				Frozen state — the FIFO queue (front to rear) and visited vertices
			</figcaption>
			<div className={styles.probeQueueWrap}>
				<span className={styles.probeQueueLabel}>queue</span>
				{queue.length === 0 ? (
					<span className={styles.probeQueueEmpty}>empty</span>
				) : (
					<ol className={styles.probeQueue} aria-label="Queue, front to rear">
						{queue.map((item, i) => (
							<li
								key={item.id}
								className={`${styles.probeQueueItem} ${
									i === 0 ? styles.probeQueueFront : ''
								}`}
							>
								<span className={styles.probeQueueId}>{item.id}</span>
								<span className={styles.probeQueuePos}>
									{i === 0 ? 'front' : i === queue.length - 1 ? 'rear' : ''}
								</span>
							</li>
						))}
					</ol>
				)}
			</div>
			<p className={styles.probeVisited}>
				<span className={styles.probeVisitedLabel}>visited</span>
				<span className={styles.probeVisitedList}>
					{visited.length ? visited.join(', ') : 'none yet'}
				</span>
			</p>
		</figure>
	);
};

// Render the frozen frame for a probe `view` descriptor. Unknown view kinds render
// nothing (the prediction widget still works), so a new probe family degrades to a
// plain predict rather than crashing.
const StepProbeFrame = ({ frame, view }) => {
	if (!frame || !view) return null;
	if (view.kind === 'dijkstra-settle') {
		return <DijkstraSettleView frame={frame} ids={view.ids} />;
	}
	if (view.kind === 'bfs-dequeue') {
		return <BfsDequeueView frame={frame} ids={view.ids} />;
	}
	return null;
};

export default StepProbeFrame;
