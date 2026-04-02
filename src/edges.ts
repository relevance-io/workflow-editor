import * as config from './config';
import { DiagramEditor } from './editor';
import { DiagramNode } from './node';
import { EventBus } from './eventbus';
import {
  ArrowMarker,
  ArrowMarkerName,
  ConnectorType,
  LineStyle,
  Point,
} from './types';

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
export const ARROW_MARKERS: Record<ArrowMarkerName, ArrowMarker | null> = {
  none: null,
  classic: { type: 'path', d: 'M 10 -5 0 0 10 5 Z' },
  block: { type: 'path', d: 'M 10 -10 0 0 10 10 Z' },
}; // =============================================================
// Edge — a connection between two nodes
// =============================================================

export class Edge extends EventBus {
  private _sourceNode: DiagramNode;
  private _targetNode: DiagramNode;
  private _pathPoints: PathPoint[];

  // headless backing fields
  private _label: string = '';
  private _labelColor: string = config.COLOR_EDGE_LABEL;
  private _labelFontSize: number = config.FONT_SIZE_PERCENT_DEFAULT;
  private _lineColor: string = config.COLOR_EDGE_LINE;
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
    return this.link.label(0)?.attrs?.text?.fill || config.COLOR_EDGE_LABEL;
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
    return this.link.get('fontSizePercent') || config.FONT_SIZE_PERCENT_DEFAULT;
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
    return this.link.attr('line/stroke') || config.COLOR_EDGE_LINE;
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
          padding: config.EDGE_ELBOW_PADDING,
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
      config.FONT_SIZE_EDGE_LABEL *
      ((this.link.get('fontSizePercent') || config.FONT_SIZE_PERCENT_DEFAULT) /
        config.FONT_SIZE_PERCENT_DEFAULT);
    const color = this.link.get('labelColor') || config.COLOR_EDGE_LABEL;
    if (text) {
      this.link.labels([
        {
          attrs: {
            text: { text, fill: color, fontSize, textVerticalAnchor: 'middle' },
            rect: {
              fill: config.COLOR_EDGE_LABEL_BG,
              opacity: config.OPACITY_EDGE_LABEL_BG,
            },
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
