import * as config from './config';
import { DiagramEditor } from './editor';
import { EventBus } from './eventbus';
import { Edge } from './edges';
import {
  NodeOptions,
  Schema,
  Point,
  ShapeType,
  BuiltInNodeProp,
  FieldDefinition,
} from './types';

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
  private _labelColor: string = config.COLOR_LABEL;
  private _labelFontSize: number = config.FONT_SIZE_PERCENT_DEFAULT;
  private _description: string = '';
  private _descriptionColor: string = config.COLOR_DESCRIPTION;
  private _backgroundColor: string = config.COLOR_NODE_BACKGROUND;
  private _borderColor: string = config.COLOR_NODE_BORDER;
  private _borderWidth: number = 2;
  private _imageUrl: string = '';
  private _imageWidth: number = config.IMAGE_DEFAULT_WIDTH;
  private _imageHeight: number = config.IMAGE_DEFAULT_HEIGHT;

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
    portRadius: number = config.PORT_RADIUS,
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
