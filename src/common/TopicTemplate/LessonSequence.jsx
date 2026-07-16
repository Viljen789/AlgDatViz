import { Link } from 'react-router-dom';
import { buildLessonSequence } from './lessonSequence.js';
import styles from './LessonSequence.module.css';

const LessonSequence = ({ topicId, sceneCount, hasPlayground, traceMode }) => {
	const steps = buildLessonSequence({
		topicId,
		sceneCount,
		hasPlayground,
		traceMode,
	});

	return (
		<nav className={styles.sequence} aria-label="How this lesson works">
			<p className={styles.sequenceLabel}>How this lesson works</p>
			<ol className={styles.steps}>
				{steps.map((step, index) => {
					const content = (
						<>
							<span className={styles.number} aria-hidden="true">
								{String(index + 1).padStart(2, '0')}
							</span>
							<span className={styles.copy}>
								<strong>{step.label}</strong>
								<span>{step.detail}</span>
							</span>
						</>
					);

					return (
						<li key={step.id} className={styles.step}>
							{step.to ? (
								<Link className={styles.stepLink} to={step.to}>
									{content}
								</Link>
							) : step.href ? (
								<a className={styles.stepLink} href={step.href}>
									{content}
								</a>
							) : (
								<span className={styles.stepOrigin}>
									{content}
								</span>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
};

export default LessonSequence;
