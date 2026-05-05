import styles from './RadixSortView.module.css';
import { useMemo } from 'react';

const placeName = exp => {
	if (exp === 1) return 'ones';
	if (exp === 10) return 'tens';
	if (exp === 100) return 'hundreds';
	if (exp === 1000) return 'thousands';
	return `${exp}s`;
};

const RadixSortView = ({
	array = [],
	currentFrame = null,
	comparingIndices = [],
	swappingIndices = [],
}) => {
	const frame =
		currentFrame && typeof currentFrame === 'object' ? currentFrame : null;
	const {
		phase = 'ready',
		exp = 1,
		buckets = [],
		currentDigit,
		currentIndex,
		activeValue,
		outputArray = [],
		destinationIndex,
		pass = 0,
		totalPasses = 0,
		maxDigits,
		placeLabel,
	} = frame?.metadata || {};

	const processedBuckets = useMemo(() => {
		return Array.from({ length: 10 }, (_, index) => ({
			index,
			elements: buckets[index] || [],
		}));
	}, [buckets]);
	const values = useMemo(() => {
		const source = frame?.array || array || [];
		return source.map((item, index) => ({
			id:
				item && typeof item === 'object' && 'id' in item
					? item.id
					: `radix-value-${index}-${item?.value ?? item}`,
			value:
				item && typeof item === 'object' && 'value' in item ? item.value : item,
		}));
	}, [array, frame]);

	const digitCount =
		maxDigits ||
		Math.max(
			1,
			...values.map(item => String(Math.max(item.value, 0)).length),
			...outputArray
				.filter(value => value !== null && value !== undefined)
				.map(value => String(Math.max(value, 0)).length)
		);
	const activePower = Math.max(0, Math.round(Math.log10(exp || 1)));
	const activeDigitPosition = digitCount - 1 - activePower;
	const passLabels = Array.from({ length: digitCount }, (_, index) => {
		const power = digitCount - 1 - index;
		const placeExp = 10 ** power;
		return {
			exp: placeExp,
			label: placeName(placeExp),
			isActive: placeExp === exp,
		};
	});

	const phaseLabel =
		phase === 'distributing'
			? 'Group by digit'
			: phase === 'collecting'
				? 'Stable collect'
				: phase === 'writing'
					? 'Write pass result'
					: phase === 'pass-complete'
						? 'Next digit'
						: phase === 'completed'
							? 'Complete'
							: 'Ready';

	const narration =
		phase === 'distributing' && activeValue !== undefined
			? `${activeValue} goes to digit bucket ${currentDigit} by its ${placeLabel || placeName(exp)} digit.`
			: phase === 'collecting' && activeValue !== undefined
				? `${activeValue} is placed into output index ${destinationIndex}, preserving stable order.`
				: phase === 'writing'
					? 'The stable digit order becomes the array for the next pass.'
					: phase === 'pass-complete'
						? `The ${placeLabel || placeName(exp)} pass is complete.`
						: phase === 'completed'
							? 'Every digit place has been processed from least to most significant.'
							: 'Start a run to isolate ones, tens, and hundreds as separate passes.';

	const renderNumber = (value, key, isActive) => {
		const digits = String(Math.max(value, 0))
			.padStart(digitCount, '0')
			.split('');
		return (
			<div
				key={key}
				className={`${styles.arrayElement} ${isActive ? styles.comparing : ''}`}
			>
				<span className={styles.digitGroup}>
					{digits.map((digit, digitIndex) => (
						<span
							key={`${key}-${digitIndex}`}
							className={`${styles.digitCell} ${
								digitIndex === activeDigitPosition ? styles.highlightDigit : ''
							}`}
						>
							{digit}
						</span>
					))}
				</span>
				<span className={styles.elementValue}>{value}</span>
			</div>
		);
	};

	return (
		<div className={styles.radixSortContainer}>
			<div className={styles.phaseIndicator}>
				<span className={styles.phaseLabel}>{phaseLabel}</span>
				<span className={styles.phaseNarration}>{narration}</span>
			</div>

			<div className={styles.passStrip} aria-label="Digit passes">
				{passLabels.map(item => (
					<div
						key={item.exp}
						className={`${styles.passPill} ${item.isActive ? styles.passActive : ''}`}
					>
						<span>{item.label}</span>
						<strong>{item.exp}</strong>
					</div>
				))}
				<p>
					Pass {pass || 0}/{totalPasses || digitCount}: only one digit place is
					allowed to decide order.
				</p>
			</div>

			<div className={styles.bucketsSection}>
				<h4 className={styles.sectionTitle}>Digit buckets 0-9</h4>
				<div className={styles.bucketsContainer}>
					{processedBuckets.map(({ index, elements }) => (
						<div
							key={index}
							className={`${styles.bucket} ${
								currentDigit === index && phase === 'distributing'
									? styles.activeBucket
									: ''
							}`}
						>
							<div className={styles.bucketLabel}>{index}</div>
							<div className={styles.bucketContent}>
								{elements.length === 0 ? (
									<div className={styles.emptyBucket}>-</div>
								) : (
									elements.map((value, elemIndex) => (
										<div key={elemIndex} className={styles.bucketElement}>
											{value}
										</div>
									))
								)}
							</div>
						</div>
					))}
				</div>
			</div>

			<div className={styles.arraySection}>
				<h4 className={styles.sectionTitle}>Array, active digit isolated</h4>
				<div className={styles.arrayContainer}>
					{values.map((item, index) =>
						renderNumber(
							item.value,
							item.id,
							(currentIndex === index && phase === 'distributing') ||
								comparingIndices.includes(index)
						)
					)}
				</div>
			</div>

			{outputArray.length > 0 && (
				<div className={styles.outputSection}>
					<h4 className={styles.sectionTitle}>Stable output buffer</h4>
					<div className={styles.outputContainer}>
						{outputArray.map((value, index) => (
							<div
								key={`output-${index}`}
								className={`${styles.outputSlot} ${
									destinationIndex === index || swappingIndices.includes(index)
										? styles.swapping
										: ''
								}`}
							>
								<span>{value ?? ''}</span>
								<small>{index}</small>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default RadixSortView;
