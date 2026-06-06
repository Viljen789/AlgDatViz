import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Lock, RotateCcw } from 'lucide-react';
import {
	BUILT_TOPICS,
	CURRICULUM,
	FIRST_TOPIC,
	TOPIC_BY_ID,
} from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import useReducedMotion from '../hooks/useReducedMotion.js';
import styles from './HomePage.module.css';

const PreviewBars = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		{[28, 12, 22, 8, 36, 16, 30, 20].map((h, i) => (
			<rect
				key={i}
				x={i * 14 + 4}
				y={48 - h}
				width="8"
				height={h}
				rx="1.5"
				fill="currentColor"
				opacity={0.35 + (i % 3) * 0.18}
			/>
		))}
	</svg>
);

const PreviewSplit = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.55">
			<line x1="60" y1="6" x2="28" y2="22" />
			<line x1="60" y1="6" x2="92" y2="22" />
			<line x1="28" y1="22" x2="14" y2="38" />
			<line x1="28" y1="22" x2="42" y2="38" />
			<line x1="92" y1="22" x2="78" y2="38" />
			<line x1="92" y1="22" x2="106" y2="38" />
		</g>
		<g fill="currentColor">
			<circle cx="60" cy="6" r="3" />
			<circle cx="28" cy="22" r="3" opacity="0.85" />
			<circle cx="92" cy="22" r="3" opacity="0.85" />
			<circle cx="14" cy="38" r="2.5" opacity="0.7" />
			<circle cx="42" cy="38" r="2.5" opacity="0.7" />
			<circle cx="78" cy="38" r="2.5" opacity="0.7" />
			<circle cx="106" cy="38" r="2.5" opacity="0.7" />
		</g>
	</svg>
);

const PreviewNetwork = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5">
			<line x1="20" y1="14" x2="56" y2="28" />
			<line x1="56" y1="28" x2="98" y2="14" />
			<line x1="20" y1="14" x2="36" y2="44" />
			<line x1="56" y1="28" x2="36" y2="44" />
			<line x1="56" y1="28" x2="84" y2="44" />
			<line x1="98" y1="14" x2="84" y2="44" />
		</g>
		<g fill="currentColor">
			<circle cx="20" cy="14" r="3.5" />
			<circle cx="56" cy="28" r="4" />
			<circle cx="98" cy="14" r="3.5" />
			<circle cx="36" cy="44" r="3" opacity="0.85" />
			<circle cx="84" cy="44" r="3" opacity="0.85" />
		</g>
	</svg>
);

const PreviewBuckets = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		{[0, 1, 2, 3].map(i => (
			<g key={i} transform={`translate(${4 + i * 30}, 6)`}>
				<rect
					width="22"
					height="44"
					rx="3"
					fill="none"
					stroke="currentColor"
					strokeWidth="1"
					opacity="0.45"
				/>
				{Array.from({ length: [2, 3, 1, 2][i] }).map((_, j) => (
					<rect
						key={j}
						x="3"
						y={37 - j * 11}
						width="16"
						height="8"
						rx="1.5"
						fill="currentColor"
						opacity={0.55 + j * 0.15}
					/>
				))}
			</g>
		))}
	</svg>
);

const PREVIEW_BY_ID = {
	sorting: PreviewBars,
	graphs: PreviewNetwork,
	'master-theorem': PreviewSplit,
	hashing: PreviewBuckets,
};

const HomePage = () => {
	const navigate = useNavigate();
	const reducedMotion = useReducedMotion();
	const { lastVisited, markVisited, reset, isCompleted, isVisited, overall } =
		useProgress();
	const [pathIndex, setPathIndex] = useState(-1);
	const nodeRefs = useRef([]);

	const allComplete = overall.allComplete;
	const started = overall.visited > 0;

	const lastTopic = lastVisited ? TOPIC_BY_ID[lastVisited] : null;
	const nextTopic = useMemo(() => {
		if (allComplete) return null;
		// First not-yet-completed *built* topic in teaching order (skips locked
		// coming-soon placeholders).
		const firstOpen = BUILT_TOPICS.find(topic => !isCompleted(topic.id));
		return firstOpen || FIRST_TOPIC;
	}, [allComplete, isCompleted]);

	const heroState = useMemo(() => {
		if (allComplete) {
			return {
				title: 'Reviewing?',
				subtitle: 'Every topic is complete. Start anywhere on the path.',
				ctaLabel: 'Open the path',
				ctaTopic: FIRST_TOPIC,
			};
		}
		if (lastTopic && lastTopic.id !== nextTopic?.id) {
			return {
				title: 'Welcome back.',
				subtitle: `You stopped at ${lastTopic.name.toLowerCase()}. Pick it back up, or jump ahead.`,
				ctaLabel: `Continue with ${nextTopic.name.toLowerCase()}`,
				ctaTopic: nextTopic,
			};
		}
		return {
			title: 'Algorithms, in motion.',
			subtitle:
				'A guided path building toward the full TDT4120 curriculum. The first seven topics are live; the rest are on the way. Built to make the why click — not just the what.',
			ctaLabel: `Begin with ${FIRST_TOPIC.name.toLowerCase()}`,
			ctaTopic: FIRST_TOPIC,
		};
	}, [allComplete, lastTopic, nextTopic]);

	const visit = topic => {
		markVisited(topic.id);
		navigate(topic.to);
	};

	useEffect(() => {
		if (reducedMotion) return undefined;
		const observer = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					if (!entry.isIntersecting) return;
					const idx = Number(entry.target.dataset.idx);
					setPathIndex(prev => (idx > prev ? idx : prev));
				});
			},
			{ rootMargin: '-30% 0px -45% 0px', threshold: 0 }
		);
		nodeRefs.current.forEach(node => {
			if (node) observer.observe(node);
		});
		return () => observer.disconnect();
	}, [reducedMotion]);

	const onKeyNavigate = (event, idx) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			const next = nodeRefs.current[idx + 1];
			if (next) next.focus();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			const prev = nodeRefs.current[idx - 1];
			if (prev) prev.focus();
		}
	};

	return (
		<div className={styles.page}>
			<section
				className={styles.hero}
				aria-labelledby="home-hero-title"
			>
				<div className={styles.lamp} aria-hidden="true" />
				<div className={styles.heroInner}>
					<p className={styles.eyebrow}>
						AlgDatViz · TDT4120
					</p>
					<h1 id="home-hero-title" className={styles.heroTitle}>
						{heroState.title}
					</h1>
					<p className={styles.heroSubtitle}>{heroState.subtitle}</p>
					<div className={styles.heroActions}>
						<button
							type="button"
							className={styles.primaryCta}
							onClick={() => visit(heroState.ctaTopic)}
						>
							<span>{heroState.ctaLabel}</span>
							<ArrowRight size={16} strokeWidth={2} />
						</button>
						{started && !allComplete && (
							<button
								type="button"
								className={styles.ghostCta}
								onClick={reset}
								title="Clear progress and start over"
							>
								<RotateCcw size={13} strokeWidth={2} />
								<span>Reset progress</span>
							</button>
						)}
					</div>
					{started && (
						<div
							className={styles.heroProgress}
							role="group"
							aria-label={`Overall progress: ${overall.completed} of ${overall.total} topics completed`}
						>
							<div
								className={styles.heroProgressTrack}
								role="progressbar"
								aria-valuenow={overall.completed}
								aria-valuemin={0}
								aria-valuemax={overall.total}
							>
								<span
									className={styles.heroProgressFill}
									style={{ width: `${overall.percent}%` }}
								/>
							</div>
							<p className={styles.heroMeta}>
								{overall.completed} of {overall.total} topics completed
								{overall.visited > overall.completed &&
									` · ${overall.visited - overall.completed} in progress`}
							</p>
						</div>
					)}
				</div>
			</section>

			<section
				className={styles.pathSection}
				aria-labelledby="path-heading"
			>
				<header className={styles.pathHeader}>
					<p className={styles.label}>The path</p>
					<h2 id="path-heading" className={styles.pathHeading}>
						The full curriculum, in the order it teaches itself.
					</h2>
					<p className={styles.pathSub}>
						Seven topics are live and interactive. The rest of the TDT4120
						syllabus is mapped here and on its way.
					</p>
				</header>

				<ol className={styles.spine} aria-label="Learning path">
					{CURRICULUM.map((topic, idx) => {
						const reached = idx <= pathIndex || reducedMotion;

						// Coming-soon: a clearly-labelled, non-navigable, muted node.
						if (topic.status === 'soon') {
							return (
								<li
									key={topic.id}
									data-idx={idx}
									ref={node => {
										nodeRefs.current[idx] = node;
									}}
									tabIndex={-1}
									className={`${styles.node} ${styles.nodeSoon} ${
										reached ? styles.nodeReached : ''
									}`}
									style={{ '--accent': topic.accent }}
								>
									<div className={styles.nodeMarker} aria-hidden="true">
										<span className={styles.nodeDot} />
									</div>
									<div
										className={styles.nodeBody}
										aria-label={`${topic.name} — coming soon`}
									>
										<div className={styles.nodeHead}>
											<span className={styles.nodeNumber}>
												{topic.number}
											</span>
											<span className={styles.nodeSoonBadge}>
												<Lock
													size={11}
													strokeWidth={2.4}
													aria-hidden="true"
												/>
												Coming soon
											</span>
										</div>
										<h3 className={styles.nodeName}>{topic.name}</h3>
										<p className={styles.nodeQuote}>{topic.pullQuote}</p>
										<div className={styles.nodeFoot}>
											<span className={styles.nodeComplexity}>
												{topic.complexity}
											</span>
										</div>
									</div>
								</li>
							);
						}

						const completed = isCompleted(topic.id);
						const visited = !completed && isVisited(topic.id);
						const isNext = !completed && topic.id === nextTopic?.id;
						const Preview = PREVIEW_BY_ID[topic.id];
						const statusText = completed
							? 'Completed'
							: isNext
								? 'Next up'
								: visited
									? 'In progress'
									: '';
						return (
							<li
								key={topic.id}
								data-idx={idx}
								ref={node => {
									nodeRefs.current[idx] = node;
								}}
								tabIndex={-1}
								className={`${styles.node} ${reached ? styles.nodeReached : ''} ${
									completed ? styles.nodeComplete : ''
								} ${visited ? styles.nodeVisited : ''} ${
									isNext ? styles.nodeNext : ''
								}`}
								style={{ '--accent': topic.accent }}
							>
								<div className={styles.nodeMarker} aria-hidden="true">
									<span className={styles.nodeDot}>
										{completed && (
											<Check size={11} strokeWidth={3.2} />
										)}
									</span>
									{isNext && <span className={styles.nodeRing} />}
								</div>

								<button
									type="button"
									className={styles.nodeBody}
									onClick={() => visit(topic)}
									onKeyDown={event => onKeyNavigate(event, idx)}
									aria-describedby={`node-quote-${topic.id}`}
								>
									<div className={styles.nodeHead}>
										<span className={styles.nodeNumber}>
											{topic.number}
										</span>
										{statusText && (
											<span className={styles.nodeStatus}>
												{statusText}
											</span>
										)}
									</div>
									<h3 className={styles.nodeName}>{topic.name}</h3>
									<p
										id={`node-quote-${topic.id}`}
										className={styles.nodeQuote}
									>
										{topic.pullQuote}
									</p>
									<div className={styles.nodeFoot}>
										<span className={styles.nodeComplexity}>
											{topic.complexity}
										</span>
										<span className={styles.nodeArrow} aria-hidden="true">
											Open
											<ArrowRight size={13} strokeWidth={2} />
										</span>
									</div>
								</button>

								{Preview && (
									<div className={styles.nodePreview} aria-hidden="true">
										<Preview />
									</div>
								)}
							</li>
						);
					})}
				</ol>

				<footer className={styles.pathFooter}>
					<p>
						The path is a guide, not a gate. Skip ahead, return, replay — every
						topic stays open.
					</p>
					{!allComplete && nextTopic && (
						<Link
							className={styles.footerLink}
							to={nextTopic.to}
							onClick={() => markVisited(nextTopic.id)}
						>
							Begin with {nextTopic.name.toLowerCase()}
							<ArrowRight size={13} strokeWidth={2} />
						</Link>
					)}
				</footer>
			</section>
		</div>
	);
};

export default HomePage;
