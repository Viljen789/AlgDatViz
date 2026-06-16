import { useMemo } from 'react';
import styles from './HeapSortView.module.css';

const getValue = item => {
	return item && typeof item === 'object' && 'value' in item
		? item.value
		: item;
};

const HeapSortView = ({
	array = [],
	currentFrame = null,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
}) => {
	const frame =
		currentFrame && typeof currentFrame === 'object' ? currentFrame : null;
	const {
		heapArray,
		phase = 'ready',
		heapSize,
		maxElement,
		parentIndex,
		leftChild,
		rightChild,
	} = frame?.metadata || {};

	const values = useMemo(() => {
		const source = frame?.array || array || [];
		return source.map((item, index) => ({
			id:
				item && typeof item === 'object' && 'id' in item
					? item.id
					: `heap-value-${index}-${getValue(item)}`,
			value: getValue(item),
		}));
	}, [array, frame]);

	const safeHeapArray = heapArray || values.map(item => item.value);
	const activeHeapSize = heapSize ?? safeHeapArray.length;

	const heapTree = useMemo(() => {
		if (!safeHeapArray.length) return [];

		const tree = [];
		const size = activeHeapSize;

		for (let i = 0; i < size; i++) {
			const level = Math.floor(Math.log2(i + 1));
			const positionInLevel = i - (Math.pow(2, level) - 1);

			tree.push({
				index: i,
				value: safeHeapArray[i],
				level: level,
				position: positionInLevel,
				parent: i === 0 ? null : Math.floor((i - 1) / 2),
				leftChild: 2 * i + 1 < size ? 2 * i + 1 : null,
				rightChild: 2 * i + 2 < size ? 2 * i + 2 : null,
				isComparing: comparingIndices.includes(i),
				isSwapping: swappingIndices.includes(i),
				isRoot: i === 0,
				isMax: i === maxElement,
			});
		}

		return tree;
	}, [
		activeHeapSize,
		comparingIndices,
		maxElement,
		safeHeapArray,
		swappingIndices,
	]);

	const treeLevels = useMemo(() => {
		const levels = {};
		heapTree.forEach(node => {
			if (!levels[node.level]) levels[node.level] = [];
			levels[node.level].push(node);
		});
		return Object.values(levels);
	}, [heapTree]);

	const phaseLabel =
		phase === 'building'
			? 'Build max heap'
			: phase === 'extracting'
				? 'Extract max'
				: phase === 'heapifying'
					? 'Restore heap'
					: phase === 'completed'
						? 'Complete'
						: 'Ready';

	const narration =
		phase === 'building'
			? 'Parents are compared with children until the largest value rises to the root.'
			: phase === 'extracting'
				? 'The root is the largest remaining value and moves into the sorted tail.'
				: phase === 'heapifying'
					? 'The displaced value moves down until every parent is at least as large as its children.'
					: phase === 'completed'
						? 'The heap is empty because every maximum has been extracted.'
						: 'Start a run to see the array interpreted as a binary heap.';

	return (
		<div className={styles.heapSortContainer}>
			<div className={styles.phaseIndicator}>
				<span className={styles.phaseLabel}>{phaseLabel}</span>
				<span className={styles.phaseNarration}>{narration}</span>
				<span className={styles.heapInfo}>heap size {activeHeapSize}</span>
			</div>

			<div className={styles.arraySection}>
				<h3 className={styles.sectionTitle}>Array representation</h3>
				<div className={styles.arrayContainer}>
					{values.map((item, index) => (
						<div
							key={item.id}
							className={`${styles.arrayElement}
                ${comparingIndices.includes(index) ? styles.comparing : ''}
                ${swappingIndices.includes(index) ? styles.swapping : ''}
                ${sortedIndices.includes(index) ? styles.sorted : ''}
                ${index === maxElement ? styles.maxElement : ''}
                ${index >= activeHeapSize ? styles.notInHeap : ''}`}
						>
							<span className={styles.elementValue}>{item.value}</span>
							<span className={styles.elementIndex}>{index}</span>
						</div>
					))}
				</div>
			</div>

			{(parentIndex !== undefined ||
				leftChild !== undefined ||
				rightChild !== undefined) && (
				<div className={styles.operationSection}>
					<h3 className={styles.sectionTitle}>Current heap check</h3>
					<div className={styles.operationDetails}>
						{parentIndex !== undefined && (
							<div className={styles.operationDetail}>
								<strong>Parent</strong>
								<span>{getValue(safeHeapArray[parentIndex])}</span>
								<small>index {parentIndex}</small>
							</div>
						)}
						{leftChild !== undefined && leftChild < activeHeapSize && (
							<div className={styles.operationDetail}>
								<strong>Left child</strong>
								<span>{getValue(safeHeapArray[leftChild])}</span>
								<small>index {leftChild}</small>
							</div>
						)}
						{rightChild !== undefined && rightChild < activeHeapSize && (
							<div className={styles.operationDetail}>
								<strong>Right child</strong>
								<span>{getValue(safeHeapArray[rightChild])}</span>
								<small>index {rightChild}</small>
							</div>
						)}
					</div>
				</div>
			)}

			<div className={styles.treeSection}>
				<h3 className={styles.sectionTitle}>Heap tree structure</h3>
				<div className={styles.treeContainer}>
					{treeLevels.map((level, levelIndex) => (
						<div key={levelIndex} className={styles.treeLevel}>
							{level.map(node => (
								<div
									key={node.index}
									className={`${styles.treeNode} 
										${node.isComparing ? styles.comparingNode : ''}
										${node.isSwapping ? styles.swappingNode : ''}
										${node.isRoot ? styles.rootNode : ''}
										${node.isMax ? styles.maxNode : ''}`}
									style={{
										'--level': levelIndex,
										'--position': node.position,
										'--total-at-level': level.length,
									}}
								>
									<div className={styles.nodeValue}>{node.value}</div>
									<div className={styles.nodeIndex}>{node.index}</div>

									{node.leftChild !== null && (
										<div className={styles.leftConnection}></div>
									)}
									{node.rightChild !== null && (
										<div className={styles.rightConnection}></div>
									)}
								</div>
							))}
						</div>
					))}
				</div>
			</div>

			{sortedIndices.length > 0 && (
				<div className={styles.sortedSection}>
					<h3 className={styles.sectionTitle}>Sorted tail, largest first</h3>
					<div className={styles.sortedContainer}>
						{sortedIndices
							.map(index => (
								<div key={index} className={styles.sortedElement}>
									{values[index]?.value}
								</div>
							))
							.reverse()}
					</div>
				</div>
			)}
		</div>
	);
};
export default HeapSortView;
