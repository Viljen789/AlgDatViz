import { useMemo, useState } from 'react';
import styles from './FoundationsPlayground.module.css';

// A growth calculator: slide n and watch the classes diverge. Bars are
// log-scaled (otherwise each class dwarfs the one below and you'd see nothing).

const CLASSES = [
	{ label: 'O(1)', f: () => 1, color: 'var(--color-text-muted)' },
	{ label: 'O(log n)', f: n => Math.max(Math.log2(n), 0), color: 'var(--topic-graphs)' },
	{ label: 'O(n)', f: n => n, color: 'var(--topic-sorting)' },
	{ label: 'O(n log n)', f: n => n * Math.max(Math.log2(n), 0), color: 'var(--brand)' },
	{ label: 'O(n²)', f: n => n * n, color: 'var(--topic-hashing)' },
	{ label: 'O(2ⁿ)', f: n => 2 ** n, color: 'var(--color-error)' },
];

const fmt = v => {
	if (v >= 1e7) return v.toExponential(1).replace('e+', 'e');
	return Math.round(v).toLocaleString('en-US');
};

const FoundationsPlayground = ({ onUserInteract }) => {
	const [n, setN] = useState(16);

	const rows = useMemo(() => {
		const vals = CLASSES.map(c => ({ ...c, v: c.f(n) }));
		const logMax = Math.log(Math.max(...vals.map(r => r.v)) + 1);
		return vals.map(r => ({
			...r,
			w: logMax > 0 ? (Math.log(r.v + 1) / logMax) * 100 : 0,
		}));
	}, [n]);

	const onChange = e => {
		setN(Number(e.target.value));
		onUserInteract?.();
	};

	return (
		<div className={styles.wrap}>
			<div className={styles.controls}>
				<label className={styles.label} htmlFor="growth-n">
					input size&nbsp;&nbsp;n
				</label>
				<input
					id="growth-n"
					type="range"
					min="1"
					max="32"
					value={n}
					onChange={onChange}
					className={styles.slider}
					aria-valuetext={`n equals ${n}`}
				/>
				<output className={styles.nValue} htmlFor="growth-n">
					n = {n}
				</output>
			</div>

			<ul className={styles.rows}>
				{rows.map(r => (
					<li key={r.label} className={styles.row}>
						<span className={styles.rowLabel}>{r.label}</span>
						<span className={styles.track}>
							<span
								className={styles.fill}
								style={{ width: `${r.w}%`, background: r.color }}
							/>
						</span>
						<span className={styles.value}>{fmt(r.v)}</span>
					</li>
				))}
			</ul>

			<p className={styles.note}>
				Bars are log-scaled — each class would otherwise dwarf the one below it.
				Slide n and watch O(2ⁿ) detonate while O(log n) barely lifts off.
			</p>
		</div>
	);
};

export default FoundationsPlayground;
