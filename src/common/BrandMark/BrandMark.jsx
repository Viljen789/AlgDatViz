import { ProofMark } from '@viljen789/study-ui';

/** The suite's proofreader mark: every algorithm is something to work through. */
const BrandMark = ({ size = 24, className }) => (
	<ProofMark
		letter="A"
		label="AlgDatViz"
		className={className}
		style={{ width: size, height: size }}
	/>
);

export default BrandMark;
