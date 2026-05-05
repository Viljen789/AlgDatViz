import { useEffect, useRef } from 'react';
import styles from './PseudocodeRail.module.css';

const PseudocodeRail = ({ lines = [], activeLine, isRunning, label = 'PSEUDOCODE' }) => {
	const railRef = useRef(null);
	const activeRef = useRef(null);

	useEffect(() => {
		if (!railRef.current || !activeRef.current) return;
		if (typeof activeLine !== 'number') return;
		const rail = railRef.current;
		const active = activeRef.current;
		const offset =
			active.offsetTop - rail.clientHeight / 2 + active.clientHeight / 2;
		rail.scrollTo({ top: offset, behavior: 'smooth' });
	}, [activeLine]);

	return (
		<aside className={styles.rail} aria-label="Pseudocode">
			<header className={styles.header}>
				<span className={styles.label}>{label}</span>
				<span className={styles.count}>{lines.length} lines</span>
			</header>
			<div className={styles.scroll} ref={railRef}>
				<ol className={styles.list}>
					{lines.map((line, idx) => {
						const isActive = isRunning && idx === activeLine;
						const isComment = line.trim().startsWith('//');
						const isEmpty = line.trim() === '';
						return (
							<li
								key={idx}
								ref={isActive ? activeRef : null}
								className={[
									styles.line,
									isActive ? styles.lineActive : '',
									isComment ? styles.lineComment : '',
									isEmpty ? styles.lineEmpty : '',
								]
									.filter(Boolean)
									.join(' ')}
								data-line={idx + 1}
							>
								<span className={styles.gutter} aria-hidden="true">
									{isEmpty ? '' : idx + 1}
								</span>
								<code className={styles.code}>{line || ' '}</code>
							</li>
						);
					})}
				</ol>
			</div>
		</aside>
	);
};

export default PseudocodeRail;
