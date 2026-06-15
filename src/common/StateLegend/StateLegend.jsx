import styles from './StateLegend.module.css';

/**
 * StateLegend — a compact, accessible key that sits under a canvas.
 *
 * A row of swatch + mono-caption pairs in the paper-and-ink style: hairline
 * swatches, no shadow, secondary-ink labels. Generic and self-contained so any
 * stage can drop it in. The caller passes only the 2-3 states currently live,
 * never the whole quartet (considered, not crowded).
 *
 * Accessibility: the legend is NOT hidden from assistive tech. It carries
 * role="img" and an aria-label that names each state in words, so a non-sighted
 * student gets the same key a sighted one reads from the swatches. Each item may
 * carry an optional `aria` phrase (e.g. "blue") naming its colour; when absent
 * the label alone is announced.
 *
 * Props:
 *   items: Array<{
 *     label:  string  — the caption shown next to the swatch
 *     swatch: string  — a CSS colour/token for the swatch fill (e.g.
 *                       'var(--state-active)'); may be a color-mix() expression
 *     aria?:  string  — optional colour word for the spoken key (e.g. 'blue');
 *                       when given, announced as "<aria> = <label>"
 *   }>
 *   className, ...rest
 */
const StateLegend = ({ items = [], className = '', ...rest }) => {
	if (!items.length) return null;

	// Name the states in words for assistive tech: "blue = comparing, ...".
	const spoken = items
		.map(item => (item.aria ? `${item.aria} = ${item.label}` : item.label))
		.join(', ');

	return (
		<div
			className={`${styles.legend} ${className}`.trim()}
			role="img"
			aria-label={`Legend: ${spoken}`}
			{...rest}
		>
			{items.map(item => (
				<span key={item.label} className={styles.item} aria-hidden="true">
					<span
						className={styles.swatch}
						style={{ background: item.swatch, borderColor: item.swatch }}
					/>
					{item.label}
				</span>
			))}
		</div>
	);
};

export default StateLegend;
