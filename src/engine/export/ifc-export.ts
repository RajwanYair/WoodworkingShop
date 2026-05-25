/**
 * Sprint 79 — IFC export (Industry Foundation Classes, IFC 2x3 SPF subset).
 *
 * Produces a minimal ISO 10303-21 / STEP Physical File containing:
 *   IFCPROJECT → IFCSITE → IFCBUILDING → IFCBUILDINGSTOREY → IFCFURNITURE
 *
 * Each cabinet Part is represented as an IFCMEMBER with an
 * IFCBOUNDINGBOX geometry. The output is a plain-text *.ifc file that
 * can be opened by Autodesk Revit, ArchiCAD, FreeCAD, and BlenderBIM.
 *
 * NOTE: Pure TypeScript — no React, no DOM, no side effects.
 */

import type { CabinetConfig, Part } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function iso(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

let _eid = 1;
function eid(): number {
  return _eid++;
}

function resetIds(): void {
  _eid = 1;
}

function line(id: number, entity: string): string {
  return `#${id}=${entity}`;
}

// ─── IFC geometry helpers ─────────────────────────────────────────────────────

function ifcCartesianPoint(id: number, x: number, y: number, z: number): string {
  return line(id, `IFCCARTESIANPOINT((${x}.,${y}.,${z}.));`);
}

function ifcDirection(id: number, x: number, y: number, z: number): string {
  return line(id, `IFCDIRECTION((${x}.,${y}.,${z}.));`);
}

function ifcAxis2Placement3D(id: number, origin: number, axis: number, refDir: number): string {
  return line(id, `IFCAXIS2PLACEMENT3D(#${origin},#${axis},#${refDir});`);
}

function ifcLocalPlacement(id: number, relativeTo: number | null, axis: number): string {
  const rel = relativeTo !== null ? `#${relativeTo}` : '$';
  return line(id, `IFCLOCALPLACEMENT(${rel},#${axis});`);
}

function ifcBoundingBox(id: number, corner: number, xDim: number, yDim: number, zDim: number): string {
  return line(id, `IFCBOUNDINGBOX(#${corner},${xDim}.,${yDim}.,${zDim}.);`);
}

// ─── public API ──────────────────────────────────────────────────────────────

/** Result of {@link generateIfcContent}. */
export interface IfcResult {
  /** Complete IFC-SPF text content (save as *.ifc). */
  content: string;
  /** Number of Part entities written. */
  partCount: number;
}

/**
 * Generate a minimal IFC 2x3 SPF file for the given cabinet configuration
 * and its expanded parts list.
 *
 * @param config - Cabinet configuration (dimensions, name, etc.)
 * @param parts  - Expanded part list from `generateParts(config)`
 * @returns `IfcResult` with the full IFC text and part count.
 */
export function generateIfcContent(config: CabinetConfig, parts: Part[]): IfcResult {
  resetIds();

  const timestamp = iso();
  const projectName = `Cabinet ${config.width}x${config.height}x${config.depth}`;

  // Entity ids allocated in order
  const idOwnerHistory = eid();
  const idPersonOrg = eid();
  const idPerson = eid();
  const idOrg = eid();

  // Geometry context
  const idCtx = eid();
  const idCtxOrigin = eid();
  const idCtxAxis = eid();
  const idCtxRefDir = eid();

  const idWorldOrigin = eid();
  const idWorldAxis = eid();
  const idWorldRefDir = eid();
  const idWorldPlacement = eid();
  const idWorldAxis2D = eid();

  const idProject = eid();
  const idSite = eid();
  const idBuilding = eid();
  const idStorey = eid();
  const idFurniture = eid();

  // Site placement
  const idSiteOrigin = eid();
  const idSiteAxis = eid();
  const idSiteRef = eid();
  const idSiteAxis2P = eid();
  const idSitePlacement = eid();

  // Building placement
  const idBuildOrigin = eid();
  const idBuildAxis = eid();
  const idBuildRef = eid();
  const idBuildAxis2P = eid();
  const idBuildPlacement = eid();

  // Storey placement
  const idStoreyOrigin = eid();
  const idStoreyAxis = eid();
  const idStoreyRef = eid();
  const idStoreyAxis2P = eid();
  const idStoreyPlacement = eid();

  // Furniture placement
  const idFurnOrigin = eid();
  const idFurnAxis = eid();
  const idFurnRef = eid();
  const idFurnAxis2P = eid();
  const idFurnPlacement = eid();

  const lines: string[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  const header = [
    'ISO-10303-21;',
    'HEADER;',
    `FILE_DESCRIPTION(('Cabinet Planner IFC Export - Sprint 79'),'2;1');`,
    `FILE_NAME('cabinet-${config.width}x${config.height}x${config.depth}.ifc','${timestamp}',('Cabinet Planner'),('Cabinet Planner'),'IFC2X3','Cabinet Planner v4.0','');`,
    `FILE_SCHEMA(('IFC2X3'));`,
    'ENDSEC;',
    'DATA;',
  ].join('\n');

  // ── Owner history ─────────────────────────────────────────────────────────
  lines.push(line(idPerson, `IFCPERSON($,'CabinetPlanner','User',$,$,$,$,$);`));
  lines.push(line(idOrg, `IFCORGANIZATION($,'Cabinet Planner',$,$,$);`));
  lines.push(line(idPersonOrg, `IFCPERSONANDORGANIZATION(#${idPerson},#${idOrg},$);`));
  lines.push(line(idOwnerHistory, `IFCOWNERHISTORY(#${idPersonOrg},#${idOrg},$,.NOCHANGE.,$,$,$,0);`));

  // ── Geometry context ──────────────────────────────────────────────────────
  lines.push(ifcCartesianPoint(idCtxOrigin, 0, 0, 0));
  lines.push(ifcDirection(idCtxAxis, 0, 0, 1));
  lines.push(ifcDirection(idCtxRefDir, 1, 0, 0));
  lines.push(line(idCtx, `IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-5,#${idCtxOrigin + 0},$);`));

  // ── World coordinates ─────────────────────────────────────────────────────
  lines.push(ifcCartesianPoint(idWorldOrigin, 0, 0, 0));
  lines.push(ifcDirection(idWorldAxis, 0, 0, 1));
  lines.push(ifcDirection(idWorldRefDir, 1, 0, 0));
  lines.push(ifcAxis2Placement3D(idWorldPlacement, idWorldOrigin, idWorldAxis, idWorldRefDir));
  lines.push(line(idWorldAxis2D, `IFCAXIS2PLACEMENT2D(#${idWorldOrigin},$);`));
  // suppress unused
  void idCtxAxis;
  void idCtxRefDir;

  // ── Project ───────────────────────────────────────────────────────────────
  lines.push(
    line(
      idProject,
      `IFCPROJECT('${idProject}',#${idOwnerHistory},'${projectName}',$,$,$,$,(#${idCtx}),#${idWorldAxis2D});`,
    ),
  );

  // ── Site ──────────────────────────────────────────────────────────────────
  lines.push(ifcCartesianPoint(idSiteOrigin, 0, 0, 0));
  lines.push(ifcDirection(idSiteAxis, 0, 0, 1));
  lines.push(ifcDirection(idSiteRef, 1, 0, 0));
  lines.push(ifcAxis2Placement3D(idSiteAxis2P, idSiteOrigin, idSiteAxis, idSiteRef));
  lines.push(ifcLocalPlacement(idSitePlacement, null, idSiteAxis2P));
  lines.push(
    line(idSite, `IFCSITE('${idSite}',#${idOwnerHistory},'Site',$,$,#${idSitePlacement},$,$,.ELEMENT.,$,$,$,$,$);`),
  );

  // ── Building ──────────────────────────────────────────────────────────────
  lines.push(ifcCartesianPoint(idBuildOrigin, 0, 0, 0));
  lines.push(ifcDirection(idBuildAxis, 0, 0, 1));
  lines.push(ifcDirection(idBuildRef, 1, 0, 0));
  lines.push(ifcAxis2Placement3D(idBuildAxis2P, idBuildOrigin, idBuildAxis, idBuildRef));
  lines.push(ifcLocalPlacement(idBuildPlacement, idSitePlacement, idBuildAxis2P));
  lines.push(
    line(
      idBuilding,
      `IFCBUILDING('${idBuilding}',#${idOwnerHistory},'Building',$,$,#${idBuildPlacement},$,$,.ELEMENT.,$,$,$);`,
    ),
  );

  // ── Building Storey ───────────────────────────────────────────────────────
  lines.push(ifcCartesianPoint(idStoreyOrigin, 0, 0, 0));
  lines.push(ifcDirection(idStoreyAxis, 0, 0, 1));
  lines.push(ifcDirection(idStoreyRef, 1, 0, 0));
  lines.push(ifcAxis2Placement3D(idStoreyAxis2P, idStoreyOrigin, idStoreyAxis, idStoreyRef));
  lines.push(ifcLocalPlacement(idStoreyPlacement, idBuildPlacement, idStoreyAxis2P));
  lines.push(
    line(
      idStorey,
      `IFCBUILDINGSTOREY('${idStorey}',#${idOwnerHistory},'Ground Floor',$,$,#${idStoreyPlacement},$,$,.ELEMENT.,0.);`,
    ),
  );

  // ── Furniture element (the whole cabinet) ─────────────────────────────────
  lines.push(ifcCartesianPoint(idFurnOrigin, 0, 0, 0));
  lines.push(ifcDirection(idFurnAxis, 0, 0, 1));
  lines.push(ifcDirection(idFurnRef, 1, 0, 0));
  lines.push(ifcAxis2Placement3D(idFurnAxis2P, idFurnOrigin, idFurnAxis, idFurnRef));
  lines.push(ifcLocalPlacement(idFurnPlacement, idStoreyPlacement, idFurnAxis2P));
  lines.push(
    line(
      idFurniture,
      `IFCFURNISHINGELEMENT('${idFurniture}',#${idOwnerHistory},'${projectName}',$,$,#${idFurnPlacement},$,$);`,
    ),
  );

  // ── Parts as IFCMEMBER with bounding-box geometry ─────────────────────────
  // Parts are stacked along the Z axis (depth) with a small gap so they don't overlap.
  let zOffset = 0;
  let partCount = 0;

  for (const part of parts) {
    const qty = part.qty;
    const xDim = Math.round(part.width);
    const yDim = Math.round(part.thickness);
    const zDim = Math.round(part.length);

    for (let i = 0; i < qty; i++) {
      const idPartOrigin = eid();
      const idPartAxis = eid();
      const idPartRef = eid();
      const idPartAxis2P = eid();
      const idPartPlacement = eid();
      const idPartCorner = eid();
      const idPartBBox = eid();
      const idPartShape = eid();
      const idPartRepr = eid();
      const idPartProdRepr = eid();
      const idMember = eid();

      const partLabel = `${part.name.en} (${i + 1}/${qty})`;

      lines.push(ifcCartesianPoint(idPartOrigin, 0, zOffset, 0));
      lines.push(ifcDirection(idPartAxis, 0, 0, 1));
      lines.push(ifcDirection(idPartRef, 1, 0, 0));
      lines.push(ifcAxis2Placement3D(idPartAxis2P, idPartOrigin, idPartAxis, idPartRef));
      lines.push(ifcLocalPlacement(idPartPlacement, idFurnPlacement, idPartAxis2P));

      lines.push(ifcCartesianPoint(idPartCorner, 0, 0, 0));
      lines.push(ifcBoundingBox(idPartBBox, idPartCorner, xDim, yDim, zDim));
      lines.push(line(idPartShape, `IFCSHAPEREPRESENTATION(#${idCtx},'Body','BoundingBox',(#${idPartBBox}));`));
      lines.push(line(idPartRepr, `IFCPRODUCTDEFINITIONSHAPE($,$,(#${idPartShape}));`));
      lines.push(
        line(
          idPartProdRepr,
          `IFCMEMBER('${idMember}',#${idOwnerHistory},'${partLabel}','${part.material}',$,#${idPartPlacement},#${idPartRepr},$);`,
        ),
      );
      void idMember;

      zOffset += zDim + 10; // 10 mm gap between stacked parts
      partCount++;
    }
  }

  // ── Relationships ─────────────────────────────────────────────────────────
  const idRelSiteProject = eid();
  const idRelBuildSite = eid();
  const idRelStoreyBuild = eid();
  const idRelFurnStorey = eid();

  lines.push(
    line(
      idRelSiteProject,
      `IFCRELAGGREGATES('${idRelSiteProject}',#${idOwnerHistory},$,$,#${idProject},(#${idSite}));`,
    ),
  );
  lines.push(
    line(idRelBuildSite, `IFCRELAGGREGATES('${idRelBuildSite}',#${idOwnerHistory},$,$,#${idSite},(#${idBuilding}));`),
  );
  lines.push(
    line(
      idRelStoreyBuild,
      `IFCRELAGGREGATES('${idRelStoreyBuild}',#${idOwnerHistory},$,$,#${idBuilding},(#${idStorey}));`,
    ),
  );
  lines.push(
    line(
      idRelFurnStorey,
      `IFCRELAGGREGATES('${idRelFurnStorey}',#${idOwnerHistory},$,$,#${idStorey},(#${idFurniture}));`,
    ),
  );

  const content = header + '\n' + lines.join('\n') + '\nENDSEC;\nEND-ISO-10303-21;\n';

  return { content, partCount };
}
