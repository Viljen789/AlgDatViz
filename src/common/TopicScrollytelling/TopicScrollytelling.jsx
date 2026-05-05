import { useEffect, useRef, useState } from 'react';
import {
	ArrowRight,
	BookOpen,
	Boxes,
	CircleDot,
	GitBranch,
	Grid3x3,
	Hash,
	ListChecks,
	Network,
	Play,
	Route,
	Sigma,
} from 'lucide-react';
import styles from './TopicScrollytelling.module.css';

const ICONS = {
	book: BookOpen,
	bars: ListChecks,
	boxes: Boxes,
	circle: CircleDot,
	graph: Network,
	grid: Grid3x3,
	hash: Hash,
	list: ListChecks,
	route: Route,
	sigma: Sigma,
	table: Grid3x3,
	tree: GitBranch,
};

const VALUES = [4, 8, 3, 7, 5, 9, 2];

const TopicFigure = ({ type = 'bars', accent }) => {
	if (type === 'graph') {
		return (
			<div className={styles.graphFigure} style={{ '--accent': accent }}>
				<span>A</span>
				<span>B</span>
				<span>C</span>
				<span>D</span>
				<i />
				<i />
				<i />
			</div>
		);
	}

	if (type === 'hash') {
		return (
			<div className={styles.hashFigure} style={{ '--accent': accent }}>
				{['0', '1', '2', '3', '4'].map((bucket, index) => (
					<span key={bucket}>
						<b>{bucket}</b>
						<i>{index === 2 ? 'cat -> tea' : index === 4 ? 'dog' : 'null'}</i>
					</span>
				))}
			</div>
		);
	}

	if (type === 'queue') {
		return (
			<div className={styles.queueFigure} style={{ '--accent': accent }}>
				<span>front</span>
				{['A', 'B', 'C', 'D'].map(item => (
					<b key={item}>{item}</b>
				))}
				<span>rear</span>
			</div>
		);
	}

	if (type === 'stack') {
		return (
			<div className={styles.stackFigure} style={{ '--accent': accent }}>
				{['top', 'D', 'C', 'B', 'A'].map(item => (
					<span key={item}>{item}</span>
				))}
			</div>
		);
	}

	if (type === 'tree') {
		return (
			<div className={styles.treeFigure} style={{ '--accent': accent }}>
				<span>42</span>
				<span>23</span>
				<span>61</span>
				<span>12</span>
				<span>31</span>
				<span>54</span>
				<span>72</span>
			</div>
		);
	}

	if (type === 'table') {
		return (
			<div className={styles.tableFigure} style={{ '--accent': accent }}>
				{Array.from({ length: 12 }, (_, index) => (
					<span key={index} className={index % 4 === 0 ? styles.tableHot : ''}>
						{index}
					</span>
				))}
			</div>
		);
	}

	if (type === 'recurrence') {
		return (
			<div className={styles.recurrenceFigure} style={{ '--accent': accent }}>
				<span>T(n)</span>
				<i />
				<div>
					<b>T(n/b)</b>
					<b>T(n/b)</b>
					<b>T(n/b)</b>
				</div>
				<em>compare leaves vs combine work</em>
			</div>
		);
	}

	return (
		<div className={styles.barFigure} style={{ '--accent': accent }}>
			{VALUES.map((value, index) => (
				<span key={`${value}-${index}`} style={{ '--height': `${value * 16}px` }} />
			))}
		</div>
	);
};

const TopicScrollytelling = ({ topic, onOpenPlayground }) => {
	const [activeIndex, setActiveIndex] = useState(0);
	const scrollerRef = useRef(null);
	const storyStartRef = useRef(null);
	const sectionRefs = useRef([]);
	const activeChapter = topic.chapters[activeIndex] || topic.chapters[0];
	const ActiveIcon = ICONS[activeChapter?.icon] || ICONS.book;
	const storyProgress =
		topic.chapters.length > 1 ? activeIndex / (topic.chapters.length - 1) : 0;

	useEffect(() => {
		const root = scrollerRef.current;
		if (!root) return undefined;
		const observer = new IntersectionObserver(
			entries => {
				const visible = entries
					.filter(entry => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
				const next = Number(visible?.target?.dataset?.index);
				if (Number.isFinite(next)) setActiveIndex(next);
			},
			{
				root,
				threshold: [0.36, 0.55, 0.72],
				rootMargin: '-16% 0px -38% 0px',
			}
		);
		sectionRefs.current.forEach(node => node && observer.observe(node));
		return () => observer.disconnect();
	}, []);

	const jumpTo = index => {
		setActiveIndex(index);
		sectionRefs.current[index]?.scrollIntoView({
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
			ref={scrollerRef}
			className={styles.shell}
			style={{
				'--topic-accent': topic.accent,
				'--story-progress': storyProgress,
			}}
		>
			<nav className={styles.modeBar} aria-label={`${topic.title} modes`}>
				<button type="button" className={styles.modeActive}>
					Story
				</button>
				<button
					type="button"
					className={styles.modeButton}
					onClick={() => onOpenPlayground?.()}
				>
					Playground
				</button>
			</nav>

			<header className={styles.hero}>
				<div className={styles.heroCopy}>
					<span className={styles.eyebrow}>{topic.kicker}</span>
					<h1>{topic.headline}</h1>
					<p>{topic.intro}</p>
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
							className={styles.secondaryLink}
							onClick={() => onOpenPlayground?.()}
						>
							Open playground
						</button>
					</div>
				</div>

				<div className={styles.heroStage} aria-label={`${topic.title} story preview`}>
					<div className={styles.heroStageTop}>
						<span>Idea trace</span>
						<b>{topic.chapters.length} chapters</b>
					</div>
					<div className={styles.heroFigure}>
						<TopicFigure type={topic.chapters[0]?.figure} accent={topic.accent} />
					</div>
					<div className={styles.heroPrinciples}>
						{topic.principles.map(item => {
							const Icon = ICONS[item.icon] || ICONS.circle;
							return (
								<span key={item.title}>
									<Icon size={14} strokeWidth={1.8} />
									{item.title}
								</span>
							);
						})}
					</div>
				</div>
			</header>

			<main
				id="story-chapters"
				ref={storyStartRef}
				className={styles.scrollySection}
			>
				<aside className={styles.pinnedStage} aria-live="polite">
					<div className={styles.stageHeader}>
						<span className={styles.eyebrow}>On stage</span>
						<div className={styles.stageCount}>
							<b>{String(activeIndex + 1).padStart(2, '0')}</b>
							<span>/{String(topic.chapters.length).padStart(2, '0')}</span>
						</div>
					</div>
					<div className={styles.stageTitleRow}>
						<div>
							<span>{activeChapter.kicker}</span>
							<h2>{activeChapter.title}</h2>
							<p>{activeChapter.question}</p>
						</div>
						<ActiveIcon size={20} strokeWidth={1.8} />
					</div>
					<div className={styles.figureShell}>
						<TopicFigure
							key={activeIndex}
							type={activeChapter.figure}
							accent={topic.accent}
						/>
					</div>
					<p className={styles.stageCaption}>{activeChapter.body}</p>
					<div className={styles.watchList}>
						<span>Remember</span>
						{activeChapter.remember.map(item => (
							<b key={item}>{item}</b>
						))}
					</div>
					<div className={styles.stageRail} aria-label={`${topic.title} chapter map`}>
						{topic.chapters.map((chapter, index) => (
							<button
								key={chapter.title}
								type="button"
								className={index === activeIndex ? styles.railActive : ''}
								onClick={() => jumpTo(index)}
							>
								<span>{String(index + 1).padStart(2, '0')}</span>
								{chapter.title}
							</button>
						))}
					</div>
					<button
						type="button"
						className={styles.panelButton}
						onClick={() => onOpenPlayground?.()}
					>
						Open playground
						<ArrowRight size={14} strokeWidth={2} />
					</button>
				</aside>

				<div className={styles.narrativeRail}>
					<div className={styles.progressTrack} aria-hidden="true">
						<i />
					</div>
					{topic.chapters.map((chapter, index) => (
						<section
							key={chapter.title}
							ref={node => {
								sectionRefs.current[index] = node;
							}}
							data-index={index}
							className={`${styles.narrativeStep} ${
								index === activeIndex ? styles.narrativeStepActive : ''
							}`}
						>
							<span className={styles.stepNumber}>
								{String(index + 1).padStart(2, '0')}
							</span>
							<span className={styles.stepKicker}>{chapter.kicker}</span>
							<h2>{chapter.title}</h2>
							<p className={styles.question}>{chapter.question}</p>
							<p>{chapter.body}</p>
							<div className={styles.logicBlock}>
								<strong>Logic to watch</strong>
								<ol>
									{chapter.logic.map(item => (
										<li key={item}>{item}</li>
									))}
								</ol>
							</div>
							<div className={styles.stepFooter}>
								<p>{chapter.takeaway}</p>
								<button type="button" onClick={() => onOpenPlayground?.()}>
									Try it
									<ArrowRight size={14} strokeWidth={2} />
								</button>
							</div>
						</section>
					))}
				</div>
			</main>
		</div>
	);
};

export default TopicScrollytelling;
