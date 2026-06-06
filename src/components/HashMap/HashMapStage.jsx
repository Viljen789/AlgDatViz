import { useMemo } from 'react';
import {
	COLLISION_BUCKET,
	COLLISION_KEYS,
	FOCUS_KEY,
	STAGE_CAPACITY,
	STAGE_HASHES,
	STAGE_KEYS,
} from './scenes.js';
import styles from './HashMapStage.module.css';

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
	const focus = useMemo(
		() => STAGE_HASHES.find(h => h.key === FOCUS_KEY),
		[]
	);

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

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label="Hash map bucket table visualization"
		>
			<div className={styles.notation} aria-hidden="true">
				α = {entryCount}/{capacity} = {loadFactor.toFixed(2)} · m = {capacity}
			</div>

			<div
				className={`${styles.table} ${isResize ? styles.tableResize : ''}`}
				key={capacity}
			>
				{buckets.map((bucket, idx) => {
					const isSpotlight =
						spotlightBucket === idx && activeScene <= 1;
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
												className={`${styles.cell} ${
													isCollider && collisionActive
														? styles.cellCollide
														: ''
												}`}
												style={{ '--chain-pos': j }}
											>
												<span className={styles.cellKey}>
													{entry.key}
												</span>
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
		</div>
	);
};

export default HashMapStage;
