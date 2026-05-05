import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Lightbulb, Info } from 'lucide-react';
import styles from './HelpOverlay.module.css';

const HelpOverlay = ({ isOpen, onClose, content }) => {
	if (!content) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<Motion.div
					className={styles.backdrop}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onClose}
				>
					<Motion.div
						className={styles.modal}
						initial={{ scale: 0.9, opacity: 0, y: 20 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.9, opacity: 0, y: 20 }}
						onClick={e => e.stopPropagation()}
					>
						<div className={styles.header}>
							<div className={styles.titleGroup}>
								<HelpCircle className={styles.titleIcon} size={24} />
								<div>
									<h2>{content.title}</h2>
									<p>Quick start guide & tips</p>
								</div>
							</div>
							<button className={styles.closeButton} onClick={onClose}>
								<X size={20} />
							</button>
						</div>

						<div className={styles.content}>
							<div className={styles.tipGrid}>
								{content.tips.map((tip, index) => (
									<div key={index} className={styles.tipItem}>
										<div className={styles.tipIcon}>
											<Lightbulb size={16} />
										</div>
										<p>{tip}</p>
									</div>
								))}
							</div>
						</div>

						<div className={styles.footer}>
							<div className={styles.infoBadge}>
								<Info size={14} />
								<span>Look for (i) icons for specific details</span>
							</div>
							<button className={styles.gotItButton} onClick={onClose}>
								Got it!
							</button>
						</div>
					</Motion.div>
				</Motion.div>
			)}
		</AnimatePresence>
	);
};

export default HelpOverlay;
