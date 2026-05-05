import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import styles from './OverlaySheet.module.css';

const OverlaySheet = ({
	isOpen,
	onClose,
	title,
	subtitle,
	children,
	variant = 'center',
	width,
}) => {
	const sheetRef = useRef(null);
	const previousFocusRef = useRef(null);

	useEffect(() => {
		if (!isOpen) return;
		previousFocusRef.current = document.activeElement;
		const onKey = e => {
			if (e.key === 'Escape') onClose?.();
		};
		document.addEventListener('keydown', onKey);
		window.requestAnimationFrame(() => {
			const firstFocusable = sheetRef.current?.querySelector(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			firstFocusable?.focus();
		});
		return () => {
			document.removeEventListener('keydown', onKey);
			if (previousFocusRef.current instanceof HTMLElement) {
				previousFocusRef.current.focus();
			}
		};
	}, [isOpen, onClose]);

	useEffect(() => {
		if (!isOpen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	}, [isOpen]);

	const sheetVariants =
		variant === 'bottom'
			? {
					initial: { y: '100%', opacity: 0.6 },
					animate: { y: 0, opacity: 1 },
					exit: { y: '100%', opacity: 0 },
				}
			: {
					initial: { y: 24, opacity: 0, scale: 0.985 },
					animate: { y: 0, opacity: 1, scale: 1 },
					exit: { y: 8, opacity: 0, scale: 0.985 },
				};

	const handleSheetKeyDown = e => {
		if (e.key !== 'Tab') return;
		const focusable = Array.from(
			sheetRef.current?.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			) || []
		).filter(
			node =>
				!node.hasAttribute('disabled') &&
				node.getAttribute('aria-hidden') !== 'true'
		);
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	};

	return createPortal(
		<AnimatePresence>
			{isOpen && (
				<Motion.div
					className={styles.backdrop}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
					onMouseDown={onClose}
				>
					<Motion.div
						ref={sheetRef}
						className={`${styles.sheet} ${
							variant === 'bottom' ? styles.bottom : styles.center
						}`}
						style={width ? { width, maxWidth: width } : undefined}
						initial={sheetVariants.initial}
						animate={sheetVariants.animate}
						exit={sheetVariants.exit}
						transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
						onMouseDown={e => e.stopPropagation()}
						onKeyDown={handleSheetKeyDown}
						role="dialog"
						aria-modal="true"
						aria-label={title || 'Overlay'}
					>
						{(title || subtitle) && (
							<header className={styles.header}>
								<div className={styles.titleGroup}>
									{title && <h2 className={styles.title}>{title}</h2>}
									{subtitle && <p className={styles.subtitle}>{subtitle}</p>}
								</div>
								<button
									type="button"
									className={styles.close}
									onClick={onClose}
									aria-label="Close"
									title="Close (Esc)"
								>
									<X size={16} strokeWidth={2} />
								</button>
							</header>
						)}
						<div className={styles.body}>{children}</div>
					</Motion.div>
				</Motion.div>
			)}
		</AnimatePresence>,
		document.body
	);
};

export default OverlaySheet;
