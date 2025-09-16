import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './DropdownControl.module.css';

const DropdownControl = ({ label, value, children }) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div
			className={styles.dropdownContainer}
			onMouseEnter={() => setIsOpen(true)}
			onMouseLeave={() => setIsOpen(false)}
		>
			<div className={styles.dropdownHeader}>
				<span className={styles.label}>{label}:</span>
				<span className={styles.value}>{value}</span>
			</div>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						className={styles.optionsPanel}
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default DropdownControl;
