/** Curated public exports for the joinery engine domain. */

export { getJointSpec, validateJointCompatibility, getAllJointSpecs } from './joint-detail';

export type { JointSpec, JointDimensions, JointConstraints } from './joint-detail';

export { calculateDowelJoint, selectDowelDiameter, minDowelsForLoad, STANDARD_DOWEL_DIAMETERS } from './dowel-joint';

export type { DowelDiameter, JointOrientation, DowelJointInput, DowelPosition, DowelJointResult } from './dowel-joint';

export { calculateDovetailLayout, recommendedDovetailAngle } from './dovetail-layout';

export type {
  DovetailType,
  DovetailStyle,
  DovetailInput,
  DovetailTail,
  DovetailPin,
  DovetailResult,
} from './dovetail-layout';

export { calculateMortiseTenon, findNearestChisel } from './mortise-tenon';

export type { MortiseTenonType, MortiseTenonInput, MortiseTenonResult } from './mortise-tenon';

export { calculateFingerJoint } from './finger-joint';

export type { FingerJointInput, FingerPosition, FingerJointResult } from './finger-joint';

export { calculateDadoRabbet } from './dado-rabbet';

export type { DadoRabbetJointType, DadoRabbetInput, DadoRabbetResult } from './dado-rabbet';

export { calculateBoxJoint } from './box-joint';

export type { BoxJointInput, BoxJointResult } from './box-joint';
