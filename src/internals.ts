import * as config from './config';
import { Point } from './types';

export function _attachPortsToCell(
  cell: any,
  polygonPoints: number[][],
  portRadius: number,
): void {
  cell.prop('ports/groups', {
    all: {
      position: 'absolute',
      attrs: {
        circle: {
          r: portRadius,
          fill: config.COLOR_ACCENT,
          magnet: true,
          stroke: config.COLOR_NODE_BACKGROUND,
          strokeWidth: config.PORT_STROKE_WIDTH,
          pointerEvents: 'all',
        },
        text: { display: 'none' },
      },
    },
  });

  let ports: any[];
  if (polygonPoints.length === 0) {
    ports = [
      { group: 'all', args: { x: '50%', y: '0%', dy: -1 } },
      { group: 'all', args: { x: '100%', y: '50%' } },
      { group: 'all', args: { x: '50%', y: '100%', dy: 1 } },
      { group: 'all', args: { x: '0%', y: '50%' } },
    ];
  } else {
    ports = polygonPoints.map((point, i) => {
      const next = polygonPoints[(i + 1) % polygonPoints.length];
      return {
        group: 'all',
        args: {
          x: `${((point[0] + next[0]) / 2 / 20) * 100}%`,
          y: `${((point[1] + next[1]) / 2 / 20) * 100}%`,
        },
      };
    });
  }
  cell.addPorts(ports);
}
export function _buildRectangleCell(
  position: Point,
  namespace: any,
  shapeType: string,
  width: number,
  height: number,
  portRadius: number,
): any {
  const cell = new namespace.standard.Rectangle();
  cell.markup = [
    { tagName: 'rect', selector: 'body', className: 'body' },
    ...SHARED_CELL_MARKUP,
  ];
  cell.position(position.x, position.y).resize(width, height);
  cell.attr({
    body: {
      fill: config.COLOR_NODE_BACKGROUND,
      stroke: config.COLOR_NODE_BORDER,
      strokeWidth: 2,
      rx: 5,
      ry: 5,
    },
    ...SHARED_CELL_ATTRS,
  });
  cell.set({ type: shapeType, ...SHARED_CELL_DEFAULTS });
  _attachPortsToCell(cell, [], portRadius);
  return cell;
}
export function _buildEllipseCell(
  position: Point,
  namespace: any,
  shapeType: string,
  width: number,
  height: number,
  portRadius: number,
): any {
  const cell = new namespace.standard.Ellipse();
  cell.markup = [
    { tagName: 'ellipse', selector: 'body', className: 'body' },
    ...SHARED_CELL_MARKUP,
  ];
  cell.position(position.x, position.y).resize(width, height);
  cell.attr({
    body: {
      fill: config.COLOR_NODE_BACKGROUND,
      stroke: config.COLOR_NODE_BORDER,
      strokeWidth: 2,
    },
    ...SHARED_CELL_ATTRS,
  });
  cell.set({ type: shapeType, ...SHARED_CELL_DEFAULTS });
  _attachPortsToCell(cell, [], portRadius);
  return cell;
}
export function _buildPolygonCell(
  position: Point,
  namespace: any,
  shapeType: string,
  width: number,
  height: number,
  points: number[][],
  portRadius: number,
): any {
  const cell = new namespace.standard.Polygon();
  cell.markup = [
    { tagName: 'polygon', selector: 'body', className: 'body' },
    ...SHARED_CELL_MARKUP,
  ];
  cell.position(position.x, position.y).resize(width, height);
  cell.attr({
    body: {
      refPoints: points.map((point) => point.join(',')).join(' '),
      fill: config.COLOR_NODE_BACKGROUND,
      stroke: config.COLOR_NODE_BORDER,
      strokeWidth: 2,
    },
    ...SHARED_CELL_ATTRS,
  });
  cell.set({ type: shapeType, ...SHARED_CELL_DEFAULTS });
  _attachPortsToCell(cell, points, portRadius);
  return cell;
}
export const SHARED_CELL_DEFAULTS = {
  description: '',
  imageUrl: '',
  imageWidth: config.IMAGE_DEFAULT_WIDTH,
  imageHeight: config.IMAGE_DEFAULT_HEIGHT,
  fontSizePercent: config.FONT_SIZE_PERCENT_DEFAULT,
};
export const SHARED_CELL_ATTRS = {
  image: { display: 'none' },
  label: {
    fill: config.COLOR_LABEL,
    fontSize: config.FONT_SIZE_LABEL,
    fontWeight: 'bold',
    pointerEvents: 'none',
  },
  descriptionLabel: {
    text: '',
    fill: config.COLOR_DESCRIPTION,
    fontSize: config.FONT_SIZE_DESCRIPTION,
    pointerEvents: 'none',
  },
}; // =============================================================
// Shared JointJS cell construction helpers
// =============================================================

export const SHARED_CELL_MARKUP = [
  { tagName: 'image', selector: 'image', className: 'image' },
  { tagName: 'text', selector: 'label', className: 'label' },
  {
    tagName: 'text',
    selector: 'descriptionLabel',
    className: 'descriptionLabel',
  },
];
