// src/components/Sorting/AlgorithmInfoPanel/Views/MergeSortExplanation.jsx
import styles from './MergeSortExplanation.module.css';

const getExplanationText = meta => {
	const { phase, operation, range, target, left, right } = meta || {};
	if (phase === 'initializing')
		return {
			title: '🚀 Starting Merge Sort',
			description:
				'All elements start at the root. We split the list recursively until each part contains only one element, then merge them back in sorted order.',
			action: 'Ready to start the division phase...',
		};
	if (phase === 'dividing' && operation === 'divide') {
		const rangeText = `[${range[0]}-${range[1]}]`;
		const leftText = `[${left[0]}-${left[1]}]`;
		const rightText = `[${right[0]}-${right[1]}]`;
		return {
			title: '📂 Dividing the List',
			description: `Splitting range ${rangeText} into two smaller parts: ${leftText} and ${rightText}.`,
			action: 'Elements flow down to their respective child nodes.',
		};
	}
	if (phase === 'merging') {
		const targetText = target ? `[${target[0]}-${target[1]}]` : '';
		const leftText = left ? `[${left[0]}-${left[1]}]` : '';
		const rightText = right ? `[${right[0]}-${right[1]}]` : '';
		if (operation === 'merge_prepare')
			return {
				title: '🔄 Preparing Merge',
				description: `Ready to merge ${leftText} and ${rightText} into the target area ${targetText}.`,
				action: 'Starting comparison and merging...',
			};
		if (operation === 'comparing') {
			const [leftVal, rightVal] = meta.comparingValues || ['?', '?'];
			return {
				title: '⚖️ Comparing Elements',
				description: `Comparing ${leftVal} from the left side with ${rightVal} from the right side.`,
				action: `The smaller value (${Math.min(leftVal, rightVal)}) will be placed in the merged result.`,
			};
		}
		if (operation?.includes('move_from')) {
			const side = operation.includes('left') ? 'left' : 'right';
			return {
				title: `⬅️ Taking from ${side}`,
				description: `Element ${meta.movedElement || '?'} from the ${side} side is smaller, and moves up to the parent node.`,
				action: `${side.charAt(0).toUpperCase() + side.slice(1)} side wins the comparison!`,
			};
		}
		if (operation?.includes('remaining'))
			return {
				title: '🏃 Moving Remaining',
				description:
					'One side is empty, so we move all remaining elements from the other side.',
				action: 'No more comparisons needed - just copying the rest!',
			};
		if (operation === 'merge_complete')
			return {
				title: '✅ Merge Complete',
				description: `Merged ${leftText} and ${rightText} into a sorted range ${targetText}.`,
				action: 'This part is now sorted! Going up the recursion tree...',
			};
	}
	if (phase === 'completed')
		return {
			title: '🎉 Sorting Complete!',
			description:
				"The entire list is now sorted using the 'divide and conquer' principle.",
			action: 'All elements are in their final, sorted positions!',
		};
	return {
		title: 'Merge Sort Visualization',
		description: "Follow the recursive 'divide and conquer' process...",
		action: '',
	};
};

const MergeSortExplanation = ({ currentFrame }) => {
	const explanation = getExplanationText(currentFrame?.metadata);
	return (
		<div className={styles.explanationPanel}>
			<h3 className={styles.explanationTitle}>{explanation.title}</h3>
			<p className={styles.explanationDescription}>{explanation.description}</p>
			{explanation.action && (
				<div className={styles.explanationAction}>{explanation.action}</div>
			)}
		</div>
	);
};

export default MergeSortExplanation;
