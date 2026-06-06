import { useState } from 'react';
import { Search, Trash2, Check } from 'lucide-react';
import Button from '../../common/Button/Button.jsx';
import Input from '../../common/Input/Input.jsx';
import Card, { CardEmpty } from '../../common/Card/Card.jsx';
import Surface from '../../common/Surface/Surface.jsx';
import Tabs from '../../common/Tabs/Tabs.jsx';
import ToggleSwitch from '../../common/ToggleSwitch/ToggleSwitch.jsx';
import styles from './StyleGuide.module.css';

const TOPICS = [
	{ id: 'foundations', label: 'Foundations', token: '--topic-foundations' },
	{ id: 'stacks-queues', label: 'Stacks & Queues', token: '--topic-stacks' },
	{ id: 'master-theorem', label: 'Master Theorem', token: '--topic-master' },
	{ id: 'sorting', label: 'Sorting', token: '--topic-sorting' },
	{ id: 'hashing', label: 'Hashing', token: '--topic-hashing' },
	{ id: 'trees', label: 'Trees', token: '--topic-trees' },
	{ id: 'graphs', label: 'Graphs', token: '--topic-graphs' },
	{ id: 'strategies', label: 'Strategies', token: '--topic-strategies' },
];

const SEMANTIC = [
	{ label: 'Success', token: '--color-success' },
	{ label: 'Warning', token: '--color-warning' },
	{ label: 'Error', token: '--color-error' },
	{ label: 'Info', token: '--color-info' },
];

const TYPE_SCALE = [
	{ name: 'Display 2XL', cls: styles.display2xl, token: '--font-size-display-2xl' },
	{ name: 'Display XL', cls: styles.displayXl, token: '--font-size-display-xl' },
	{ name: 'Display LG', cls: styles.displayLg, token: '--font-size-display-lg' },
	{ name: 'Heading LG', cls: styles.headingLg, token: '--font-size-heading-lg' },
	{ name: 'Heading MD', cls: styles.headingMd, token: '--font-size-heading-md' },
	{ name: 'Heading SM', cls: styles.headingSm, token: '--font-size-heading-sm' },
	{ name: 'Body LG', cls: styles.bodyLg, token: '--font-size-body-lg' },
	{ name: 'Body', cls: styles.body, token: '--font-size-body' },
	{ name: 'Label', cls: styles.labelType, token: '--font-size-label' },
	{ name: 'Caption', cls: styles.caption, token: '--font-size-caption' },
];

const SURFACES = [
	{ name: 'Surface 0', level: 0 },
	{ name: 'Surface 1', level: 1 },
	{ name: 'Surface 2', level: 2 },
	{ name: 'Surface 3', level: 3 },
];

const EASINGS = [
	{ name: 'quiet', token: '--ease-quiet' },
	{ name: 'step', token: '--ease-step' },
	{ name: 'trace', token: '--ease-trace' },
	{ name: 'spring', token: '--ease-spring' },
];

const Section = ({ title, subtitle, children }) => (
	<section className={styles.section}>
		<header className={styles.sectionHead}>
			<h2 className={styles.sectionTitle}>{title}</h2>
			{subtitle && <p className={styles.sectionSub}>{subtitle}</p>}
		</header>
		{children}
	</section>
);

const Swatch = ({ label, token, family }) => (
	<div className={styles.swatch}>
		<div
			className={styles.swatchChip}
			style={{ background: `var(${token})` }}
		/>
		<div className={styles.swatchMeta}>
			<span className={styles.swatchLabel}>{label}</span>
			<code className={styles.swatchToken}>{token}</code>
			{family && <span className={styles.swatchFamily}>{family}</span>}
		</div>
	</div>
);

const StyleGuide = () => {
	const [toggleOn, setToggleOn] = useState(true);
	const [animKey, setAnimKey] = useState(0);
	const [loading, setLoading] = useState(false);

	return (
		<div className={styles.page}>
			<header className={styles.pageHead}>
				<p className={styles.eyebrow}>AlgDatViz · Design System</p>
				<h1 className={styles.pageTitle}>Style Reference</h1>
				<p className={styles.pageLede}>
					The living source of truth for type, color, surface, motion, and the
					token-wired primitives. Everything here reads from{' '}
					<code>src/styles/theme.css</code>.
				</p>
			</header>

			<Section
				title="Per-topic signature hues"
				subtitle="One harmonized HSL family — shared saturation (72%) and lightness (66%); only the hue rotates. Each topic hue is defined once."
			>
				<div className={styles.swatchGrid}>
					{TOPICS.map(t => (
						<Swatch key={t.id} label={t.label} token={t.token} />
					))}
				</div>
			</Section>

			<Section
				title="Semantic colors"
				subtitle="Held separate from topic identity — never reused as a topic signature."
			>
				<div className={styles.swatchGrid}>
					{SEMANTIC.map(s => (
						<Swatch key={s.token} label={s.label} token={s.token} />
					))}
				</div>
			</Section>

			<Section
				title="Text & borders"
				subtitle="Tuned for WCAG AA on the surface system below."
			>
				<div className={styles.swatchGrid}>
					<Swatch label="Text primary" token="--color-text-primary" />
					<Swatch label="Text secondary" token="--color-text-secondary" />
					<Swatch label="Text muted" token="--color-text-muted" />
					<Swatch label="Text dim" token="--color-text-dim" />
					<Swatch label="Border" token="--color-border" />
					<Swatch label="Border strong" token="--color-border-strong" />
				</div>
			</Section>

			<Section
				title="Type scale"
				subtitle="Bricolage Grotesque (display) · Inter (body) · JetBrains Mono (code). Modular scale with matching line-height and tracking."
			>
				<div className={styles.typeList}>
					{TYPE_SCALE.map(t => (
						<div key={t.name} className={styles.typeRow}>
							<div className={styles.typeMeta}>
								<span className={styles.typeName}>{t.name}</span>
								<code className={styles.swatchToken}>{t.token}</code>
							</div>
							<p className={t.cls}>The quick brown fox jumps over 12 lazy dogs.</p>
						</div>
					))}
				</div>
				<div className={styles.fontFamilies}>
					<p className={styles.famDisplay}>Bricolage Grotesque — Display</p>
					<p className={styles.famBody}>Inter — Body copy for first-time students.</p>
					<p className={styles.famMono}>JetBrains Mono — for(i=0; i&lt;n; i++)</p>
				</div>
			</Section>

			<Section
				title="Surface & elevation"
				subtitle="Layered tints (surface 0–3) plus a consistent shadow ramp (1–4). No flat-black + single glow."
			>
				<div className={styles.surfaceGrid}>
					{SURFACES.map(s => (
						<Surface
							key={s.level}
							level={s.level}
							elevation={s.level + 1}
							className={styles.surfaceTile}
						>
							<span className={styles.surfaceName}>{s.name}</span>
							<code className={styles.swatchToken}>elevation {s.level + 1}</code>
						</Surface>
					))}
					<Surface inset className={styles.surfaceTile}>
						<span className={styles.surfaceName}>Inset well</span>
						<code className={styles.swatchToken}>inset</code>
					</Surface>
				</div>
			</Section>

			<Section
				title="Motion easings"
				subtitle="Hover a tile to replay its easing curve. Respects prefers-reduced-motion."
			>
				<button className={styles.replay} onClick={() => setAnimKey(k => k + 1)}>
					Replay all
				</button>
				<div className={styles.easeGrid}>
					{EASINGS.map(e => (
						<div key={e.name} className={styles.easeTile}>
							<div className={styles.easeTrack}>
								<span
									key={animKey}
									className={styles.easeDot}
									style={{ animationTimingFunction: `var(${e.token})` }}
								/>
							</div>
							<div className={styles.swatchMeta}>
								<span className={styles.swatchLabel}>{e.name}</span>
								<code className={styles.swatchToken}>{e.token}</code>
							</div>
						</div>
					))}
				</div>
			</Section>

			<Section
				title="Button"
				subtitle="Variants and sizes, each with hover / focus-visible / active / disabled / loading."
			>
				<div className={styles.row}>
					<Button variant="primary">Primary</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="danger">Danger</Button>
				</div>
				<div className={styles.row}>
					<Button variant="primary" size="sm">Small</Button>
					<Button variant="primary" size="md">Medium</Button>
					<Button variant="primary" size="lg">Large</Button>
				</div>
				<div className={styles.row}>
					<Button variant="primary" disabled>Disabled</Button>
					<Button variant="secondary" disabled>Disabled</Button>
					<Button
						variant="primary"
						loading={loading}
						onClick={() => {
							setLoading(true);
							setTimeout(() => setLoading(false), 1600);
						}}
					>
						{loading ? 'Working' : 'Click to load'}
					</Button>
				</div>
			</Section>

			<Section
				title="Input"
				subtitle="Label, hint, error, adornments. States: hover / focus / disabled / error."
			>
				<div className={styles.formGrid}>
					<Input label="Default" placeholder="Type a value…" />
					<Input
						label="With hint"
						placeholder="Search nodes"
						leading={<Search size={14} />}
						hint="Search by id or label."
					/>
					<Input
						label="Error"
						defaultValue="-1"
						error="Must be a positive integer."
					/>
					<Input label="Disabled" placeholder="Unavailable" disabled />
				</div>
			</Section>

			<Section
				title="Card"
				subtitle="Built on Surface. Static, interactive (hover/focus/active), accented, and empty state."
			>
				<div className={styles.cardGrid}>
					<Card>
						<h3 className={styles.cardTitle}>Static card</h3>
						<p className={styles.cardBody}>
							A plain content container on surface 1 with elevation 2.
						</p>
					</Card>
					<Card interactive as="button" type="button">
						<h3 className={styles.cardTitle}>Interactive</h3>
						<p className={styles.cardBody}>
							Hover, tab to focus, press. Keyboard focus is visible.
						</p>
					</Card>
					<Card accent="var(--topic-graphs)">
						<h3 className={styles.cardTitle}>Accented</h3>
						<p className={styles.cardBody}>
							Tinted accent rail from a per-topic hue token.
						</p>
					</Card>
					<Card padded={false}>
						<CardEmpty
							icon={<Trash2 size={22} />}
							title="Nothing here yet"
						>
							Empty-state slot for lists and playgrounds.
						</CardEmpty>
					</Card>
				</div>
			</Section>

			<Section
				title="Tabs"
				subtitle="Animated indicator, arrow-key navigation, disabled tab, focus-visible."
			>
				<Surface level={1} className={styles.tabsShell}>
					<Tabs
						tabs={[
							{ label: 'Overview', content: <p className={styles.cardBody}>First panel content.</p> },
							{ label: 'Details', content: <p className={styles.cardBody}>Second panel content.</p> },
							{ label: 'Locked', content: <p className={styles.cardBody}>Hidden.</p>, disabled: true },
						]}
					/>
				</Surface>
			</Section>

			<Section
				title="Toggle"
				subtitle="Hover / focus-visible / active / disabled."
			>
				<div className={styles.row}>
					<ToggleSwitch
						label="Animations"
						checked={toggleOn}
						onChange={e => setToggleOn(e.target.checked)}
					/>
					<ToggleSwitch
						label={
							<span className={styles.inlineCheck}>
								<Check size={13} /> On (disabled)
							</span>
						}
						checked
						disabled
						onChange={() => {}}
					/>
					<ToggleSwitch label="Off (disabled)" checked={false} disabled onChange={() => {}} />
				</div>
			</Section>
		</div>
	);
};

export default StyleGuide;
