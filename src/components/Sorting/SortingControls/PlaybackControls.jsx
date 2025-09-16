import { Pause, Play, RedoDot, UndoDot } from 'lucide-react';
import styles from './PlaybackControls.module.css';
import Button from '../../../common/Button/Button';

const PlaybackControls = ({
	onPlayPause,
	onStepBack,
	onStepForward,
	isSorting,
	isPaused,
}) => {
	return (
		<div className={styles.playbackContainer}>
			<Button onClick={onStepBack} disabled={!isSorting}>
				<UndoDot size={20} strokeWidth={2.5} />
			</Button>

			<Button
				onClick={onPlayPause}
				disabled={!isSorting}
				variant="primary"
			>
				{isPaused ? (
					<Play size={20} strokeWidth={2.5} />
				) : (
					<Pause size={20} strokeWidth={2.5} />
				)}
			</Button>

			<Button onClick={onStepForward} disabled={!isSorting}>
				<RedoDot size={20} strokeWidth={2.5} />
			</Button>
		</div>
	);
};

export default PlaybackControls;
