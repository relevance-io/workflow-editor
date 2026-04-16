import { defaultConfig } from './config';
import { _buildPolygonCell } from './internals';
import { _buildEllipseCell } from './internals';
import { _buildRectangleCell } from './internals';
import { DiagramNode, NodeConstructor } from './node';
import { ShapeType, Point } from './types';

// =============================================================
// Concrete node shape subclasses
// =============================================================

export class RectangleNode extends DiagramNode {
  public static nodeClass = 'RectangleNode';
  public get portCount(): number {
    return 4;
  }
  public _getShapeType(): ShapeType {
    return 'rect';
  }
  public _buildCell(
    position: Point,
    namespace: any,
  ): any {
    const cfg = this.editor?.config ?? defaultConfig;
    const cell = _buildRectangleCell(
      position,
      namespace,
      'rect',
      cfg.nodes.default_width,
      cfg.nodes.default_height,
      cfg,
    );
    cell.set('nodeClass', 'RectangleNode');
    return cell;
  }
}
export class SquareNode extends DiagramNode {
  public static nodeClass = 'SquareNode';
  public get portCount(): number {
    return 4;
  }
  public _getShapeType(): ShapeType {
    return 'square';
  }
  public _buildCell(
    position: Point,
    namespace: any,
  ): any {
    const cfg = this.editor?.config ?? defaultConfig;
    const cell = _buildRectangleCell(
      position,
      namespace,
      'square',
      cfg.nodes.squarish_size,
      cfg.nodes.squarish_size,
      cfg,
    );
    cell.set('nodeClass', 'SquareNode');
    return cell;
  }
}
export class EllipseNode extends DiagramNode {
  public static nodeClass = 'EllipseNode';
  public get portCount(): number {
    return 4;
  }
  public _getShapeType(): ShapeType {
    return 'ellipse';
  }
  public _buildCell(
    position: Point,
    namespace: any,
  ): any {
    const cfg = this.editor?.config ?? defaultConfig;
    const cell = _buildEllipseCell(
      position,
      namespace,
      'ellipse',
      cfg.nodes.default_width,
      cfg.nodes.default_height,
      cfg,
    );
    cell.set('nodeClass', 'EllipseNode');
    return cell;
  }
}
export class CircleNode extends DiagramNode {
  public static nodeClass = 'CircleNode';
  public get portCount(): number {
    return 4;
  }
  public _getShapeType(): ShapeType {
    return 'circle';
  }
  public _buildCell(
    position: Point,
    namespace: any,
  ): any {
    const cfg = this.editor?.config ?? defaultConfig;
    const cell = _buildEllipseCell(
      position,
      namespace,
      'circle',
      cfg.nodes.squarish_size,
      cfg.nodes.squarish_size,
      cfg,
    );
    cell.set('nodeClass', 'CircleNode');
    return cell;
  }
}
export class DiamondNode extends DiagramNode {
  public static nodeClass = 'DiamondNode';
  public get portCount(): number {
    return 4;
  }
  public _getShapeType(): ShapeType {
    return 'diamond';
  }
  public _buildCell(
    position: Point,
    namespace: any,
  ): any {
    const cfg = this.editor?.config ?? defaultConfig;
    const cell = _buildPolygonCell(
      position,
      namespace,
      'diamond',
      cfg.nodes.squarish_size,
      cfg.nodes.squarish_size,
      [
        [0, 10],
        [10, 0],
        [20, 10],
        [10, 20],
      ],
      cfg,
    );
    cell.set('nodeClass', 'DiamondNode');
    return cell;
  }
}
export class TriangleNode extends DiagramNode {
  public static nodeClass = 'TriangleNode';
  public get portCount(): number {
    return 3;
  }
  public _getShapeType(): ShapeType {
    return 'triangle';
  }
  public _buildCell(
    position: Point,
    namespace: any,
  ): any {
    const cfg = this.editor?.config ?? defaultConfig;
    const cell = _buildPolygonCell(
      position,
      namespace,
      'triangle',
      cfg.nodes.default_width,
      cfg.nodes.default_height,
      [
        [10, 0],
        [20, 20],
        [0, 20],
      ],
      cfg,
    );
    cell.set('nodeClass', 'TriangleNode');
    return cell;
  }
}
export class HexagonNode extends DiagramNode {
  public static nodeClass = 'HexagonNode';
  public get portCount(): number {
    return 6;
  }
  public _getShapeType(): ShapeType {
    return 'hexagon';
  }
  public _buildCell(
    position: Point,
    namespace: any,
  ): any {
    const cfg = this.editor?.config ?? defaultConfig;
    const cell = _buildPolygonCell(
      position,
      namespace,
      'hexagon',
      cfg.nodes.default_width,
      cfg.nodes.default_height,
      [
        [5, 0],
        [15, 0],
        [20, 10],
        [15, 20],
        [5, 20],
        [0, 10],
      ],
      cfg,
    );
    cell.set('nodeClass', 'HexagonNode');
    return cell;
  }
}
export class PentagonNode extends DiagramNode {
  public static nodeClass = 'PentagonNode';
  public get portCount(): number {
    return 5;
  }
  public _getShapeType(): ShapeType {
    return 'pentagon';
  }
  public _buildCell(
    position: Point,
    namespace: any,
  ): any {
    const cfg = this.editor?.config ?? defaultConfig;
    const cell = _buildPolygonCell(
      position,
      namespace,
      'pentagon',
      cfg.nodes.default_width,
      cfg.nodes.default_height,
      [
        [10, 0],
        [20, 7],
        [16, 20],
        [4, 20],
        [0, 7],
      ],
      cfg,
    );
    cell.set('nodeClass', 'PentagonNode');
    return cell;
  }
}
export class OctagonNode extends DiagramNode {
  public static nodeClass = 'OctagonNode';
  public get portCount(): number {
    return 8;
  }
  public _getShapeType(): ShapeType {
    return 'octagon';
  }
  public _buildCell(
    position: Point,
    namespace: any,
  ): any {
    const cfg = this.editor?.config ?? defaultConfig;
    const cell = _buildPolygonCell(
      position,
      namespace,
      'octagon',
      cfg.nodes.default_width,
      cfg.nodes.default_height,
      [
        [6, 0],
        [14, 0],
        [20, 6],
        [20, 14],
        [14, 20],
        [6, 20],
        [0, 14],
        [0, 6],
      ],
      cfg,
    );
    cell.set('nodeClass', 'OctagonNode');
    return cell;
  }
}
// =============================================================
// DiagramEditor — the main controller
// =============================================================
export const builtInShapes: {
  type: ShapeType;
  cls: NodeConstructor;
  name: string;
  category: string;
  subcategory?: string;
}[] = [
  { type: 'rect',     cls: RectangleNode, name: 'Rectangle', category: 'Shapes', subcategory: 'Basic'    },
  { type: 'square',   cls: SquareNode,    name: 'Square',    category: 'Shapes', subcategory: 'Basic'    },
  { type: 'ellipse',  cls: EllipseNode,   name: 'Ellipse',   category: 'Shapes', subcategory: 'Basic'    },
  { type: 'circle',   cls: CircleNode,    name: 'Circle',    category: 'Shapes', subcategory: 'Basic'    },
  { type: 'diamond',  cls: DiamondNode,   name: 'Diamond',   category: 'Shapes', subcategory: 'Basic'    },
  { type: 'triangle', cls: TriangleNode,  name: 'Triangle',  category: 'Shapes', subcategory: 'Polygons' },
  { type: 'hexagon',  cls: HexagonNode,   name: 'Hexagon',   category: 'Shapes', subcategory: 'Polygons' },
  { type: 'pentagon', cls: PentagonNode,  name: 'Pentagon',  category: 'Shapes', subcategory: 'Polygons' },
  { type: 'octagon',  cls: OctagonNode,   name: 'Octagon',   category: 'Shapes', subcategory: 'Polygons' },
];
