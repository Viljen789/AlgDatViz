import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Eyebrow from '../common/Eyebrow/Eyebrow.jsx';
import styles from './NotFoundPage.module.css';

/* Catch-all for addresses that don't resolve. Same editorial voice as the
   study pages: eyebrow, serif display headline, one plain paragraph, one
   primary way forward. The little dead-end graph is drawn inline so the page
   still says "this is the algorithms app" without loading a visualizer. */
const NotFoundPage = () => (
	<div className={styles.page}>
		<div className={styles.inner}>
			<figure className={styles.figure} aria-hidden="true">
				<svg viewBox="0 0 240 120" className={styles.graph}>
					<path
						d="M24 96 L84 60 L150 78"
						fill="none"
						stroke="var(--color-border-strong)"
						strokeWidth="1.5"
					/>
					<path
						d="M84 60 L138 28"
						fill="none"
						stroke="var(--color-border)"
						strokeWidth="1.5"
						strokeDasharray="4 5"
					/>
					<circle cx="24" cy="96" r="7" fill="var(--surface-2)" stroke="var(--color-border-strong)" strokeWidth="1.5" />
					<circle cx="84" cy="60" r="7" fill="var(--surface-2)" stroke="var(--color-border-strong)" strokeWidth="1.5" />
					<circle cx="150" cy="78" r="7" fill="var(--surface-2)" stroke="var(--color-border-strong)" strokeWidth="1.5" />
					<circle cx="138" cy="28" r="7" fill="none" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="3 3" />
					<text x="206" y="33" className={styles.nodeLabel}>
						?
					</text>
				</svg>
			</figure>
			<Eyebrow>Not found · 404</Eyebrow>
			<h1 className={styles.title}>This node has no edges.</h1>
			<p className={styles.lede}>
				The address doesn&rsquo;t match any page — the link may be stale, or a
				letter went missing. Every topic, drill, and cheat sheet is still
				reachable from the overview.
			</p>
			<div className={styles.actions}>
				<Link to="/" className={styles.primary}>
					Back to the overview
					<ArrowRight size={15} aria-hidden="true" />
				</Link>
				<Link to="/reference" className={styles.secondary}>
					Open the exam reference
				</Link>
			</div>
		</div>
	</div>
);

export default NotFoundPage;
