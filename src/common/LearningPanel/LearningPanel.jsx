import { createElement, useState } from 'react';
import {
	AlertTriangle,
	Brain,
	CheckCircle2,
	Code2,
	Gauge,
	HelpCircle,
	Lightbulb,
	Route,
	ScanLine,
} from 'lucide-react';
import styles from './LearningPanel.module.css';

const DEFAULT_LEGEND = [
	{ label: 'Inspecting / comparing', color: 'var(--color-accent-blue)' },
	{ label: 'Moving / writing', color: 'var(--color-accent-orange)' },
	{ label: 'Done / settled', color: 'var(--color-accent-green)' },
];

const Section = ({ icon, title, children }) => {
	if (!children) return null;
	return (
		<section className={styles.section}>
			<div className={styles.sectionTitle}>
				{createElement(icon, { size: 16, strokeWidth: 2.2 })}
				<h4>{title}</h4>
			</div>
			{children}
		</section>
	);
};

const BulletList = ({ items }) => {
	if (!items?.length) return null;
	return (
		<ul className={styles.bulletList}>
			{items.map(item => (
				<li key={item}>{item}</li>
			))}
		</ul>
	);
};

const normalizeComplexityTiles = complexity => {
	if (!complexity) return [];
	const tiles = [];
	const time = complexity.time;
	if (typeof time === 'string') {
		tiles.push({ label: 'Time', value: time });
	} else if (time) {
		if (time.best) tiles.push({ label: 'Best', value: time.best });
		if (time.average) tiles.push({ label: 'Average', value: time.average });
		if (time.worst) tiles.push({ label: 'Worst', value: time.worst });
		if (time.amortized) tiles.push({ label: 'Amortized', value: time.amortized });
		if (time.result) tiles.push({ label: 'Result', value: time.result });
	}

	const space = complexity.space;
	if (typeof space === 'string') {
		tiles.push({ label: 'Space', value: space });
	} else if (space?.worst) {
		tiles.push({ label: 'Space', value: space.worst });
	}

	return tiles;
};

const ComplexityGrid = ({ complexity }) => {
	const tiles = normalizeComplexityTiles(complexity);
	if (!tiles.length) return null;
	return (
		<div className={styles.complexityGrid}>
			{tiles.map(tile => (
				<div key={`${tile.label}-${tile.value}`} className={styles.complexityTile}>
					<span>{tile.label}</span>
					<strong>{tile.value}</strong>
				</div>
			))}
		</div>
	);
};

const Variables = ({ variables }) => {
	if (!variables?.length) return null;
	return (
		<div className={styles.variableGrid}>
			{variables.map(variable => (
				<div key={variable.symbol}>
					<strong>{variable.symbol}</strong>
					<span>{variable.label}</span>
				</div>
			))}
		</div>
	);
};

const TraceCard = ({ trace, accent }) => {
	if (!trace) return null;
	return (
		<div className={styles.traceBox} style={{ borderColor: accent }}>
			<span>{trace.title}</span>
			<p>{trace.text}</p>
			{trace.steps?.length > 0 && (
				<div className={styles.traceSteps}>
					{trace.steps.map((step, index) => (
						<div key={`${step.label}-${index}`} className={styles.traceStep}>
							<span>{index + 1}</span>
							<div>
								<strong>{step.label}</strong>
								<p>{step.text}</p>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

const Pseudocode = ({ lines, activeLine, activeLineBase = 0 }) => {
	if (!lines?.length) return null;
	return (
		<div className={styles.codeBlock}>
			{lines.map((line, index) => {
				const isActive = activeLine === index + activeLineBase;
				return (
					<div
						key={`${line}-${index}`}
						className={`${styles.codeLine} ${isActive ? styles.codeActive : ''}`}
					>
						<span>{String(index + 1).padStart(2, '0')}</span>
						<code>{line}</code>
					</div>
				);
			})}
		</div>
	);
};

const Legend = ({ items = DEFAULT_LEGEND }) => {
	if (!items?.length) return null;
	return (
		<div className={styles.legend}>
			{items.map(item => (
				<div key={item.label} className={styles.legendItem}>
					<span
						className={styles.swatch}
						style={{
							background: item.color,
							borderColor: item.borderColor || item.color,
						}}
					/>
					<span>{item.label}</span>
				</div>
			))}
		</div>
	);
};

const CompareCards = ({ cards }) => {
	if (!cards?.length) return null;
	return (
		<div className={styles.compareGrid}>
			{cards.map(card => (
				<div key={card.title} className={styles.compareCard}>
					<span>{card.label}</span>
					<strong>{card.title}</strong>
					<p>{card.text}</p>
				</div>
			))}
		</div>
	);
};

const ConceptChecks = ({ checks }) => {
	if (!checks?.length) return null;
	return (
		<div className={styles.checkList}>
			{checks.map(check => (
				<details key={check.question} className={styles.checkItem}>
					<summary>{check.question}</summary>
					<p>{check.answer}</p>
				</details>
			))}
		</div>
	);
};

const Walkthrough = ({ steps, accent }) => {
	const [activeIndex, setActiveIndex] = useState(0);
	if (!steps?.length) return null;

	const activeStep = steps[Math.min(activeIndex, steps.length - 1)];
	const progress =
		steps.length <= 1 ? 100 : Math.round((activeIndex / (steps.length - 1)) * 100);

	return (
		<section className={styles.walkthrough}>
			<div className={styles.walkthroughHeader}>
				<span>Guided walkthrough</span>
				<strong>
					{activeIndex + 1}/{steps.length}
				</strong>
			</div>
			<div className={styles.walkthroughTrack}>
				<div
					className={styles.walkthroughFill}
					style={{ width: `${progress}%`, background: accent }}
				/>
			</div>
			<div className={styles.walkthroughCard}>
				<strong>{activeStep.title}</strong>
				<p>{activeStep.text}</p>
				{activeStep.action && <em>{activeStep.action}</em>}
			</div>
			<div className={styles.walkthroughControls}>
				<button
					type="button"
					onClick={() => setActiveIndex(index => Math.max(index - 1, 0))}
					disabled={activeIndex === 0}
				>
					Back
				</button>
				<button
					type="button"
					onClick={() =>
						setActiveIndex(index => Math.min(index + 1, steps.length - 1))
					}
					disabled={activeIndex === steps.length - 1}
				>
					Next
				</button>
			</div>
		</section>
	);
};

const LearningPanel = ({
	content,
	trace,
	activeLine,
	activeLineBase = 0,
	accent = 'var(--color-primary)',
}) => {
	if (!content) {
		return <div className={styles.emptyState}>Learning notes unavailable.</div>;
	}

	const summary = content.summary || content.intuition;
	const pseudocode = content.pseudocode || content.lines;
	const walkthroughSteps =
		content.walkthrough ||
		content.strategy?.slice(0, 4).map((text, index) => ({
			title: `Step ${index + 1}`,
			text,
		}));

	return (
		<div className={styles.learningPanel} style={{ '--learning-accent': accent }}>
			<header className={styles.hero}>
				<div className={styles.eyebrow}>{content.category || 'Learning lens'}</div>
				<h3>{content.name || content.title}</h3>
				{summary && <p>{summary}</p>}
			</header>

			<ComplexityGrid complexity={content.complexity} />
			<Walkthrough steps={walkthroughSteps} accent={accent} />
			<TraceCard trace={trace} accent={accent} />

			<Section icon={Brain} title="Intuition">
				{content.intuition && <p>{content.intuition}</p>}
				<BulletList items={content.strategy} />
			</Section>

			<Section icon={Gauge} title="Why This Complexity">
				<Variables variables={content.complexity?.variables} />
				<BulletList items={content.complexity?.why || content.complexityReason} />
			</Section>

			<CompareCards cards={content.compareCards} />

			<div className={styles.tradeoffGrid}>
				<Section icon={CheckCircle2} title="Use When">
					<BulletList items={content.tradeoffs?.useWhen} />
				</Section>
				<Section icon={AlertTriangle} title="Watch Out">
					<BulletList items={content.tradeoffs?.watchOut} />
				</Section>
			</div>

			<Section icon={Route} title="Visual Legend">
				<Legend items={content.legend} />
			</Section>

			<Section icon={Code2} title="Pseudocode">
				<Pseudocode
					lines={pseudocode}
					activeLine={activeLine}
					activeLineBase={activeLineBase}
				/>
			</Section>

			<Section icon={Lightbulb} title="Case Intuition">
				<BulletList items={content.caseIntuition} />
			</Section>

			<Section icon={HelpCircle} title="Concept Checks">
				<ConceptChecks checks={content.conceptChecks} />
			</Section>

			{content.prompt && (
				<div className={styles.promptBox}>
					<ScanLine size={16} />
					<p>{content.prompt}</p>
				</div>
			)}
		</div>
	);
};

export default LearningPanel;
