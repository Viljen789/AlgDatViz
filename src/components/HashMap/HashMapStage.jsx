import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import {
	COLLISION_BUCKET,
	COLLISION_KEYS,
	FOCUS_KEY,
	STAGE_CAPACITY,
	STAGE_HASHES,
	STAGE_KEYS,
} from './scenes.js';
import StateLegend from '../../common/StateLegend/StateLegend';
import { SceneNarration } from '../../common/PlaybackEngine';
import styles from './HashMapStage.module.css';

// Flip captures the small-table layout; MotionPath arcs each entry into its new
// bucket under the larger modulus. Idempotent (mirrors HomePage's pattern).
gsap.registerPlugin(Flip, MotionPathPlugin);

// Swatch colours mirror what HashMapStage.module.css actually paints. The probed
// bucket rides the topic accent (hashing hue) as a faint wash; the collision
// bucket + its colliding cells borrow --color-warning and also gain a solid
// border, so the clash never reads by hue alone. The gauge fill is the accent
// until the table overloads, when it flips to --color-warning.
const SW_PROBED = 'color-mix(in srgb, var(--topic-accent) 10%, transparent)';
const SW_COLLISION = 'var(--color-warning-wash)';
const SW_FILL = 'var(--topic-accent)';
const SW_OVERLOADED = 'var(--color-warning)';

// A larger table the resize scene rehashes into. The exact value is the next
// prime above 2 × STAGE_CAPACITY, matching the dashboard's resize rule.
const RESIZE_CAPACITY = 17;

const computeIndex = (rawHash, capacity) => rawHash % capacity;

// Build the chained buckets for a given capacity from the demo keys, preserving
// insertion order so chains grow in a stable, teachable way.
const buildBuckets = (keys, capacity) => {
	const buckets = Array.from({ length: capacity }, () => []);
	keys.forEach(key => {
		const meta = STAGE_HASHES.find(h => h.key === key);
		if (!meta) return;
		buckets[computeIndex(meta.rawHash, capacity)].push(meta);
	});
	return buckets;
};

/**
 * HashMapStage — the synchronized visualization for the Hashing scrolly.
 *
 * One continuous story across five scenes:
 *   0 hash      — a single key is hashed into its bucket.
 *   1 collision — a second key compresses into the same bucket.
 *   2 chaining  — the bucket is shown as a chain; full table fills in.
 *   3 load      — a load-factor gauge animates in.
 *   4 resize    — the entries rehash into a larger table.
 *
 * All motion is CSS-driven so prefers-reduced-motion (handled in the stylesheet)
 * can calm it. The stage reads only `activeScene`.
 */
const HashMapStage = ({ activeScene = 0 }) => {
	const focus = useMemo(() => STAGE_HASHES.find(h => h.key === FOCUS_KEY), []);

	const isResize = activeScene >= 4;
	const capacity = isResize ? RESIZE_CAPACITY : STAGE_CAPACITY;

	// Which keys are present at this scene. The story adds keys one beat at a
	// time so the table builds up rather than appearing all at once.
	const visibleKeys = useMemo(() => {
		if (activeScene <= 0) return [FOCUS_KEY];
		if (activeScene === 1) {
			// Focus key plus the colliding pair so the clash is visible.
			const set = new Set([FOCUS_KEY, ...COLLISION_KEYS]);
			return STAGE_KEYS.filter(k => set.has(k));
		}
		return STAGE_KEYS;
	}, [activeScene]);

	const buckets = useMemo(
		() => buildBuckets(visibleKeys, capacity),
		[visibleKeys, capacity]
	);

	const entryCount = visibleKeys.length;
	const loadFactor = entryCount / capacity;
	const loadPct = Math.min(loadFactor / 1, 1) * 100;
	const overloaded = loadFactor > 0.75;

	const showGauge = activeScene >= 3;
	const collisionActive = activeScene === 1 || activeScene === 2;

	// The bucket the focus / collision keys live in for the current capacity.
	const spotlightBucket = isResize
		? null
		: computeIndex(focus.rawHash, STAGE_CAPACITY);

	const reducedMotion = useReducedMotion();
	const tableRef = useRef(null);
	const cellRefs = useRef(new Map());
	const registerCell = useCallback((key, el) => {
		if (el) cellRefs.current.set(key, el);
		else cellRefs.current.delete(key);
	}, []);
	// Flip state of the small (pre-resize) table, refreshed each scene while we are
	// NOT resized, so the moment we cross into the resize scene we know where every
	// entry used to sit. wasResizeRef makes the arc fire once per crossing.
	const smallTableStateRef = useRef(null);
	const wasResizeRef = useRef(false);
	const ctxRef = useRef(null);

	useEffect(() => {
		const ctx = gsap.context(() => {}, tableRef.current || undefined);
		ctxRef.current = ctx;
		return () => {
			ctx.revert();
			ctxRef.current = null;
		};
	}, []);

	// Keep a fresh Flip capture of the small table on every scene while it is the
	// one on screen, so by the time the resize scene arrives we hold the layout
	// with ALL entries present (scenes 2–3), not the single-key scene-0 layout.
	useLayoutEffect(() => {
		const table = tableRef.current;
		if (!table || isResize) return;
		smallTableStateRef.current = Flip.getState(
			table.querySelectorAll('[data-flip-id]')
		);
		wasResizeRef.current = false;
	}, [activeScene, isResize]);

	// The rehash re-fly for the scrolly twin. The scene jump 3 → 4 grows the table
	// from m = STAGE_CAPACITY to m = RESIZE_CAPACITY; without the fix below the
	// table remounted and every key teleported into the new modulus at once. Now
	// each key arcs from its old bucket into its new one, staggered one entry at a
	// time, so the lesson — resize re-places entries individually, it does not copy
	// slots — is visible. Keys that shared a bucket visibly split apart.
	useLayoutEffect(() => {
		const table = tableRef.current;
		if (!table || !isResize) return;

		// Only animate on the actual crossing into the resize scene, not on every
		// re-render that is already resized (e.g. scrolling within scene 4+).
		if (wasResizeRef.current) return;
		wasResizeRef.current = true;

		const savedState = smallTableStateRef.current;
		const ctx = ctxRef.current;
		if (!savedState || !ctx) return;

		// Honor the generator's per-entry pacing: each key departs a beat after the
		// previous, so only one entry is meaningfully in flight at a time.
		const order = STAGE_KEYS.filter(key => cellRefs.current.has(key));
		const stepDelay = reducedMotion ? 0.05 : 0.16;

		ctx.add(() => {
			order.forEach((key, i) => {
				const cell = cellRefs.current.get(key);
				if (!cell) return;
				// Match the recorded old position by data-flip-id (= the entry key).
				const oldEl = savedState.idLookup ? savedState.idLookup[key] : null;
				const oldBounds = oldEl?.bounds || null;
				if (!oldBounds) return;
				const newBounds = cell.getBoundingClientRect();
				const dx = oldBounds.left - newBounds.left;
				const dy = oldBounds.top - newBounds.top;
				const delay = i * stepDelay;

				// A cell that changes bucket is a freshly-mounted node, so the CSS
				// .cell entrance keyframe would fire and, being an animation, win
				// over GSAP's inline transform. Suppress it inline (pre-paint, in a
				// layout effect) so the arc owns the move; restore it on land.
				cell.style.animation = 'none';
				const restore = () => {
					cell.style.animation = '';
				};

				if (reducedMotion) {
					// Keep the one-at-a-time sequence (the lesson) but collapse each
					// arc to a short straight settle.
					gsap.fromTo(
						cell,
						{ x: dx * 0.18, y: dy * 0.18, autoAlpha: 0.55 },
						{
							x: 0,
							y: 0,
							autoAlpha: 1,
							duration: 0.16,
							delay,
							ease: 'power1.inOut',
							overwrite: 'auto',
							clearProps: 'transform,opacity',
							onComplete: restore,
							onInterrupt: restore,
						}
					);
					return;
				}

				const arcLift = Math.min(46, 18 + Math.abs(dy) * 0.18);
				gsap.fromTo(
					cell,
					{ x: dx, y: dy },
					{
						duration: 0.55,
						delay,
						ease: 'power3.inOut',
						overwrite: 'auto',
						clearProps: 'transform',
						onComplete: restore,
						onInterrupt: restore,
						motionPath: {
							path: [
								{ x: dx, y: dy },
								{ x: dx / 2, y: dy / 2 - arcLift },
								{ x: 0, y: 0 },
							],
							curviness: 1,
						},
					}
				);
			});
		});
	}, [isResize, reducedMotion]);

	// Scene-aware key: only the states this scene actually paints. Hue is never
	// the sole signal: the collision bucket also carries a solid warning border,
	// so it reads apart from the accent probe on a colour-blind canvas.
	const legend = (() => {
		switch (activeScene) {
			// 0 hash: just the probed bucket the key lands in.
			case 0:
				return [{ swatch: SW_PROBED, label: 'probed bucket', aria: 'accent' }];
			// 1 collision: the probe plus the bucket a second key clashes into.
			case 1:
				return [
					{ swatch: SW_PROBED, label: 'probed bucket', aria: 'accent' },
					{ swatch: SW_COLLISION, label: 'collision (bordered)', aria: 'amber' },
				];
			// 2 chaining: the clash chains, so only the collision bucket stays lit.
			case 2:
				return [
					{ swatch: SW_COLLISION, label: 'collision (bordered)', aria: 'amber' },
				];
			// 3 load / 4 resize: the gauge fill, accent until it overloads.
			case 3:
			default:
				return [
					overloaded
						? { swatch: SW_OVERLOADED, label: 'load α > 0.75', aria: 'amber' }
						: { swatch: SW_FILL, label: 'load α', aria: 'accent' },
				];
		}
	})();

	// Per-scene narration for screen readers — the honest WHY the table paints at
	// this scene, including the load factor the gauge shows once it appears.
	const sceneNarration = (() => {
		switch (activeScene) {
			case 0:
				return `Key ${FOCUS_KEY} hashes into bucket ${spotlightBucket} of ${capacity}.`;
			case 1:
				return `A second key collides into bucket ${COLLISION_BUCKET} — same index, different key.`;
			case 2:
				return 'Collisions chain: each bucket holds a list, so the full table fills in.';
			case 3:
				return `Load factor α = ${loadFactor.toFixed(2)} — ${
					overloaded
						? 'above 0.75, time to resize'
						: 'healthy, chains stay short'
				}.`;
			default:
				return `Resizing to ${capacity} buckets: every entry rehashes into the larger table one at a time.`;
		}
	})();

	return (
		<>
			{/* Per-scene narration for screen readers, OUTSIDE the role=img figure
			    below (whose bucket table collapses into one static label). */}
			<SceneNarration>{sceneNarration}</SceneNarration>
			<div
				className={styles.wrap}
				data-scene={activeScene}
				role="img"
				aria-label="Hash map bucket table visualization"
			>
				<div className={styles.notation} aria-hidden="true">
					α = {entryCount}/{capacity} = {loadFactor.toFixed(2)} · m = {capacity}
				</div>

				{/* Stable key (NOT key={capacity}) so the table is reconciled, not
			    remounted, across the resize — Flip needs the same DOM nodes on
			    both sides of the scene jump to arc each entry to its new bucket. */}
				<div
					ref={tableRef}
					className={`${styles.table} ${isResize ? styles.tableResize : ''}`}
					key="bucket-table"
				>
					{buckets.map((bucket, idx) => {
						const isSpotlight = spotlightBucket === idx && activeScene <= 1;
						const isCollisionBucket =
							!isResize && idx === COLLISION_BUCKET && collisionActive;
						return (
							<div
								key={idx}
								className={`${styles.bucket} ${
									isSpotlight ? styles.bucketSpotlight : ''
								} ${isCollisionBucket ? styles.bucketCollision : ''}`}
								style={{ '--row': idx }}
							>
								<span className={styles.bucketIndex}>{idx}</span>
								<div className={styles.chain}>
									{bucket.length === 0 ? (
										<span className={styles.empty}>·</span>
									) : (
										bucket.map((entry, j) => {
											const isCollider =
												!isResize &&
												idx === COLLISION_BUCKET &&
												COLLISION_KEYS.includes(entry.key);
											return (
												<div
													key={entry.key}
													ref={el => registerCell(entry.key, el)}
													data-flip-id={entry.key}
													className={`${styles.cell} ${
														isCollider && collisionActive
															? styles.cellCollide
															: ''
													}`}
													style={{ '--chain-pos': j }}
												>
													<span className={styles.cellKey}>{entry.key}</span>
												</div>
											);
										})
									)}
								</div>
							</div>
						);
					})}
				</div>

				{showGauge && (
					<div
						className={`${styles.gauge} ${overloaded ? styles.gaugeWarn : ''}`}
					>
						<div className={styles.gaugeHead}>
							<span className={styles.gaugeLabel}>load factor α</span>
							<span className={styles.gaugeValue}>{loadFactor.toFixed(2)}</span>
						</div>
						<div className={styles.gaugeTrack}>
							<div
								className={styles.gaugeFill}
								style={{ '--pct': `${loadPct}%` }}
							/>
							<div className={styles.gaugeThreshold} aria-hidden="true" />
						</div>
						<span className={styles.gaugeNote}>
							{overloaded
								? 'above 0.75 — time to resize'
								: 'healthy — chains stay short'}
						</span>
					</div>
				)}

				<StateLegend items={legend} />
			</div>
		</>
	);
};

export default HashMapStage;
