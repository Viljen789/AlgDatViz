import { useMemo } from 'react';
import styles from './HeapSortView.module.css';

const HeapSortView = ({
	array,
	currentFrame,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
}) => {
	const {
		heapArray,
		phase,
		heapSize,
		maxElement,
		parentIndex,
		leftChild,
		rightChild,
	} = currentFrame.metadata || {};
	const getValue = item => {
		return item && typeof item === 'object' && 'value' in item
			? item.value
			: item;
	};

	const heapTree = useMemo(() => {
		if (!heapArray) return [];

		const tree = [];
		const size = heapSize || heapArray.length;

		for (let i = 0; i < size; i++) {
			const level = Math.floor(Math.log2(i + 1));
			const positionInLevel = i - (Math.pow(2, level) - 1);

			tree.push({
				index: i,
				value: heapArray[i],
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
	}, [heapArray, heapSize, comparingIndices, swappingIndices, maxElement]);

	const treeLevels = useMemo(() => {
		const levels = {};
		heapTree.forEach(node => {
			if (!levels[node.level]) levels[node.level] = [];
			levels[node.level].push(node);
		});
		return Object.values(levels);
	}, [heapTree]);

	return (
		<div className={styles.heapSortContainer}>
			<div className={styles.phaseIndicator}>
				Phase:{' '}
				{phase === 'building'
					? 'Building Max Heap'
					: phase === 'extracting'
						? 'Extracting Max'
						: phase === 'heapifying'
							? 'Heapifying'
							: 'Completed'}
				{heapSize && (
					<span className={styles.heapInfo}>(Heap Size: {heapSize})</span>
				)}
			</div>

			<div className={styles.arraySection}>
				<h4>Array Representation</h4>
				<div className={styles.arrayContainer}>
					{array.map((item, index) => (
						<div
							key={item.id}
							className={`${styles.arrayElement}
                ${comparingIndices.includes(index) ? styles.comparing : ''}
                ${swappingIndices.includes(index) ? styles.swapping : ''}
                ${sortedIndices.includes(index) ? styles.sorted : ''}
                ${index === maxElement ? styles.maxElement : ''}
                ${index >= (heapSize || array.length) ? styles.notInHeap : ''}`}
						>
							<span className={styles.elementValue}>{getValue(item)}</span>
							<span className={styles.elementIndex}>{index}</span>
						</div>
					))}
				</div>
			</div>

			{(parentIndex !== undefined ||
				leftChild !== undefined ||
				rightChild !== undefined) && (
				<div className={styles.operationSection}>
					<h4>Current Operation</h4>
					<div className={styles.operationDetails}>
						{parentIndex !== undefined && (
							<div className={styles.operationDetail}>
								<strong>Parent:</strong> {getValue(heapArray[parentIndex])}{' '}
								(index {parentIndex}) {/* ✅ Fixed */}
							</div>
						)}
						{leftChild !== undefined && leftChild < heapSize && (
							<div className={styles.operationDetail}>
								<strong>Left Child:</strong> {getValue(heapArray[leftChild])}{' '}
								(index {leftChild}) {/* ✅ Fixed */}
							</div>
						)}
						{rightChild !== undefined && rightChild < heapSize && (
							<div className={styles.operationDetail}>
								<strong>Right Child:</strong> {getValue(heapArray[rightChild])}{' '}
								(index {rightChild}) {/* ✅ Fixed */}
							</div>
						)}
					</div>
				</div>
			)}

			<div className={styles.treeSection}>
				<h4>Heap Tree Structure</h4>
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
					<h4>Sorted Elements (from largest to smallest)</h4>
					<div className={styles.sortedContainer}>
						{sortedIndices
							.map(index => (
								<div key={index} className={styles.sortedElement}>
									{getValue(array[index])}
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
