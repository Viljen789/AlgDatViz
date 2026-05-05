import { useEffect, useMemo, useRef, useState } from 'react';
import {
	ArrowRight,
	ChartNoAxesColumnIncreasing,
	GitBranch,
	Play,
	Rows3,
} from 'lucide-react';
import { ALGORITHM_INFO } from '../../../utils/sorting';
import {
	ALGORITHM_META,
	ALGORITHM_ORDER,
} from '../../../utils/sorting/algorithmMeta';
import styles from './SortingScrollytelling.module.css';

const STORY = {
	bubbleSort: {
		chapter: 'Local repair',
		question: 'Can we fix disorder with only neighbor decisions?',
		intuition:
			'Bubble sort is the purest view of an inversion. It never needs a global plan; it asks whether two neighbors are wrong and repairs that one local mistake.',
		logic: [
			'Compare neighboring values from left to right.',
			'Swap when the left value is larger than the right value.',
			'After a pass, the largest remaining value has drifted into the sorted suffix.',
		],
		useWhen: 'Best for teaching inversions, adjacent swaps, and early exit.',
		figure: 'bars',
	},
	selectionSort: {
		chapter: 'Commit one slot',
		question: 'What if we minimize writes instead of comparisons?',
		intuition:
			'Selection sort treats the output as a row of fixed seats. For each seat, it searches the unsorted suffix for the smallest remaining value and places it once.',
		logic: [
			'Freeze the sorted prefix.',
			'Scan the unsorted suffix for the current minimum.',
			'Swap once, then move the boundary forward.',
		],
		useWhen: 'Useful when writes are expensive and predictability matters.',
		figure: 'scanner',
	},
	insertionSort: {
		chapter: 'Grow a hand',
		question: 'Can nearly sorted data pay less?',
		intuition:
			'Insertion sort keeps a sorted prefix, then slides each new value left until it fits. It feels fast when values are already close to home.',
		logic: [
			'Pick the next unsorted value as the key.',
			'Shift larger prefix values one step right.',
			'Drop the key into the gap that remains.',
		],
		useWhen: 'Strong for tiny, streaming, or nearly sorted inputs.',
		figure: 'insert',
	},
	mergeSort: {
		chapter: 'Divide and combine',
		question: 'Can splitting make sorting predictable?',
		intuition:
			'Merge sort makes the hard part boring. It splits until every piece is trivially sorted, then merges two already-sorted runs by watching their front values.',
		logic: [
			'Split the range into halves until every piece has one value.',
			'Compare the two front cursors of neighboring sorted runs.',
			'Copy the smaller front value into the output, then merge upward.',
		],
		useWhen: 'Great when stable, predictable O(n log n) work matters.',
		figure: 'split',
	},
	quickSort: {
		chapter: 'Pivot partition',
		question: 'Can one value divide the whole problem?',
		intuition:
			'Quick sort asks a pivot to become a wall: smaller values move left, larger values move right, and the pivot lands in its final position.',
		logic: [
			'Choose a pivot.',
			'Partition the range around that pivot.',
			'Recurse independently on the two sides.',
		],
		useWhen: 'Fast in practice when pivot choices stay balanced.',
		figure: 'pivot',
	},
	heapSort: {
		chapter: 'Priority structure',
		question: 'What if the array becomes a priority queue?',
		intuition:
			'Heap sort first reshapes the array into a max-heap. The largest value is always at the root, so each extraction locks one more value into the sorted tail.',
		logic: [
			'Build a max-heap in the array.',
			'Swap the root with the last unsorted value.',
			'Sift the new root down until the heap property is restored.',
		],
		useWhen: 'Helpful for showing guaranteed O(n log n) without extra arrays.',
		figure: 'heap',
	},
	countingSort: {
		chapter: 'Value as address',
		question: 'Can we stop comparing entirely?',
		intuition:
			'Counting sort works when values live in a small range. Each value becomes an index in a frequency table, then counts are replayed in order.',
		logic: [
			'Allocate a count table for the value range.',
			'Increment count[value] for every input item.',
			'Replay counts from low value to high value.',
		],
		useWhen: 'Excellent when k is small compared with n.',
		figure: 'counts',
	},
	radixSort: {
		chapter: 'Digit passes',
		question: 'Can stable small sorts handle wide numbers?',
		intuition:
			'Radix sort sorts by one digit position at a time. Stability is the trick: earlier digit order survives later passes.',
		logic: [
			'Group values by the ones digit.',
			'Collect groups stably.',
			'Repeat for tens, hundreds, and higher places.',
		],
		useWhen: 'Useful for fixed-width integers or strings with stable buckets.',
		figure: 'radix',
	},
	bucketSort: {
		chapter: 'Range distribution',
		question: 'Can distribution make each local sort small?',
		intuition:
			'Bucket sort bets on spread. Values fly into range buckets, each bucket is sorted locally, then buckets are concatenated in range order.',
		logic: [
			'Create buckets that cover value ranges.',
			'Distribute every value into its range bucket.',
			'Sort each bucket and concatenate from low range to high range.',
		],
		useWhen: 'Works when values distribute evenly across known ranges.',
		figure: 'buckets',
	},
};

const FIGURE_VALUES = [7, 2, 6, 3, 9, 4, 8];

const AlgorithmFigure = ({ type, name }) => {
	if (type === 'split') {
		return (
			<div className={styles.splitFigure} aria-label={`${name} split diagram`}>
				<span>7 2 6 3</span>
				<div>
					<i />
					<i />
				</div>
				<span>2 7</span>
				<span>3 6</span>
			</div>
		);
	}

	if (type === 'heap') {
		return (
			<div className={styles.heapFigure} aria-label={`${name} heap diagram`}>
				<span className={styles.heapRoot}>9</span>
				<span>7</span>
				<span>8</span>
				<span>2</span>
				<span>6</span>
				<span>3</span>
				<span>4</span>
			</div>
		);
	}

	if (type === 'counts') {
		return (
			<div className={styles.countFigure} aria-label={`${name} count table`}>
				{[0, 1, 2, 3, 4, 5].map((slot, index) => (
					<span key={slot} style={{ '--bar': [1, 3, 2, 4, 2, 1][index] }}>
						<i />
						<b>{slot}</b>
					</span>
				))}
			</div>
		);
	}

	if (type === 'radix' || type === 'buckets') {
		return (
			<div className={styles.bucketFigure} aria-label={`${name} bucket diagram`}>
				{['0-2', '3-5', '6-8', '9'].map((bucket, index) => (
					<span key={bucket}>
						<b>{type === 'radix' ? index : bucket}</b>
						<i style={{ '--height': `${34 + index * 13}px` }} />
					</span>
				))}
			</div>
		);
	}

	if (type === 'pivot') {
		return (
			<div className={styles.pivotFigure} aria-label={`${name} pivot diagram`}>
				{FIGURE_VALUES.map(value => (
					<span key={value} className={value === 6 ? styles.pivotValue : ''}>
						{value}
					</span>
				))}
			</div>
		);
	}

	return (
		<div className={styles.barFigure} aria-label={`${name} bar diagram`}>
			{FIGURE_VALUES.map((value, index) => (
				<span
					key={`${value}-${index}`}
					className={
						type === 'scanner' && index === 1
							? styles.scanBar
							: type === 'insert' && index === 3
								? styles.insertBar
								: ''
					}
					style={{ '--height': `${value * 10}px` }}
				/>
			))}
		</div>
	);
};

const SortingScrollytelling = ({ onOpenPlayground }) => {
	const [activeAlgorithm, setActiveAlgorithm] = useState('bubbleSort');
	const scrollerRef = useRef(null);
	const storyStartRef = useRef(null);
	const sectionRefs = useRef({});

	const activeStory = STORY[activeAlgorithm];
	const activeInfo = ALGORITHM_INFO[activeAlgorithm];
	const activeMeta = ALGORITHM_META[activeAlgorithm] || {};
	const activeIndex = Math.max(ALGORITHM_ORDER.indexOf(activeAlgorithm), 0);
	const storyProgress =
		ALGORITHM_ORDER.length > 1 ? activeIndex / (ALGORITHM_ORDER.length - 1) : 0;

	const groupedAlgorithms = useMemo(
		() => [
			{
				label: 'Compare and swap',
				items: ['bubbleSort', 'selectionSort', 'insertionSort'],
			},
			{
				label: 'Divide or structure',
				items: ['mergeSort', 'quickSort', 'heapSort'],
			},
			{
				label: 'Distribution',
				items: ['countingSort', 'radixSort', 'bucketSort'],
			},
		],
		[]
	);
	const activeGroup = groupedAlgorithms.find(group =>
		group.items.includes(activeAlgorithm)
	);

	useEffect(() => {
		const root = scrollerRef.current;
		if (!root) return undefined;

		const observer = new IntersectionObserver(
			entries => {
				const visible = entries
					.filter(entry => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
				const next = visible?.target?.dataset?.algorithm;
				if (next) setActiveAlgorithm(next);
			},
			{
				root,
				threshold: [0.28, 0.48, 0.68],
				rootMargin: '-22% 0px -34% 0px',
			}
		);

		Object.values(sectionRefs.current).forEach(node => {
			if (node) observer.observe(node);
		});

		return () => observer.disconnect();
	}, []);

	const handleJump = key => {
		setActiveAlgorithm(key);
		sectionRefs.current[key]?.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		});
	};

	const handleStartStory = () => {
		storyStartRef.current?.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		});
	};

	return (
		<div
			className={styles.storyShell}
			ref={scrollerRef}
			style={{ '--story-progress': storyProgress }}
		>
			<nav className={styles.modeBar} aria-label="Sorting modes">
				<button type="button" className={styles.modeActive}>
					Story
				</button>
				<button
					type="button"
					className={styles.modeButton}
					onClick={() => onOpenPlayground(activeAlgorithm)}
				>
					Playground
				</button>
			</nav>

			<header className={styles.hero}>
				<div className={styles.heroCopy}>
					<span className={styles.eyebrow}>Sorting scrollytelling</span>
					<h1>Scroll through the decisions that make sorting work.</h1>
					<p>
						Each algorithm gets one stage cue: what it asks, what moves, and
						when its promise breaks. The playground stays close when you want
						to test the idea.
					</p>
					<div className={styles.heroActions}>
						<button
							type="button"
							className={styles.primaryButton}
							onClick={handleStartStory}
						>
							<Play size={15} strokeWidth={2} fill="currentColor" />
							Start story
						</button>
						<button
							type="button"
							className={styles.secondaryButton}
							onClick={() => onOpenPlayground(activeAlgorithm)}
						>
							Open playground
						</button>
					</div>
				</div>

				<div className={styles.heroStage} aria-label="Sorting story preview">
					<div className={styles.heroStageTop}>
						<span>Decision trace</span>
						<b>{ALGORITHM_ORDER.length} algorithms</b>
					</div>
					<div className={styles.heroBars} aria-hidden="true">
						{FIGURE_VALUES.map((value, index) => (
							<span key={`${value}-${index}`} style={{ '--height': `${value * 13}px` }} />
						))}
					</div>
					<ol className={styles.heroSequence}>
						<li>
							<span>Compare</span>
							<i />
						</li>
						<li>
							<span>Move</span>
							<i />
						</li>
						<li>
							<span>Lock</span>
						</li>
					</ol>
				</div>
			</header>

			<section
				id="algorithm-story"
				ref={storyStartRef}
				className={styles.scrollySection}
			>
				<aside className={styles.pinnedStage} aria-live="polite">
					<div className={styles.stageHeader}>
						<span className={styles.eyebrow}>On stage</span>
						<div className={styles.stageCount}>
							<b>{String(activeIndex + 1).padStart(2, '0')}</b>
							<span>/{String(ALGORITHM_ORDER.length).padStart(2, '0')}</span>
						</div>
					</div>

					<div className={styles.stageTitleRow}>
						<div>
							<h2>{activeInfo?.name}</h2>
							<p>{activeStory.question}</p>
						</div>
						<span>{activeGroup?.label}</span>
					</div>

					<div className={styles.stageFigure}>
						<AlgorithmFigure
							key={activeAlgorithm}
							type={activeStory.figure}
							name={activeInfo?.name || activeAlgorithm}
						/>
					</div>

					<p className={styles.stageCaption}>{activeMeta.oneLine}</p>

					<div className={styles.stageMeta}>
						<div>
							<ChartNoAxesColumnIncreasing size={16} strokeWidth={1.8} />
							<span>{activeMeta.complexity}</span>
						</div>
						<div>
							<GitBranch size={16} strokeWidth={1.8} />
							<span>{activeMeta.showcase?.tag}</span>
						</div>
						<div>
							<Rows3 size={16} strokeWidth={1.8} />
							<span>{activeMeta.motionPhrase}</span>
						</div>
					</div>

					<div className={styles.watchList}>
						<span>Watch for</span>
						{activeMeta.showcase?.watch?.map(item => (
							<b key={item}>{item}</b>
						))}
					</div>

					<div className={styles.stageRail} aria-label="Jump to algorithm">
						{ALGORITHM_ORDER.map((key, index) => (
							<button
								key={key}
								type="button"
								className={activeAlgorithm === key ? styles.railActive : ''}
								onClick={() => handleJump(key)}
								aria-label={`Jump to ${ALGORITHM_INFO[key]?.name}`}
							>
								<span>{String(index + 1).padStart(2, '0')}</span>
								{ALGORITHM_INFO[key]?.name}
							</button>
						))}
					</div>

					<button
						type="button"
						className={styles.showcaseButton}
						onClick={() => onOpenPlayground(activeAlgorithm)}
					>
						Open this algorithm
						<ArrowRight size={14} strokeWidth={2} />
					</button>
				</aside>

				<div className={styles.narrativeRail}>
					<div className={styles.progressTrack} aria-hidden="true">
						<i />
					</div>
					{ALGORITHM_ORDER.map((key, index) => {
						const story = STORY[key];
						const info = ALGORITHM_INFO[key];
						const meta = ALGORITHM_META[key] || {};
						const isActive = activeAlgorithm === key;
						return (
							<section
								key={key}
								ref={node => {
									sectionRefs.current[key] = node;
								}}
								data-algorithm={key}
								className={`${styles.narrativeStep} ${
									isActive ? styles.narrativeStepActive : ''
								}`}
							>
								<span className={styles.stepNumber}>
									{String(index + 1).padStart(2, '0')}
								</span>
								<span className={styles.stepKicker}>{story.chapter}</span>
								<h2>{info?.name}</h2>
								<p className={styles.stepQuestion}>{story.question}</p>
								<p>{story.intuition}</p>

								<div className={styles.logicBlock}>
									<strong>Decision rule</strong>
									<ol>
										{story.logic.map(item => (
											<li key={item}>{item}</li>
										))}
									</ol>
								</div>

								<div className={styles.stepFooter}>
									<div>
										<span>{meta.complexity}</span>
										<p>{story.useWhen}</p>
									</div>
									<button
										type="button"
										onClick={() => onOpenPlayground(key)}
									>
										Try in playground
										<ArrowRight size={14} strokeWidth={2} />
									</button>
								</div>
							</section>
						);
					})}
				</div>
			</section>
		</div>
	);
};

export default SortingScrollytelling;
