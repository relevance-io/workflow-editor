import type { DiagramNode } from './node';

export type ArrowMarkerName = 'none' | 'classic' | 'block';
export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type ConnectorType = 'curved' | 'straight' | 'elbow';
export type ShapeType =
  | 'rect'
  | 'square'
  | 'ellipse'
  | 'circle'
  | 'diamond'
  | 'triangle'
  | 'hexagon'
  | 'pentagon'
  | 'octagon';

export interface Point {
  x: number;
  y: number;
}

export interface ArrowMarker {
  type: string;
  d: string;
}

export interface FieldDefinition {
  label?: string;
  type?:
    | 'text'
    | 'number'
    | 'textarea'
    | 'boolean'
    | 'choice'
    | 'color'
    | 'object';
  default?: any;
  choices?: Record<string, string>;
  min?: number;
  max?: number;
  visible?: boolean;
  readonly?: boolean;
  serialize?: (value: any, node: DiagramNode) => any;
  deserialize?: (raw: any, node: DiagramNode) => any;
  onChange?: (node: DiagramNode, newValue: any, oldValue: any) => void;
}

export type Schema = Record<string, FieldDefinition>;

export interface SerializedNode {
  id: string;
  nodeClass: string;
  x?: number;
  y?: number;
  props: Record<string, any>;
  customProps: Record<string, any>;
}

export interface SerializedEdge {
  sourceId: string;
  targetId: string;
  sourcePort: number | null;
  targetPort: number | null;
  label: string;
  labelColor: string;
  labelFontSize: number;
  lineColor: string;
  lineWidth: number;
  lineStyle: LineStyle;
  sourceArrow: ArrowMarkerName;
  targetArrow: ArrowMarkerName;
  connectorType: ConnectorType;
  description: string;
  vertices: Point[];
}

// TODO: Replace ad-hoc __schema, __defaultOptions, __baseClass, __visibleProps,
// __nodeLabel, __nodeName constructor stamps with a typed TypeRegistry map.
export type SerializedNodeType =
  | string
  | {
      nodeClass: string;
      name?: string;
      baseClass: string;
      defaultOptions: NodeOptions;
      schema: Schema;
      visibleProps?: BuiltInNodeProp[];
      editProp?: string;
    };

export interface SerializedDiagram {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  nodeTypes?: SerializedNodeType[];
}

export interface NodeOptions {
  label?: string;
  labelColor?: string;
  labelFontSize?: number;
  description?: string;
  descriptionColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  [key: string]: any;
}

export interface TouchState {
  type: 'pan' | 'pinch';
  startX?: number;
  startY?: number;
  initialTranslation?: { tx: number; ty: number };
  initialDistance?: number;
  initialMidpoint?: Point;
  initialScale?: number;
}

export type BuiltInNodeProp =
  | 'label'
  | 'labelColor'
  | 'labelFontSize'
  | 'description'
  | 'descriptionColor'
  | 'backgroundColor'
  | 'borderColor'
  | 'imageUrl'
  | 'imageWidth'
  | 'imageHeight';

export class UnknownNodeTypeError extends Error {
  public readonly nodeClass: string;

  constructor(nodeClass: string) {
    super(
      `Unknown node type: "${nodeClass}". Make sure it has been registered before deserializing.`,
    );
    this.name = 'UnknownNodeTypeError';
    this.nodeClass = nodeClass;
    Object.setPrototypeOf(this, UnknownNodeTypeError.prototype);
  }
}
