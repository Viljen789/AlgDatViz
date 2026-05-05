import { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import styles from './Tooltip.module.css';

const Tooltip = ({ text, children, position = 'top' }) => {
	const [isVisible, setIsVisible] = useState(false);

	return (
		<div
			className={styles.tooltipContainer}
			onMouseEnter={() => setIsVisible(true)}
			onMouseLeave={() => setIsVisible(false)}
		>
			{children}
			<AnimatePresence>
				{isVisible && (
					<Motion.div
						className={`${styles.tooltip} ${styles[position]}`}
						initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 4 : -4 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: position === 'top' ? 4 : -4 }}
						transition={{ duration: 0.15 }}
					>
						{text}
						<div className={styles.arrow} />
					</Motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default Tooltip;
