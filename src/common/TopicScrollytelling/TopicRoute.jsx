import { useState } from 'react';
import TopicScrollytelling from './TopicScrollytelling.jsx';
import styles from './TopicScrollytelling.module.css';

const TopicRoute = ({ topic, children }) => {
	const [mode, setMode] = useState('story');

	if (mode === 'playground') {
		return (
			<div className={styles.playgroundShell}>
				<button
					type="button"
					className={styles.storyReturn}
					onClick={() => setMode('story')}
				>
					Story mode
				</button>
				<div className={styles.playgroundContent}>{children}</div>
			</div>
		);
	}

	return (
		<TopicScrollytelling
			topic={topic}
			onOpenPlayground={() => setMode('playground')}
		/>
	);
};

export default TopicRoute;
