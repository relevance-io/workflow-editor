import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { DiagramEditor, DiagramNode, Edge } from '@relevance/workflow-editor';

@Component({
  selector: 'workflow-editor',
  standalone: true,
  template: ` <div #container [style.width]="width" [style.height]="height"></div> `,
})
export class DiagramEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true })
  private containerRef!: ElementRef<HTMLDivElement>;

  @Input() width = '100%';
  @Input() height = '100%';

  @Output() change = new EventEmitter<void>();
  @Output() nodeAdd = new EventEmitter<DiagramNode>();
  @Output() nodeRemove = new EventEmitter<DiagramNode>();
  @Output() nodeChange = new EventEmitter<DiagramNode>();
  @Output() nodeMove = new EventEmitter<DiagramNode>();
  @Output() edgeAdd = new EventEmitter<Edge>();
  @Output() edgeRemove = new EventEmitter<Edge>();
  @Output() edgeChange = new EventEmitter<Edge>();
  @Output() selectionChange = new EventEmitter<DiagramNode | Edge | null>();

  private _editor!: DiagramEditor;

  get editor(): DiagramEditor {
    return this._editor;
  }

  ngAfterViewInit(): void {
    this._editor = new DiagramEditor(this.containerRef.nativeElement);

    this._editor.on('change', () => this.change.emit());
    this._editor.on('node:add', (node: DiagramNode) => this.nodeAdd.emit(node));
    this._editor.on('node:remove', (node: DiagramNode) => this.nodeRemove.emit(node));
    this._editor.on('node:change', (node: DiagramNode) => this.nodeChange.emit(node));
    this._editor.on('node:move', (node: DiagramNode) => this.nodeMove.emit(node));
    this._editor.on('edge:add', (edge: Edge) => this.edgeAdd.emit(edge));
    this._editor.on('edge:remove', (edge: Edge) => this.edgeRemove.emit(edge));
    this._editor.on('edge:change', (edge: Edge) => this.edgeChange.emit(edge));
    this._editor.on('selection:change', (item: DiagramNode | Edge | null) =>
      this.selectionChange.emit(item),
    );
  }

  ngOnDestroy(): void {
    this.containerRef.nativeElement.innerHTML = '';
  }

  // ── Public API proxies ───────────────────────────────────────

  addNode(node: DiagramNode, x?: number, y?: number): Promise<DiagramNode> {
    return this._editor.addNode(node, x, y);
  }

  removeNode(node: DiagramNode): void {
    this._editor.removeNode(node);
  }

  getNodes(): DiagramNode[] {
    return this._editor.getNodes();
  }

  getEdges(): Edge[] {
    return this._editor.getEdges();
  }

  serialize(): string {
    return this._editor.serialize();
  }

  deserialize(json: string): Promise<DiagramEditor> {
    return this._editor.deserialize(json);
  }

  autoArrange(): void {
    this._editor.autoArrange();
  }

  zoomToFit(): void {
    this._editor.zoomToFit();
  }

  centerContent(): void {
    this._editor.centerContent();
  }

  clearSelection(): void {
    this._editor.clearSelection();
  }

  getSelectedItem(): DiagramNode | Edge | null {
    return this._editor.getSelectedItem();
  }
}
