import type { Configuration } from './config';
import { Point } from './types';

export function _attachPortsToCell(
  cell: any,
  polygonPoints: number[][],
  config: Configuration,
): void {
  const portRadius = config.diagram.port_radius;
  cell.prop('ports/groups', {
    all: {
      position: 'absolute',
      attrs: {
        circle: {
          r: portRadius,
          fill: config.diagram.accent_color,
          magnet: true,
          stroke: config.nodes.background_color,
          strokeWidth: config.diagram.port_stroke_width,
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
  config: Configuration,
): any {
  const cell = new namespace.standard.Rectangle();
  cell.markup = [
    { tagName: 'rect', selector: 'body', className: 'body' },
    ...SHARED_CELL_MARKUP,
  ];
  cell.position(position.x, position.y).resize(width, height);
  cell.attr({
    body: {
      fill: config.nodes.background_color,
      stroke: config.nodes.border_color,
      strokeWidth: 2,
      rx: 5,
      ry: 5,
    },
    ...SHARED_CELL_ATTRS(config),
  });
  cell.set({ type: shapeType, ...SHARED_CELL_DEFAULTS(config) });
  _attachPortsToCell(cell, [], config);
  return cell;
}
export function _buildEllipseCell(
  position: Point,
  namespace: any,
  shapeType: string,
  width: number,
  height: number,
  config: Configuration,
): any {
  const cell = new namespace.standard.Ellipse();
  cell.markup = [
    { tagName: 'ellipse', selector: 'body', className: 'body' },
    ...SHARED_CELL_MARKUP,
  ];
  cell.position(position.x, position.y).resize(width, height);
  cell.attr({
    body: {
      fill: config.nodes.background_color,
      stroke: config.nodes.border_color,
      strokeWidth: 2,
    },
    ...SHARED_CELL_ATTRS(config),
  });
  cell.set({ type: shapeType, ...SHARED_CELL_DEFAULTS(config) });
  _attachPortsToCell(cell, [], config);
  return cell;
}
export function _buildPolygonCell(
  position: Point,
  namespace: any,
  shapeType: string,
  width: number,
  height: number,
  points: number[][],
  config: Configuration,
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
      fill: config.nodes.background_color,
      stroke: config.nodes.border_color,
      strokeWidth: 2,
    },
    ...SHARED_CELL_ATTRS(config),
  });
  cell.set({ type: shapeType, ...SHARED_CELL_DEFAULTS(config) });
  _attachPortsToCell(cell, points, config);
  return cell;
}
export function SHARED_CELL_DEFAULTS(config: Configuration) {
  return {
    description: '',
    imageUrl: '',
    imageWidth: config.nodes.image_width,
    imageHeight: config.nodes.image_height,
    fontSizePercent: config.nodes.font_size_percent_default,
  };
}
export function SHARED_CELL_ATTRS(config: Configuration) {
  return {
    image: { display: 'none' },
    label: {
      fill: config.nodes.label_color,
      fontSize: config.nodes.label_font_size,
      fontWeight: 'bold',
      pointerEvents: 'none',
    },
    descriptionLabel: {
      text: '',
      fill: config.nodes.description_color,
      fontSize: config.nodes.description_font_size,
      pointerEvents: 'none',
    },
  };
} // =============================================================
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
