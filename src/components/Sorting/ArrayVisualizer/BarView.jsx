import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import styles from './ArrayVisualizer.module.css';
import useReducedMotion from '../../../hooks/useReducedMotion';

// State colors come from the canonical tokens (paper-and-ink, both themes) — not
// the stale dark-indigo hex this used to hardcode, which read wrong on cream and
// never inverted. idle = muted ink; the rest are the Algorithm State Quartet.
// Resolved at runtime because GSAP's backgroundColor tween needs a concrete color.
const STATE_VARS = {
	idle: '--color-text-muted',
	active: '--state-active',
	done: '--state-done',
	flight: '--state-flight',
	special: '--state-special',
};

const resolveStateColors = () => {
	const cs = getComputedStyle(document.documentElement);
	const out = {};
	for (const key in STATE_VARS) {
		out[key] = cs.getPropertyValue(STATE_VARS[key]).trim() || 'currentColor';
	}
	return out;
};

const stateOf = (idx, comparing, swapping, sorted, special) => {
	if (sorted.includes(idx)) return 'done';
	if (special && special.includes(idx)) return 'special';
	if (swapping.includes(idx)) return 'flight';
	if (comparing.includes(idx)) return 'active';
	return 'idle';
};

const BarView = ({
	array,
	currentFrame,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
	specialIndices = [],
	isFastMode,
}) => {
	const reducedMotion = useReducedMotion();
	const barsRef = useRef([]);
	const previousValuesRef = useRef([]);
	const previousSwapKeyRef = useRef('');
	const previousCompareKeyRef = useRef('');
	const previousDoneKeyRef = useRef('');

	const values = useMemo(() => {
		if (currentFrame?.array && Array.isArray(currentFrame.array)) {
			return currentFrame.array.map(v =>
				typeof v === 'object' && v !== null ? v.value : v
			);
		}
		return (array || []).map(item =>
			typeof item === 'object' && item !== null ? item.value : item
		);
	}, [currentFrame, array]);

	const maxValue = useMemo(() => {
		if (!values.length) return 1;
		return Math.max(...values);
	}, [values]);

	useEffect(() => {
		const heightDuration = reducedMotion ? 0.18 : 0.34;
		const colorDuration = reducedMotion ? 0.1 : 0.22;
		const flightLift = reducedMotion ? 0 : -6;
		const swapKey = swappingIndices.join('-');
		const compareKey = comparingIndices.join('-');
		const doneKey = sortedIndices.join('-');
		const shouldCrossSwap =
			!reducedMotion &&
			!isFastMode &&
			swappingIndices.length === 2 &&
			swapKey !== previousSwapKeyRef.current;
		const shouldPulseCompare =
			!reducedMotion &&
			!isFastMode &&
			comparingIndices.length > 0 &&
			compareKey !== previousCompareKeyRef.current;
		const shouldPulseDone =
			!reducedMotion &&
			sortedIndices.length > 0 &&
			doneKey !== previousDoneKeyRef.current;
		const [swapA, swapB] = swappingIndices;
		const swapDistance =
			shouldCrossSwap && barsRef.current[swapA] && barsRef.current[swapB]
				? barsRef.current[swapB].offsetLeft - barsRef.current[swapA].offsetLeft
				: 0;
		// Re-read each tick so a theme toggle is picked up on the next frame.
		const stateColors = resolveStateColors();

		barsRef.current.forEach((el, idx) => {
			if (!el) return;
			const value = values[idx] ?? 0;
			const heightPct = Math.max((value / maxValue) * 100, 2);
			const previousValue = previousValuesRef.current[idx];
			const valueChanged = previousValue !== value;
			const state = stateOf(
				idx,
				comparingIndices,
				swappingIndices,
				sortedIndices,
				specialIndices
			);
			const target = stateColors[state];

			gsap.to(el, {
				height: `${heightPct}%`,
				duration: valueChanged ? heightDuration : 0.001,
				ease: 'expo.out',
				overwrite: 'auto',
			});

			gsap.to(el, {
				backgroundColor: target,
				duration: colorDuration,
				ease: 'power2.out',
				overwrite: 'auto',
			});

			if (shouldCrossSwap && (idx === swapA || idx === swapB)) {
				const fromX = idx === swapA ? swapDistance : -swapDistance;
				gsap.fromTo(
					el,
					{
						x: fromX,
						y: -10,
						scaleX: 0.86,
						transformOrigin: '50% 100%',
					},
					{
						x: 0,
						y: 0,
						scaleX: 1,
						duration: 0.48,
						ease: 'expo.out',
						overwrite: 'auto',
					}
				);
			} else if (state === 'flight' && !reducedMotion && !isFastMode) {
				gsap.fromTo(
					el,
					{ y: flightLift },
					{ y: 0, duration: 0.36, ease: 'expo.out', overwrite: 'auto' }
				);
			} else if (state === 'active' && shouldPulseCompare) {
				gsap.fromTo(
					el,
					{ scaleY: 1.06, transformOrigin: '50% 100%' },
					{
						scaleY: 1,
						duration: 0.24,
						ease: 'expo.out',
						overwrite: 'auto',
					}
				);
			} else if (state === 'done' && shouldPulseDone) {
				gsap.fromTo(
					el,
					{ filter: 'brightness(1.28)' },
					{
						filter: 'brightness(1)',
						duration: 0.42,
						ease: 'expo.out',
						overwrite: 'auto',
					}
				);
			}
		});

		previousValuesRef.current = values;
		previousSwapKeyRef.current = swapKey;
		previousCompareKeyRef.current = compareKey;
		previousDoneKeyRef.current = doneKey;
	}, [
		values,
		maxValue,
		comparingIndices,
		swappingIndices,
		sortedIndices,
		specialIndices,
		isFastMode,
		reducedMotion,
	]);

	return (
		<div className={styles.barContainer}>
			{values.map((value, index) => {
				const initialPct = Math.max((value / maxValue) * 100, 2);
				return (
					<div
						key={index}
						ref={el => (barsRef.current[index] = el)}
						className={styles.arrayBar}
						style={{
							height: `${initialPct}%`,
							backgroundColor: 'var(--color-text-muted)',
						}}
						title={`Value: ${value} · Index: ${index}`}
					/>
				);
			})}
		</div>
	);
};

export default BarView;
