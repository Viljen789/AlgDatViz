import { useMemo } from 'react';
import styles from './CountingSortView.module.css';

const CountingSortView = ({
	array = [],
	currentFrame = null,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
}) => {
	const frame =
		currentFrame && typeof currentFrame === 'object' ? currentFrame : null;
	const metadata = frame?.metadata || {};
	const {
		countArray,
		activeSlot,
		activeValue,
		outputIndex,
		phase = 'ready',
	} = metadata;
	const values = useMemo(() => {
		const source = frame?.array || array || [];
		return source.map((item, index) => ({
			id:
				item && typeof item === 'object' && 'id' in item
					? item.id
					: `counting-value-${index}-${item?.value ?? item}`,
			value:
				item && typeof item === 'object' && 'value' in item ? item.value : item,
		}));
	}, [array, frame]);

	const observedMax = values.length
		? Math.max(...values.map(item => item.value))
		: 0;
	const max = metadata.max ?? observedMax;
	const k = metadata.k ?? metadata.rangeSize ?? (values.length ? max + 1 : 0);
	const usedValues =
		metadata.usedValues ?? new Set(values.map(item => item.value)).size;
	const unusedSlots = metadata.unusedSlots ?? Math.max(k - usedValues, 0);
	const density = metadata.density ?? (k > 0 ? usedValues / k : 1);
	const costTone =
		k > Math.max(values.length * 4, 12)
			? 'range dominates'
			: k > values.length * 2
				? 'range is noticeable'
				: 'compact range';

	const frequencyBars = useMemo(() => {
		if (!k) return [];
		const counts = countArray || new Array(k).fill(0);
		const peak = Math.max(...counts, 1);
		return Array.from({ length: k }, (_, index) => ({
			value: index,
			count: counts[index] || 0,
			height: Math.max(((counts[index] || 0) / peak) * 72, 5),
			isActive: activeSlot === index,
		}));
	}, [activeSlot, countArray, k]);

	const phaseLabel =
		phase === 'counting'
			? 'Count frequencies'
			: phase === 'reconstructing'
				? 'Replay counts'
				: phase === 'completed'
					? 'Complete'
					: 'Ready';

	const narration =
		phase === 'counting' && activeValue !== undefined
			? `Value ${activeValue} increments count[${activeSlot}].`
			: phase === 'reconstructing' && activeValue !== undefined
				? `count[${activeSlot}] writes ${activeValue} into output index ${outputIndex}.`
				: phase === 'completed'
					? 'Every count has been replayed from low value to high value.'
					: 'Start a run to see each value become an index in the count table.';

	return (
		<div className={styles.countingSortContainer}>
			<div className={styles.phaseIndicator}>
				<span className={styles.phaseLabel}>{phaseLabel}</span>
				<span className={styles.phaseNarration}>{narration}</span>
			</div>

			<div className={styles.costStrip} aria-label="Counting sort cost">
				<div>
					<span>n</span>
					<strong>{values.length}</strong>
				</div>
				<div className={k > values.length * 3 ? styles.costWarn : ''}>
					<span>k</span>
					<strong>{k}</strong>
				</div>
				<div>
					<span>empty slots</span>
					<strong>{unusedSlots}</strong>
				</div>
				<p>
					O(n + k): {costTone}. Table density {(density * 100).toFixed(0)}%.
				</p>
			</div>

			<div className={styles.arraySection}>
				<h3 className={styles.sectionTitle}>Input and output array</h3>
				<div className={styles.arrayContainer}>
					{values.map((item, index) => (
						<div
							key={item.id}
							className={`${styles.arrayElement}
                ${comparingIndices.includes(index) ? styles.comparing : ''}
                ${swappingIndices.includes(index) ? styles.placing : ''}
                ${sortedIndices.includes(index) ? styles.sorted : ''}`}
						>
							{item.value}
						</div>
					))}
				</div>
			</div>

			<div className={styles.histogramSection}>
				<h3 className={styles.sectionTitle}>
					Count table, one slot per possible value
				</h3>
				<div className={styles.histogramWrap}>
					<div
						className={styles.histogram}
						style={{ '--count-slots': frequencyBars.length || 1 }}
					>
						{frequencyBars.map(({ value, count, height, isActive }) => (
							<div
								key={value}
								className={`${styles.histogramBar} ${
									isActive ? styles.activeSlot : ''
								}`}
							>
								<div className={styles.bar} style={{ height: `${height}px` }}>
									<span className={styles.count}>{count}</span>
								</div>
								<div className={styles.value}>{value}</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default CountingSortView;
