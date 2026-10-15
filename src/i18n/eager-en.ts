/** English namespaces required before the first workspace paint. */
import app from './en/app.json';
import a11y from './en/a11y.json';
import tabs from './en/tabs.json';
import footer from './en/footer.json';
import commandPalette from './en/commandPalette.json';
import shortcuts from './en/shortcuts.json';
import projects from './en/projects.json';
import templates from './en/templates.json';
import marketplace from './en/marketplace.json';
import onboarding from './en/onboarding.json';
import gestures from './en/gestures.json';
import skeleton from './en/skeleton.json';
import errors from './en/errors.json';
import focusMode from './en/focusMode.json';
import toast from './en/toast.json';
import config from './en/config.json';
import diagnostics from './en/diagnostics.json';
import project from './en/project.json';
import finish from './en/finish.json';
import faceFrame from './en/faceFrame.json';
import cabinetDoor from './en/cabinetDoor.json';
import drawerBox from './en/drawerBox.json';
import screwPullout from './en/screwPullout.json';
import kerfBending from './en/kerfBending.json';
import dadoRabbet from './en/dadoRabbet.json';
import finishingCoat from './en/finishingCoat.json';
import woodTurning from './en/woodTurning.json';
import framePanel from './en/framePanel.json';
import taperJig from './en/taperJig.json';
import stairStringer from './en/stairStringer.json';
import boxJoint from './en/boxJoint.json';
import pocketHole from './en/pocketHole.json';
import shelfDeflection from './en/shelfDeflection.json';
import mortiseTenon from './en/mortiseTenon.json';
import dovetailLayout from './en/dovetailLayout.json';
import glueCoverage from './en/glueCoverage.json';
import planerPasses from './en/planerPasses.json';
import honingGuide from './en/honingGuide.json';
import crownMoulding from './en/crownMoulding.json';
import routerCircle from './en/routerCircle.json';
import coveCut from './en/coveCut.json';
import moistureShrinkage from './en/moistureShrinkage.json';
import rafterLength from './en/rafterLength.json';
import routerTemplate from './en/routerTemplate.json';
import halfLap from './en/halfLap.json';
import splineJoint from './en/splineJoint.json';
import cost from './en/cost.json';
import costSummary from './en/costSummary.json';
import costVariance from './en/costVariance.json';
import diff from './en/diff.json';
import plugins from './en/plugins.json';
import room from './en/room.json';
import shelfSpacingPanel from './en/shelfSpacingPanel.json';
import snapshot from './en/snapshot.json';
import storage from './en/storage.json';
import validation from './en/validation.json';

// cost…validation (below) are always requested by the Sidebar at mount (FEATURE_NAMESPACES.workspace),
// so they must ship eagerly or the default tab races a lazy English chunk fetch against navigation.
export const eagerEnglish = {
  app,
  a11y,
  tabs,
  footer,
  commandPalette,
  shortcuts,
  projects,
  templates,
  marketplace,
  onboarding,
  gestures,
  skeleton,
  errors,
  focusMode,
  toast,
  config,
  diagnostics,
  project,
  finish,
  faceFrame,
  cabinetDoor,
  drawerBox,
  screwPullout,
  kerfBending,
  dadoRabbet,
  finishingCoat,
  woodTurning,
  framePanel,
  taperJig,
  stairStringer,
  boxJoint,
  pocketHole,
  shelfDeflection,
  mortiseTenon,
  dovetailLayout,
  glueCoverage,
  planerPasses,
  honingGuide,
  crownMoulding,
  routerCircle,
  coveCut,
  moistureShrinkage,
  rafterLength,
  routerTemplate,
  halfLap,
  splineJoint,
  cost,
  costSummary,
  costVariance,
  diff,
  plugins,
  room,
  shelfSpacingPanel,
  snapshot,
  storage,
  validation,
};
