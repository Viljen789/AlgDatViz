// src/common/Panel/Panel.jsx

import styles from "./Panel.module.css";

/**
 * A reusable Panel component that provides a consistent "card" container style.
 *
 * @param {React.ReactNode} children - The content to be rendered inside the panel.
 * @param {string} className - Optional additional CSS classes for custom layout styling.
 * @param {object} style - Optional inline styles.
 */
const Panel = ({ children, className = "", style = {} }) => {
  // We combine the generic .panel style with any custom classes passed in.
  const combinedClassName = `${styles.panel} ${className}`;

  return (
    <div className={combinedClassName} style={style}>
      {children}
    </div>
  );
};

export default Panel;
