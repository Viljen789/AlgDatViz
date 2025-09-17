import React, { useMemo } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import styles from './MergeSortView.module.css';

const MergeSortView = ({ array, currentFrame, isFastMode = false }) => {
	const meta = currentFrame?.metadata || {};
	const phase = meta.phase || 'initializing';
	const currentLevel = meta.currentLevel || 0;
	const maxLevel = meta.maxLevel || 0;
	const leftHalf = meta.leftArray || [];
	const rightHalf = meta.rightArray || [];
	const mergeIndices = meta.mergeIndices || null;

	// Generate the recursive path being taken
	const recursionPath = useMemo(() => {
		if (!array || array.length === 0) return [];

		// Create levels showing the current recursive state
		const levels = [];
		const n = array.length;

		// Always show the root level
		levels[0] = [
			{
				id: '0-0-' + (n - 1),
				start: 0,
				end: n - 1,
				elements: array,
				level: 0,
				isActive: currentLevel === 0,
				isCompleted: phase === 'completed',
			},
		];

		// Build the path down to current level based on metadata
		if (phase === 'dividing' && meta.subarrays) {
			// Show the current subarray being divided
			const currentSub = meta.subarrays[0];
			if (currentSub && currentLevel > 0) {
				// Create path from root down to current level
				let start = 0,
					end = n - 1;

				for (let level = 1; level <= currentLevel; level++) {
					if (!levels[level]) levels[level] = [];

					const mid = Math.floor((start + end) / 2);

					// Add left child (the path we're following)
					levels[level].push({
						id: `${level}-${start}-${mid}`,
						start,
						end: mid,
						elements: array.slice(start, mid + 1),
						level,
						isActive: level === currentLevel,
						isCompleted: false,
					});

					// If we're not at max depth, show right child too
					if (level < maxLevel) {
						levels[level].push({
							id: `${level}-${mid + 1}-${end}`,
							start: mid + 1,
							end,
							elements: array.slice(mid + 1, end + 1),
							level,
							isActive: false,
							isCompleted: false,
						});
					}

					// Continue down the left path
					end = mid;
					if (start >= end) break;
				}
			}
		}

		if (phase === 'merging' && mergeIndices) {
			// Show the merge happening - build full tree up to merge level
			const buildMergeTree = (start, end, level) => {
				if (!levels[level]) levels[level] = [];

				const isInMergeRange =
					start >= mergeIndices[0] && end <= mergeIndices[1];
				const isMergeTarget =
					start === mergeIndices[0] && end === mergeIndices[1];

				levels[level].push({
					id: `${level}-${start}-${end}`,
					start,
					end,
					elements: array.slice(start, end + 1),
					level,
					isActive: isMergeTarget,
					isMerging: isInMergeRange,
					isCompleted: false,
				});

				if (start < end && level < maxLevel) {
					const mid = Math.floor((start + end) / 2);
					buildMergeTree(start, mid, level + 1);
					buildMergeTree(mid + 1, end, level + 1);
				}
			};

			buildMergeTree(0, n - 1, 0);
		}

		return levels.filter(level => level && level.length > 0);
	}, [array, phase, currentLevel, maxLevel, meta, mergeIndices]);

	const animationDuration = isFastMode ? 0.1 : 0.4;

	if (recursionPath.length === 0) {
		return (
			<div className={styles.mergeSortContainer}>
				<div className={styles.emptyState}>No data to visualize</div>
			</div>
		);
	}

	return (
		<div className={styles.mergeSortContainer}>
			{/* Phase indicator with more detail */}
			<div className={styles.phaseIndicator}>
				{phase === 'dividing'
					? `Dividing - Level ${currentLevel}/${maxLevel}`
					: phase === 'merging'
						? `Merging - Combining subarrays`
						: phase === 'completed'
							? 'Completed - Array is sorted!'
							: 'Initializing'}
			</div>

			{/* Recursive tree visualization */}
			<LayoutGroup>
				<div className={styles.recursionContainer}>
					{recursionPath.map((level, levelIndex) => (
						<motion.div
							key={levelIndex}
							className={styles.recursionLevel}
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: animationDuration,
								delay: levelIndex * 0.1,
							}}
						>
							<div className={styles.levelIndicator}>Level {levelIndex}</div>

							<div className={styles.nodesRow}>
								{level.map(node => (
									<motion.div
										key={node.id}
										className={`${styles.recursionNode} ${
											node.isActive ? styles.active : ''
										} ${node.isMerging ? styles.merging : ''} ${
											node.isCompleted ? styles.completed : ''
										}`}
										layout
										initial={{
											scale: 0.8,
											opacity: 0,
											y: levelIndex > 0 ? -30 : 0,
										}}
										animate={{
											scale: node.isActive ? 1.1 : 1,
											opacity: 1,
											y: 0,
										}}
										transition={{
											layout: {
												duration: animationDuration,
											},
											scale: {
												duration: animationDuration * 0.5,
											},
											y: {
												duration: animationDuration * 1.5,
												ease: 'easeOut',
											},
										}}
									>
										<div className={styles.nodeElements}>
											<AnimatePresence mode="popLayout">
												{node.elements.map((element, elemIndex) => {
													const globalIndex = node.start + elemIndex;
													const isComparing =
														currentFrame?.comparing?.includes(globalIndex);
													const isSwapping =
														currentFrame?.swapping?.includes(globalIndex);
													const isSorted =
														currentFrame?.sorted?.includes(globalIndex);

													let elementState = '';
													if (isSorted) elementState = styles.sortedElement;
													else if (isSwapping)
														elementState = styles.swappingElement;
													else if (isComparing)
														elementState = styles.comparingElement;

													return (
														<motion.span
															key={`${node.id}-${element.id || elemIndex}`}
															layoutId={element.id || `${node.id}-${elemIndex}`}
															className={`${styles.recursionElement} ${elementState}`}
															initial={{
																scale: 0.8,
																opacity: 0,
															}}
															animate={{
																scale: 1,
																opacity: 1,
															}}
															exit={{
																scale: 0.8,
																opacity: 0,
																y: phase === 'merging' ? -20 : 20,
															}}
															transition={{
																layout: {
																	duration: animationDuration,
																},
																scale: {
																	duration: animationDuration * 0.3,
																},
																y: {
																	duration: animationDuration * 0.8,
																},
															}}
														>
															{element.value || element}
														</motion.span>
													);
												})}
											</AnimatePresence>
										</div>

										<div className={styles.nodeLabel}>
											[{node.start}-{node.end}]
										</div>

										{/* Arrows showing flow direction */}
										{node.isActive && (
											<motion.div
												className={`${styles.flowArrow} ${
													phase === 'dividing'
														? styles.arrowDown
														: styles.arrowUp
												}`}
												initial={{
													opacity: 0,
													scale: 0.5,
												}}
												animate={{
													opacity: 1,
													scale: 1,
												}}
												exit={{
													opacity: 0,
													scale: 0.5,
												}}
											>
												{phase === 'dividing' ? '↓' : '↑'}
											</motion.div>
										)}
									</motion.div>
								))}
							</div>

							{/* Connection lines showing parent-child relationships */}
							{levelIndex < recursionPath.length - 1 && (
								<div className={styles.connectionLines}>
									{level.map(node => (
										<motion.div
											key={`connection-${node.id}`}
											className={styles.connectionLine}
											initial={{ scaleY: 0, opacity: 0 }}
											animate={{
												scaleY: 1,
												opacity: 0.3,
											}}
											transition={{
												duration: animationDuration,
												delay: 0.2,
											}}
										/>
									))}
								</div>
							)}
						</motion.div>
					))}
				</div>
			</LayoutGroup>

			{/* Dynamic merge status */}
			{phase === 'merging' && (leftHalf.length > 0 || rightHalf.length > 0) && (
				<motion.div
					className={styles.mergeProgress}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: animationDuration }}
				>
					<div className={styles.mergeVisualization}>
						<div className={styles.mergeGroup}>
							<span className={styles.mergeLabel}>Merging:</span>
							<div className={styles.mergeArrays}>
								<div className={styles.leftArray}>
									{leftHalf.map((value, i) => (
										<motion.span
											key={`left-${i}`}
											className={`${styles.recursionElement} ${styles.leftMerge}`}
											animate={{
												y: [0, -8, 0],
												scale: [1, 1.1, 1],
											}}
											transition={{
												duration: 1.2,
												repeat: Infinity,
												delay: i * 0.1,
											}}
										>
											{value}
										</motion.span>
									))}
								</div>

								<motion.div
									className={styles.mergeArrow}
									animate={{ x: [0, 5, 0] }}
									transition={{
										duration: 1,
										repeat: Infinity,
									}}
								>
									→
								</motion.div>

								<div className={styles.rightArray}>
									{rightHalf.map((value, i) => (
										<motion.span
											key={`right-${i}`}
											className={`${styles.recursionElement} ${styles.rightMerge}`}
											animate={{
												y: [0, -8, 0],
												scale: [1, 1.1, 1],
											}}
											transition={{
												duration: 1.2,
												repeat: Infinity,
												delay: i * 0.1 + 0.3,
											}}
										>
											{value}
										</motion.span>
									))}
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			)}
		</div>
	);
};

export default MergeSortView;
