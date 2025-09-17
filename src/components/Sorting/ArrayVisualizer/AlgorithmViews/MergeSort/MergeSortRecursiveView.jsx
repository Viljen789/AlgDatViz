import { useCallback, useMemo } from 'react';
import styles from './MergeSortRecursiveView.module.css';

const MergeSortRecursiveView = ({
	array,
	currentFrame,
	onAnimationComplete,
	animationSpeed = 100,
	isSorting = false,
	isPaused = false,
}) => {
	// Build complete tree structure showing all recursive levels
	const treeStructure = useMemo(() => {
		if (!currentFrame || !currentFrame.array) {
			// Build initial complete tree structure
			const initialArray = array || Array.from({ length: 8 }, (_, i) => i + 1);
			// Extract values if they're objects with {id, value} structure
			const values = initialArray.map(item =>
				typeof item === 'object' ? item.value : item
			);
			return buildCompleteTree(values);
		}

		const { metadata = {}, array: stepArray = [] } = currentFrame;
		const { level = 0, left, right, target, phase, operation } = metadata;

		// Extract values from objects if needed
		const values = stepArray.map(item =>
			typeof item === 'object' ? item.value : item
		);

		// Build the complete tree and highlight current operation
		const tree = buildCompleteTree(values);

		// Mark active nodes based on current operation
		if (phase === 'dividing' && target) {
			markActiveNodes(tree, target, 'dividing', level);
		} else if (phase === 'merging' && target && left && right) {
			markActiveNodes(tree, target, operation || 'merging', level);
			markActiveNodes(tree, left, 'source_left', level + 1);
			markActiveNodes(tree, right, 'source_right', level + 1);
		}

		return tree;
	}, [currentFrame, array]);

	// Build complete binary tree structure
	function buildCompleteTree(arr) {
		const n = arr.length;
		const maxDepth = Math.ceil(Math.log2(n)) + 1;
		const tree = [];

		// Initialize all levels
		for (let depth = 0; depth < maxDepth; depth++) {
			tree.push({ nodes: [] });
		}

		// Build tree recursively
		function buildNode(start, end, depth) {
			if (start > end || depth >= maxDepth) return;

			const elements = arr.slice(start, end + 1);
			tree[depth].nodes.push({
				range: [start, end],
				elements: elements,
				state: 'idle',
				depth: depth,
				id: `${depth}-${start}-${end}`,
			});

			if (start < end) {
				const mid = Math.floor((start + end) / 2);
				buildNode(start, mid, depth + 1);
				buildNode(mid + 1, end, depth + 1);
			}
		}

		buildNode(0, n - 1, 0);
		return tree;
	}

	// Mark nodes as active based on current operation
	function markActiveNodes(tree, range, state, targetDepth) {
		tree.forEach((level, depth) => {
			level.nodes.forEach(node => {
				if (node.range[0] === range[0] && node.range[1] === range[1]) {
					node.state = state;
					node.isActive = true;
				}
			});
		});
	}

	// Generate explanation text
	const explanationText = useMemo(() => {
		if (!currentFrame) {
			return {
				title: 'Merge Sort - Complete Tree View',
				description:
					'Complete recursion tree showing all levels of divide and conquer.',
				action:
					'Start to see the sorting process across the entire tree structure.',
			};
		}

		const { metadata = {} } = currentFrame;
		const { phase, operation, level = 0 } = metadata;

		switch (phase) {
			case 'initializing':
				return {
					title: 'Tree Built - Ready to Sort',
					description:
						'Complete recursion tree ready. Each level shows array subdivisions.',
					action: 'Tree structure prepared for divide and conquer sorting.',
				};

			case 'dividing':
				return {
					title: `Dividing - Level ${level}`,
					description: `Splitting arrays at level ${level} across the tree.`,
					action: 'Breaking problem into smaller subproblems.',
				};

			case 'merging':
				switch (operation) {
					case 'merge_prepare':
						return {
							title: `Merging - Level ${level}`,
							description: `Combining sorted subarrays at level ${level}.`,
							action: 'Merging two sorted halves into larger sorted array.',
						};
					case 'comparing':
						return {
							title: 'Comparing Elements',
							description: 'Comparing elements to determine merge order.',
							action: 'Selecting smaller element for result array.',
						};
					case 'merge_complete':
						return {
							title: `Level ${level} Complete`,
							description: `Merge finished at level ${level}.`,
							action: 'Sorted subarray ready for next level.',
						};
					default:
						return {
							title: 'Merging in Progress',
							description: 'Combining sorted elements.',
							action: 'Building larger sorted arrays from smaller ones.',
						};
				}

			case 'completed':
				return {
					title: 'Sort Complete! ✓',
					description: 'Entire tree processed - array fully sorted.',
					action: 'All recursive levels completed successfully.',
				};

			default:
				return {
					title: 'Merge Sort Tree',
					description: 'Processing complete recursion structure.',
					action: 'Working...',
				};
		}
	}, [currentFrame]);

	// Handle token state for animations
	const getTokenState = useCallback((elementIndex, nodeRange, currentFrame) => {
		if (!currentFrame) return '';

		// Adjust index to global position
		const globalIndex = nodeRange[0] + elementIndex;
		const { comparing = [], swapping = [], sorted = [] } = currentFrame;

		if (sorted && sorted.includes(globalIndex)) return 'sorted';
		if (swapping && swapping.includes(globalIndex)) return 'swapping';
		if (comparing && comparing.includes(globalIndex)) return 'comparing';

		return '';
	}, []);

	if (!treeStructure.length) {
		return (
			<div className={styles.container}>
				<div className={styles.empty}>Building merge sort tree...</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			{/* Phase indicator */}
			<div className={styles.phaseIndicator}>{explanationText.title}</div>

			{/* Complete tree visualization */}
			<div className={styles.treeArea}>
				{treeStructure.map((level, levelIndex) => (
					<div key={levelIndex} className={styles.levelRow}>
						<div className={styles.levelLabel}>L{levelIndex}</div>
						<div className={styles.nodesRow}>
							{level.nodes.map((node, nodeIndex) => (
								<div
									key={node.id}
									className={`${styles.node} ${styles[node.state] || ''} ${node.isActive ? styles.active : ''}`}
								>
									<div className={styles.nodeInfo}>
										[{node.range[0]}-{node.range[1]}]
									</div>
									<div className={styles.tokens}>
										{node.elements.map((element, elementIndex) => {
											const tokenState = getTokenState(
												elementIndex,
												node.range,
												currentFrame
											);
											// Make sure we render the actual value, not the object
											const displayValue =
												typeof element === 'object' ? element.value : element;

											return (
												<div
													key={`${node.id}-${elementIndex}-${displayValue}`}
													className={`${styles.token} ${tokenState ? styles[tokenState] : ''}`}
												>
													{displayValue}
												</div>
											);
										})}
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>

			{/* Compact explanation panel */}
			<div className={styles.explanationPanel}>
				<div className={styles.explanationContent}>
					<h4 className={styles.explanationTitle}>{explanationText.title}</h4>
					<p className={styles.explanationDescription}>
						{explanationText.description}
					</p>
					<div className={styles.explanationAction}>
						{explanationText.action}
					</div>
				</div>
			</div>
		</div>
	);
};

export default MergeSortRecursiveView;
