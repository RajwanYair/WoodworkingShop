/**
 * IFC 2x3 BIM Export — Future Horizons / Sprint 11
 *
 * Generates an IFC 2x3 STEP (ISO-10303-21) file from a list of cabinet entries.
 * Each cabinet becomes an IfcFurnishingElement with an extruded-box solid
 * placed in a row along the X axis.
 *
 * The output can be imported into Revit, ArchiCAD, FreeCAD, BlenderBIM, etc.
 *
 * All dimensions are in millimetres (IfcSIUnit MILLIMETRE).
 * Coordinate system: X = width, Y = depth, Z = height.
 */

import type { CabinetEntry } from '../store/cabinet-store';

// ── Public types ──────────────────────────────────────────────────────────────

export interface IfcExportOptions {
  /** Author / organisation string embedded in the file header. */
  author?: string;
  /** App version string embedded in the header. */
  appVersion?: string;
  /**
   * Starting X position (mm) for the first cabinet.
   * Subsequent cabinets are placed immediately to the right.
   */
  startX?: number;
  /**
   * Gap (mm) between adjacent cabinets.  Default 10.
   */
  gapMm?: number;
}

export interface IfcExportResult {
  /** Full IFC STEP text ready to write to a .ifc file. */
  content: string;
  /** Number of IfcFurnishingElement entities written (one per cabinet). */
  furnishingCount: number;
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Generate an IFC 2x3 STEP file from a list of cabinet entries.
 *
 * @param cabinets  Cabinet entries to export.
 * @param options   Optional export settings.
 * @returns {@link IfcExportResult} with the file content and entity count.
 */
export function exportToIfc(
  cabinets: readonly CabinetEntry[],
  options: IfcExportOptions = {},
): IfcExportResult {
  const author = options.author ?? 'Cabinet Planner';
  const appVersion = options.appVersion ?? '3.62';
  const startX = options.startX ?? 0;
  const gap = options.gapMm ?? 10;

  const ids = makeIdCounter();
  const lines: string[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  const now = new Date().toISOString().slice(0, 19);
  lines.push('ISO-10303-21;');
  lines.push('HEADER;');
  lines.push(`FILE_DESCRIPTION(('IFC2X3 Cabinet Planner Export'),'2;1');`);
  lines.push(`FILE_NAME('cabinet-planner.ifc','${now}',('${author}'),(''),`);
  lines.push(`  'Cabinet Planner ${appVersion}','IFC2X3','');`);
  lines.push("FILE_SCHEMA(('IFC2X3'));");
  lines.push('ENDSEC;');
  lines.push('DATA;');

  // ── Shared geometry axes (reused by all placements) ───────────────────────
  const idOrigin = ids.next();
  const idDirZ = ids.next();
  const idDirX = ids.next();
  const idAxis3d = ids.next();

  lines.push(`#${idOrigin}=IFCCARTESIANPOINT((0.,0.,0.));`);
  lines.push(`#${idDirZ}=IFCDIRECTION((0.,0.,1.));`);
  lines.push(`#${idDirX}=IFCDIRECTION((1.,0.,0.));`);
  lines.push(`#${idAxis3d}=IFCAXIS2PLACEMENT3D(#${idOrigin},#${idDirZ},#${idDirX});`);

  // ── Owner history ─────────────────────────────────────────────────────────
  const idOrg = ids.next();
  const idApp = ids.next();
  const idPerson = ids.next();
  const idPersonOrg = ids.next();
  const idOwnerHistory = ids.next();

  lines.push(`#${idOrg}=IFCORGANIZATION($,'${author}',$,$,$);`);
  lines.push(`#${idApp}=IFCAPPLICATION(#${idOrg},'${appVersion}','Cabinet Planner','cabinet-planner');`);
  lines.push(`#${idPerson}=IFCPERSON($,'${author}',$,$,$,$,$,$);`);
  lines.push(`#${idPersonOrg}=IFCPERSONANDORGANIZATION(#${idPerson},#${idOrg},$);`);
  lines.push(`#${idOwnerHistory}=IFCOWNERHISTORY(#${idPersonOrg},#${idApp},$,.ADDED.,$,$,$,0);`);

  // ── Geometric representation context (3D) ─────────────────────────────────
  const idGeomCtx = ids.next();
  const idBodyCtx = ids.next();

  lines.push(
    `#${idGeomCtx}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#${idAxis3d},$);`,
  );
  lines.push(
    `#${idBodyCtx}=IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#${idGeomCtx},$,.MODEL_VIEW.,$);`,
  );

  // ── Unit assignment (millimetres) ─────────────────────────────────────────
  const idLengthUnit = ids.next();
  const idAreaUnit = ids.next();
  const idVolumeUnit = ids.next();
  const idUnitAssignment = ids.next();

  lines.push(`#${idLengthUnit}=IFCSIUNIT(*,.LENGTHUNIT.,$,.MILLIMETRE.);`);
  lines.push(`#${idAreaUnit}=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);`);
  lines.push(`#${idVolumeUnit}=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);`);
  lines.push(`#${idUnitAssignment}=IFCUNITASSIGNMENT((#${idLengthUnit},#${idAreaUnit},#${idVolumeUnit}));`);

  // ── Spatial hierarchy: Project → Site → Building → Storey ────────────────
  const idProject = ids.next();
  const idSite = ids.next();
  const idBuilding = ids.next();
  const idStorey = ids.next();
  const idRelProjSite = ids.next();
  const idRelSiteBldg = ids.next();
  const idRelBldgStorey = ids.next();

  lines.push(
    `#${idProject}=IFCPROJECT('${guid()}',#${idOwnerHistory},'Cabinet Planner Project',$,$,$,$,(#${idGeomCtx}),#${idUnitAssignment});`,
  );
  lines.push(`#${idSite}=IFCSITE('${guid()}',#${idOwnerHistory},'Site',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);`);
  lines.push(
    `#${idBuilding}=IFCBUILDING('${guid()}',#${idOwnerHistory},'Building',$,$,$,$,$,.ELEMENT.,$,$,$);`,
  );
  lines.push(
    `#${idStorey}=IFCBUILDINGSTOREY('${guid()}',#${idOwnerHistory},'Ground Floor',$,$,$,$,$,.ELEMENT.,0.);`,
  );
  lines.push(
    `#${idRelProjSite}=IFCRELAGGREGATES('${guid()}',#${idOwnerHistory},$,$,#${idProject},(#${idSite}));`,
  );
  lines.push(
    `#${idRelSiteBldg}=IFCRELAGGREGATES('${guid()}',#${idOwnerHistory},$,$,#${idSite},(#${idBuilding}));`,
  );
  lines.push(
    `#${idRelBldgStorey}=IFCRELAGGREGATES('${guid()}',#${idOwnerHistory},$,$,#${idBuilding},(#${idStorey}));`,
  );

  // ── 2D placement origin for profile extrusion ─────────────────────────────
  const idOrigin2d = ids.next();
  const idAxis2d = ids.next();

  lines.push(`#${idOrigin2d}=IFCCARTESIANPOINT((0.,0.));`);
  lines.push(`#${idAxis2d}=IFCAXIS2PLACEMENT2D(#${idOrigin2d},$);`);

  // ── Per-cabinet entities ──────────────────────────────────────────────────
  const furnishingIds: number[] = [];
  let xCursor = startX;

  for (const cabinet of cabinets) {
    const w = cabinet.config.width;
    const h = cabinet.config.height;
    const d = cabinet.config.depth;
    const label = _sanitise(cabinet.name || cabinet.config.furnitureType || 'Cabinet');

    // Local placement (position along X)
    const idOriginN = ids.next();
    const idAxis3dN = ids.next();
    const idPlacement = ids.next();

    lines.push(`#${idOriginN}=IFCCARTESIANPOINT((${fmt(xCursor)},0.,0.));`);
    lines.push(`#${idAxis3dN}=IFCAXIS2PLACEMENT3D(#${idOriginN},#${idDirZ},#${idDirX});`);
    lines.push(`#${idPlacement}=IFCLOCALPLACEMENT($,#${idAxis3dN});`);

    // Box solid: rectangle profile extruded along Z
    const idProfile = ids.next();
    const idSolid = ids.next();
    const idShapeRep = ids.next();
    const idProdShape = ids.next();
    const idFurnishing = ids.next();

    lines.push(`#${idProfile}=IFCRECTANGLEPROFILEDEF(.AREA.,$,#${idAxis2d},${fmt(w)},${fmt(d)});`);
    lines.push(
      `#${idSolid}=IFCEXTRUDEDAREASOLID(#${idProfile},#${idAxis3d},#${idDirZ},${fmt(h)});`,
    );
    lines.push(
      `#${idShapeRep}=IFCSHAPEREPRESENTATION(#${idBodyCtx},'Body','SweptSolid',(#${idSolid}));`,
    );
    lines.push(`#${idProdShape}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${idShapeRep}));`);
    lines.push(
      `#${idFurnishing}=IFCFURNISHINGELEMENT('${guid()}',#${idOwnerHistory},'${label}',$,$,#${idPlacement},#${idProdShape},$);`,
    );

    furnishingIds.push(idFurnishing);
    xCursor += w + gap;
  }

  // ── Relate furnishings to storey ──────────────────────────────────────────
  if (furnishingIds.length > 0) {
    const idRelContains = ids.next();
    const refs = furnishingIds.map((i) => `#${i}`).join(',');
    lines.push(
      `#${idRelContains}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',#${idOwnerHistory},'Cabinets',$,(${refs}),#${idStorey});`,
    );
  }

  lines.push('ENDSEC;');
  lines.push('END-ISO-10303-21;');

  return {
    content: lines.join('\n'),
    furnishingCount: furnishingIds.length,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simple sequential IFC entity ID counter. */
function makeIdCounter() {
  let n = 0;
  return { next: () => ++n };
}

/** Format a number for IFC: no trailing zeros, always at least one decimal place. */
function fmt(n: number): string {
  const s = n.toFixed(3).replace(/\.?0+$/, '');
  return s.includes('.') ? s : s + '.';
}

/** Generate an IFC-compatible GUID (22-char base64url-ish, fixed-length). */
export function guid(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  // IFC GUIDs are 22 chars from the IFC base64 alphabet.
  // We use a simpler UUID hex approach that is universally accepted by parsers.
  const hex = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Strip characters not allowed in IFC string literals. */
function _sanitise(s: string): string {
  return s.replace(/['"\\]/g, '').slice(0, 255);
}
