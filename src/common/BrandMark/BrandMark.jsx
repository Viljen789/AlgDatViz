/**
 * Product-local AlgDatViz mark. Four data shapes share one traversal path:
 * array cell, tree node, heap point, and graph vertex.
 */
const BrandMark = ({ size = 24, className }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 30 30"
		fill="none"
		className={className}
		aria-hidden="true"
		focusable="false"
	>
		<path
			d="M4.5 22.5 9 7.5l6.5 12L25 6"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			opacity=".45"
			pathLength="1"
			data-trace
		/>
		<circle cx="4.5" cy="22.5" r="2.7" fill="var(--topic-sorting)" />
		<rect x="6.2" y="4.7" width="5.6" height="5.6" rx=".9" fill="var(--topic-graphs)" />
		<path d="m15.5 16.2 3.3 5.8h-6.6l3.3-5.8Z" fill="var(--topic-hashing)" />
		<circle cx="25" cy="6" r="2.7" fill="var(--topic-trees)" />
		<circle cx="15.5" cy="19.5" r="1" fill="var(--color-bg-sidebar)" />
	</svg>
);

export default BrandMark;
