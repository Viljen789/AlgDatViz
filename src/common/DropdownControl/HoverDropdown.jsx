import { useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import styles from './HoverDropdown.module.css';

const HoverDropdown = ({ label, options, value, onChange, disabled }) => {
	const [isOpen, setIsOpen] = useState(false);

	const listVariants = {
		hidden: { opacity: 0, y: -10, scale: 0.95 },
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: {
				duration: 0.2,
				staggerChildren: 0.05,
			},
		},
		exit: {
			opacity: 0,
			y: -10,
			scale: 0.95,
			transition: { duration: 0.15 },
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, x: -10 },
		visible: { opacity: 1, x: 0 },
	};

	const currentOption = options.find(opt => opt.value === value);

	return (
		<div
			className={styles.dropdown}
			onMouseEnter={() => !disabled && setIsOpen(true)}
			onMouseLeave={() => setIsOpen(false)}
		>
			<div className={`${styles.trigger} ${disabled ? styles.disabled : ''}`}>
				<span>
					{label}: {currentOption?.label}
				</span>
				<span className={styles.arrow}>▼</span>
			</div>

			<AnimatePresence>
				{isOpen && !disabled && (
					<Motion.div
						className={styles.optionsContainer}
						variants={listVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
					>
						{options.map(option => (
							<Motion.div
								key={option.value}
								variants={itemVariants}
								className={`${styles.option} ${value === option.value ? styles.active : ''}`}
								onClick={() => {
									onChange(option.value);
									setIsOpen(false);
								}}
							>
								{option.label}
							</Motion.div>
						))}
					</Motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default HoverDropdown;
