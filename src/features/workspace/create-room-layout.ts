import { MAX_ROOM_DIMENSION_MM } from '../../engine/room/room-planner';
import type { RoomLayout } from '../../engine/core/types';
import type { CabinetConfig } from '../../engine/core/types';

const CLEARANCE_MM = 300;
const CABINET_GAP_MM = 150;
const TARGET_ROOM_WIDTH_MM = 6000;
const MIN_ROOM_DIMENSION_MM = 3000;

/**
 * Arrange the current project cabinets in a new room layout.
 *
 * @param name Project name used as the room name.
 * @param cabinets Cabinet instances to place in the room.
 * @param createId Creates stable-unique IDs for the layout and cabinets.
 * @returns A room layout with every project cabinet placed without overlap.
 * @throws {RangeError} If the cabinets cannot fit within supported room dimensions.
 */
export function createRoomLayoutFromProject(
  name: string,
  cabinets: readonly { name: string; config: Pick<CabinetConfig, 'width' | 'depth'> }[],
  createId: () => string,
): RoomLayout {
  const maxCabinetWidth = Math.max(0, ...cabinets.map(({ config }) => config.width));
  const requestedWidth =
    cabinets.reduce((sum, { config }) => sum + config.width, 0) +
    Math.max(0, cabinets.length - 1) * CABINET_GAP_MM +
    CLEARANCE_MM * 2;
  const roomWidth = Math.max(
    MIN_ROOM_DIMENSION_MM,
    maxCabinetWidth + CLEARANCE_MM * 2,
    Math.min(TARGET_ROOM_WIDTH_MM, requestedWidth),
  );

  if (roomWidth > MAX_ROOM_DIMENSION_MM) {
    throw new RangeError('createRoomLayoutFromProject: cabinet width exceeds supported room dimensions');
  }

  let x = CLEARANCE_MM;
  let y = CLEARANCE_MM;
  let rowDepth = 0;
  const roomCabinets = cabinets.map(({ name: cabinetName, config }) => {
    if (x > CLEARANCE_MM && x + config.width > roomWidth - CLEARANCE_MM) {
      y += rowDepth + CABINET_GAP_MM;
      x = CLEARANCE_MM;
      rowDepth = 0;
    }
    const placed = {
      id: createId(),
      name: cabinetName,
      x,
      y,
      width: config.width,
      depth: config.depth,
    };
    x += config.width + CABINET_GAP_MM;
    rowDepth = Math.max(rowDepth, config.depth);
    return placed;
  });
  const roomDepth = Math.max(MIN_ROOM_DIMENSION_MM, y + rowDepth + CLEARANCE_MM);

  if (roomDepth > MAX_ROOM_DIMENSION_MM) {
    throw new RangeError('createRoomLayoutFromProject: cabinet count exceeds supported room dimensions');
  }

  return {
    id: createId(),
    name: name.trim(),
    roomWidth,
    roomDepth,
    roomHeight: 2400,
    cabinets: roomCabinets,
  };
}
