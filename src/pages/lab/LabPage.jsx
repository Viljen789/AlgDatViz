import { Component, lazy, Suspense, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './LabPage.module.css';

// Throwaway design lab: several radically different site-wide language + motion
// explorations, each a self-contained full-bleed showcase. Not linked in the main
// nav — reachable at /lab. Each variant owns its own chrome; this shell only adds
// a floating switcher + a back link, and isolates a broken variant behind an error
// boundary so the others stay browsable.

const VARIANTS = [
	{
		key: 'studio',
		label: 'Studio',
		blurb: 'Paper instrument · grab-and-scrub, study-teacher',
		Comp: lazy(() => import('./LabStudio.jsx')),
	},
	{
		key: 'kinetic',
		label: 'Kinetic',
		blurb: 'Physics · springy, interactive',
		Comp: lazy(() => import('./LabKinetic.jsx')),
	},
	{
		key: 'aurora',
		label: 'Aurora',
		blurb: 'Glass · smooth, ambient depth',
		Comp: lazy(() => import('./LabAurora.jsx')),
	},
];

class VariantBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}
	static getDerivedStateFromError(error) {
		return { error };
	}
	componentDidUpdate(prev) {
		// Reset the boundary when the user switches variants.
		if (prev.resetKey !== this.props.resetKey && this.state.error) {
			this.setState({ error: null });
		}
	}
	render() {
		if (this.state.error) {
			return (
				<div className={styles.error} role="alert">
					<p className={styles.errorTitle}>This variant failed to render.</p>
					<pre className={styles.errorBody}>
						{String(this.state.error?.message || this.state.error)}
					</pre>
				</div>
			);
		}
		return this.props.children;
	}
}

const LabPage = () => {
	const [active, setActive] = useState(VARIANTS[0].key);
	const current = VARIANTS.find(v => v.key === active) ?? VARIANTS[0];
	const Active = current.Comp;

	// Portal to <body> so the full-bleed lab escapes the app shell's transformed
	// route-transition wrapper (a fixed child of a transformed ancestor anchors to
	// that ancestor, not the viewport — which left the sidebar/header showing).
	return createPortal(
		<div className={styles.lab}>
			<Suspense
				fallback={<div className={styles.loading}>Loading variant…</div>}
			>
				<VariantBoundary resetKey={active}>
					<Active />
				</VariantBoundary>
			</Suspense>

			<nav className={styles.switcher} aria-label="Design variants">
				<a className={styles.back} href="/" aria-label="Back to the live site">
					←
				</a>
				<span className={styles.lab_label}>design lab</span>
				<div className={styles.tabs}>
					{VARIANTS.map(v => (
						<button
							key={v.key}
							type="button"
							className={`${styles.tab} ${active === v.key ? styles.tabActive : ''}`}
							onClick={() => setActive(v.key)}
							title={v.blurb}
						>
							{v.label}
						</button>
					))}
				</div>
				<span className={styles.blurb}>{current.blurb}</span>
			</nav>
		</div>,
		document.body
	);
};

export default LabPage;
