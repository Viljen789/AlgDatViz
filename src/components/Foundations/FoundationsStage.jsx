import { useMemo } from 'react';
import { SceneNarration } from '../../common/PlaybackEngine';
import { GROWTH_RATES, RACE_NMAX } from './growthRates.js';
import { BISECT, bisectProbes } from './scenes.js';
import styles from './FoundationsStage.module.css';

// FoundationsStage — one figure per complexity scene, switched by `activeScene`
// with eased cross-fades. Scene order matches scenes.js:
//   0 cost · 1 counting · 2 drop · 3 notation · 4 race · 5 bisect ·
//   6 invariant · 7 cases

const VB = { w: 720, h: 560 };
const PLOT = { x0: 70, x1: 540, y0: 84, y1: 432 };

// The race + the predict check + the playground all read the SAME growth-rate
// functions from growthRates.js, so the picture and the quiz can never disagree
// about which class tops the chart. (The stage names colours `colorVar`.)
const RACE = GROWTH_RATES.map(r => ({ ...r, color: r.colorVar }));
const NMAX = RACE_NMAX;
const CAP = NMAX * NMAX;
const xAt = n => PLOT.x0 + (n / NMAX) * (PLOT.x1 - PLOT.x0);
const yAt = v => PLOT.y1 - (Math.min(v, CAP) / CAP) * (PLOT.y1 - PLOT.y0);
const linePath = f => {
	let d = '';
	for (let n = 1; n <= NMAX; n += 1) {
		d += `${n === 1 ? 'M' : 'L'}${xAt(n).toFixed(1)} ${yAt(f(n)).toFixed(1)} `;
	}
	return d.trim();
};

const Axes = ({ xLabel = 'input size  n →', yLabel = 'operations' }) => (
	<g>
		<line
			className={styles.axis}
			x1={PLOT.x0}
			y1={PLOT.y1}
			x2={PLOT.x1 + 6}
			y2={PLOT.y1}
		/>
		<line
			className={styles.axis}
			x1={PLOT.x0}
			y1={PLOT.y1}
			x2={PLOT.x0}
			y2={PLOT.y0 - 6}
		/>
		<text
			className={styles.axisLabel}
			x={PLOT.x1 + 6}
			y={PLOT.y1 + 20}
			textAnchor="end"
		>
			{xLabel}
		</text>
		<text
			className={styles.axisLabel}
			x={PLOT.x0 - 4}
			y={PLOT.y0 - 12}
			textAnchor="start"
		>
			{yLabel}
		</text>
	</g>
);

const FoundationsStage = ({ activeScene = 0, holdReveal = false }) => {
	const racePaths = useMemo(
		() => RACE.map(r => ({ ...r, d: linePath(r.f) })),
		[]
	);

	// The race scene (4) plots every class statically the instant it fades in, so
	// it would otherwise spoil the predict-before-reveal. While the prediction is
	// still open (holdReveal), hold an honest pre-reveal frame: bare axes, no
	// curves, no winner — just the prompt to commit first.
	const raceHeld = activeScene === 4 && holdReveal;

	const sceneClass = i =>
		`${styles.scene} ${activeScene === i ? styles.sceneOn : ''}`;

	// ── 1 counting: an n×n grid of operation dots (n = 7) ──
	const GN = 7;
	const grid = [];
	for (let r = 0; r < GN; r += 1)
		for (let c = 0; c < GN; c += 1) grid.push({ r, c });

	// ── 5 bisect: the sorted array from scenes.js, first probe drawn, live
	// window bracketed. Probe 1 and the [lo, hi) it leaves are DERIVED from the
	// same bisectProbes trace that keys the scene's check, so the figure shows
	// exactly the state the question starts from — and never the second probe,
	// which would spoil the answer.
	const bN = BISECT.values.length; // 14
	const probe1 = bisectProbes(BISECT.values, BISECT.target)[0]; // 7
	const probe1TooSmall = BISECT.values[probe1] < BISECT.target;
	const lo1 = probe1TooSmall ? probe1 + 1 : 0; // 8
	const hi1 = probe1TooSmall ? bN : probe1; // 14
	const BX = 55; // left edge of cell row
	const BP = 44; // cell pitch
	const BW = 38; // cell width/height
	const BY = 156; // cell row top

	// ── 6 invariant: initialization / maintenance / termination as three
	// shrinking [lo, hi) bars, derived from the same trace as the bisect board.
	const foundAt = bisectProbes(BISECT.values, BISECT.target).at(-1); // 8
	const INV_ROWS = [
		{
			label: 'initialization',
			lo: 0,
			hi: bN,
			note: `[0, ${bN}) — if ${BISECT.target} is anywhere, it is in here`,
		},
		{
			label: 'maintenance',
			lo: lo1,
			hi: hi1,
			note: `a[${probe1}] = ${BISECT.values[probe1]} < ${BISECT.target} discards [0, ${lo1}) — the claim survives the pass`,
		},
		{
			label: 'termination',
			lo: foundAt,
			hi: foundAt + 1,
			note: `a[${foundAt}] = ${BISECT.target} — the invariant hands back “found at ${foundAt}”`,
		},
	];
	const IVX = 250; // invariant bar left edge
	const IVW = 396; // invariant bar full width ([0, n))
	const ivxAt = i => IVX + (i / bN) * IVW;

	// ── 7 cases: dynamic-array append costs (spikes at powers of two) ──
	const APPENDS = 16;
	const appendCost = i => {
		const k = i + 1; // 1-based append index
		return (k & (k - 1)) === 0 ? k : 1; // power of two ⇒ resize of cost k
	};

	// Per-scene narration for screen readers — the honest WHY each scene's figure
	// paints, mirroring the caption text drawn inside the (otherwise mute) SVG.
	const sceneNarration = [
		'Cost is f(n): doubling the input doubles the work — the pattern of that growth is the cost.',
		'One loop is n steps; a nested loop is n × n = n² steps.',
		'Drop constants and lower-order terms: 3n² + 5n + 2 becomes O(n²).',
		'O is an upper bound, Ω a lower bound, Θ both — f(n) sits between them.',
		raceHeld
			? 'Bare axes, no curves yet — predict which class grows fastest before the race is drawn.'
			: 'Same axes: as n grows the growth-rate classes separate violently.',
		'A sorted array probed in the middle: each comparison discards half the window, so search costs O(log n).',
		'Three bars shrink the [lo, hi) window: initialization covers the whole array, maintenance keeps the target inside, termination reads off the answer.',
		'One algorithm, different inputs: best, worst, average — and amortized append stays O(1).',
	][Math.min(activeScene, 7)];

	return (
		<>
			{/* Per-scene narration for screen readers, OUTSIDE the role=img figure
			    below (whose in-SVG caption collapses into one static label). */}
			<SceneNarration>{sceneNarration}</SceneNarration>
			<div
				className={styles.wrap}
				role="img"
				aria-label="Complexity concept visualization"
			>
				<svg
					className={styles.svg}
					viewBox={`0 0 ${VB.w} ${VB.h}`}
					preserveAspectRatio="xMidYMid meet"
				>
					{/* 0 — cost grows with n */}
					<g className={sceneClass(0)}>
						<text
							className={styles.kicker}
							x={VB.w / 2}
							y={70}
							textAnchor="middle"
						>
							cost = f(n) — steps as a function of input size
						</text>
						{[
							{ n: 4, y: 170, label: 'n = 4  →  ~4 steps' },
							{ n: 8, y: 300, label: 'n = 8  →  ~8 steps' },
						].map(row => (
							<g key={row.n}>
								{Array.from({ length: row.n }, (_, i) => (
									<rect
										key={i}
										className={styles.cell}
										x={170 + i * 46}
										y={row.y}
										width={38}
										height={38}
										rx={6}
									/>
								))}
								<text
									className={styles.cellLabel}
									x={170}
									y={row.y + 70}
									textAnchor="start"
								>
									{row.label}
								</text>
							</g>
						))}
						<text
							className={styles.caption}
							x={VB.w / 2}
							y={440}
							textAnchor="middle"
						>
							Double the input, double this work. The pattern of that growth is
							the cost.
						</text>
					</g>

					{/* 1 — counting operations: nested loop = n² */}
					<g className={sceneClass(1)}>
						<g className={styles.code}>
							<text className={styles.codeLine} x={66} y={150}>
								for i in 1..n:
							</text>
							<text className={styles.codeLine} x={92} y={184}>
								for j in 1..n:
							</text>
							<text
								className={`${styles.codeLine} ${styles.codeHot}`}
								x={118}
								y={218}
							>
								step()
							</text>
						</g>
						<text className={styles.kicker} x={66} y={284} textAnchor="start">
							one loop → n · nested loop → n × n
						</text>
						<g transform="translate(372 116)">
							{grid.map(({ r, c }, i) => (
								<circle
									key={i}
									className={styles.opDot}
									cx={c * 36 + 12}
									cy={r * 36 + 12}
									r={6}
								/>
							))}
							<text
								className={styles.gridLabel}
								x={(GN * 36) / 2}
								y={GN * 36 + 28}
								textAnchor="middle"
							>
								n × n = n² (here 7 × 7 = 49)
							</text>
						</g>
					</g>

					{/* 2 — drop constants + lower-order terms */}
					<g className={sceneClass(2)}>
						<text
							className={styles.expr}
							x={VB.w / 2}
							y={150}
							textAnchor="middle"
						>
							<tspan className={styles.exprFade}>3</tspan>
							<tspan className={styles.exprKeep}>n²</tspan>
							<tspan className={styles.exprFade}> + 5n + 2</tspan>
						</text>
						<text
							className={styles.exprArrow}
							x={VB.w / 2}
							y={206}
							textAnchor="middle"
						>
							↓ keep the dominant term, drop the rest
						</text>
						<text
							className={styles.exprResult}
							x={VB.w / 2}
							y={262}
							textAnchor="middle"
						>
							O(n²)
						</text>
						{/* share of the work at n = 100 */}
						<g transform="translate(120 330)">
							<rect
								className={styles.shareDom}
								x={0}
								y={0}
								width={452}
								height={34}
								rx={6}
							/>
							<rect
								className={styles.shareRest}
								x={452}
								y={0}
								width={26}
								height={34}
								rx={6}
							/>
							<text
								className={styles.shareLabel}
								x={226}
								y={22}
								textAnchor="middle"
							>
								n² ≈ 95%
							</text>
							<text
								className={styles.caption}
								x={240}
								y={68}
								textAnchor="middle"
							>
								share of the total work at n = 100 — the 5n + 2 is the sliver on
								the right
							</text>
						</g>
					</g>

					{/* 3 — O / Ω / Θ */}
					<g className={sceneClass(3)}>
						<Axes yLabel="operations" />
						{/* Θ band between the upper (O) and lower (Ω) bounds */}
						<polygon
							className={styles.band}
							points={`${PLOT.x0},${PLOT.y1} ${PLOT.x1},${PLOT.y1 - 300} ${PLOT.x1},${PLOT.y1 - 140} ${PLOT.x0},${PLOT.y1}`}
						/>
						<line
							className={styles.bound}
							x1={PLOT.x0}
							y1={PLOT.y1}
							x2={PLOT.x1}
							y2={PLOT.y1 - 300}
						/>
						<line
							className={styles.bound}
							x1={PLOT.x0}
							y1={PLOT.y1}
							x2={PLOT.x1}
							y2={PLOT.y1 - 140}
						/>
						<line
							className={styles.fLine}
							x1={PLOT.x0}
							y1={PLOT.y1}
							x2={PLOT.x1}
							y2={PLOT.y1 - 214}
						/>
						<text
							className={styles.curveLabel}
							x={PLOT.x1 + 8}
							y={PLOT.y1 - 300}
							textAnchor="start"
						>
							O — at most
						</text>
						<text
							className={`${styles.curveLabel} ${styles.fLabel}`}
							x={PLOT.x1 + 8}
							y={PLOT.y1 - 210}
							textAnchor="start"
						>
							f(n)
						</text>
						<text
							className={styles.curveLabel}
							x={PLOT.x1 + 8}
							y={PLOT.y1 - 138}
							textAnchor="start"
						>
							Ω — at least
						</text>
						<text
							className={styles.bandLabel}
							x={PLOT.x0 + 150}
							y={PLOT.y1 - 110}
							textAnchor="middle"
						>
							Θ — both
						</text>
					</g>

					{/* 4 — the growth-rate race (marquee) */}
					{/* While the prediction is open (raceHeld) the curves are held back:
					    bare axes + a "predict first" placeholder, so the race can't spoil
					    the answer. Once answered, the curves and legend are drawn. */}
					<g className={sceneClass(4)}>
						<Axes />
						{raceHeld ? (
							<>
								<text
									className={styles.kicker}
									x={(PLOT.x0 + PLOT.x1) / 2}
									y={PLOT.y0 + 96}
									textAnchor="middle"
								>
									Commit to a prediction first.
								</text>
								<text
									className={styles.caption}
									x={(PLOT.x0 + PLOT.x1) / 2}
									y={PLOT.y0 + 134}
									textAnchor="middle"
								>
									Which class tops this chart at large n? Answer, then the race
									is drawn.
								</text>
							</>
						) : (
							<>
								{racePaths.map(r => (
									<path
										key={r.label}
										className={styles.curve}
										style={{ stroke: r.color }}
										d={r.d}
									/>
								))}
								<g>
									{racePaths.map((r, i) => (
										<g
											key={r.label}
											transform={`translate(${PLOT.x1 + 22} ${PLOT.y0 + 6 + i * 30})`}
										>
											<line
												className={styles.legendSwatch}
												style={{ stroke: r.color }}
												x1={0}
												y1={0}
												x2={20}
												y2={0}
											/>
											<text className={styles.legendLabel} x={28} y={4}>
												{r.label}
											</text>
										</g>
									))}
								</g>
								<text
									className={styles.caption}
									x={PLOT.x0}
									y={VB.h - 28}
									textAnchor="start"
								>
									Same axes. As n grows the classes separate violently — the
									class is the story.
								</text>
							</>
						)}
					</g>

					{/* 5 — binary search: probe the middle, halve the window */}
					<g className={sceneClass(5)}>
						<text
							className={styles.kicker}
							x={VB.w / 2}
							y={84}
							textAnchor="middle"
						>
							binary search for {BISECT.target} — half-open window [lo, hi)
						</text>
						<text
							className={styles.probeLabel}
							x={BX + probe1 * BP + BW / 2}
							y={136}
							textAnchor="middle"
						>
							probe 1 → a[{probe1}] = {BISECT.values[probe1]} &lt;{' '}
							{BISECT.target}
						</text>
						<line
							className={styles.probeTick}
							x1={BX + probe1 * BP + BW / 2}
							y1={142}
							x2={BX + probe1 * BP + BW / 2}
							y2={BY - 4}
						/>
						{BISECT.values.map((v, i) => {
							const dead = i < lo1 || i >= hi1;
							return (
								<g key={i}>
									<rect
										className={
											dead ? `${styles.cell} ${styles.bisectDead}` : styles.cell
										}
										x={BX + i * BP}
										y={BY}
										width={BW}
										height={BW}
										rx={6}
									/>
									<text
										className={
											dead
												? `${styles.bisectValue} ${styles.bisectValueDead}`
												: styles.bisectValue
										}
										x={BX + i * BP + BW / 2}
										y={BY + 24}
										textAnchor="middle"
									>
										{v}
									</text>
									<text
										className={styles.bisectIndex}
										x={BX + i * BP + BW / 2}
										y={BY + 60}
										textAnchor="middle"
									>
										{i}
									</text>
								</g>
							);
						})}
						{/* live-window bracket: [lo, hi) after the first probe */}
						<path
							className={styles.rangeLine}
							d={`M${BX + lo1 * BP} 234 V240 H${BX + (hi1 - 1) * BP + BW} V234`}
						/>
						<text
							className={styles.rangeLabel}
							x={BX + lo1 * BP}
							y={262}
							textAnchor="start"
						>
							lo = {lo1}
						</text>
						<text
							className={styles.rangeLabel}
							x={BX + (hi1 - 1) * BP + BW}
							y={262}
							textAnchor="end"
						>
							hi = {hi1}
						</text>
						<text
							className={styles.caption}
							x={VB.w / 2}
							y={308}
							textAnchor="middle"
						>
							Each probe halves the window: 14 → 6 → 3 → 1 — at most ⌊log₂ n⌋ +
							1 probes.
						</text>
						<text
							className={styles.caption}
							x={VB.w / 2}
							y={334}
							textAnchor="middle"
						>
							That halving is the O(log n) curve from the race.
						</text>
					</g>

					{/* 6 — loop invariant: initialization / maintenance / termination */}
					<g className={sceneClass(6)}>
						<text
							className={styles.kicker}
							x={VB.w / 2}
							y={100}
							textAnchor="middle"
						>
							invariant — “if the target is present, it lies in [lo, hi)”
						</text>
						{INV_ROWS.map((row, i) => {
							const rowY = 150 + i * 96;
							return (
								<g key={row.label}>
									<text
										className={styles.invLabel}
										x={70}
										y={rowY + 17}
										textAnchor="start"
									>
										{row.label}
									</text>
									<rect
										className={styles.invDead}
										x={IVX}
										y={rowY}
										width={IVW}
										height={26}
										rx={5}
									/>
									<rect
										className={styles.invLive}
										x={ivxAt(row.lo)}
										y={rowY}
										width={((row.hi - row.lo) / bN) * IVW}
										height={26}
										rx={5}
									/>
									<text
										className={styles.invNote}
										x={IVX}
										y={rowY + 46}
										textAnchor="start"
									>
										{row.note}
									</text>
								</g>
							);
						})}
						<text
							className={styles.caption}
							x={VB.w / 2}
							y={448}
							textAnchor="middle"
						>
							Base case, inductive step, payoff — a proof by induction that the
							loop is correct.
						</text>
					</g>

					{/* 7 — best / worst / average + amortized */}
					<g className={sceneClass(7)}>
						<text className={styles.kicker} x={70} y={92} textAnchor="start">
							same algorithm, different inputs — linear search
						</text>
						<g transform="translate(70 108)">
							<rect
								className={styles.caseBest}
								x={0}
								y={0}
								width={70}
								height={26}
								rx={5}
							/>
							<text className={styles.caseLabel} x={80} y={18}>
								best — O(1) (found first)
							</text>
							<rect
								className={styles.caseWorst}
								x={0}
								y={40}
								width={470}
								height={26}
								rx={5}
							/>
							<text className={styles.caseLabel} x={480} y={58}>
								worst — O(n)
							</text>
						</g>

						<text className={styles.kicker} x={70} y={252} textAnchor="start">
							amortized — dynamic-array append cost over time
						</text>
						<g transform={`translate(70 ${PLOT.y1})`}>
							{Array.from({ length: APPENDS }, (_, i) => {
								const cost = appendCost(i);
								const h = 10 + cost * 7;
								const isResize = cost > 1;
								return (
									<rect
										key={i}
										className={isResize ? styles.amortSpike : styles.amortBar}
										x={i * 30}
										y={-h}
										width={18}
										height={h}
										rx={3}
									/>
								);
							})}
							<line
								className={styles.amortLine}
								x1={-4}
								y1={-32}
								x2={APPENDS * 30}
								y2={-32}
							/>
							<text
								className={styles.amortLineLabel}
								x={APPENDS * 30}
								y={-38}
								textAnchor="end"
							>
								amortized ≈ O(1)
							</text>
							<text className={styles.caption} x={0} y={36} textAnchor="start">
								Tall bars are the rare O(n) resizes; spread over all the cheap
								appends, the average stays flat.
							</text>
						</g>
					</g>
				</svg>
			</div>
		</>
	);
};

export default FoundationsStage;
