import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Clock, Flame, Lock } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
	BUILT_TOPICS,
	CURRICULUM,
	FIRST_TOPIC,
	TOPIC_BY_ID,
} from '../data/curriculum.js';
import { REVIEW_BANK } from '../components/Review/reviewBank.js';
import { DAILY_GOAL, examNewCap } from '../lib/activityLog.js';
import useProgress from '../hooks/useProgress.js';
import useSrs from '../hooks/useSrs.js';
import useActivity from '../hooks/useActivity.js';
import HeroRecompose from './HeroRecompose.jsx';
import { PHASES, THESIS_SENTENCE, WASH_HUE } from './recomposeLayout.js';
import styles from './HomePage.module.css';

gsap.registerPlugin(ScrollTrigger);

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

// A small daily-goal ring: today's answered count against the goal.
const GoalRing = ({ value, goal, done }) => {
	const R = 15;
	const C = 2 * Math.PI * R;
	const frac = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
	return (
		<svg
			className={styles.ring}
			width="40"
			height="40"
			viewBox="0 0 40 40"
			aria-hidden="true"
		>
			<circle className={styles.ringTrack} cx="20" cy="20" r={R} />
			<circle
				className={styles.ringFill}
				cx="20"
				cy="20"
				r={R}
				transform="rotate(-90 20 20)"
				style={{ strokeDasharray: C, strokeDashoffset: C * (1 - frac) }}
			/>
			{done && (
				<path className={styles.ringCheck} d="M14.5 20.5 l3.5 3.5 l7 -8" />
			)}
		</svg>
	);
};

const HomePage = () => {
	const navigate = useNavigate();
	const { lastVisited, markVisited, isCompleted, isVisited, overall } =
		useProgress();
	const { plan: srsPlan } = useSrs();
	const { todayCount, currentStreak, daysUntilExam } = useActivity();
	const pageRef = useRef(null);
	const nodeRefs = useRef([]);
	// The live figure legend is updated imperatively (5× per loop) to avoid a
	// React re-render on every morph boundary.
	const figureRef = useRef(null);
	const figureNameRef = useRef(null);
	const figureNoteRef = useRef(null);
	const flipTimer = useRef(null);

	// HeroRecompose calls this at each morph completion: swap the structure name
	// and its one defining fact, retint the "Fig. 1" mark to the active concept
	// hue, and play a brief flip.
	const handleHeroState = useCallback(state => {
		const phase = PHASES[state];
		const fig = figureRef.current;
		const nameEl = figureNameRef.current;
		const noteEl = figureNoteRef.current;
		if (nameEl && phase) nameEl.textContent = phase.name;
		if (noteEl && phase) noteEl.textContent = phase.note;
		if (fig && WASH_HUE[state] != null) {
			fig.style.setProperty('--wash-h', String(WASH_HUE[state]));
			fig.classList.remove(styles.isFlipping);
			// force reflow so the flip animation restarts on each swap
			void fig.offsetWidth;
			fig.classList.add(styles.isFlipping);
			clearTimeout(flipTimer.current);
			flipTimer.current = setTimeout(() => {
				if (figureRef.current) figureRef.current.classList.remove(styles.isFlipping);
			}, 220);
		}
	}, []);

	const allComplete = overall.allComplete;
	const started = overall.visited > 0;

	// Spaced-repetition: how many cards are due (or newly eligible) right now.
	// Closer to the exam ⇒ a larger new-card budget.
	const isNewEligible = useCallback(entry => isVisited(entry.topicId), [isVisited]);
	const duePlan = useMemo(
		() => srsPlan(REVIEW_BANK, { newCap: examNewCap(daysUntilExam), isNewEligible }),
		[srsPlan, isNewEligible, daysUntilExam]
	);
	const dueTotal = duePlan.dueCount + duePlan.freshCount;
	const goalDone = started && todayCount >= DAILY_GOAL;

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
				titleLines: ['Reviewing?'],
				subtitle: 'Every topic is complete. Start anywhere on the path.',
				ctaLabel: 'Open the path',
				ctaTopic: FIRST_TOPIC,
			};
		}
		if (lastTopic && lastTopic.id !== nextTopic?.id) {
			return {
				titleLines: ['Welcome back.'],
				subtitle: `You stopped at ${lastTopic.name.toLowerCase()}. Pick it back up, or jump ahead.`,
				ctaLabel: `Continue with ${nextTopic.name.toLowerCase()}`,
				ctaTopic: nextTopic,
			};
		}
		return {
			titleLines: ['One dataset.', 'Every structure.'],
			subtitle:
				'Fourteen values, read as an array, a tree, a heap, and a graph — a guided, interactive path through all of TDT4120, built to make the why click, not just the what.',
			ctaLabel: `Begin with ${FIRST_TOPIC.name.toLowerCase()}`,
			ctaTopic: FIRST_TOPIC,
		};
	}, [allComplete, lastTopic, nextTopic]);

	const visit = topic => {
		markVisited(topic.id);
		navigate(topic.to);
	};

	// Scroll choreography. The whole sequence is gated behind
	// `prefers-reduced-motion: no-preference`, so reduced-motion (and no-JS)
	// users get the fully drawn rail and visible nodes from the CSS defaults —
	// nothing here strips a lesson, it only adds flow on top of a static page.
	useLayoutEffect(() => {
		const pageEl = pageRef.current;
		if (!pageEl) return undefined;

		// Seed the live figure legend to the static-tree frame. HeroRecompose then
		// drives it imperatively via onState; reduced-motion / no-JS users never get
		// an onState call, so this is the legend they keep — "Binary tree", tinted to
		// match the drawn tree the static SVG shows.
		if (figureRef.current) {
			figureRef.current.style.setProperty('--wash-h', String(WASH_HUE.tree));
		}
		if (figureNameRef.current) {
			figureNameRef.current.textContent = PHASES.tree.name;
		}
		if (figureNoteRef.current) {
			figureNoteRef.current.textContent = PHASES.tree.note;
		}

		const ctx = gsap.context(() => {
			const mm = gsap.matchMedia();
			mm.add('(prefers-reduced-motion: no-preference)', () => {
				const q = sel => pageEl.querySelector(sel);

				// ---- Hero: a short, confident staggered entrance ----
				const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
				const lampEl = q('[data-hero-lamp]');
				const eyebrowEl = q('[data-hero-eyebrow]');
				const titleLineEls = pageEl.querySelectorAll('[data-hero-title-line]');
				const subEl = q('[data-hero-sub]');
				const stripEl = q('[data-hero-strip]');
				const actionEls = pageEl.querySelectorAll('[data-hero-actions] > *');
				const progressEl = q('[data-hero-progress]');

				if (lampEl)
					heroTl.from(
						lampEl,
						{ autoAlpha: 0, scale: 1.08, duration: 1.4, ease: 'power2.out' },
						0
					);
				if (eyebrowEl)
					heroTl.from(eyebrowEl, { y: 14, opacity: 0, duration: 0.55 }, 0.1);
				// Each title line rises out of its own clipping mask, in sequence.
				if (titleLineEls.length)
					heroTl.from(
						titleLineEls,
						{ yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.08 },
						0.16
					);
				if (subEl)
					heroTl.from(subEl, { y: 18, opacity: 0, duration: 0.7 }, 0.34);
				if (stripEl)
					heroTl.from(stripEl, { y: 12, opacity: 0, duration: 0.6 }, 0.42);
				if (actionEls.length)
					heroTl.from(
						actionEls,
						{ y: 14, opacity: 0, duration: 0.6, stagger: 0.09 },
						0.44
					);
				if (progressEl)
					heroTl.from(progressEl, { y: 12, opacity: 0, duration: 0.6 }, 0.54);
				const recomposeEl = q('[data-hero-recompose]');
				if (recomposeEl)
					heroTl.from(
						recomposeEl,
						{ autoAlpha: 0, scale: 0.985, duration: 1.1, ease: 'power2.out' },
						0.2
					);
				// The figure legend lands as the closing beat of the hero entrance.
				const figCaptionEl = q('[data-hero-figure-caption]');
				if (figCaptionEl)
					heroTl.from(
						figCaptionEl,
						{ y: 10, opacity: 0, duration: 0.6, ease: 'power2.out' },
						0.62
					);

				// ---- Hero lamp drifts down a touch as you scroll past it ----
				const heroEl = q('[data-hero]');
				if (lampEl && heroEl)
					gsap.to(lampEl, {
						yPercent: 16,
						ease: 'none',
						scrollTrigger: {
							trigger: heroEl,
							scroller: pageEl,
							start: 'top top',
							end: 'bottom top',
							scrub: true,
						},
					});

				// ---- The spine draws itself; a glow pool follows the reader ----
				const railEl = q('[data-rail]');
				const fillEl = q('[data-rail-fill]');
				const headEl = q('[data-rail-head]');
				const glowEl = q('[data-rail-glow]');
				const spineEl = q('[data-spine]');

				if (railEl && fillEl && spineEl) {
					gsap.set([headEl, glowEl].filter(Boolean), { opacity: 1 });
					const railTl = gsap.timeline({
						scrollTrigger: {
							trigger: spineEl,
							scroller: pageEl,
							start: 'top 72%',
							end: 'bottom 60%',
							scrub: 0.6,
						},
					});
					railTl.fromTo(fillEl, { scaleY: 0 }, { scaleY: 1, ease: 'none' }, 0);
					if (headEl)
						railTl.fromTo(
							headEl,
							{ y: 0 },
							{ y: () => railEl.offsetHeight, ease: 'none' },
							0
						);
					if (glowEl)
						railTl.fromTo(
							glowEl,
							{ y: () => -spineEl.offsetHeight * 0.1 },
							{ y: () => spineEl.offsetHeight * 0.9, ease: 'none' },
							0
						);
				}

				// ---- Each station rises and ignites as the line reaches it ----
				const nodes = gsap.utils.toArray('[data-node]');
				if (nodes.length) {
					gsap.set(nodes, { opacity: 0, y: 30 });
					const revealed = new WeakSet();
					ScrollTrigger.batch(nodes, {
						scroller: pageEl,
						start: 'top 90%',
						onEnter: batch => {
							const fresh = batch.filter(n => !revealed.has(n));
							if (!fresh.length) return;
							fresh.forEach(n => revealed.add(n));
							gsap.to(fresh, {
								opacity: 1,
								y: 0,
								duration: 0.8,
								ease: 'power3.out',
								stagger: 0.12,
								overwrite: true,
							});
							fresh.forEach((node, i) => {
								const dot = node.querySelector('[data-dot]');
								const spark = node.querySelector('[data-spark]');
								if (dot)
									gsap.fromTo(
										dot,
										{ scale: 0.68 },
										{
											scale: 1,
											duration: 0.7,
											ease: 'power3.out',
											delay: i * 0.12,
										}
									);
								if (spark)
									gsap.fromTo(
										spark,
										{ scale: 0.3, opacity: 0.85 },
										{
											scale: 2.6,
											opacity: 0,
											duration: 1,
											ease: 'power2.out',
											delay: i * 0.12,
										}
									);
							});
						},
					});
				}
			});
		}, pageEl);

		// Positions depend on web-font metrics and the route mount transition;
		// recompute once both have settled.
		const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(() => ScrollTrigger.refresh());
		}

		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(flipTimer.current);
			ctx.revert();
		};
	}, []);

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
		<div className={styles.page} ref={pageRef}>
			<section
				className={styles.hero}
				aria-labelledby="home-hero-title"
				data-hero
			>
				<div className={styles.lamp} aria-hidden="true" data-hero-lamp />
				<div className={styles.heroInner}>
					<p className={styles.eyebrow} data-hero-eyebrow>
						AlgDatViz · TDT4120
					</p>
					<h1 id="home-hero-title" className={styles.heroTitle}>
						{heroState.titleLines.map((line, i) => (
							<span key={i} className={styles.heroTitleMask}>
								<span className={styles.heroTitleLine} data-hero-title-line>
									{line}
								</span>
							</span>
						))}
					</h1>
					<p className={styles.heroSubtitle} data-hero-sub>
						{heroState.subtitle}
					</p>
					<p className={styles.heroThesisStrip} data-hero-strip>
						{THESIS_SENTENCE}{' '}
						<span className={styles.heroThesisForms}>
							{Object.values(PHASES)
								.map(p => p.name)
								.join(' · ')}
						</span>
					</p>
					<div className={styles.today} data-hero-actions>
						<div className={styles.todayTop}>
							<span className={styles.todayLabel}>
								{started ? 'Today' : 'Start here'}
							</span>
							{currentStreak > 0 && (
								<span className={styles.streak}>
									<Flame size={13} strokeWidth={2.4} aria-hidden="true" />
									{currentStreak}-day streak
								</span>
							)}
							{daysUntilExam != null && daysUntilExam >= 0 && (
								<Link to="/progress" className={styles.examChip}>
									Exam in {daysUntilExam}d
								</Link>
							)}
						</div>

						<div className={styles.todayActions}>
							<button
								type="button"
								className={styles.primaryCta}
								onClick={() => visit(heroState.ctaTopic)}
							>
								<span>{heroState.ctaLabel}</span>
								<ArrowRight size={16} strokeWidth={2} />
							</button>
							{started && dueTotal > 0 && (
								<Link
									to="/review"
									className={styles.reviewCta}
									aria-label={`Review ${dueTotal} due — spaced retrieval`}
								>
									<Clock size={14} strokeWidth={2.2} aria-hidden="true" />
									<span>
										Review <strong>{dueTotal}</strong> due
									</span>
								</Link>
							)}
						</div>

						{started && (
							<div className={styles.todayGoal}>
								<GoalRing value={todayCount} goal={DAILY_GOAL} done={goalDone} />
								<div className={styles.goalText}>
									{goalDone ? (
										<>
											<span className={styles.goalHead}>Done for today</span>
											<span className={styles.goalSub}>
												{todayCount} answered · streak safe
											</span>
										</>
									) : (
										<>
											<span className={styles.goalHead}>
												{todayCount} / {DAILY_GOAL} answered today
											</span>
											<span className={styles.goalSub}>
												{overall.completed} of {overall.total} topics complete
											</span>
										</>
									)}
								</div>
								<Link to="/progress" className={styles.progressLink}>
									Progress
									<ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
								</Link>
							</div>
						)}
					</div>
				</div>
				<figure className={styles.heroFigure} ref={figureRef}>
					<HeroRecompose
						className={styles.heroRecompose}
						onState={handleHeroState}
					/>
					<figcaption
						className={styles.heroFigcaption}
						aria-hidden="true"
						data-hero-figure-caption
					>
						{/* Legend text + the figure's --wash-h are imperative DOM, driven
						    by HeroRecompose via onState (and seeded in the layout effect).
						    React must not manage them, or it resets the live values on
						    every re-render — hence no text children and no inline --wash-h. */}
						<span className={styles.heroFigureRow}>
							<span className={styles.heroFigureMark}>Fig. 1</span>
							<span className={styles.heroFigureName} ref={figureNameRef} />
						</span>
						<span className={styles.heroFigureNote} ref={figureNoteRef} />
					</figcaption>
				</figure>
			</section>

			<section className={styles.pathSection} aria-labelledby="path-heading">
				<header className={styles.pathHeader}>
					<p className={styles.label}>The path</p>
					<h2 id="path-heading" className={styles.pathHeading}>
						The full curriculum, in the order it teaches itself.
					</h2>
					<p className={styles.pathSub}>
						Every topic in the TDT4120 syllabus, end to end — from arrays and
						complexity through to NP-completeness.
					</p>
				</header>

				<div className={styles.spineWrap} data-spine>
					<div className={styles.glow} aria-hidden="true" data-rail-glow />
					<div className={styles.rail} aria-hidden="true" data-rail>
						<span className={styles.railFill} data-rail-fill />
						<span className={styles.railHead} data-rail-head />
					</div>

					<ol className={styles.spine} aria-label="Learning path">
						{CURRICULUM.map((topic, idx) => {
							// Coming-soon: a clearly-labelled, non-navigable, muted node.
							if (topic.status === 'soon') {
								return (
									<li
										key={topic.id}
										data-idx={idx}
										data-node
										ref={node => {
											nodeRefs.current[idx] = node;
										}}
										tabIndex={-1}
										className={`${styles.node} ${styles.nodeSoon}`}
										style={{ '--accent': topic.accent }}
									>
										<div className={styles.nodeMarker} aria-hidden="true">
											<span className={styles.nodeDot} data-dot>
												<span className={styles.nodeDotInner} />
											</span>
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
									data-node
									ref={node => {
										nodeRefs.current[idx] = node;
									}}
									tabIndex={-1}
									className={`${styles.node} ${
										completed ? styles.nodeComplete : ''
									} ${visited ? styles.nodeVisited : ''} ${
										isNext ? styles.nodeNext : ''
									}`}
									style={{
										'--accent': topic.accent,
										'--accent-contrast': `var(--topic-${topic.id}-contrast)`,
									}}
								>
									<div className={styles.nodeMarker} aria-hidden="true">
										<span className={styles.nodeSpark} data-spark />
										<span className={styles.nodeDot} data-dot>
											{completed ? (
												<Check size={11} strokeWidth={3.2} />
											) : (
												<span className={styles.nodeDotInner} />
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
											<span className={styles.nodeNumber}>{topic.number}</span>
											{statusText && (
												<span className={styles.nodeStatus}>{statusText}</span>
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
				</div>

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
					<Link className={styles.footerLink} to="/review">
						Test yourself — cumulative review
						<ArrowRight size={13} strokeWidth={2} />
					</Link>
				</footer>
			</section>
		</div>
	);
};

export default HomePage;
