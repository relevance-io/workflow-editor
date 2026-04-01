// =============================================================
// Declarations for external libraries (JointJS, Dagre)
// =============================================================

import * as joint from 'jointjs';
import * as dagre from 'dagre';

// =============================================================
// Constants
// =============================================================

// Colors
const COLOR_NODE_BACKGROUND = '#ffffff';
const COLOR_NODE_BORDER = '#adb5bd';
const COLOR_LABEL = '#212529';
const COLOR_DESCRIPTION = '#6c757d';
const COLOR_EDGE_LINE = '#495057';
const COLOR_EDGE_LABEL = '#333333';
const COLOR_ACCENT = '#3498db';
const COLOR_GRID_DOT = '#e9ecef';
const COLOR_DIVIDER = '#dee2e6';
const COLOR_EDGE_LABEL_BG = 'white';
const OPACITY_EDGE_LABEL_BG = 0.9;

// Default node sizes
const NODE_DEFAULT_WIDTH = 140;
const NODE_DEFAULT_HEIGHT = 50;
const NODE_SQUARISH_SIZE = 80;
const NODE_MIN_WIDTH = 140;
const NODE_MIN_HEIGHT = 50;
const NODE_MIN_SQUARISH_SIZE = 80;

// Default image dimensions
const IMAGE_DEFAULT_WIDTH = 32;
const IMAGE_DEFAULT_HEIGHT = 32;

// Font sizes
const FONT_SIZE_LABEL = 13;
const FONT_SIZE_DESCRIPTION = 11;
const FONT_SIZE_EDGE_LABEL = 12;
const FONT_SIZE_PERCENT_DEFAULT = 100;

// UI measurements
const PORT_RADIUS = 6;
const PORT_STROKE_WIDTH = 2;
const NODE_PADDING = 15;
const IMAGE_SPACING = 10;
const SELECTION_PADDING = 5;
const SELECTION_STROKE_WIDTH = 3;
const EDGE_REMOVE_DISTANCE = 20;
const EDGE_ELBOW_PADDING = 20;
const SNAP_RADIUS = 25;
const ROUTER_PADDING = 30;
const ROUTER_MAX_ITER = 200;
const DUPLICATE_OFFSET = 40;
const ZOOM_FIT_PADDING = 50;
const SPIRAL_SEARCH_LIMIT = 30;

// Polygon shape ratios
const POLYGON_ASPECT_RATIO = 1.2;
const TRIANGLE_SCALE = 1.25;

// Zoom
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 10;
const ZOOM_IN_FACTOR = 1.25;
const ZOOM_OUT_FACTOR = 0.8;
const ZOOM_FIT_MIN_SCALE = 0.2;
const ZOOM_FIT_MAX_SCALE = 2;
const ZOOM_WHEEL_SENSITIVITY = 0.0015;

// Timing (ms)
const SIDEBAR_RESIZE_INTERVAL = 16;
const SIDEBAR_ANIM_DURATION = 350;
const BLOB_URL_REVOKE_DELAY = 1000;

// =============================================================
// Shared types
// =============================================================

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

// =============================================================
// UnknownNodeTypeError
// =============================================================

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

// =============================================================
// EventBus — minimal pub/sub base class
// =============================================================

export class EventBus {
  private listeners: Record<string, Array<(...args: any[]) => void>>;

  constructor() {
    this.listeners = {};
  }

  public on(eventName: string, callback: (...args: any[]) => void): this {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    return this;
  }

  public off(eventName: string, callback: (...args: any[]) => void): this {
    if (!this.listeners[eventName]) {
      return this;
    }
    this.listeners[eventName] = this.listeners[eventName].filter(
      (fn) => fn !== callback,
    );
    return this;
  }

  public emit(eventName: string, ...args: any[]): this {
    (this.listeners[eventName] || []).forEach((fn) => fn(...args));
    return this;
  }
}

// =============================================================
// PathPoint — a single movable bend point on an edge's path
// =============================================================

export class PathPoint extends EventBus {
  private _edge: any;
  private _pointIndex: number;
  public id: string;

  constructor(parentEdge: any, pointIndex: number) {
    super();
    this.id = `pathpoint-${Math.random().toString(36).slice(2)}`;
    this._edge = parentEdge;
    this._pointIndex = pointIndex;
  }

  public get x(): number {
    return this._edge.vertices()[this._pointIndex]?.x ?? 0;
  }
  public get y(): number {
    return this._edge.vertices()[this._pointIndex]?.y ?? 0;
  }

  public moveTo(x: number, y: number): this {
    const points: Point[] = [...this._edge.vertices()];
    points[this._pointIndex] = { x, y };
    this._edge.vertices(points);
    this.emit('move', this);
    return this;
  }

  public moveBy(deltaX: number, deltaY: number): this {
    return this.moveTo(this.x + deltaX, this.y + deltaY);
  }

  public remove(): void {
    const points: Point[] = [...this._edge.vertices()];
    points.splice(this._pointIndex, 1);
    this._edge.vertices(points);
    this.emit('remove', this);
  }
}

// =============================================================
// Arrow marker definitions for edge endpoints
// =============================================================

const ARROW_MARKERS: Record<ArrowMarkerName, ArrowMarker | null> = {
  none: null,
  classic: { type: 'path', d: 'M 10 -5 0 0 10 5 Z' },
  block: { type: 'path', d: 'M 10 -10 0 0 10 10 Z' },
};

// =============================================================
// Edge — a connection between two nodes
// =============================================================

export class Edge extends EventBus {
  private _sourceNode: DiagramNode;
  private _targetNode: DiagramNode;
  private _pathPoints: PathPoint[];

  // headless backing fields
  private _label: string = '';
  private _labelColor: string = COLOR_EDGE_LABEL;
  private _labelFontSize: number = FONT_SIZE_PERCENT_DEFAULT;
  private _lineColor: string = COLOR_EDGE_LINE;
  private _lineWidth: number = 2;
  private _lineStyle: LineStyle = 'solid';
  private _sourceArrow: ArrowMarkerName = 'none';
  private _targetArrow: ArrowMarkerName = 'classic';
  private _connectorType: ConnectorType = 'elbow';
  private _sourcePort: number | null = null;
  private _targetPort: number | null = null;
  private _description: string = '';

  public link: any;
  public editor: DiagramEditor;

  constructor(
    link: any,
    sourceNode: DiagramNode,
    targetNode: DiagramNode,
    editor: DiagramEditor,
  ) {
    super();
    this.link = link;
    this._sourceNode = sourceNode;
    this._targetNode = targetNode;
    this.editor = editor;
    this._pathPoints = [];
  }

  public get id(): string {
    return this.link?.id ?? `edge-${Math.random().toString(36).slice(2)}`;
  }
  public get source(): DiagramNode {
    return this._sourceNode;
  }
  public get target(): DiagramNode {
    return this._targetNode;
  }

  public get label(): string {
    if (!this.link) return this._label;
    return this.link.label(0)?.attrs?.text?.text || '';
  }
  public set label(value: string) {
    this._label = value;
    if (this.link) this._applyLabel(value);
    this.emit('change', this);
  }

  public get labelColor(): string {
    if (!this.link) return this._labelColor;
    return this.link.label(0)?.attrs?.text?.fill || COLOR_EDGE_LABEL;
  }
  public set labelColor(value: string) {
    this._labelColor = value;
    if (this.link) {
      this.link.prop('labelColor', value);
      this._applyLabel(this.label);
    }
    this.emit('change', this);
  }

  public get labelFontSize(): number {
    if (!this.link) return this._labelFontSize;
    return this.link.get('fontSizePercent') || FONT_SIZE_PERCENT_DEFAULT;
  }
  public set labelFontSize(value: number) {
    this._labelFontSize = value;
    if (this.link) {
      this.link.set('fontSizePercent', value);
      this._applyLabel(this.label);
    }
    this.emit('change', this);
  }

  public get lineColor(): string {
    if (!this.link) return this._lineColor;
    return this.link.attr('line/stroke') || COLOR_EDGE_LINE;
  }
  public set lineColor(value: string) {
    this._lineColor = value;
    if (this.link) this.link.attr('line/stroke', value);
    this.emit('change', this);
  }

  public get lineWidth(): number {
    if (!this.link) return this._lineWidth;
    return this.link.attr('line/strokeWidth') || 2;
  }
  public set lineWidth(value: number) {
    this._lineWidth = value;
    if (this.link) this.link.attr('line/strokeWidth', value);
    this.emit('change', this);
  }

  public get lineStyle(): LineStyle {
    if (!this.link) return this._lineStyle;
    const dash: string = this.link.attr('line/strokeDasharray') || '';
    if (dash === '5,5') return 'dashed';
    if (dash === '1,5') return 'dotted';
    return 'solid';
  }
  public set lineStyle(value: LineStyle) {
    this._lineStyle = value;
    if (this.link) {
      if (value === 'dashed') this.link.attr('line/strokeDasharray', '5,5');
      else if (value === 'dotted')
        this.link.attr('line/strokeDasharray', '1,5');
      else this.link.attr('line/strokeDasharray', '');
    }
    this.emit('change', this);
  }

  public get sourceArrow(): ArrowMarkerName {
    if (!this.link) return this._sourceArrow;
    return this._arrowNameFromDefinition(this.link.attr('line/sourceMarker'));
  }
  public set sourceArrow(value: ArrowMarkerName) {
    this._sourceArrow = value;
    if (this.link)
      this.link.attr('line/sourceMarker', ARROW_MARKERS[value] || null);
    this.emit('change', this);
  }

  public get targetArrow(): ArrowMarkerName {
    if (!this.link) return this._targetArrow;
    return this._arrowNameFromDefinition(this.link.attr('line/targetMarker'));
  }
  public set targetArrow(value: ArrowMarkerName) {
    this._targetArrow = value;
    if (this.link)
      this.link.attr('line/targetMarker', ARROW_MARKERS[value] || null);
    this.emit('change', this);
  }

  public get connectorType(): ConnectorType {
    if (!this.link) return this._connectorType;
    const connector: string = this.link.connector()?.name;
    const router: string = this.link.router()?.name;
    if (connector === 'smooth') return 'curved';
    if (router === 'normal') return 'straight';
    return 'elbow';
  }
  public set connectorType(value: ConnectorType) {
    this._connectorType = value;
    if (this.link) {
      const gridSize = this.editor.gridSize;
      if (value === 'elbow') {
        this.link.router('manhattan', {
          step: gridSize,
          padding: EDGE_ELBOW_PADDING,
        });
        this.link.connector('rounded');
      } else if (value === 'straight') {
        this.link.router('normal');
        this.link.connector('normal');
      } else {
        this.link.router('normal');
        this.link.connector('smooth');
      }
    }
    this.emit('change', this);
  }

  public get sourcePort(): number | null {
    if (!this.link) return this._sourcePort;
    return this.link.get('sourcePort') ?? null;
  }
  public set sourcePort(value: number | null) {
    this._sourcePort = value;
    if (this.link) this._setPort('source', value);
  }

  public get targetPort(): number | null {
    if (!this.link) return this._targetPort;
    return this.link.get('targetPort') ?? null;
  }
  public set targetPort(value: number | null) {
    this._targetPort = value;
    if (this.link) this._setPort('target', value);
  }

  public get description(): string {
    if (!this.link) return this._description;
    return this.link.get('description') || '';
  }
  public set description(value: string) {
    this._description = value;
    if (this.link) this.link.set('description', value);
    this.emit('change', this);
  }

  public getPathPoints(): PathPoint[] {
    return [...this._pathPoints];
  }

  public addPathPoint(x: number, y: number): PathPoint {
    const points: Point[] = [...this.link.vertices(), { x, y }];
    this.link.vertices(points);
    const point = new PathPoint(this.link, points.length - 1);
    this._pathPoints.push(point);
    return point;
  }

  public select(): this {
    this.editor._selectItem(this);
    return this;
  }
  public deselect(): this {
    this.editor.clearSelection();
    return this;
  }
  public remove(): void {
    if (this.link) this.link.remove();
    this.emit('remove', this);
  }

  private _applyLabel(text: string): void {
    const fontSize =
      FONT_SIZE_EDGE_LABEL *
      ((this.link.get('fontSizePercent') || FONT_SIZE_PERCENT_DEFAULT) /
        FONT_SIZE_PERCENT_DEFAULT);
    const color = this.link.get('labelColor') || COLOR_EDGE_LABEL;
    if (text) {
      this.link.labels([
        {
          attrs: {
            text: { text, fill: color, fontSize, textVerticalAnchor: 'middle' },
            rect: { fill: COLOR_EDGE_LABEL_BG, opacity: OPACITY_EDGE_LABEL_BG },
          },
          position: { distance: 0.5 },
        },
      ]);
    } else {
      this.link.labels([]);
    }
  }

  private _arrowNameFromDefinition(
    definition: ArrowMarker | null,
  ): ArrowMarkerName {
    if (!definition) return 'none';
    if (definition.d === ARROW_MARKERS.classic!.d) return 'classic';
    if (definition.d === ARROW_MARKERS.block!.d) return 'block';
    return 'none';
  }

  private _setPort(side: 'source' | 'target', portIndex: number | null): void {
    const node = side === 'source' ? this._sourceNode : this._targetNode;
    this.link.set(`${side}Port`, portIndex);
    if (portIndex === null) {
      this.link[side]({ id: node.cell.id });
    } else {
      const port = node.cell.getPorts()[portIndex - 1];
      if (port) this.link[side]({ id: node.cell.id, port: port.id });
    }
    this.emit('change', this);
  }
}

// =============================================================
// DiagramNode — base class for a diagram shape
// =============================================================

export class DiagramNode extends EventBus {
  public static nodeClass: string = 'DiagramNode';

  public _label: string;
  public _initOptions: NodeOptions;
  public cell: any;
  public editor: DiagramEditor | null;
  public schema: Schema;
  public customProps: Record<string, any>;
  public _defaultOptions?: NodeOptions;
  [key: `_init_${string}`]: any;

  // headless backing fields
  private _headlessX?: number;
  private _headlessY?: number;
  private _labelColor: string = COLOR_LABEL;
  private _labelFontSize: number = FONT_SIZE_PERCENT_DEFAULT;
  private _description: string = '';
  private _descriptionColor: string = COLOR_DESCRIPTION;
  private _backgroundColor: string = COLOR_NODE_BACKGROUND;
  private _borderColor: string = COLOR_NODE_BORDER;
  private _borderWidth: number = 2;
  private _imageUrl: string = '';
  private _imageWidth: number = IMAGE_DEFAULT_WIDTH;
  private _imageHeight: number = IMAGE_DEFAULT_HEIGHT;

  constructor(options: NodeOptions | string = {}) {
    super();
    this._label = typeof options === 'string' ? options : (options.label ?? '');
    this._initOptions = typeof options === 'string' ? {} : options;
    this.cell = null;
    this.editor = null;
    this.schema = {};
    this.customProps = {};
  }

  public getCustomProperty(key: string): any {
    return this.customProps[key];
  }
  public setCustomProperty(key: string, value: any): void {
    this.customProps[key] = value;
    this.cell?.set(`custom_${key}`, value);
    this.emit('change', this);
  }
  public getSchema(): Schema {
    return this.schema;
  }

  public get id(): string | null {
    return this.cell?.id ?? null;
  }

  public get x(): number | undefined {
    if (!this.cell) return this._headlessX;
    return this.cell.position().x;
  }
  public set x(value: number) {
    if (!this.cell) {
      this._headlessX = value;
      return;
    }
    this.cell.position(value, this.y as number);
    this.emit('change', this);
  }

  public get y(): number | undefined {
    if (!this.cell) return this._headlessY;
    return this.cell.position().y;
  }
  public set y(value: number) {
    if (!this.cell) {
      this._headlessY = value;
      return;
    }
    this.cell.position(this.x as number, value);
    this.emit('change', this);
  }

  public get width(): number {
    return this.cell?.size().width ?? 0;
  }
  public get height(): number {
    return this.cell?.size().height ?? 0;
  }
  public get portCount(): number {
    return 4;
  }

  public get label(): string {
    return this.cell?.attr('label/text') ?? this._label;
  }
  public set label(value: string) {
    this._label = value;
    if (this.cell) {
      this.cell.attr('label/text', value);
      this._resizeToFitContent();
    }
    this.emit('change', this);
  }

  public get labelColor(): string {
    return this.cell?.attr('label/fill') ?? this._labelColor;
  }
  public set labelColor(value: string) {
    this._labelColor = value;
    if (this.cell) this.cell.attr('label/fill', value);
    this.emit('change', this);
  }

  public get labelFontSize(): number {
    return this.cell?.get('fontSizePercent') ?? this._labelFontSize;
  }
  public set labelFontSize(value: number) {
    this._labelFontSize = value;
    if (this.cell) {
      this.cell.set('fontSizePercent', value);
      this._resizeToFitContent();
    }
    this.emit('change', this);
  }

  public get description(): string {
    return this.cell?.get('description') ?? this._description;
  }
  public set description(value: string) {
    this._description = value;
    if (this.cell) {
      this.cell.set('description', value);
      this.cell.attr('descriptionLabel/text', value);
      this._resizeToFitContent();
    }
    this.emit('change', this);
  }

  public get descriptionColor(): string {
    return this.cell?.attr('descriptionLabel/fill') ?? this._descriptionColor;
  }
  public set descriptionColor(value: string) {
    this._descriptionColor = value;
    if (this.cell) this.cell.attr('descriptionLabel/fill', value);
    this.emit('change', this);
  }

  public get backgroundColor(): string {
    return this.cell?.attr('body/fill') ?? this._backgroundColor;
  }
  public set backgroundColor(value: string) {
    this._backgroundColor = value;
    if (this.cell) this.cell.attr('body/fill', value);
    this.emit('change', this);
  }

  public get borderColor(): string {
    return this.cell?.attr('body/stroke') ?? this._borderColor;
  }
  public set borderColor(value: string) {
    this._borderColor = value;
    if (this.cell) this.cell.attr('body/stroke', value);
    this.emit('change', this);
  }

  public get borderWidth(): number {
    return this.cell?.attr('body/strokeWidth') ?? this._borderWidth;
  }
  public set borderWidth(value: number) {
    this._borderWidth = value;
    if (this.cell) this.cell.attr('body/strokeWidth', value);
    this.emit('change', this);
  }

  public get imageUrl(): string {
    return this.cell?.get('imageUrl') ?? this._imageUrl;
  }
  public set imageUrl(value: string) {
    this._imageUrl = value;
    if (this.cell) {
      this.cell.set('imageUrl', value);
      this.cell.attr('image/xlink:href', value);
      this.cell.attr('image/display', value ? 'block' : 'none');
      this._resizeToFitContent();
    }
    this.emit('change', this);
  }

  public get imageWidth(): number {
    return this.cell?.get('imageWidth') ?? this._imageWidth;
  }
  public set imageWidth(value: number) {
    this._imageWidth = value;
    if (this.cell) {
      this.cell.set('imageWidth', value);
      this._resizeToFitContent();
    }
    this.emit('change', this);
  }

  public get imageHeight(): number {
    return this.cell?.get('imageHeight') ?? this._imageHeight;
  }
  public set imageHeight(value: number) {
    this._imageHeight = value;
    if (this.cell) {
      this.cell.set('imageHeight', value);
      this._resizeToFitContent();
    }
    this.emit('change', this);
  }

  public moveTo(x: number, y: number): this {
    if (!this.cell) {
      this._headlessX = x;
      this._headlessY = y;
      this.emit('move', this);
      return this;
    }
    this.cell.position(x, y);
    this.emit('move', this);
    return this;
  }
  public moveBy(deltaX: number, deltaY: number): this {
    return this.moveTo((this.x ?? 0) + deltaX, (this.y ?? 0) + deltaY);
  }
  public toFront(): this {
    this.cell?.toFront();
    return this;
  }
  public toBack(): this {
    this.cell?.toBack();
    return this;
  }
  public select(): this {
    this.editor?._selectItem(this);
    return this;
  }
  public deselect(): this {
    this.editor?.clearSelection();
    return this;
  }

  public getEdges(): Edge[] {
    return this.editor?._getEdgesForNode(this) ?? [];
  }
  public getIncomingEdges(): Edge[] {
    return this.getEdges().filter((edge) => edge.target === this);
  }
  public getOutgoingEdges(): Edge[] {
    return this.getEdges().filter((edge) => edge.source === this);
  }

  public connectTo(
    targetNode: DiagramNode,
    sourcePortIndex: number | null = null,
    targetPortIndex: number | null = null,
  ): Edge | null {
    if (targetNode === this)
      throw new Error('A node cannot connect to itself.');
    return (
      this.editor?._createEdge(
        this,
        targetNode,
        sourcePortIndex,
        targetPortIndex,
      ) ?? null
    );
  }

  public remove(): void {
    this.cell?.remove();
    this.emit('remove', this);
  }

  public _buildCell(
    position: Point,
    jointNamespace: any,
    portRadius: number = PORT_RADIUS,
  ): any {
    throw new Error('_buildCell must be implemented by subclass');
  }

  public _resizeToFitContent(): void {
    if (!this.editor || !this.cell) return;
    this.editor._fitNodeToContent(this.cell);
  }

  public _getShapeType(): ShapeType {
    return 'rect';
  }
}

// =============================================================
// DiagramNode.define — factory that creates custom node classes
// =============================================================

export type NodeConstructor = new (options?: NodeOptions) => DiagramNode;

export interface DefineOptions {
  defaults?: NodeOptions;
  schema?: Schema;
  visibleProps?: BuiltInNodeProp[];
  editProp?: string;
  onKeyUp?: (node: DiagramNode, key: string) => void;
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

(DiagramNode as any).define = function (
  BaseNodeClass: NodeConstructor,
  options: DefineOptions = {},
): NodeConstructor {
  const defaultOptions: NodeOptions = options.defaults ?? {};
  const schema: Schema = options.schema ?? {};
  const visibleProps: BuiltInNodeProp[] | undefined = options.visibleProps;
  const editProp: string = options.editProp ?? 'label';
  const onKeyUp = options.onKeyUp ?? null;

  class CustomNode extends (BaseNodeClass as any) {
    constructor(options: NodeOptions = {}) {
      super();
      this.schema = schema;
      this.customProps = {};
      this._defaultOptions = defaultOptions;

      const merged: NodeOptions = { ...defaultOptions, ...options };

      // FIXME: This builtIns array is duplicated verbatim in addNode() and deserialize().
      // Extract to a module-level BUILT_IN_NODE_PROPS constant.
      const builtIns: (keyof NodeOptions)[] = [
        'label',
        'labelColor',
        'labelFontSize',
        'description',
        'descriptionColor',
        'backgroundColor',
        'borderColor',
        'borderWidth',
        'imageUrl',
        'imageWidth',
        'imageHeight',
      ];
      builtIns.forEach((key) => {
        if (merged[key] !== undefined)
          (this as any)[`_init_${key}`] = merged[key];
      });
      this._label = merged.label ?? defaultOptions.label ?? '';

      // FIXME: This two-pass onChange firing pattern is duplicated in addNode(),
      // deserialize(), and the drop handler. Extract to a shared module-level
      // fireOnChangeForAllProps(node, schema) helper and call it from all four sites.
      // Pass 1: set all customProps silently
      Object.entries(schema).forEach(([key, fieldDef]) => {
        this.customProps[key] =
          options[key] !== undefined
            ? options[key]
            : (fieldDef as FieldDefinition).default;
      });

      // Pass 2: fire onChange for each prop after all are initialized
      Object.entries(schema).forEach(([key, fieldDef]) => {
        const fieldDefinition = fieldDef as FieldDefinition;
        fieldDefinition.onChange?.(
          this as unknown as DiagramNode,
          this.customProps[key],
          undefined,
        );
      });
    }

    getCustomProperty(key: string): any {
      return this.customProps[key];
    }

    setCustomProperty(key: string, value: any): void {
      if (!(key in this.schema)) return;
      const fieldDefinition = this.schema[key] as FieldDefinition;
      const oldValue = this.customProps[key];
      this.customProps[key] = value;
      if (fieldDefinition.type !== 'object')
        this.cell?.set(`custom_${key}`, value);
      fieldDefinition.onChange?.(
        this as unknown as DiagramNode,
        value,
        oldValue,
      );
      this.emit('change', this);
    }

    getSchema(): Schema {
      return this.schema;
    }

    // FIXME: `(this as unknown as DiagramNode)` is repeated throughout this class
    // because CustomNode extends a dynamically passed base, bypassing strict typing.
    // Introduce a typed ICustomNode interface that CustomNode satisfies to eliminate
    // these casts.
    _buildCell(position: Point, jointNamespace: any): any {
      return super._buildCell(position, jointNamespace);
    }
  }

  // TODO: Replace these ad-hoc constructor stamps with a typed TypeRegistry map
  // keyed by nodeClass string to avoid (cls as any).__x casts throughout the codebase.
  (CustomNode as any).__defaultOptions = defaultOptions;
  (CustomNode as any).__schema = schema;
  (CustomNode as any).__baseClass = (BaseNodeClass as any).nodeClass;
  (CustomNode as any).__visibleProps = visibleProps ?? null;
  (CustomNode as any).__editProp = editProp;
  (CustomNode as any).__onKeyUp = onKeyUp;

  (CustomNode.prototype as any)._getShapeType = (
    BaseNodeClass.prototype as any
  )._getShapeType;
  Object.defineProperty(
    CustomNode.prototype,
    'portCount',
    Object.getOwnPropertyDescriptor(BaseNodeClass.prototype, 'portCount') || {
      get() {
        return 4;
      },
    },
  );
  return CustomNode as unknown as NodeConstructor;
};

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
    portRadius: number = PORT_RADIUS,
  ): any {
    const cell = _buildRectangleCell(
      position,
      namespace,
      'rect',
      NODE_DEFAULT_WIDTH,
      NODE_DEFAULT_HEIGHT,
      portRadius,
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
    portRadius: number = PORT_RADIUS,
  ): any {
    const cell = _buildRectangleCell(
      position,
      namespace,
      'square',
      NODE_SQUARISH_SIZE,
      NODE_SQUARISH_SIZE,
      portRadius,
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
    portRadius: number = PORT_RADIUS,
  ): any {
    const cell = _buildEllipseCell(
      position,
      namespace,
      'ellipse',
      NODE_DEFAULT_WIDTH,
      NODE_DEFAULT_HEIGHT,
      portRadius,
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
    portRadius: number = PORT_RADIUS,
  ): any {
    const cell = _buildEllipseCell(
      position,
      namespace,
      'circle',
      NODE_SQUARISH_SIZE,
      NODE_SQUARISH_SIZE,
      portRadius,
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
    portRadius: number = PORT_RADIUS,
  ): any {
    const cell = _buildPolygonCell(
      position,
      namespace,
      'diamond',
      NODE_SQUARISH_SIZE,
      NODE_SQUARISH_SIZE,
      [
        [0, 10],
        [10, 0],
        [20, 10],
        [10, 20],
      ],
      portRadius,
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
    portRadius: number = PORT_RADIUS,
  ): any {
    const cell = _buildPolygonCell(
      position,
      namespace,
      'triangle',
      NODE_DEFAULT_WIDTH,
      NODE_DEFAULT_HEIGHT,
      [
        [10, 0],
        [20, 20],
        [0, 20],
      ],
      portRadius,
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
    portRadius: number = PORT_RADIUS,
  ): any {
    const cell = _buildPolygonCell(
      position,
      namespace,
      'hexagon',
      NODE_DEFAULT_WIDTH,
      NODE_DEFAULT_HEIGHT,
      [
        [5, 0],
        [15, 0],
        [20, 10],
        [15, 20],
        [5, 20],
        [0, 10],
      ],
      portRadius,
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
    portRadius: number = PORT_RADIUS,
  ): any {
    const cell = _buildPolygonCell(
      position,
      namespace,
      'pentagon',
      NODE_DEFAULT_WIDTH,
      NODE_DEFAULT_HEIGHT,
      [
        [10, 0],
        [20, 7],
        [16, 20],
        [4, 20],
        [0, 7],
      ],
      portRadius,
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
    portRadius: number = PORT_RADIUS,
  ): any {
    const cell = _buildPolygonCell(
      position,
      namespace,
      'octagon',
      NODE_DEFAULT_WIDTH,
      NODE_DEFAULT_HEIGHT,
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
      portRadius,
    );
    cell.set('nodeClass', 'OctagonNode');
    return cell;
  }
}

// =============================================================
// Shared JointJS cell construction helpers
// =============================================================

const SHARED_CELL_MARKUP = [
  { tagName: 'image', selector: 'image', className: 'image' },
  { tagName: 'text', selector: 'label', className: 'label' },
  {
    tagName: 'text',
    selector: 'descriptionLabel',
    className: 'descriptionLabel',
  },
];

const SHARED_CELL_ATTRS = {
  image: { display: 'none' },
  label: {
    fill: COLOR_LABEL,
    fontSize: FONT_SIZE_LABEL,
    fontWeight: 'bold',
    pointerEvents: 'none',
  },
  descriptionLabel: {
    text: '',
    fill: COLOR_DESCRIPTION,
    fontSize: FONT_SIZE_DESCRIPTION,
    pointerEvents: 'none',
  },
};

const SHARED_CELL_DEFAULTS = {
  description: '',
  imageUrl: '',
  imageWidth: IMAGE_DEFAULT_WIDTH,
  imageHeight: IMAGE_DEFAULT_HEIGHT,
  fontSizePercent: FONT_SIZE_PERCENT_DEFAULT,
};

function _attachPortsToCell(
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
          fill: COLOR_ACCENT,
          magnet: true,
          stroke: COLOR_NODE_BACKGROUND,
          strokeWidth: PORT_STROKE_WIDTH,
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

function _buildRectangleCell(
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
      fill: COLOR_NODE_BACKGROUND,
      stroke: COLOR_NODE_BORDER,
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

function _buildEllipseCell(
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
      fill: COLOR_NODE_BACKGROUND,
      stroke: COLOR_NODE_BORDER,
      strokeWidth: 2,
    },
    ...SHARED_CELL_ATTRS,
  });
  cell.set({ type: shapeType, ...SHARED_CELL_DEFAULTS });
  _attachPortsToCell(cell, [], portRadius);
  return cell;
}

function _buildPolygonCell(
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
      fill: COLOR_NODE_BACKGROUND,
      stroke: COLOR_NODE_BORDER,
      strokeWidth: 2,
    },
    ...SHARED_CELL_ATTRS,
  });
  cell.set({ type: shapeType, ...SHARED_CELL_DEFAULTS });
  _attachPortsToCell(cell, points, portRadius);
  return cell;
}

// =============================================================
// DiagramEditor — the main controller
// =============================================================

const builtInShapes: { type: ShapeType; cls: NodeConstructor; name: string }[] =
  [
    { type: 'rect', cls: RectangleNode, name: 'Rectangle' },
    { type: 'square', cls: SquareNode, name: 'Square' },
    { type: 'ellipse', cls: EllipseNode, name: 'Ellipse' },
    { type: 'circle', cls: CircleNode, name: 'Circle' },
    { type: 'diamond', cls: DiamondNode, name: 'Diamond' },
    { type: 'triangle', cls: TriangleNode, name: 'Triangle' },
    { type: 'hexagon', cls: HexagonNode, name: 'Hexagon' },
    { type: 'pentagon', cls: PentagonNode, name: 'Pentagon' },
    { type: 'octagon', cls: OctagonNode, name: 'Octagon' },
  ];

export class DiagramEditor extends EventBus {
  // private fields
  private _nodeMap: Map<string, DiagramNode>;
  private _edgeMap: Map<string, Edge>;
  private _headlessEdges: Array<{
    source: DiagramNode;
    target: DiagramNode;
    props: Partial<SerializedEdge>;
  }>;
  private _selection: DiagramNode | Edge | null;
  private _autoPortsOn: boolean;
  private _isLoading: boolean;
  private _touchState: TouchState | null;
  private _pointerDownAt: Point | null;
  private _selectionWasAlreadyActive: boolean;
  private _registeredNodeTypes: Record<string, NodeConstructor>;
  private _clipboard: DiagramNode | null;
  private _isHeadless: boolean;

  // private DOM elements
  private _leftSidebar!: HTMLElement;
  private _rightSidebar!: HTMLElement;
  private _leftCollapseButton!: HTMLElement;
  private _leftCollapseIcon!: HTMLElement;
  private _rightCollapseButton!: HTMLElement;
  private _rightCollapseIcon!: HTMLElement;
  private _shapeLibrary!: HTMLElement;
  private _canvasArea!: HTMLElement;
  private _paperElement!: HTMLElement;
  private _topRightButtons!: HTMLElement;
  private _topLeftButtons!: HTMLElement;
  private _bottomLeftButtons!: HTMLElement;
  private _exportButton!: HTMLButtonElement;
  private _importButton!: HTMLButtonElement;
  private _importFileInput!: HTMLInputElement;
  private _autoPortToggleButton!: HTMLButtonElement;
  private _autoArrangeButton!: HTMLButtonElement;
  private _zoomToFitButton!: HTMLButtonElement;
  private _zoomResetButton!: HTMLButtonElement;
  private _zoomInButton!: HTMLButtonElement;
  private _zoomOutButton!: HTMLButtonElement;
  private _centerButton!: HTMLButtonElement;
  private _contextMenu!: HTMLElement;
  private _propertiesHeaderActions!: HTMLElement;
  private _nodePropertiesPanel!: HTMLElement;
  private _edgePropertiesPanel!: HTMLElement;
  private _noSelectionMessage!: HTMLElement;

  // private JointJS objects
  // TODO: Replace `any` with specific internal interfaces for JointJS graph and paper.
  private _graph!: any;
  private _renderer!: any;

  // public fields
  public container: HTMLElement | null;
  public gridSize: number;
  public clearanceUnits: number;

  constructor(container?: HTMLElement) {
    super();
    this.container = container ?? null;
    this.gridSize = 10;
    this.clearanceUnits = 4;
    this._nodeMap = new Map();
    this._edgeMap = new Map();
    this._headlessEdges = [];
    this._selection = null;
    this._autoPortsOn = true;
    this._isLoading = false;
    this._touchState = null;
    this._pointerDownAt = null;
    this._selectionWasAlreadyActive = false;
    this._registeredNodeTypes = {};
    this._clipboard = null;
    this._isHeadless = !container;

    [
      'node:add',
      'node:remove',
      'node:change',
      'node:move',
      'edge:add',
      'edge:remove',
      'edge:change',
    ].forEach((event) => {
      this.on(event, () => {
        if (!this._isLoading) this.emit('change');
      });
    });

    if (container) this.render(container);
  }

  // ── Public API ──────────────────────────────────────────────

  public async render(container: HTMLElement): Promise<this> {
    if (this._graph)
      throw new Error('DiagramEditor.render() can only be called once.');

    this.container = container;
    this._buildLayout();
    this._setupRenderer();

    // Backfill library items for node types registered while headless
    Object.entries(this._registeredNodeTypes).forEach(([label, NodeClass]) => {
      const item = this._shapeLibrary.appendChild(
        this._makeElement('div', 'wf-node-template'),
      ) as HTMLElement;
      item.textContent = (NodeClass as any).__nodeName ?? label;
      item.draggable = true;
      item.dataset.nodeTypeLabel = label;
      item.addEventListener('click', () => {
        if (!this._isMobile()) return;
        this.addNode(new NodeClass());
        if (!this._leftSidebar.classList.contains('wf-collapsed'))
          this._toggleSidebar(this._leftSidebar);
      });
      item.addEventListener('dragstart', (event) =>
        (event as DragEvent).dataTransfer!.setData('customNode', label),
      );
    });

    this._attachButtonListeners();
    this._attachDiagramListeners();
    this._attachTouchListeners();
    this._attachKeyboardShortcuts();

    if (this._isMobile()) {
      this._setSidebarCollapsed(this._leftSidebar, true);
      this._setSidebarCollapsed(this._rightSidebar, true);
    }

    const nodes = [...this._nodeMap.values()];
    const positioned = nodes.filter(
      (n) => n.x !== undefined && n.y !== undefined,
    );
    const unpositioned = nodes.filter(
      (n) => n.x === undefined || n.y === undefined,
    );
    const hasPartialPositioning =
      positioned.length > 0 && unpositioned.length > 0;
    const shouldAutoArrange = unpositioned.length > 0;

    if (hasPartialPositioning) {
      console.warn(
        `DiagramEditor.render(): ${positioned.length} node(s) have explicit positions and ` +
          `${unpositioned.length} do not. Ignoring all positions and falling back to auto-arrange.`,
      );
    }

    const serialized = JSON.parse(this.serialize()) as SerializedDiagram;
    this._isHeadless = false;

    if (
      serialized.nodes.length > 0 ||
      (serialized.nodeTypes && serialized.nodeTypes.length > 0)
    ) {
      if (shouldAutoArrange)
        serialized.nodes.forEach((n) => {
          delete n.x;
          delete n.y;
        });
      await this.deserialize(serialized);
      if (shouldAutoArrange) await this.autoArrange();
    }

    return this;
  }

  public registerNodeType(
    label: string,
    NodeClass: NodeConstructor,
    name?: string,
  ): void {
    const displayName = name ?? label;
    if (!this._isHeadless && !this._registeredNodeTypes[label]) {
      const item = this._shapeLibrary.appendChild(
        this._makeElement('div', 'wf-node-template'),
      ) as HTMLElement;
      item.textContent = displayName;
      item.draggable = true;
      item.dataset.nodeTypeLabel = label;
      item.addEventListener('click', () => {
        if (!this._isMobile()) return;
        this.addNode(new NodeClass());
        if (!this._leftSidebar.classList.contains('wf-collapsed'))
          this._toggleSidebar(this._leftSidebar);
      });
      item.addEventListener('dragstart', (event) =>
        (event as DragEvent).dataTransfer!.setData('customNode', label),
      );
    }

    // TODO: Replace these ad-hoc constructor stamps with a typed TypeRegistry map.
    (NodeClass as any).__nodeLabel = label;
    (NodeClass as any).__nodeName = displayName;
    if (!Object.prototype.hasOwnProperty.call(NodeClass, 'nodeClass'))
      (NodeClass as any).nodeClass = label;
    this._registeredNodeTypes[label] = NodeClass;
  }

  public registerBuiltInNodes(): void {
    for (const { cls, name } of builtInShapes)
      this.registerNodeType(cls.name, cls, name);
  }

  public addNode(
    node: DiagramNode,
    canvasX?: number,
    canvasY?: number,
  ): Promise<DiagramNode> {
    if (!(node as any)._nodeClass)
      (node as any)._nodeClass = (node.constructor as any).nodeClass;

    if (this._isHeadless) {
      const id = `node-${Math.random().toString(36).slice(2)}`;
      (node as any)._headlessId = id;
      node.editor = this;
      this._nodeMap.set(id, node);
      node.on('change', (changedNode: DiagramNode) =>
        this.emit('node:change', changedNode),
      );
      node.on('move', (movedNode: DiagramNode) =>
        this.emit('node:move', movedNode),
      );
      this.emit('node:add', node);
      return Promise.resolve(node);
    }

    const namespace = joint.shapes;
    const area = this._canvasArea;
    const centerX = canvasX ?? area.clientWidth / 2;
    const centerY = canvasY ?? area.clientHeight / 2;
    const localPosition: Point = this._renderer.clientToLocalPoint({
      x: centerX + area.getBoundingClientRect().left,
      y: centerY + area.getBoundingClientRect().top,
    });

    const isSquarish =
      node instanceof SquareNode ||
      node instanceof CircleNode ||
      node instanceof DiamondNode;
    const width = isSquarish ? NODE_SQUARISH_SIZE : NODE_DEFAULT_WIDTH;
    const height = isSquarish ? NODE_SQUARISH_SIZE : NODE_DEFAULT_HEIGHT;
    const openPosition = this._findOpenPosition(
      localPosition.x - width / 2,
      localPosition.y - height / 2,
      width,
      height,
    );

    const portRadius = PORT_RADIUS;
    const cell = node._buildCell(openPosition, namespace, portRadius);
    cell.attr('label/text', node._label);
    const customLabel = (node.constructor as any).__nodeLabel;
    if (customLabel) cell.set('nodeClass', customLabel);
    node.cell = cell;
    node.editor = this;

    // FIXME: This builtIns array is duplicated verbatim in define() and deserialize().
    // Extract to a module-level BUILT_IN_NODE_PROPS constant.
    const builtIns: (keyof NodeOptions)[] = [
      'label',
      'labelColor',
      'labelFontSize',
      'description',
      'descriptionColor',
      'backgroundColor',
      'borderColor',
      'borderWidth',
      'imageUrl',
      'imageWidth',
      'imageHeight',
    ];
    const initOptions: NodeOptions = node._initOptions || {};
    builtIns.forEach((key) => {
      const value = initOptions[key] ?? (node as any)[`_init_${key}`];
      if (value !== undefined) (node as any)[key] = value;
    });

    Object.entries(node.customProps).forEach(([key, value]) =>
      cell.set(`custom_${key}`, value),
    );
    cell.addTo(this._graph);
    this._nodeMap.set(cell.id, node);
    this.clearSelection();

    // FIXME: This async render-wait-resize-listeners sequence is duplicated in the
    // custom-node and built-in drop handlers. Extract to a _finalizeAddedNode(node, cell)
    // helper and call it from all three sites.
    const ready = (async () => {
      await this._waitForRender(cell);
      await this._resizeNodeAsync(cell);

      // FIXME: This two-pass onChange firing is duplicated in define(), deserialize(),
      // and the drop handler. Extract to a shared fireOnChangeForAllProps helper.
      Object.entries(node.schema as Schema).forEach(([key, fieldDef]) => {
        (fieldDef as FieldDefinition).onChange?.(
          node,
          node.customProps[key],
          undefined,
        );
      });

      await this._waitForRender(cell);
      node.on('change', (changedNode: DiagramNode) =>
        this.emit('node:change', changedNode),
      );
      node.on('move', (movedNode: DiagramNode) =>
        this.emit('node:move', movedNode),
      );
      return node;
    })();

    this.emit('node:add', node);
    return ready;
  }

  // TODO: Add a public destroy() method that removes all window/document event
  // listeners, calls graph.clear() and paper.remove(), and clears _nodeMap and _edgeMap.
  // The Angular component's ngOnDestroy should delegate to this instead of clearing innerHTML.

  public clear(): this {
    if (!this._isHeadless) {
      this._deselectAll();
      this._graph.clear();
    }
    this._nodeMap.clear();
    this._edgeMap.clear();
    this._headlessEdges = [];
    this.emit('change');
    return this;
  }

  public clearRegisteredNodes(): this {
    this._registeredNodeTypes = {};
    if (!this._isHeadless) this._shapeLibrary.innerHTML = '';
    return this;
  }

  public removeNode(node: DiagramNode): void {
    const id = node.id ?? (node as any)._headlessId;
    node.remove();
    this._nodeMap.delete(id);
    this.emit('node:remove', node);
  }

  public getNodes(): DiagramNode[] {
    return [...this._nodeMap.values()];
  }
  public getEdges(): Edge[] {
    return [...this._edgeMap.values()];
  }

  public panTo(x: number, y: number): this {
    if (!this._isHeadless) this._renderer.translate(x, y);
    return this;
  }

  public centerContent(): this {
    if (this._isHeadless) return this;
    const bbox = this._graph.getBBox();
    if (!bbox) return this;
    const size = this._renderer.getComputedSize();
    this._renderer.scale(1, 1);
    this._renderer.translate(
      size.width / 2 - (bbox.x + bbox.width / 2),
      size.height / 2 - (bbox.y + bbox.height / 2),
    );
    return this;
  }

  public zoomIn(factor: number = ZOOM_IN_FACTOR): this {
    if (!this._isHeadless) this._zoomAtCenter(factor);
    return this;
  }
  public zoomOut(factor: number = ZOOM_OUT_FACTOR): this {
    if (!this._isHeadless) this._zoomAtCenter(factor);
    return this;
  }
  public zoomReset(): this {
    if (!this._isHeadless) this._zoomAtCenter(1 / this._renderer.scale().sx);
    return this;
  }
  public zoomToFit(): this {
    if (!this._isHeadless)
      this._renderer.scaleContentToFit({
        padding: ZOOM_FIT_PADDING,
        minScale: ZOOM_FIT_MIN_SCALE,
        maxScale: ZOOM_FIT_MAX_SCALE,
      });
    return this;
  }

  public getZoomLevel(): number {
    return this._isHeadless ? 1 : this._renderer.scale().sx;
  }
  public getSelectedItem(): DiagramNode | Edge | null {
    return this._selection;
  }
  public clearSelection(): this {
    if (!this._isHeadless) this._deselectAll();
    return this;
  }

  public setAutoPortSwitching(enabled: boolean): this {
    this._autoPortsOn = enabled;
    if (!this._isHeadless) {
      this._autoPortToggleButton.classList.toggle('active', enabled);
      if (enabled)
        this._graph
          .getElements()
          .forEach((el: any) => this._updateConnectionPorts(el));
    }
    return this;
  }

  // TODO: Add a public batchUpdate(fn: () => void) method wrapping
  // graph.startBatch / graph.stopBatch for callers applying bulk mutations.

  public autoArrange(): Promise<this> {
    if (this._isHeadless) return Promise.resolve(this);
    return new Promise<this>((resolve) => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          this._graph
            .getElements()
            .forEach((cell: any) => this._fitNodeToContent(cell));
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              this._doAutoArrange();
              resolve(this);
            }),
          );
        }),
      );
    });
  }

  private _doAutoArrange(): void {
    const clearance = this.clearanceUnits * this.gridSize;
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setGraph({
      rankdir: 'TB',
      ranksep: clearance * 2,
      nodesep: clearance * 2,
      marginx: clearance,
      marginy: clearance,
    });
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    this._graph.getElements().forEach((element: any) => {
      const { width, height } = element.size();
      dagreGraph.setNode(element.id, { width, height });
    });
    this._graph.getLinks().forEach((link: any) => {
      const source = link.getSourceElement();
      const target = link.getTargetElement();
      if (source && target) dagreGraph.setEdge(source.id, target.id);
    });

    dagre.layout(dagreGraph);

    this._isLoading = true;
    this._graph.getElements().forEach((element: any) => {
      const layoutNode = dagreGraph.node(element.id);
      if (!layoutNode) return;
      element.position(
        Math.ceil((layoutNode.x - layoutNode.width / 2) / this.gridSize) *
          this.gridSize,
        Math.ceil((layoutNode.y - layoutNode.height / 2) / this.gridSize) *
          this.gridSize,
      );
    });
    this._isLoading = false;

    if (this._autoPortsOn)
      this._graph
        .getElements()
        .forEach((el: any) => this._updateConnectionPorts(el));
    this.centerContent();
  }

  public serializeTypes(): SerializedNodeType[] {
    return Object.entries(this._registeredNodeTypes).map(([label, cls]) => {
      const schema = (cls as any).__schema;
      const nodeClass = (cls as any).nodeClass ?? label;
      if (schema) {
        const safeSchema: Schema = Object.fromEntries(
          Object.entries(schema as Schema).map(([key, fieldDef]) => {
            const {
              serialize: _s,
              deserialize: _d,
              onChange: _o,
              ...rest
            } = fieldDef as FieldDefinition;
            return [key, rest];
          }),
        );
        const visibleProps = (cls as any).__visibleProps;
        const editProp = (cls as any).__editProp;
        return {
          nodeClass,
          name: (cls as any).__nodeName,
          baseClass: (cls as any).__baseClass,
          defaultOptions: (cls as any).__defaultOptions ?? {},
          schema: safeSchema,
          ...(visibleProps !== null && visibleProps !== undefined
            ? { visibleProps }
            : {}),
          ...(editProp !== undefined && editProp !== 'label'
            ? { editProp }
            : {}),
        };
      }
      return nodeClass as string;
    });
  }

  public serializeNodes(): {
    nodes: SerializedNode[];
    edges: SerializedEdge[];
  } {
    // FIXME: The headless and non-headless paths below produce the same SerializedNode
    // shape with only the id and nodeClass source differing. Extract a
    // _serializeNodeProps(node) helper to eliminate the duplicated props/customProps block.
    const serializeNodeProps = (node: DiagramNode) => ({
      label: node.label,
      labelColor: node.labelColor,
      labelFontSize: node.labelFontSize,
      description: node.description,
      descriptionColor: node.descriptionColor,
      backgroundColor: node.backgroundColor,
      borderColor: node.borderColor,
      borderWidth: node.borderWidth,
      imageUrl: node.imageUrl,
      imageWidth: node.imageWidth,
      imageHeight: node.imageHeight,
    });
    const serializeCustomProps = (node: DiagramNode) =>
      Object.fromEntries(
        Object.entries(node.customProps).map(([k, v]) => {
          const fieldDef = (node.schema as Schema)[k] as
            | FieldDefinition
            | undefined;
          return [k, fieldDef?.serialize ? fieldDef.serialize(v, node) : v];
        }),
      );

    if (this._isHeadless) {
      const nodes: SerializedNode[] = [...this._nodeMap.values()].map(
        (node) => ({
          id: (node as any)._headlessId,
          nodeClass:
            (node.constructor as any).nodeClass ?? (node as any)._nodeClass,
          x: node.x,
          y: node.y,
          props: serializeNodeProps(node),
          customProps: serializeCustomProps(node),
        }),
      );
      const edges: SerializedEdge[] = this._headlessEdges.map(
        (headlessEdge) => ({
          sourceId: (headlessEdge.source as any)._headlessId,
          targetId: (headlessEdge.target as any)._headlessId,
          sourcePort: headlessEdge.props.sourcePort ?? null,
          targetPort: headlessEdge.props.targetPort ?? null,
          label: headlessEdge.props.label ?? '',
          labelColor: headlessEdge.props.labelColor ?? COLOR_EDGE_LABEL,
          labelFontSize:
            headlessEdge.props.labelFontSize ?? FONT_SIZE_PERCENT_DEFAULT,
          lineColor: headlessEdge.props.lineColor ?? COLOR_EDGE_LINE,
          lineWidth: headlessEdge.props.lineWidth ?? 2,
          lineStyle: headlessEdge.props.lineStyle ?? 'solid',
          sourceArrow: headlessEdge.props.sourceArrow ?? 'none',
          targetArrow: headlessEdge.props.targetArrow ?? 'classic',
          connectorType: headlessEdge.props.connectorType ?? 'elbow',
          description: headlessEdge.props.description ?? '',
          vertices: headlessEdge.props.vertices ?? [],
        }),
      );
      return { nodes, edges };
    }

    const nodes: SerializedNode[] = [...this._nodeMap.values()].map((node) => ({
      id: node.cell.id,
      nodeClass:
        node.cell.get('nodeClass') ??
        (node.constructor as any).nodeClass ??
        (node as any)._nodeClass,
      x: node.x,
      y: node.y,
      props: serializeNodeProps(node),
      customProps: serializeCustomProps(node),
    }));

    const edges: SerializedEdge[] = [...this._edgeMap.values()].map((edge) => {
      const resolvePort = (endpoint: any, node: DiagramNode): number | null => {
        const portId = endpoint?.port;
        if (!portId) return null;
        const index = node.cell
          .getPorts()
          .findIndex((port: any) => port.id === portId);
        return index >= 0 ? index + 1 : null;
      };
      return {
        sourceId: edge.source.cell.id,
        targetId: edge.target.cell.id,
        sourcePort: resolvePort(edge.link.source(), edge.source),
        targetPort: resolvePort(edge.link.target(), edge.target),
        label: edge.label,
        labelColor: edge.labelColor,
        labelFontSize: edge.labelFontSize,
        lineColor: edge.lineColor,
        lineWidth: edge.lineWidth,
        lineStyle: edge.lineStyle,
        sourceArrow: edge.sourceArrow,
        targetArrow: edge.targetArrow,
        connectorType: edge.connectorType,
        description: edge.description,
        vertices: edge.link.vertices(),
      };
    });

    return { nodes, edges };
  }

  public serialize(includeTypes: boolean = true): string {
    const { nodes, edges } = this.serializeNodes();
    const result: SerializedDiagram = { nodes, edges };
    if (includeTypes) result.nodeTypes = this.serializeTypes();
    return JSON.stringify(result);
  }

  public async deserialize(json: string | SerializedDiagram): Promise<this> {
    let parsedDiagram: SerializedDiagram;
    try {
      parsedDiagram = typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e) {
      throw new Error(`Failed to parse diagram JSON: ${(e as Error).message}`);
    }
    const {
      nodes: nodeDataList,
      edges: edgeDataList,
      nodeTypes,
    }: SerializedDiagram = parsedDiagram;
    if (!Array.isArray(nodeDataList))
      throw new Error('Invalid diagram file format.');

    if (nodeTypes != null && nodeTypes.length > 0) {
      const importedKeys = new Set(
        nodeTypes.map((t) => (typeof t === 'string' ? t : t.nodeClass)),
      );

      for (const key of Object.keys(this._registeredNodeTypes)) {
        const cls = this._registeredNodeTypes[key];
        const nodeClass = (cls as any).nodeClass;
        if (!importedKeys.has(nodeClass)) {
          delete this._registeredNodeTypes[key];
          if (!this._isHeadless) {
            const item = this._shapeLibrary.querySelector(
              `[data-node-type-label="${key}"]`,
            );
            if (item) item.remove();
          }
        }
      }

      for (const typeData of nodeTypes) {
        if (typeof typeData === 'string') {
          const typeInfo = builtInShapes.find((t) => t.cls.name === typeData);
          const cls = typeInfo?.cls;
          if (cls) {
            const existingEntry = Object.entries(
              this._registeredNodeTypes,
            ).find(([, c]) => (c as any).nodeClass === typeData);
            if (!existingEntry)
              this.registerNodeType(typeData, cls, typeInfo.name);
          }
        } else {
          const existing = Object.values(this._registeredNodeTypes).find(
            (cls) => (cls as any).nodeClass === typeData.nodeClass,
          );
          if (existing) continue;

          const baseClass =
            builtInShapes.find((t) => t.cls.name === typeData.baseClass)?.cls ??
            (Object.values(this._registeredNodeTypes).find(
              (cls) => (cls as any).nodeClass === typeData.baseClass,
            ) as NodeConstructor | undefined);
          if (!baseClass) throw new UnknownNodeTypeError(typeData.baseClass);

          const NodeClass = (DiagramNode as any).define(baseClass, {
            defaults: typeData.defaultOptions,
            schema: typeData.schema,
            visibleProps: (typeData as any).visibleProps ?? undefined,
            editProp: (typeData as any).editProp ?? undefined,
          });
          (NodeClass as any).nodeClass = typeData.nodeClass;
          this.registerNodeType(typeData.nodeClass, NodeClass, typeData.name);
        }
      }
    }

    if (!this._isHeadless) this._deselectAll();
    this._nodeMap.clear();
    this._edgeMap.clear();
    this._headlessEdges = [];
    if (!this._isHeadless) this._graph.clear();

    const nodeClassMap: Record<string, NodeConstructor> = Object.fromEntries(
      Object.values(this._registeredNodeTypes).map((cls) => [
        (cls as any).nodeClass,
        cls,
      ]),
    );

    const autoPortsOn = this._autoPortsOn;
    this._autoPortsOn = false;
    this._isLoading = true;
    const oldIdToNode: Record<string, DiagramNode> = {};

    for (const nodeData of nodeDataList) {
      const NodeClass = nodeClassMap[nodeData.nodeClass];
      if (!NodeClass) throw new UnknownNodeTypeError(nodeData.nodeClass);

      const node = new NodeClass({
        ...nodeData.props,
        ...nodeData.customProps,
      });
      node.editor = this;

      const applyCustomProps = (n: DiagramNode, raw: Record<string, any>) => {
        Object.entries(n.schema as Schema).forEach(([key, fieldDef]) => {
          const fieldDefinition = fieldDef as FieldDefinition;
          if (!(key in raw)) return;
          const liveValue = fieldDefinition.deserialize
            ? fieldDefinition.deserialize(raw[key], n)
            : raw[key];
          n.customProps[key] = liveValue;
        });
        Object.entries(n.schema as Schema).forEach(([key, fieldDef]) => {
          const fieldDefinition = fieldDef as FieldDefinition;
          if (!(key in raw)) return;
          fieldDefinition.onChange?.(n, n.customProps[key], undefined);
        });
      };
      applyCustomProps(node, nodeData.customProps);

      if (this._isHeadless) {
        const id = nodeData.id ?? `node-${Math.random().toString(36).slice(2)}`;
        (node as any)._headlessId = id;
        if (nodeData.x !== undefined) node.x = nodeData.x;
        if (nodeData.y !== undefined) node.y = nodeData.y;
        this._nodeMap.set(id, node);
        node.on('change', (changedNode: DiagramNode) =>
          this.emit('node:change', changedNode),
        );
        node.on('move', (movedNode: DiagramNode) =>
          this.emit('node:move', movedNode),
        );
        oldIdToNode[nodeData.id] = node;
        continue;
      }

      const portRadius = PORT_RADIUS;
      const position: Point = { x: nodeData.x ?? 0, y: nodeData.y ?? 0 };
      const cell = node._buildCell(position, joint.shapes, portRadius);
      cell.attr('label/text', node._label);
      cell.set('nodeClass', nodeData.nodeClass);
      node.cell = cell;

      // FIXME: This builtIns array is duplicated verbatim in define() and addNode().
      // Extract to a module-level BUILT_IN_NODE_PROPS constant.
      const builtIns: (keyof NodeOptions)[] = [
        'label',
        'labelColor',
        'labelFontSize',
        'description',
        'descriptionColor',
        'backgroundColor',
        'borderColor',
        'borderWidth',
        'imageUrl',
        'imageWidth',
        'imageHeight',
      ];
      const initOptions: NodeOptions = node._initOptions || {};
      builtIns.forEach((key) => {
        const value = initOptions[key] ?? (node as any)[`_init_${key}`];
        if (value !== undefined) (node as any)[key] = value;
      });

      Object.entries(node.customProps).forEach(([key, value]) =>
        cell.set(`custom_${key}`, value),
      );
      cell.addTo(this._graph);
      this._nodeMap.set(cell.id, node);

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      this._fitNodeToContent(cell);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      this._renderer.updateViews();

      // FIXME: This two-pass onChange firing is duplicated in define(), addNode(),
      // and the drop handler. Extract to a shared fireOnChangeForAllProps helper.
      Object.entries(node.schema as Schema).forEach(([key, fieldDef]) => {
        (fieldDef as FieldDefinition).onChange?.(
          node,
          node.customProps[key],
          undefined,
        );
      });

      node.on('change', (changedNode: DiagramNode) =>
        this.emit('node:change', changedNode),
      );
      node.on('move', (movedNode: DiagramNode) =>
        this.emit('node:move', movedNode),
      );
      oldIdToNode[nodeData.id] = node;
    }

    for (const edgeData of edgeDataList) {
      const sourceNode = oldIdToNode[edgeData.sourceId];
      const targetNode = oldIdToNode[edgeData.targetId];
      if (!sourceNode || !targetNode) continue;

      if (this._isHeadless) {
        this._headlessEdges.push({
          source: sourceNode,
          target: targetNode,
          props: { ...edgeData },
        });
        continue;
      }

      const edge = sourceNode.connectTo(
        targetNode,
        edgeData.sourcePort,
        edgeData.targetPort,
      );
      if (!edge) continue;

      if (edgeData.label) edge.label = edgeData.label;
      if (edgeData.labelColor) edge.labelColor = edgeData.labelColor;
      if (edgeData.labelFontSize) edge.labelFontSize = edgeData.labelFontSize;
      edge.lineColor = edgeData.lineColor;
      edge.lineWidth = edgeData.lineWidth;
      edge.lineStyle = edgeData.lineStyle;
      edge.sourceArrow = edgeData.sourceArrow;
      edge.targetArrow = edgeData.targetArrow;
      edge.connectorType = edgeData.connectorType;
      if (edgeData.description) edge.description = edgeData.description;
      if (edgeData.vertices?.length) edge.link.vertices(edgeData.vertices);
    }

    this._autoPortsOn = autoPortsOn;
    this._isLoading = false;

    if (!this._isHeadless) {
      const allCells = this._graph.getCells();
      this._graph.resetCells(allCells);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      this._graph.getLinks().forEach((link: any) => {
        const edge = this._edgeMap.get(link.id);
        if (!edge) return;
        const savedEdge = edgeDataList.find(
          (data) =>
            oldIdToNode[data.sourceId]?.cell.id === edge.source.cell.id &&
            oldIdToNode[data.targetId]?.cell.id === edge.target.cell.id,
        );
        if (!savedEdge) return;
        if (savedEdge.sourcePort != null)
          link.set('sourcePort', savedEdge.sourcePort);
        if (savedEdge.targetPort != null)
          link.set('targetPort', savedEdge.targetPort);
      });

      if (this._autoPortsOn) {
        this._graph.getLinks().forEach((link: any) => {
          const edge = this._edgeMap.get(link.id);
          if (!edge) return;
          const savedEdge = edgeDataList.find(
            (data) =>
              oldIdToNode[data.sourceId]?.cell.id === edge.source.cell.id &&
              oldIdToNode[data.targetId]?.cell.id === edge.target.cell.id,
          );
          if (savedEdge?.sourcePort == null) link.unset('sourcePort');
          if (savedEdge?.targetPort == null) link.unset('targetPort');
        });
      }
    }

    this.emit('change');
    return this;
  }

  // ── Internal methods ──────────────────────────────────────────

  // TODO: Replace `any` with specific internal interfaces for JointJS view and model types.
  public _selectItem(item: DiagramNode | Edge): void {
    if (this._isHeadless) return;
    if (this._selection && this._selection !== item) {
      const prevModel =
        this._selection instanceof DiagramNode
          ? this._selection.cell
          : (this._selection as Edge).link;
      this._renderer
        .findViewByModel(prevModel)
        ?.el.classList.remove('wf-selected');
      joint.highlighters.stroke.removeAll(this._renderer);
    }
    this._selection = item;
    const isNode = item instanceof DiagramNode;
    const model = isNode ? (item as DiagramNode).cell : (item as Edge).link;
    const view = this._renderer.findViewByModel(model);

    if (view) {
      view.el.classList.add('wf-selected');
      joint.highlighters.stroke.add(view, 'root', 'selection', {
        padding: SELECTION_PADDING,
        attrs: { stroke: COLOR_ACCENT, 'stroke-width': SELECTION_STROKE_WIDTH },
      });
    }

    this._propertiesHeaderActions.style.display = 'flex';
    (
      this._propertiesHeaderActions.querySelector(
        '[data-action="duplicate"]',
      ) as HTMLElement
    ).style.display = isNode ? 'flex' : 'none';

    if (isNode) {
      this._showPropertiesPanel('node');
      this._fillNodeProperties(item as DiagramNode);
    } else {
      this._showPropertiesPanel('edge');
      this._fillEdgeProperties(item as Edge);
    }

    this.emit('selection:change', item);
    this._updateMobileButtonVisibility();
  }

  public _getEdgesForNode(node: DiagramNode): Edge[] {
    if (this._isHeadless) {
      return this._headlessEdges
        .filter(
          (headlessEdge) =>
            headlessEdge.source === node || headlessEdge.target === node,
        )
        .map((headlessEdge) => {
          const edge = new Edge(
            null,
            headlessEdge.source,
            headlessEdge.target,
            this,
          );
          Object.assign(edge, headlessEdge.props);
          return edge;
        });
    }
    return [...this._edgeMap.values()].filter(
      (edge) => edge.source === node || edge.target === node,
    );
  }

  public _createEdge(
    sourceNode: DiagramNode,
    targetNode: DiagramNode,
    sourcePortIndex: number | null,
    targetPortIndex: number | null,
  ): Edge | null {
    const alreadyConnected = (src: DiagramNode, tgt: DiagramNode) => {
      if (this._isHeadless) {
        return this._headlessEdges.some(
          (headlessEdge) =>
            (headlessEdge.source === src && headlessEdge.target === tgt) ||
            (headlessEdge.source === tgt && headlessEdge.target === src),
        );
      }
      return [...this._edgeMap.values()].some(
        (edge) =>
          (edge.source === src && edge.target === tgt) ||
          (edge.source === tgt && edge.target === src),
      );
    };

    if (alreadyConnected(sourceNode, targetNode)) return null;

    if (this._isHeadless) {
      const edge = new Edge(null, sourceNode, targetNode, this);
      edge.sourcePort = sourcePortIndex;
      edge.targetPort = targetPortIndex;
      this._headlessEdges.push({
        source: sourceNode,
        target: targetNode,
        props: { sourcePort: sourcePortIndex, targetPort: targetPortIndex },
      });
      edge.on('change', (changedEdge: Edge) =>
        this.emit('edge:change', changedEdge),
      );
      this.emit('edge:add', edge);
      return edge;
    }

    const link = new joint.shapes.standard.Link({
      attrs: {
        line: {
          stroke: COLOR_EDGE_LINE,
          strokeWidth: 2,
          targetMarker: ARROW_MARKERS.classic as any,
        },
      },
    });

    const sourcePorts = sourceNode.cell.getPorts();
    const targetPorts = targetNode.cell.getPorts();
    const sourcePort =
      sourcePortIndex !== null ? sourcePorts[sourcePortIndex - 1] : null;
    const targetPort =
      targetPortIndex !== null ? targetPorts[targetPortIndex - 1] : null;

    link.source(
      sourcePort
        ? { id: sourceNode.cell.id, port: sourcePort.id }
        : { id: sourceNode.cell.id },
    );
    link.target(
      targetPort
        ? { id: targetNode.cell.id, port: targetPort.id }
        : { id: targetNode.cell.id },
    );
    if (sourcePortIndex !== null) link.set('sourcePort', sourcePortIndex);
    if (targetPortIndex !== null) link.set('targetPort', targetPortIndex);

    this._graph.startBatch('edge');
    link.addTo(this._graph);
    this._graph.stopBatch('edge');
    this._renderer.updateViews();

    const edge = new Edge(link, sourceNode, targetNode, this);
    this._edgeMap.set(link.id.toString(), edge);
    edge.on('change', (changedEdge: Edge) =>
      this.emit('edge:change', changedEdge),
    );
    this.emit('edge:add', edge);
    return edge;
  }

  public _fitNodeToContent(cell: any): void {
    const view = this._renderer.findViewByModel(cell);
    if (!view) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => this._fitNodeToContent(cell)),
      );
      return;
    }

    const labelElement = view.el.querySelector(
      '.label',
    ) as SVGTextElement | null;
    const descriptionElement = view.el.querySelector(
      '.descriptionLabel',
    ) as SVGTextElement | null;
    if (!labelElement || !descriptionElement) return;

    const fontScale =
      (cell.get('fontSizePercent') || FONT_SIZE_PERCENT_DEFAULT) /
      FONT_SIZE_PERCENT_DEFAULT;
    cell.attr({
      label: { fontSize: FONT_SIZE_LABEL * fontScale },
      descriptionLabel: { fontSize: FONT_SIZE_DESCRIPTION * fontScale },
    });

    const imageUrl: string = cell.get('imageUrl');
    const shapeType: ShapeType = cell.get('type');
    const descriptionText: string = cell.attr('descriptionLabel/text') || '';
    const imageWidth: number = cell.get('imageWidth') || IMAGE_DEFAULT_WIDTH;
    const imageHeight: number = cell.get('imageHeight') || IMAGE_DEFAULT_HEIGHT;
    const imageSpacing = imageUrl ? IMAGE_SPACING : 0;

    const labelBBox = labelElement.getBBox();
    const descriptionBBox = descriptionElement.getBBox();
    const textWidth = Math.max(labelBBox.width, descriptionBBox.width);
    const totalContentWidth =
      (imageUrl ? imageWidth : 0) + imageSpacing + textWidth;

    let width = Math.max(
      NODE_MIN_WIDTH,
      NODE_PADDING + totalContentWidth + NODE_PADDING,
    );
    const totalTextHeight = descriptionText
      ? labelBBox.height + descriptionBBox.height
      : labelBBox.height;
    let height = Math.max(
      NODE_MIN_HEIGHT,
      NODE_PADDING +
        Math.max(imageUrl ? imageHeight : 0, totalTextHeight) +
        NODE_PADDING,
    );

    if (shapeType === 'diamond' || shapeType === 'circle') {
      width = height = Math.max(width, height, NODE_MIN_SQUARISH_SIZE);
    } else if (
      ['triangle', 'hexagon', 'pentagon', 'octagon'].includes(shapeType)
    ) {
      if (width / height > POLYGON_ASPECT_RATIO)
        height = width / POLYGON_ASPECT_RATIO;
      else width = height * POLYGON_ASPECT_RATIO;
      if (shapeType === 'triangle') {
        width *= TRIANGLE_SCALE;
        height *= TRIANGLE_SCALE;
      }
    }

    const contentStartX = (width - totalContentWidth) / 2;
    const textCenterX =
      contentStartX +
      (imageUrl ? imageWidth : 0) +
      imageSpacing +
      textWidth / 2;

    // TODO: Merge image, label, and descriptionLabel attr updates into a single
    // cell.attr({}) call below to avoid triggering multiple JointJS change events.
    cell.attr('image', {
      refX: 0,
      refX2: contentStartX,
      refY: 0.5,
      y: -imageHeight / 2,
      width: imageWidth,
      height: imageHeight,
    });

    if (descriptionText) {
      const contentStartY = (height - totalTextHeight) / 2;
      cell.attr('label', {
        refX: 0,
        refX2: textCenterX,
        refY: 0,
        refY2: contentStartY + labelBBox.height / 2,
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
      });
      cell.attr('descriptionLabel', {
        refX: 0,
        refX2: textCenterX,
        refY: 0,
        refY2: contentStartY + labelBBox.height + descriptionBBox.height / 2,
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
      });
    } else {
      cell.attr('label', {
        refX: 0,
        refX2: textCenterX,
        refY: 0.5,
        refY2: 0,
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
      });
    }

    cell.resize(width, height);
  }

  // ── Private methods ──────────────────────────────────────────

  private _updateMobileButtonVisibility(): void {
    if (!this._isMobile()) return;
    const shouldHide =
      this._selection !== null ||
      !this._leftSidebar.classList.contains('wf-collapsed') ||
      !this._rightSidebar.classList.contains('wf-collapsed');
    const display = shouldHide ? 'none' : '';
    this._topRightButtons.style.display = display;
    this._topLeftButtons.style.display = display;
    this._bottomLeftButtons.style.display = display;
  }

  private _buildLayout(): void {
    this.container!.innerHTML = '';
    this.container!.style.cssText =
      'display:flex; height:100%; overflow:hidden;';

    this._leftSidebar = this.container!.appendChild(
      this._makeElement('div', 'wf-sidebar wf-sidebar-left'),
    );
    const leftHeader = this._leftSidebar.appendChild(
      this._makeElement('div', 'wf-sidebar-header'),
    );
    leftHeader.innerHTML = `
      <span class="wf-sidebar-title">Library</span>
      <button class="wf-collapse-btn" title="Toggle Library">
        <svg class="wf-collapse-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="wf-collapsed-label" style="display:none">Library</span>`;
    this._leftCollapseButton = leftHeader.querySelector(
      '.wf-collapse-btn',
    ) as HTMLElement;
    this._leftCollapseIcon = leftHeader.querySelector(
      '.wf-collapse-icon',
    ) as HTMLElement;
    this._shapeLibrary = this._leftSidebar.appendChild(
      this._makeElement('div', 'wf-library wf-sidebar-body'),
    );

    this._canvasArea = this.container!.appendChild(
      this._makeElement('div', 'wf-canvas-container'),
    );
    this._paperElement = this._canvasArea.appendChild(
      this._makeElement('div', 'wf-paper'),
    );

    this._topRightButtons = this._canvasArea.appendChild(
      this._makeElement('div'),
    );
    this._topRightButtons.style.cssText =
      'position:absolute; top:20px; right:20px; z-index:100; display:flex; gap:8px;';

    this._exportButton = this._topRightButtons.appendChild(
      this._makeElement('button', 'wf-ctrl-btn'),
    ) as HTMLButtonElement;
    this._exportButton.title = 'Export';
    this._exportButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

    this._importButton = this._topRightButtons.appendChild(
      this._makeElement('button', 'wf-ctrl-btn'),
    ) as HTMLButtonElement;
    this._importButton.title = 'Import';
    this._importButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

    this._importFileInput = this._canvasArea.appendChild(
      this._makeElement('input'),
    ) as HTMLInputElement;
    this._importFileInput.type = 'file';
    this._importFileInput.accept = '.json';
    this._importFileInput.style.display = 'none';

    this._topLeftButtons = this._canvasArea.appendChild(
      this._makeElement('div'),
    );
    this._topLeftButtons.style.cssText =
      'position:absolute; top:20px; left:20px; z-index:100; display:flex; gap:8px;';

    this._autoPortToggleButton = this._topLeftButtons.appendChild(
      this._makeElement('button', 'wf-ctrl-btn active'),
    ) as HTMLButtonElement;
    this._autoPortToggleButton.title = 'Toggle Auto Port Switching';
    this._autoPortToggleButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9m3 10H5M16 12H8M7 7l-4 4 4 4M17 9l4 4-4 4"/></svg>`;

    this._autoArrangeButton = this._topLeftButtons.appendChild(
      this._makeElement('button', 'wf-ctrl-btn'),
    ) as HTMLButtonElement;
    this._autoArrangeButton.title = 'Auto Arrange';
    this._autoArrangeButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="4" rx="1"/><rect x="3" y="10" width="7" height="4" rx="1"/><rect x="3" y="17" width="7" height="4" rx="1"/><rect x="14" y="5" width="7" height="4" rx="1"/><rect x="14" y="15" width="7" height="4" rx="1"/><line x1="10" y1="5" x2="14" y2="7"/><line x1="10" y1="12" x2="14" y2="7"/><line x1="10" y1="12" x2="14" y2="17"/><line x1="10" y1="19" x2="14" y2="17"/></svg>`;

    this._bottomLeftButtons = this._canvasArea.appendChild(
      this._makeElement('div', 'wf-bottom-left'),
    );
    const zoomGroup = this._bottomLeftButtons.appendChild(
      this._makeElement('div', 'wf-zoom-group'),
    );
    this._zoomToFitButton = this._makeZoomButton(
      zoomGroup,
      'Fit',
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`,
    );
    this._zoomResetButton = this._makeZoomButton(
      zoomGroup,
      'Reset Zoom',
      '1:1',
    );
    this._zoomInButton = this._makeZoomButton(zoomGroup, 'Zoom In', '+');
    this._zoomOutButton = this._makeZoomButton(zoomGroup, 'Zoom Out', '−');
    this._centerButton = this._makeZoomButton(
      zoomGroup,
      'Center',
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
    );

    if (this._isMobile()) {
      this._zoomInButton.style.display = 'none';
      this._zoomOutButton.style.display = 'none';
    }

    this._contextMenu = this._canvasArea.appendChild(
      this._makeElement('div', 'wf-context-menu'),
    );
    this._contextMenu.innerHTML = `
      <div class="wf-menu-item" data-action="duplicate">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Duplicate
      </div>
      <div class="wf-menu-item danger" data-action="delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Delete
      </div>`;

    this._rightSidebar = this.container!.appendChild(
      this._makeElement('div', 'wf-sidebar wf-sidebar-right'),
    );
    const rightHeader = this._rightSidebar.appendChild(
      this._makeElement('div', 'wf-sidebar-header'),
    );
    rightHeader.innerHTML = `
      <button class="wf-collapse-btn" title="Toggle Properties">
        <svg class="wf-collapse-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <span class="wf-sidebar-title">Properties</span>
      <span class="wf-collapsed-label" style="display:none">Properties</span>
      <div class="wf-header-actions wf-sidebar-body" style="display:none;">
        <button class="wf-header-btn" data-action="focus" title="Center on Element">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="wf-header-btn" data-action="duplicate" title="Duplicate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="wf-header-btn danger" data-action="delete" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>`;
    this._rightCollapseButton = rightHeader.querySelector(
      '.wf-collapse-btn',
    ) as HTMLElement;
    this._rightCollapseIcon = rightHeader.querySelector(
      '.wf-collapse-icon',
    ) as HTMLElement;
    this._propertiesHeaderActions = rightHeader.querySelector(
      '.wf-header-actions',
    ) as HTMLElement;

    this._nodePropertiesPanel = this._buildNodePropertiesPanel();
    this._edgePropertiesPanel = this._buildEdgePropertiesPanel();

    this._noSelectionMessage = this._rightSidebar.appendChild(
      this._makeElement('div', 'wf-no-selection wf-sidebar-body'),
    );
    this._noSelectionMessage.textContent = 'Select an item to view properties';

    this._showPropertiesPanel('none');
  }

  private _buildNodePropertiesPanel(): HTMLElement {
    const panel = this._rightSidebar.appendChild(
      this._makeElement(
        'div',
        'wf-properties wf-prop-panel-element wf-sidebar-body',
      ),
    );
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="wf-prop-group" data-builtin-prop="label">
        <label>Label</label>
        <input type="text" data-prop="label">
      </div>
      <div class="wf-prop-group" data-builtin-prop="labelFontSize">
        <label>Font Size (%)</label>
        <input type="number" data-prop="labelFontSize" min="10" max="500">
      </div>
      <div class="wf-prop-group" data-builtin-prop="backgroundColor">
        <label>Background Color</label>
        <div class="wf-color-row">
          <input type="color" data-prop="backgroundColor" data-pair="backgroundColorHex">
          <input type="text"  data-prop="backgroundColorHex" data-pair-picker="backgroundColor" placeholder="#FFFFFF">
        </div>
      </div>
      <div class="wf-prop-group" data-builtin-prop="borderColor">
        <label>Border Color</label>
        <div class="wf-color-row">
          <input type="color" data-prop="borderColor" data-pair="borderColorHex">
          <input type="text"  data-prop="borderColorHex" data-pair-picker="borderColor" placeholder="#ADB5BD">
        </div>
      </div>
      <div class="wf-prop-group" data-builtin-prop="labelColor">
        <label>Label Color</label>
        <div class="wf-color-row">
          <input type="color" data-prop="labelColor" data-pair="labelColorHex">
          <input type="text"  data-prop="labelColorHex" data-pair-picker="labelColor" placeholder="#212529">
        </div>
      </div>
      <div class="wf-prop-group" data-builtin-prop="descriptionColor">
        <label>Description Color</label>
        <div class="wf-color-row">
          <input type="color" data-prop="descriptionColor" data-pair="descriptionColorHex">
          <input type="text"  data-prop="descriptionColorHex" data-pair-picker="descriptionColor" placeholder="#6C757D">
        </div>
      </div>
      <div class="wf-prop-group" data-builtin-prop="description">
        <label>Description</label>
        <textarea data-prop="description"></textarea>
      </div>
      <div class="wf-prop-group" data-builtin-prop="imageUrl">
        <label>Image URL</label>
        <div class="wf-image-row">
          <input type="text" data-prop="imageUrl" placeholder="https://...">
          <button class="wf-upload-btn" data-action="upload-image" title="Upload Image">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
          <input type="file" data-action="image-file" style="display:none;" accept="image/*">
        </div>
      </div>
      <div class="wf-prop-row" data-builtin-prop="imageWidth">
        <div class="wf-prop-group">
          <label>Image Width</label>
          <input type="number" data-prop="imageWidth" min="0">
        </div>
        <div class="wf-prop-group">
          <label>Image Height</label>
          <input type="number" data-prop="imageHeight" min="0">
        </div>
      </div>`;
    return panel;
  }

  private _buildEdgePropertiesPanel(): HTMLElement {
    const panel = this._rightSidebar.appendChild(
      this._makeElement(
        'div',
        'wf-properties wf-prop-panel-link wf-sidebar-body',
      ),
    );
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="wf-prop-group">
        <label>Label</label>
        <input type="text" data-prop="label">
      </div>
      <div class="wf-prop-group">
        <label>Label Color</label>
        <div class="wf-color-row">
          <input type="color" data-prop="labelColor" data-pair="labelColorHex">
          <input type="text"  data-prop="labelColorHex" data-pair-picker="labelColor" placeholder="#333333">
        </div>
      </div>
      <div class="wf-prop-group">
        <label>Font Size (%)</label>
        <input type="number" data-prop="labelFontSize" min="10" max="500">
      </div>
      <div class="wf-prop-group">
        <label>Connector Type</label>
        <select data-prop="connectorType">
          <option value="elbow">Elbow (Default)</option>
          <option value="straight">Straight</option>
          <option value="curved">Curved</option>
        </select>
      </div>
      <div class="wf-prop-group">
        <label>Line Color</label>
        <div class="wf-color-row">
          <input type="color" data-prop="lineColor" data-pair="lineColorHex">
          <input type="text"  data-prop="lineColorHex" data-pair-picker="lineColor" placeholder="#495057">
        </div>
      </div>
      <div class="wf-prop-group">
        <label>Line Style</label>
        <select data-prop="lineStyle">
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>
      <div class="wf-prop-group">
        <label>Source Arrow</label>
        <select data-prop="sourceArrow">
          <option value="none">None</option>
          <option value="classic">Classic</option>
          <option value="block">Block</option>
        </select>
      </div>
      <div class="wf-prop-group">
        <label>Target Arrow</label>
        <select data-prop="targetArrow">
          <option value="none">None</option>
          <option value="classic">Classic</option>
          <option value="block">Block</option>
        </select>
      </div>
      <div class="wf-prop-group">
        <label>Description</label>
        <textarea data-prop="description"></textarea>
      </div>`;
    return panel;
  }

  private _setupRenderer(): void {
    this._graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    this._renderer = new joint.dia.Paper({
      el: this._paperElement,
      model: this._graph,
      width: '100%',
      height: '100%',
      gridSize: this.gridSize,
      drawGrid: { name: 'dot', color: COLOR_GRID_DOT },
      background: { color: COLOR_NODE_BACKGROUND },
      cellNamespace: joint.shapes,
      defaultConnector: { name: 'rounded' },
      defaultRouter: {
        name: 'manhattan',
        args: {
          step: this.gridSize,
          padding: ROUTER_PADDING,
          maxIter: ROUTER_MAX_ITER,
        },
      },
      interactive: {
        linkMove: true,
        vertexAdd: true,
        vertexMove: true,
        elementMove: true,
      },
      preventDefaultBlankAction: false,
      linkPinning: false,
      snapLinks: { radius: SNAP_RADIUS },
      markAvailable: true,
      defaultLink: () =>
        new joint.shapes.standard.Link({
          attrs: {
            line: {
              stroke: COLOR_EDGE_LINE,
              strokeWidth: 2,
              targetMarker: ARROW_MARKERS.classic as any,
            },
          },
        }),
      // TODO: Replace `any` with specific internal interfaces for JointJS view types.
      validateConnection: (
        sourceView: any,
        sourceMagnet: any,
        targetView: any,
        targetMagnet: any,
      ) => {
        if (!sourceMagnet || !targetMagnet || sourceView === targetView)
          return false;
        const sourceNode = this._nodeMap.get(sourceView.model.id);
        const targetNode = this._nodeMap.get(targetView.model.id);
        if (!sourceNode || !targetNode) return false;
        return ![...this._edgeMap.values()].some(
          (edge) =>
            (edge.source === sourceNode && edge.target === targetNode) ||
            (edge.source === targetNode && edge.target === sourceNode),
        );
      },
    });
  }

  // FIXME: This method is ~250 lines and handles unrelated concerns: export/import,
  // sidebar collapse, zoom buttons, wheel zoom, context menu, drag-and-drop (two full
  // drop paths), and image upload. Split into _attachToolbarListeners,
  // _attachCanvasListeners, and _attachDropListeners.
  private _attachButtonListeners(): void {
    this._exportButton.addEventListener('click', () => {
      try {
        const blob = new Blob([this.serialize()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = Object.assign(document.createElement('a'), {
          href: url,
          download: 'diagram.json',
        });
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_REVOKE_DELAY);
      } catch (error: any) {
        alert('Export failed: ' + error.message);
      }
    });

    this._importButton.addEventListener('click', () =>
      this._importFileInput.click(),
    );

    this._importFileInput.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) =>
        this.deserialize(
          (loadEvent.target as FileReader).result as string,
        ).catch((error: any) => alert('Import failed: ' + error.message));
      reader.readAsText(file);
      (event.target as HTMLInputElement).value = '';
    });

    this._leftCollapseButton.addEventListener('click', () =>
      this._toggleSidebar(this._leftSidebar),
    );
    this._rightCollapseButton.addEventListener('click', () =>
      this._toggleSidebar(this._rightSidebar),
    );
    this._autoPortToggleButton.addEventListener('click', () =>
      this.setAutoPortSwitching(!this._autoPortsOn),
    );
    this._autoArrangeButton.addEventListener('click', () => this.autoArrange());
    this._zoomToFitButton.addEventListener('click', () => this.zoomToFit());
    this._zoomResetButton.addEventListener('click', () => this.zoomReset());
    this._zoomInButton.addEventListener('click', () => this.zoomIn());
    this._zoomOutButton.addEventListener('click', () => this.zoomOut());
    this._centerButton.addEventListener('click', () => this.centerContent());

    this._renderer.el.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        event.preventDefault();
        if (event.ctrlKey) {
          this._zoomAtPoint(
            Math.exp(-event.deltaY * ZOOM_WHEEL_SENSITIVITY),
            event.clientX,
            event.clientY,
          );
        } else {
          const translation = this._renderer.translate();
          // TODO: Wrap this translate call in requestAnimationFrame (with a dirty flag)
          // to sync panning with the display refresh rate on large diagrams.
          this._renderer.translate(
            translation.tx - event.deltaX,
            translation.ty - event.deltaY,
          );
        }
      },
      { passive: false },
    );

    this._contextMenu.addEventListener('click', (event) => {
      const action = (event.target as Element)
        .closest('[data-action]')
        ?.getAttribute('data-action');
      if (action === 'duplicate') this._duplicateSelected();
      if (action === 'delete') this._deleteSelected();
      this._contextMenu.style.display = 'none';
    });

    // TODO: Store this handler reference so destroy() can remove it via
    // window.removeEventListener — currently leaks on teardown.
    window.addEventListener('click', (event) => {
      if (!(event.target as Element).closest('.wf-context-menu'))
        this._contextMenu.style.display = 'none';
    });

    this._propertiesHeaderActions.addEventListener('click', (event) => {
      const action = (event.target as Element)
        .closest('[data-action]')
        ?.getAttribute('data-action');
      if (!action) return;
      if (action === 'focus') this._focusCameraOnSelection();
      if (action === 'duplicate') {
        this._duplicateSelected();
        if (this._isMobile()) this._toggleSidebar(this._rightSidebar);
      }
      if (action === 'delete') {
        this._deleteSelected();
        if (this._isMobile()) this._toggleSidebar(this._rightSidebar);
      }
    });

    this._nodePropertiesPanel.addEventListener('input', (event) =>
      this._handleNodePropertyChange(event),
    );
    this._nodePropertiesPanel.addEventListener('change', (event) =>
      this._handleNodePropertyChange(event),
    );
    this._edgePropertiesPanel.addEventListener('input', (event) =>
      this._handleEdgePropertyChange(event),
    );
    this._edgePropertiesPanel.addEventListener('change', (event) =>
      this._handleEdgePropertyChange(event),
    );

    const returnToCanvas = () => {
      if (this._isMobile()) this._setSidebarCollapsed(this._rightSidebar, true);
      (this._canvasArea as HTMLElement).focus();
    };

    [this._nodePropertiesPanel, this._edgePropertiesPanel].forEach((panel) => {
      panel.addEventListener('keydown', (event: KeyboardEvent) => {
        const target = event.target as HTMLElement;
        if (event.key === 'Escape') {
          event.preventDefault();
          returnToCanvas();
        } else if (
          event.key === 'Enter' &&
          target.tagName === 'INPUT' &&
          (target as HTMLInputElement).type !== 'checkbox'
        ) {
          event.preventDefault();
          returnToCanvas();
        }
      });
    });

    this._canvasArea.addEventListener('dragover', (event) =>
      event.preventDefault(),
    );
    this._canvasArea.addEventListener('drop', (event: DragEvent) => {
      event.preventDefault();

      const customLabel = event.dataTransfer!.getData('customNode');
      if (customLabel && this._registeredNodeTypes?.[customLabel]) {
        const NodeClass = this._registeredNodeTypes[customLabel];
        const dropPosition: Point = this._renderer.clientToLocalPoint({
          x: event.clientX,
          y: event.clientY,
        });

        // FIXME: This drop path reimplements addNode() inline — building the cell,
        // setting attrs, adding to the graph, and running the async render loop manually.
        // It also bypasses the _findOpenPosition centering logic that addNode() applies.
        // Refactor to call addNode() with the computed drop coordinates instead.
        const node = new NodeClass();
        const openPosition = this._findOpenPosition(
          dropPosition.x - NODE_DEFAULT_WIDTH / 2,
          dropPosition.y - NODE_DEFAULT_HEIGHT / 2,
          NODE_DEFAULT_WIDTH,
          NODE_DEFAULT_HEIGHT,
        );
        const portRadius = PORT_RADIUS;
        const cell = node._buildCell(openPosition, joint.shapes, portRadius);
        cell.attr('label/text', node._label);
        node.cell = cell;
        node.editor = this;
        Object.entries(node.customProps).forEach(([key, value]) =>
          cell.set(`custom_${key}`, value),
        );
        cell.addTo(this._graph);
        this._nodeMap.set(cell.id, node);
        this.clearSelection();

        // FIXME: This async render-wait-resize-listeners sequence is duplicated in
        // addNode() and the built-in drop handler below. Extract to _finalizeAddedNode.
        // FIXME: This two-pass onChange firing is duplicated in define(), addNode(),
        // and deserialize(). Extract to a shared fireOnChangeForAllProps helper.
        (async () => {
          await this._waitForRender(cell);
          await this._resizeNodeAsync(cell);
          Object.entries(node.schema as Schema).forEach(([key, fieldDef]) => {
            (fieldDef as FieldDefinition).onChange?.(
              node,
              node.customProps[key],
              undefined,
            );
          });
          await this._waitForRender(cell);
          node.on('change', (changedNode: DiagramNode) =>
            this.emit('node:change', changedNode),
          );
          node.on('move', (movedNode: DiagramNode) =>
            this.emit('node:move', movedNode),
          );
          this._selectItem(node);
        })();

        this.emit('node:add', node);
        return;
      }

      const droppedType = event.dataTransfer!.getData('type');
      const match = builtInShapes.find((shape) => shape.type === droppedType);
      if (!match) return;

      const label = droppedType.charAt(0).toUpperCase() + droppedType.slice(1);
      const dropPosition: Point = this._renderer.clientToLocalPoint({
        x: event.clientX,
        y: event.clientY,
      });

      // FIXME: This drop path reimplements addNode() inline — same issue as the
      // custom-node drop path above. Refactor to call addNode() with drop coordinates.
      const node = new match.cls({ label: label.toUpperCase() });
      const isSquarish = ['square', 'circle', 'diamond'].includes(droppedType);
      const width = isSquarish ? NODE_SQUARISH_SIZE : NODE_DEFAULT_WIDTH;
      const height = isSquarish ? NODE_SQUARISH_SIZE : NODE_DEFAULT_HEIGHT;
      const openPosition = this._findOpenPosition(
        dropPosition.x - width / 2,
        dropPosition.y - height / 2,
        width,
        height,
      );
      const portRadius = PORT_RADIUS;
      const cell = node._buildCell(openPosition, joint.shapes, portRadius);
      cell.attr('label/text', node._label);
      node.cell = cell;
      node.editor = this;
      cell.addTo(this._graph);
      this._nodeMap.set(cell.id, node);
      this.clearSelection();

      // FIXME: This async render-wait-resize-listeners sequence is duplicated in
      // addNode() and the custom-node drop handler above. Extract to _finalizeAddedNode.
      (async () => {
        await this._waitForRender(cell);
        await this._resizeNodeAsync(cell);
        await this._waitForRender(cell);
        node.on('change', (changedNode: DiagramNode) =>
          this.emit('node:change', changedNode),
        );
        node.on('move', (movedNode: DiagramNode) =>
          this.emit('node:move', movedNode),
        );
        this._selectItem(node);
      })();

      this.emit('node:add', node);
    });

    (
      this._nodePropertiesPanel.querySelector(
        '[data-action="upload-image"]',
      ) as HTMLElement
    ).addEventListener('click', () => {
      (
        this._nodePropertiesPanel.querySelector(
          '[data-action="image-file"]',
        ) as HTMLElement
      ).click();
    });

    (
      this._nodePropertiesPanel.querySelector(
        '[data-action="image-file"]',
      ) as HTMLInputElement
    ).addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        (
          this._nodePropertiesPanel.querySelector(
            '[data-prop="imageUrl"]',
          ) as HTMLInputElement
        ).value = (loadEvent.target as FileReader).result as string;
        if (this._selection instanceof DiagramNode)
          this._selection.imageUrl = (loadEvent.target as FileReader)
            .result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  private _handleNodePropertyChange(event: Event): void {
    if (!(this._selection instanceof DiagramNode)) return;
    const input = (event.target as Element).closest(
      '[data-prop]',
    ) as HTMLInputElement | null;
    if (!input) return;

    const prop = input.dataset.prop!;
    const value =
      input.type === 'number' ? parseFloat(input.value) : input.value;

    if (input.dataset.pair) {
      (
        this._nodePropertiesPanel.querySelector(
          `[data-prop="${input.dataset.pair}"]`,
        ) as HTMLInputElement
      ).value = String(value);
    }
    if (input.dataset.pairPicker) {
      (
        this._nodePropertiesPanel.querySelector(
          `[data-prop="${input.dataset.pairPicker}"]`,
        ) as HTMLInputElement
      ).value = String(value);
    }

    const resolvedProp = prop.endsWith('Hex') ? prop.slice(0, -3) : prop;
    if (resolvedProp in this._selection)
      (this._selection as any)[resolvedProp] = value;
  }

  private _handleEdgePropertyChange(event: Event): void {
    if (!(this._selection instanceof Edge)) return;
    const input = (event.target as Element).closest(
      '[data-prop]',
    ) as HTMLInputElement | null;
    if (!input) return;

    const prop = input.dataset.prop!;
    const value =
      input.type === 'number' ? parseFloat(input.value) : input.value;

    if (input.dataset.pair) {
      (
        this._edgePropertiesPanel.querySelector(
          `[data-prop="${input.dataset.pair}"]`,
        ) as HTMLInputElement
      ).value = String(value);
    }
    if (input.dataset.pairPicker) {
      (
        this._edgePropertiesPanel.querySelector(
          `[data-prop="${input.dataset.pairPicker}"]`,
        ) as HTMLInputElement
      ).value = String(value);
    }

    const resolvedProp = prop.endsWith('Hex') ? prop.slice(0, -3) : prop;
    if (resolvedProp in this._selection)
      (this._selection as any)[resolvedProp] = value;
  }

  private _attachDiagramListeners(): void {
    const CustomSourceArrowhead = joint.linkTools.SourceArrowhead.extend({
      tagName: 'circle',
      attributes: {
        r: PORT_RADIUS,
        fill: COLOR_ACCENT,
        stroke: COLOR_NODE_BACKGROUND,
        'stroke-width': PORT_STROKE_WIDTH,
        cursor: 'move',
      },
    });

    // TODO: Replace `any` with specific internal interfaces for JointJS view and event types.
    this._renderer.on(
      'element:pointerdown',
      (view: any, event: PointerEvent) => {
        const node = this._nodeMap.get(view.model.id);
        if (!node) return;
        this._pointerDownAt = { x: event.clientX, y: event.clientY };
        this._selectionWasAlreadyActive = this._selection === node;
        this._deselectAll();
        if (!this._isMobile()) node.cell.toFront();
        this._selectItem(node);
      },
    );

    this._renderer.on('element:pointerup', (view: any, event: PointerEvent) => {
      const deltaX = Math.abs(
        event.clientX - (this._pointerDownAt?.x ?? event.clientX),
      );
      const deltaY = Math.abs(
        event.clientY - (this._pointerDownAt?.y ?? event.clientY),
      );

      if (
        deltaX < 5 &&
        deltaY < 5 &&
        this._selectionWasAlreadyActive &&
        this._rightSidebar.classList.contains('wf-collapsed')
      ) {
        this._toggleSidebar(this._rightSidebar);
      }
      this._pointerDownAt = null;
      this._selectionWasAlreadyActive = false;

      if (!this._isMobile()) {
        const node = this._nodeMap.get(view.model.id);
        if (node) {
          const bbox = node.cell.getBBox();
          const openPosition = this._findOpenPosition(
            bbox.x,
            bbox.y,
            bbox.width,
            bbox.height,
            node.cell,
          );
          node.cell.position(openPosition.x, openPosition.y);
        }
      }
    });

    this._renderer.on('link:pointerdown', (view: any) => {
      this._renderer.el.classList.add('wf-dragging-link');
      const edge = this._edgeMap.get(view.model.id);
      if (!edge) return;
      this._deselectAll();
      view.model.toFront();
      this._selectItem(edge);
      view.addTools(
        new joint.dia.ToolsView({
          tools: [
            new joint.linkTools.Vertices(),
            new CustomSourceArrowhead(),
            new joint.linkTools.TargetArrowhead({ offset: -1 }),
            new joint.linkTools.Remove({ distance: EDGE_REMOVE_DISTANCE }),
          ],
        }),
      );
    });

    this._renderer.el.addEventListener('pointerdown', (event: PointerEvent) => {
      const target = event.target as Element;
      if (
        target?.classList?.contains('source-arrowhead') ||
        target?.classList?.contains('target-arrowhead')
      ) {
        this._renderer.el.classList.add('wf-dragging-link');
      }
    });
    this._renderer.el.addEventListener('pointerup', () =>
      this._renderer.el.classList.remove('wf-dragging-link'),
    );

    this._renderer.on(
      'cell:pointerdown tool:pointerdown',
      (view: any, event: PointerEvent) => {
        if ((event?.target as Element)?.closest?.('.joint-port'))
          this._renderer.el.classList.add('wf-dragging-link');
      },
    );
    this._renderer.on('cell:pointerup link:pointerup tool:pointerup', () =>
      this._renderer.el.classList.remove('wf-dragging-link'),
    );

    this._renderer.on('cell:contextmenu', (view: any, event: MouseEvent) => {
      event.preventDefault();
      const rect = this._canvasArea.getBoundingClientRect();
      this._contextMenu.style.display = 'block';
      this._contextMenu.style.left = event.clientX - rect.left + 'px';
      this._contextMenu.style.top = event.clientY - rect.top + 'px';
      (
        this._contextMenu.querySelector(
          '[data-action="duplicate"]',
        ) as HTMLElement
      ).style.display = this._nodeMap.has(view.model.id) ? 'flex' : 'none';
    });

    this._renderer.on('blank:pointerdown', (event: PointerEvent) => {
      this._collapseAllSidebarsOnMobile();
      const startX = event.clientX;
      const startY = event.clientY;
      const initialTranslation = this._renderer.translate();

      if (this._isMobile()) {
        this._deselectAll();
        return;
      }

      // TODO: Wrap translate in requestAnimationFrame (with a dirty flag) to sync
      // panning with the display refresh rate on large diagrams.
      // TODO: Store onMove/onUp references so destroy() can remove them via
      // document.removeEventListener — currently leaks if the editor is torn down
      // while a pan gesture is in progress.
      const onMove = (moveEvent: MouseEvent) =>
        this._renderer.translate(
          initialTranslation.tx + (moveEvent.clientX - startX),
          initialTranslation.ty + (moveEvent.clientY - startY),
        );
      const onUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (
          Math.abs(upEvent.clientX - startX) < 5 &&
          Math.abs(upEvent.clientY - startY) < 5
        )
          this._deselectAll();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    this._renderer.on('link:connect', (view: any) => {
      const link = view.model;
      const sourceCell = link.getSourceElement();
      const targetCell = link.getTargetElement();
      if (!sourceCell || !targetCell) return;

      const sourceNode = this._nodeMap.get(sourceCell.id);
      const targetNode = this._nodeMap.get(targetCell.id);
      if (!sourceNode || !targetNode || this._edgeMap.has(link.id)) return;

      const alreadyConnected = [...this._edgeMap.values()].some(
        (edge) =>
          (edge.source === sourceNode && edge.target === targetNode) ||
          (edge.source === targetNode && edge.target === sourceNode),
      );
      if (alreadyConnected) {
        link.remove();
        return;
      }

      const edge = new Edge(link, sourceNode, targetNode, this);
      this._edgeMap.set(link.id, edge);
      edge.on('change', (changedEdge: Edge) =>
        this.emit('edge:change', changedEdge),
      );
      this.emit('edge:add', edge);
    });

    this._graph.on('remove', (cell: any) => {
      if (cell.isLink()) {
        const edge = this._edgeMap.get(cell.id);
        if (edge) {
          this._edgeMap.delete(cell.id);
          this.emit('edge:remove', edge);
        }
      } else {
        const node = this._nodeMap.get(cell.id);
        if (node) {
          this._nodeMap.delete(cell.id);
          this.emit('node:remove', node);
        }
      }
    });

    this._graph.on('change:position', (cell: any) => {
      const node = this._nodeMap.get(cell.id);
      if (node) {
        this._updateConnectionPorts(cell);
        node.emit('move', node);
        this._graph.getLinks().forEach((link: any) => link.toFront());
      }
    });
  }

  private _attachKeyboardShortcuts(): void {
    this._clipboard = null;
    (this._canvasArea as HTMLElement).tabIndex = 0;
    this._canvasArea.style.outline = 'none';
    (this._canvasArea as HTMLElement).focus();

    this._canvasArea.addEventListener('mousedown', () => {
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA')
        (this._canvasArea as HTMLElement).focus();
    });

    this._canvasArea.addEventListener(
      'keydown',
      async (event: KeyboardEvent) => {
        const tag = document.activeElement?.tagName;
        const isTyping =
          tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        if (event.key === 'F2' || (!isTyping && event.key === 'Enter')) {
          if (
            this._selection instanceof DiagramNode ||
            this._selection instanceof Edge
          ) {
            event.preventDefault();
            if (this._rightSidebar.classList.contains('wf-collapsed'))
              this._toggleSidebar(this._rightSidebar);
            await this._waitForRender(
              this._selection instanceof DiagramNode
                ? this._selection.cell
                : this._selection.link,
            );
            const panel =
              this._selection instanceof DiagramNode
                ? this._nodePropertiesPanel
                : this._edgePropertiesPanel;
            const editProp =
              this._selection instanceof DiagramNode
                ? ((this._selection.constructor as any).__editProp ?? 'label')
                : 'label';
            const labelInput = panel.querySelector(
              `[data-prop="${editProp}"]`,
            ) as HTMLInputElement | null;
            if (labelInput) {
              labelInput.focus();
              labelInput.select();
            }
          }
          return;
        }

        if (isTyping) return;

        if (event.key === 'Escape') {
          event.preventDefault();
          this._deselectAll();
          return;
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          this._deleteSelected();
          return;
        }
        if (event.key === '0' && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.zoomReset();
          return;
        }
        if (event.key === 'Tab') {
          event.preventDefault();
          const nodes = [...this._nodeMap.values()];
          if (nodes.length === 0) return;
          const currentIndex =
            this._selection instanceof DiagramNode
              ? nodes.indexOf(this._selection)
              : -1;
          const nextIndex = event.shiftKey
            ? (currentIndex - 1 + nodes.length) % nodes.length
            : (currentIndex + 1) % nodes.length;
          this._deselectAll();
          nodes[nextIndex].select();
          return;
        }
        if (event.key === '-' && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.zoomOut();
          return;
        }
        if (
          (event.key === '=' || event.key === '+') &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          this.zoomIn();
          return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
          if (this._selection instanceof DiagramNode) {
            event.preventDefault();
            this._clipboard = this._selection;
          }
          return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
          if (this._clipboard) {
            event.preventDefault();
            const bbox = this._clipboard.cell.getBBox();
            const openPosition = this._findOpenPosition(
              bbox.x + DUPLICATE_OFFSET,
              bbox.y + DUPLICATE_OFFSET,
              bbox.width,
              bbox.height,
            );
            const clonedCell = this._clipboard.cell.clone();
            clonedCell.position(openPosition.x, openPosition.y);
            clonedCell.addTo(this._graph);
            this._deselectAll();

            const copy = new (this._clipboard.constructor as NodeConstructor)({
              label: this._clipboard.label,
            });
            copy.cell = clonedCell;
            copy.editor = this;
            this._nodeMap.set(clonedCell.id, copy);

            (async () => {
              await this._waitForRender(clonedCell);
              await this._resizeNodeAsync(clonedCell);
              await this._waitForRender(clonedCell);
              copy.on('change', (changedNode: DiagramNode) =>
                this.emit('node:change', changedNode),
              );
              copy.on('move', (movedNode: DiagramNode) =>
                this.emit('node:move', movedNode),
              );
              this._selectItem(copy);
            })();

            this.emit('node:add', copy);
          }
          return;
        }

        if (
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          const deltaX =
            event.key === 'ArrowLeft'
              ? -this.gridSize
              : event.key === 'ArrowRight'
                ? this.gridSize
                : 0;
          const deltaY =
            event.key === 'ArrowUp'
              ? -this.gridSize
              : event.key === 'ArrowDown'
                ? this.gridSize
                : 0;
          if (this._selection instanceof DiagramNode) {
            this._selection.moveBy(deltaX, deltaY);
          } else if (!this._selection) {
            const translation = this._renderer.translate();
            this._renderer.translate(
              translation.tx - deltaX,
              translation.ty - deltaY,
            );
          }
        }
      },
    );

    this._canvasArea.addEventListener('keyup', (event: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!(this._selection instanceof DiagramNode)) return;
      const onKeyUp = (this._selection.constructor as any).__onKeyUp;
      if (onKeyUp) onKeyUp(this._selection, event.key);
    });

    // Ensure keyup always reaches the canvas even if focus briefly moved
    document.addEventListener('keyup', (event: KeyboardEvent) => {
      if (document.activeElement === this._canvasArea) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!(this._selection instanceof DiagramNode)) return;
      const onKeyUp = (this._selection.constructor as any).__onKeyUp;
      if (onKeyUp) onKeyUp(this._selection, event.key);
    });
  }

  private _attachTouchListeners(): void {
    this._renderer.el.addEventListener(
      'touchstart',
      (event: TouchEvent) => {
        if (!this._isMobile()) return;
        if (event.touches.length === 1) {
          const touch = event.touches[0];
          if (
            document
              .elementFromPoint(touch.clientX, touch.clientY)
              ?.closest('.joint-cell')
          )
            return;
          event.stopPropagation();
          this._touchState = {
            type: 'pan',
            startX: touch.clientX,
            startY: touch.clientY,
            initialTranslation: this._renderer.translate(),
          };
        } else if (event.touches.length === 2) {
          event.stopPropagation();
          const touch1 = event.touches[0];
          const touch2 = event.touches[1];
          this._touchState = {
            type: 'pinch',
            initialDistance: this._touchDistance(touch1, touch2),
            initialMidpoint: this._touchMidpoint(touch1, touch2),
            initialScale: this._renderer.scale().sx,
            initialTranslation: this._renderer.translate(),
          };
        }
      },
      { passive: true },
    );

    this._renderer.el.addEventListener(
      'touchmove',
      (event: TouchEvent) => {
        if (!this._isMobile() || !this._touchState) return;
        event.preventDefault();
        const state = this._touchState;

        if (state.type === 'pan' && event.touches.length === 1) {
          const touch = event.touches[0];
          this._renderer.translate(
            state.initialTranslation!.tx + (touch.clientX - state.startX!),
            state.initialTranslation!.ty + (touch.clientY - state.startY!),
          );
        } else if (state.type === 'pinch' && event.touches.length === 2) {
          const touch1 = event.touches[0];
          const touch2 = event.touches[1];
          const newScale = Math.max(
            ZOOM_MIN,
            Math.min(
              ZOOM_MAX,
              (state.initialScale! * this._touchDistance(touch1, touch2)) /
                state.initialDistance!,
            ),
          );
          const midpoint = this._touchMidpoint(touch1, touch2);
          const rect = this._renderer.el.getBoundingClientRect();
          const viewportX = midpoint.x - rect.left;
          const viewportY = midpoint.y - rect.top;
          // TODO: originX/Y should divide by the renderer's current scale at the time
          // of this move event, not state.initialScale — if the gesture starts while
          // the canvas is already mid-zoom the origin is wrong and the content jumps.
          const originX =
            (viewportX - state.initialTranslation!.tx) / state.initialScale!;
          const originY =
            (viewportY - state.initialTranslation!.ty) / state.initialScale!;
          this._renderer.scale(newScale, newScale);
          this._renderer.translate(
            viewportX - originX * newScale,
            viewportY - originY * newScale,
          );
        }
      },
      { passive: false },
    );

    this._renderer.el.addEventListener(
      'touchend',
      (event: TouchEvent) => {
        if (!this._isMobile()) return;
        if (this._touchState?.type === 'pinch' && event.touches.length === 1) {
          const touch = event.touches[0];
          this._touchState = {
            type: 'pan',
            startX: touch.clientX,
            startY: touch.clientY,
            initialTranslation: this._renderer.translate(),
          };
        } else {
          this._touchState = null;
        }
      },
      { passive: true },
    );
  }

  private _deselectAll(): void {
    if (this._selection) {
      const model =
        this._selection instanceof DiagramNode
          ? this._selection.cell
          : (this._selection as Edge).link;
      this._renderer.findViewByModel(model)?.el.classList.remove('wf-selected');
    }
    this._renderer.removeTools();
    joint.highlighters.stroke.removeAll(this._renderer);
    this._selection = null;
    this._propertiesHeaderActions.style.display = 'none';
    this._showPropertiesPanel('none');
    this.emit('selection:change', null);
    (this._canvasArea as HTMLElement).focus();
    this._updateMobileButtonVisibility();
  }

  private _showPropertiesPanel(which: 'node' | 'edge' | 'none'): void {
    this._nodePropertiesPanel.style.display =
      which === 'node' ? 'flex' : 'none';
    this._edgePropertiesPanel.style.display =
      which === 'edge' ? 'flex' : 'none';
    this._noSelectionMessage.style.display =
      which === 'none' ? 'block' : 'none';
  }

  private _fillNodeProperties(node: DiagramNode): void {
    const panel = this._nodePropertiesPanel;
    const setField = (prop: string, value: any) => {
      const element = panel.querySelector(
        `[data-prop="${prop}"]`,
      ) as HTMLInputElement | null;
      if (element) element.value = value ?? '';
    };

    setField('label', node.label);
    setField('labelFontSize', node.labelFontSize);
    setField('description', node.description);
    setField('imageUrl', node.imageUrl);
    setField('imageWidth', node.imageWidth);
    setField('imageHeight', node.imageHeight);
    setField('backgroundColor', node.backgroundColor);
    setField('backgroundColorHex', node.backgroundColor);
    setField('borderColor', node.borderColor);
    setField('borderColorHex', node.borderColor);
    setField('labelColor', node.labelColor);
    setField('labelColorHex', node.labelColor);
    setField('descriptionColor', node.descriptionColor);
    setField('descriptionColorHex', node.descriptionColor);

    const visibleProps: BuiltInNodeProp[] | null =
      (node.constructor as any).__visibleProps ?? null;
    const isPropVisible = (prop: BuiltInNodeProp) =>
      visibleProps === null || visibleProps.includes(prop);
    panel.querySelectorAll<HTMLElement>('[data-builtin-prop]').forEach((el) => {
      el.style.display = isPropVisible(
        el.dataset.builtinProp as BuiltInNodeProp,
      )
        ? ''
        : 'none';
    });

    panel.querySelector('.wf-custom-props')?.remove();
    const schema = node.getSchema?.() ?? {};
    if (!Object.keys(schema).length) return;

    const customSection = this._makeElement('div', 'wf-custom-props');
    const hasVisibleBuiltIns = visibleProps === null || visibleProps.length > 0;
    if (hasVisibleBuiltIns) {
      const divider = customSection.appendChild(this._makeElement('div'));
      divider.style.cssText = `border-top:1px solid ${COLOR_DIVIDER}; margin:4px 0;`;
    }

    Object.entries(schema).forEach(([key, fieldDef]) => {
      const fieldDefinition = fieldDef as FieldDefinition;
      if (
        fieldDefinition.visible === false ||
        fieldDefinition.type === 'object'
      )
        return;

      const group = customSection.appendChild(
        this._makeElement('div', 'wf-prop-group'),
      );
      const label = group.appendChild(this._makeElement('label'));
      label.textContent = fieldDefinition.label ?? key;

      const currentValue = node.getCustomProperty(key);
      let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

      if (fieldDefinition.type === 'choice') {
        input = this._makeElement('select') as HTMLSelectElement;
        Object.entries(fieldDefinition.choices ?? {}).forEach(
          ([value, label]) => {
            const option = input.appendChild(
              this._makeElement('option'),
            ) as HTMLOptionElement;
            option.value = value;
            option.textContent = label;
          },
        );
        (input as HTMLSelectElement).value =
          currentValue ?? fieldDefinition.default;
      } else if (fieldDefinition.type === 'textarea') {
        input = this._makeElement('textarea') as HTMLTextAreaElement;
        (input as HTMLTextAreaElement).value = currentValue ?? '';
        input.dataset.prop = key;
      } else if (fieldDefinition.type === 'boolean') {
        input = this._makeElement('input') as HTMLInputElement;
        (input as HTMLInputElement).type = 'checkbox';
        (input as HTMLInputElement).checked =
          currentValue ?? fieldDefinition.default ?? false;
        input.style.cssText =
          'width:auto !important; margin:0; cursor:pointer; align-self:flex-start;';
        group.appendChild(input);
      } else if (fieldDefinition.type === 'color') {
        const row = group.appendChild(this._makeElement('div', 'wf-color-row'));
        const picker = this._makeElement('input') as HTMLInputElement;
        picker.type = 'color';
        picker.value = currentValue ?? fieldDefinition.default ?? '#000000';
        const hexInput = this._makeElement('input') as HTMLInputElement;
        hexInput.type = 'text';
        hexInput.value = currentValue ?? fieldDefinition.default ?? '#000000';
        picker.addEventListener('input', () => {
          hexInput.value = picker.value;
          node.setCustomProperty(key, picker.value);
        });
        hexInput.addEventListener('input', () => {
          picker.value = hexInput.value;
          node.setCustomProperty(key, hexInput.value);
        });
        row.appendChild(picker);
        row.appendChild(hexInput);
        group.appendChild(row);
        return;
      } else {
        input = this._makeElement('input') as HTMLInputElement;
        (input as HTMLInputElement).type =
          fieldDefinition.type === 'number' ? 'number' : 'text';
        (input as HTMLInputElement).value = currentValue ?? '';
        input.dataset.prop = key;
        if (fieldDefinition.min !== undefined)
          (input as HTMLInputElement).min = String(fieldDefinition.min);
        if (fieldDefinition.max !== undefined)
          (input as HTMLInputElement).max = String(fieldDefinition.max);
      }

      if (fieldDefinition.readonly) (input as HTMLInputElement).disabled = true;
      group.appendChild(input);

      input.addEventListener(
        fieldDefinition.type === 'boolean' ? 'change' : 'input',
        () => {
          let newValue: any;
          if (fieldDefinition.type === 'boolean')
            newValue = (input as HTMLInputElement).checked;
          else if (fieldDefinition.type === 'number')
            newValue = parseFloat((input as HTMLInputElement).value);
          else newValue = input.value;
          node.setCustomProperty(key, newValue);
        },
      );
    });

    panel.appendChild(customSection);
  }

  private _fillEdgeProperties(edge: Edge): void {
    const panel = this._edgePropertiesPanel;
    const setField = (prop: string, value: any) => {
      const element = panel.querySelector(
        `[data-prop="${prop}"]`,
      ) as HTMLInputElement | null;
      if (element) element.value = value ?? '';
    };

    setField('label', edge.label);
    setField('labelFontSize', edge.labelFontSize);
    setField('labelColor', edge.labelColor);
    setField('labelColorHex', edge.labelColor);
    setField('lineColor', edge.lineColor);
    setField('lineColorHex', edge.lineColor);
    setField('lineStyle', edge.lineStyle);
    setField('connectorType', edge.connectorType);
    setField('sourceArrow', edge.sourceArrow);
    setField('targetArrow', edge.targetArrow);
    setField('description', edge.description);
  }

  // FIXME: _toggleSidebar duplicates the icon rotation and collapsed-label DOM
  // operations from _setSidebarCollapsed instead of delegating to it. Consolidate
  // so _toggleSidebar calls _setSidebarCollapsed(sidebar, !isCurrentlyCollapsed).
  private _toggleSidebar(sidebar: HTMLElement): void {
    const isLeft = sidebar === this._leftSidebar;
    const icon = isLeft ? this._leftCollapseIcon : this._rightCollapseIcon;
    const previousTranslation = this._renderer.translate();
    const isNowCollapsed = sidebar.classList.toggle('wf-collapsed');

    (icon as HTMLElement).style.transform = isNowCollapsed
      ? 'rotate(180deg)'
      : 'rotate(0deg)';
    (
      sidebar.querySelector('.wf-collapsed-label') as HTMLElement
    ).style.display = isNowCollapsed ? 'block' : 'none';

    if (this._isMobile() && !isNowCollapsed) {
      const otherSidebar = isLeft ? this._rightSidebar : this._leftSidebar;
      const otherIcon = isLeft
        ? this._rightCollapseIcon
        : this._leftCollapseIcon;
      if (!otherSidebar.classList.contains('wf-collapsed')) {
        otherSidebar.classList.add('wf-collapsed');
        (otherIcon as HTMLElement).style.transform = 'rotate(180deg)';
        (
          otherSidebar.querySelector('.wf-collapsed-label') as HTMLElement
        ).style.display = 'block';
      }
    }

    const interval = setInterval(() => {
      const area = this._canvasArea;
      this._renderer.setDimensions(area.clientWidth, area.clientHeight);
      this._renderer.translate(previousTranslation.tx, previousTranslation.ty);
    }, SIDEBAR_RESIZE_INTERVAL);
    setTimeout(() => clearInterval(interval), SIDEBAR_ANIM_DURATION);
    this._updateMobileButtonVisibility();
  }

  private _setSidebarCollapsed(sidebar: HTMLElement, collapsed: boolean): void {
    const isLeft = sidebar === this._leftSidebar;
    const icon = isLeft ? this._leftCollapseIcon : this._rightCollapseIcon;
    sidebar.classList.toggle('wf-collapsed', collapsed);
    (icon as HTMLElement).style.transform = collapsed
      ? 'rotate(180deg)'
      : 'rotate(0deg)';
    (
      sidebar.querySelector('.wf-collapsed-label') as HTMLElement
    ).style.display = collapsed ? 'block' : 'none';
  }

  private _collapseAllSidebarsOnMobile(): void {
    if (!this._isMobile()) return;
    const previousTranslation = this._renderer.translate();
    this._setSidebarCollapsed(this._leftSidebar, true);
    this._setSidebarCollapsed(this._rightSidebar, true);
    const interval = setInterval(() => {
      const area = this._canvasArea;
      this._renderer.setDimensions(area.clientWidth, area.clientHeight);
      this._renderer.translate(previousTranslation.tx, previousTranslation.ty);
    }, SIDEBAR_RESIZE_INTERVAL);
    setTimeout(() => clearInterval(interval), SIDEBAR_ANIM_DURATION);
    this._updateMobileButtonVisibility();
  }

  private _duplicateSelected(): void {
    if (!(this._selection instanceof DiagramNode)) return;
    const bbox = this._selection.cell.getBBox();
    const openPosition = this._findOpenPosition(
      bbox.x + DUPLICATE_OFFSET,
      bbox.y + DUPLICATE_OFFSET,
      bbox.width,
      bbox.height,
    );
    const clonedCell = this._selection.cell.clone();
    clonedCell.translate(openPosition.x - bbox.x, openPosition.y - bbox.y);
    clonedCell.addTo(this._graph);
    const copy = new (this._selection.constructor as NodeConstructor)({
      label: this._selection.label,
    });
    copy.cell = clonedCell;
    copy.editor = this;
    this._nodeMap.set(clonedCell.id, copy);
    this._selectItem(copy);
    this.emit('node:add', copy);
  }

  private _deleteSelected(): void {
    if (!this._selection) return;
    const item = this._selection;
    this._deselectAll();
    item.remove();
  }

  private _focusCameraOnSelection(): void {
    if (!this._selection) return;
    const model =
      this._selection instanceof DiagramNode
        ? this._selection.cell
        : (this._selection as Edge).link;
    const center = model.getBBox().center();
    const size = this._renderer.getComputedSize();
    this._renderer.scale(1, 1);
    this._renderer.translate(
      size.width / 2 - center.x,
      size.height / 2 - center.y,
    );
  }

  private _updateConnectionPorts(cell: any): void {
    if (!this._autoPortsOn || this._isLoading) return;

    this._graph.getConnectedLinks(cell).forEach((link: any) => {
      if (typeof link.get('sourcePort') === 'number') return;
      if (typeof link.get('targetPort') === 'number') return;

      const sourceCell = link.getSourceElement();
      const targetCell = link.getTargetElement();
      if (!sourceCell || !targetCell) return;

      const getCenterOf = (element: any): Point => {
        const position = element.position();
        const size = element.size();
        return {
          x: position.x + size.width / 2,
          y: position.y + size.height / 2,
        };
      };

      const getUsedSourcePortIds = (element: any): Set<string> => {
        const used = new Set<string>();
        this._graph
          .getConnectedLinks(element, { outbound: true })
          .forEach((connectedLink: any) => {
            if (connectedLink.id === link.id) return;
            const portId = connectedLink.source()?.port;
            if (portId) used.add(portId);
          });
        return used;
      };

      const getUsedTargetPortIds = (element: any): Set<string> => {
        const used = new Set<string>();
        this._graph
          .getConnectedLinks(element, { inbound: true })
          .forEach((connectedLink: any) => {
            if (connectedLink.id === link.id) return;
            const portId = connectedLink.target()?.port;
            if (portId) used.add(portId);
          });
        return used;
      };

      const getBestPortFacing = (
        element: any,
        towardPoint: Point,
        avoidPortIds: Set<string>,
      ): string | null => {
        const center = getCenterOf(element);
        const angleToward = Math.atan2(
          towardPoint.y - center.y,
          towardPoint.x - center.x,
        );
        const portPositions = element.getPortsPositions('all');
        const size = element.size();
        let bestPortId: string | null = null;
        let bestAngleDiff = Infinity;
        let bestPortIdFallback: string | null = null;
        let bestAngleDiffFallback = Infinity;

        element.getPorts().forEach((port: any) => {
          const position = portPositions[port.id];
          if (!position) return;
          const portAngle = Math.atan2(
            position.y - size.height / 2,
            position.x - size.width / 2,
          );
          let angleDiff = Math.abs(angleToward - portAngle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          if (angleDiff < bestAngleDiffFallback) {
            bestAngleDiffFallback = angleDiff;
            bestPortIdFallback = port.id;
          }
          if (!avoidPortIds.has(port.id) && angleDiff < bestAngleDiff) {
            bestAngleDiff = angleDiff;
            bestPortId = port.id;
          }
        });

        return bestPortId ?? bestPortIdFallback;
      };

      const sourceCenter = getCenterOf(sourceCell);
      const targetCenter = getCenterOf(targetCell);
      const sourceAvoid = getUsedTargetPortIds(sourceCell);
      const targetAvoid = getUsedSourcePortIds(targetCell);
      const bestSourcePort = getBestPortFacing(
        sourceCell,
        targetCenter,
        sourceAvoid,
      );
      const bestTargetPort = getBestPortFacing(
        targetCell,
        sourceCenter,
        targetAvoid,
      );

      if (link.source().port !== bestSourcePort) {
        link.source({ id: sourceCell.id, port: bestSourcePort });
        link.unset('sourcePort');
      }
      if (link.target().port !== bestTargetPort) {
        link.target({ id: targetCell.id, port: bestTargetPort });
        link.unset('targetPort');
      }
    });
  }

  private _waitForRender(cell: any): Promise<any> {
    return new Promise((resolve) => {
      const view = this._renderer.findViewByModel(cell);
      if (!view) {
        resolve(undefined);
        return;
      }
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(view)));
    });
  }

  private async _resizeNodeAsync(cell: any): Promise<void> {
    this._fitNodeToContent(cell);
    await this._waitForRender(cell);
    this._renderer.updateViews();
  }

  // FIXME: _isMobile() calls window.matchMedia(...) on every invocation with no caching.
  // It is called on every pointer event, render step, and sidebar toggle. Cache the
  // MediaQueryList as a private field and read .matches from it instead.
  private _isMobile(): boolean {
    return window.matchMedia('(pointer:coarse) and (max-width:767px)').matches;
  }

  private _makeElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string = '',
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (className) element.className = className;
    return element;
  }

  private _makeZoomButton(
    parent: HTMLElement,
    title: string,
    html: string,
  ): HTMLButtonElement {
    const button = parent.appendChild(
      this._makeElement('button', 'wf-ctrl-btn'),
    );
    button.title = title;
    button.innerHTML = html;
    return button;
  }

  private _zoomAtPoint(factor: number, clientX: number, clientY: number): void {
    const currentScale: number = this._renderer.scale().sx;
    const newScale = Math.max(
      ZOOM_MIN,
      Math.min(ZOOM_MAX, currentScale * factor),
    );
    const rect = this._renderer.el.getBoundingClientRect();
    const viewportX = clientX - rect.left;
    const viewportY = clientY - rect.top;
    const translation = this._renderer.translate();
    const originX = (viewportX - translation.tx) / currentScale;
    const originY = (viewportY - translation.ty) / currentScale;
    this._renderer.scale(newScale, newScale);
    this._renderer.translate(
      viewportX - originX * newScale,
      viewportY - originY * newScale,
    );
  }

  private _zoomAtCenter(factor: number): void {
    const rect = this._renderer.el.getBoundingClientRect();
    this._zoomAtPoint(
      factor,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
  }

  // TODO: Snapshot element bboxes before the spiral loop to avoid calling
  // graph.getElements() on every candidate position check — currently O(N) per candidate.
  private _findOpenPosition(
    startX: number,
    startY: number,
    width: number,
    height: number,
    excludeCell: any = null,
  ): Point {
    const clearance = this.clearanceUnits * this.gridSize;
    let x = Math.round(startX / this.gridSize) * this.gridSize;
    let y = Math.round(startY / this.gridSize) * this.gridSize;

    const isBlocked = (testX: number, testY: number): boolean => {
      const testRect = new joint.g.Rect(testX, testY, width, height).inflate(
        clearance,
      );
      return this._graph.getElements().some((element: any) => {
        if (excludeCell && element.id === excludeCell.id) return false;
        return testRect.intersect(element.getBBox().clone().inflate(clearance));
      });
    };

    if (!isBlocked(x, y)) return { x, y };

    for (let radius = 1; radius < SPIRAL_SEARCH_LIMIT; radius++) {
      for (let deltaX = -radius; deltaX <= radius; deltaX++) {
        for (let deltaY = -radius; deltaY <= radius; deltaY++) {
          if (Math.abs(deltaX) !== radius && Math.abs(deltaY) !== radius)
            continue;
          const testX = x + deltaX * this.gridSize;
          const testY = y + deltaY * this.gridSize;
          if (!isBlocked(testX, testY)) return { x: testX, y: testY };
        }
      }
    }

    return { x, y };
  }

  private _touchDistance(touch1: Touch, touch2: Touch): number {
    const deltaX = touch1.clientX - touch2.clientX;
    const deltaY = touch1.clientY - touch2.clientY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  private _touchMidpoint(touch1: Touch, touch2: Touch): Point {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }
}

declare global {
  interface Window {
    DiagramEditor: typeof DiagramEditor;
    DiagramNode: typeof DiagramNode;
    RectangleNode: typeof RectangleNode;
    SquareNode: typeof SquareNode;
    EllipseNode: typeof EllipseNode;
    CircleNode: typeof CircleNode;
    DiamondNode: typeof DiamondNode;
    TriangleNode: typeof TriangleNode;
    HexagonNode: typeof HexagonNode;
    PentagonNode: typeof PentagonNode;
    OctagonNode: typeof OctagonNode;
    UnknownNodeTypeError: typeof UnknownNodeTypeError;
  }
}

Object.assign(window, {
  DiagramEditor,
  DiagramNode,
  RectangleNode,
  SquareNode,
  EllipseNode,
  CircleNode,
  DiamondNode,
  TriangleNode,
  HexagonNode,
  PentagonNode,
  OctagonNode,
  UnknownNodeTypeError,
});
