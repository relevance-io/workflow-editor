/**
 * WorkflowEditor.tsx
 *
 * React mirror of lib/angular/src/workflow-editor.component.ts.
 *
 * DiagramEditor is an imperative, DOM-owning library (like a map or canvas),
 * so the ref-based pattern is the correct React adaptation — not a compromise.
 * useImperativeHandle exposes the full public API on the forwarded ref so
 * callers can drive the editor programmatically when needed.
 *
 * Usage:
 *   const editorRef = useRef<WorkflowEditorHandle>(null)
 *
 *   <WorkflowEditor
 *     ref={editorRef}
 *     width="100%"
 *     height="600px"
 *     onChange={handleChange}
 *     onNodeAdd={handleNodeAdd}
 *     onSelectionChange={handleSelectionChange}
 *   />
 *
 *   await editorRef.current?.addNode(new RectangleNode({ label: 'Hello' }))
 *
 * Installation:
 *   npm install @relevance/workflow-editor
 *
 * In your entry point:
 *   import '@relevance/workflow-editor/index.css'
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

import {
  DiagramEditor,
  DiagramNode,
  Edge,
  type NodeConstructor,
  type SerializedDiagram,
  type SerializedNodeType,
} from '@relevance/workflow-editor';

// ── Public handle type ────────────────────────────────────────────────────────
// Callers import this type to annotate their useRef<WorkflowEditorHandle>(null).

export interface WorkflowEditorHandle {
  /** Direct access to the underlying DiagramEditor instance. */
  getEditor(): DiagramEditor;

  /** Add a node to the canvas. x and y are optional canvas-area pixel coordinates. */
  addNode(node: DiagramNode, x?: number, y?: number): Promise<DiagramNode>;

  /** Remove a node from the canvas. */
  removeNode(node: DiagramNode): void;

  /** Remove all nodes and edges. */
  clear(): void;

  /** Get all nodes currently on the canvas. */
  getNodes(): DiagramNode[];

  /** Get all edges currently on the canvas. */
  getEdges(): Edge[];

  /** Serialize diagram to a JSON string. Includes node type definitions by default. */
  serialize(includeTypes?: boolean): string;

  /** Serialize only the nodes and edges (no type definitions). */
  serializeNodes(): { nodes: unknown[]; edges: unknown[] };

  /** Serialize only the registered node type definitions. */
  serializeTypes(): SerializedNodeType[];

  /** Restore diagram from JSON. Re-registers node types if present in the data. */
  deserialize(json: string | SerializedDiagram): Promise<DiagramEditor>;

  /** Register a custom node type with an optional friendly display name. */
  registerNodeType(label: string, NodeClass: NodeConstructor, name?: string): void;

  /** Register all built-in node types. */
  registerBuiltInNodes(): void;

  /** Unregister all node types and clear the library sidebar. */
  clearRegisteredNodes(): void;

  /** Auto-arrange nodes using Dagre layout. */
  autoArrange(): Promise<DiagramEditor>;

  /** Zoom to fit all content. */
  zoomToFit(): void;

  /** Zoom in by an optional factor. */
  zoomIn(factor?: number): void;

  /** Zoom out by an optional factor. */
  zoomOut(factor?: number): void;

  /** Reset zoom to 1:1. */
  zoomReset(): void;

  /** Get the current zoom level. */
  getZoomLevel(): number;

  /** Center the canvas content. */
  centerContent(): void;

  /** Pan the canvas to a specific position. */
  panTo(x: number, y: number): void;

  /** Clear the current selection. */
  clearSelection(): void;

  /** Get the currently selected node or edge, or null if nothing is selected. */
  getSelectedItem(): DiagramNode | Edge | null;

  /** Toggle automatic port switching when nodes are moved. */
  setAutoPortSwitching(enabled: boolean): void;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface WorkflowEditorProps {
  /** CSS width of the editor container. Defaults to '100%'. */
  width?: string;
  /** CSS height of the editor container. Defaults to '100%'. */
  height?: string;

  /** Fired on any diagram change. */
  onChange?: () => void;
  /** Fired when a node is added. */
  onNodeAdd?: (node: DiagramNode) => void;
  /** Fired when a node is removed. */
  onNodeRemove?: (node: DiagramNode) => void;
  /** Fired when a node's properties change. */
  onNodeChange?: (node: DiagramNode) => void;
  /** Fired when a node is moved. */
  onNodeMove?: (node: DiagramNode) => void;
  /** Fired when an edge is added. */
  onEdgeAdd?: (edge: Edge) => void;
  /** Fired when an edge is removed. */
  onEdgeRemove?: (edge: Edge) => void;
  /** Fired when an edge's properties change. */
  onEdgeChange?: (edge: Edge) => void;
  /** Fired when the selection changes. */
  onSelectionChange?: (item: DiagramNode | Edge | null) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const WorkflowEditor = forwardRef<WorkflowEditorHandle, WorkflowEditorProps>(
  (props, ref) => {
    const {
      width = '100%',
      height = '100%',
      onChange,
      onNodeAdd,
      onNodeRemove,
      onNodeChange,
      onNodeMove,
      onEdgeAdd,
      onEdgeRemove,
      onEdgeChange,
      onSelectionChange,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);

    // Store the DiagramEditor instance in a ref — not state — so React never
    // re-renders because the editor mutated. DiagramEditor owns its own DOM.
    const editorRef = useRef<DiagramEditor | null>(null);

    // ── Initialise and tear down ──────────────────────────────────────────────

    useEffect(() => {
      if (!containerRef.current) return;

      const editor = new DiagramEditor(containerRef.current);
      editorRef.current = editor;

      // Wire all editor events to the corresponding React prop callbacks.
      // Callbacks are read from props at call time via the stable refs below,
      // so stale-closure bugs are avoided without re-running this effect.
      editor.on('change',           ()                               => onChangeRef.current?.());
      editor.on('node:add',         (node: DiagramNode)              => onNodeAddRef.current?.(node));
      editor.on('node:remove',      (node: DiagramNode)              => onNodeRemoveRef.current?.(node));
      editor.on('node:change',      (node: DiagramNode)              => onNodeChangeRef.current?.(node));
      editor.on('node:move',        (node: DiagramNode)              => onNodeMoveRef.current?.(node));
      editor.on('edge:add',         (edge: Edge)                     => onEdgeAddRef.current?.(edge));
      editor.on('edge:remove',      (edge: Edge)                     => onEdgeRemoveRef.current?.(edge));
      editor.on('edge:change',      (edge: Edge)                     => onEdgeChangeRef.current?.(edge));
      editor.on('selection:change', (item: DiagramNode | Edge | null) => onSelectionChangeRef.current?.(item));

      return () => {
        // Mirrors Angular's ngOnDestroy / Vue's onBeforeUnmount.
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
        editorRef.current = null;
      };

      // Empty deps: editor is created once on mount and destroyed on unmount.
      // Callback prop changes are handled via the stable callback refs below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Stable callback refs ──────────────────────────────────────────────────
    // Storing callbacks in refs means the event listeners wired above always
    // call the latest version of each prop without needing to be re-registered.
    // This is the standard React pattern for imperative event bridges.

    const onChangeRef          = useRef(onChange);
    const onNodeAddRef         = useRef(onNodeAdd);
    const onNodeRemoveRef      = useRef(onNodeRemove);
    const onNodeChangeRef      = useRef(onNodeChange);
    const onNodeMoveRef        = useRef(onNodeMove);
    const onEdgeAddRef         = useRef(onEdgeAdd);
    const onEdgeRemoveRef      = useRef(onEdgeRemove);
    const onEdgeChangeRef      = useRef(onEdgeChange);
    const onSelectionChangeRef = useRef(onSelectionChange);

    // Keep refs in sync with the latest prop values on every render.
    onChangeRef.current          = onChange;
    onNodeAddRef.current         = onNodeAdd;
    onNodeRemoveRef.current      = onNodeRemove;
    onNodeChangeRef.current      = onNodeChange;
    onNodeMoveRef.current        = onNodeMove;
    onEdgeAddRef.current         = onEdgeAdd;
    onEdgeRemoveRef.current      = onEdgeRemove;
    onEdgeChangeRef.current      = onEdgeChange;
    onSelectionChangeRef.current = onSelectionChange;

    // ── Internal guard ────────────────────────────────────────────────────────

    function requireEditor(): DiagramEditor {
      if (!editorRef.current) {
        throw new Error(
          '[WorkflowEditor] The editor is not yet mounted. ' +
          'Call this method after the component has mounted (e.g. in useEffect or an event handler).',
        );
      }
      return editorRef.current;
    }

    // ── Exposed imperative handle ─────────────────────────────────────────────
    // useImperativeHandle narrows what the forwarded ref exposes to callers.
    // Only the typed WorkflowEditorHandle surface is visible — not the raw
    // DiagramEditor or any React internals.

    useImperativeHandle(ref, () => ({
      getEditor:              ()                         => requireEditor(),
      addNode:                (node, x, y)              => requireEditor().addNode(node, x, y),
      removeNode:             (node)                    => requireEditor().removeNode(node),
      clear:                  ()                        => requireEditor().clear(),
      getNodes:               ()                        => requireEditor().getNodes(),
      getEdges:               ()                        => requireEditor().getEdges(),
      serialize:              (includeTypes = true)     => requireEditor().serialize(includeTypes),
      serializeNodes:         ()                        => requireEditor().serializeNodes(),
      serializeTypes:         ()                        => requireEditor().serializeTypes(),
      deserialize:            (json)                    => requireEditor().deserialize(json),
      registerNodeType:       (label, NodeClass, name)  => requireEditor().registerNodeType(label, NodeClass, name),
      registerBuiltInNodes:   ()                        => requireEditor().registerBuiltInNodes(),
      clearRegisteredNodes:   ()                        => requireEditor().clearRegisteredNodes(),
      autoArrange:            ()                        => requireEditor().autoArrange(),
      zoomToFit:              ()                        => requireEditor().zoomToFit(),
      zoomIn:                 (factor)                  => requireEditor().zoomIn(factor),
      zoomOut:                (factor)                  => requireEditor().zoomOut(factor),
      zoomReset:              ()                        => requireEditor().zoomReset(),
      getZoomLevel:           ()                        => requireEditor().getZoomLevel(),
      centerContent:          ()                        => requireEditor().centerContent(),
      panTo:                  (x, y)                   => requireEditor().panTo(x, y),
      clearSelection:         ()                        => requireEditor().clearSelection(),
      getSelectedItem:        ()                        => requireEditor().getSelectedItem(),
      setAutoPortSwitching:   (enabled)                 => requireEditor().setAutoPortSwitching(enabled),
    }));

    // ── Render ────────────────────────────────────────────────────────────────
    // A single div is all DiagramEditor needs — it builds its full DOM inside it.

    return <div ref={containerRef} style={{ width, height }} />;
  },
);

WorkflowEditor.displayName = 'WorkflowEditor';

export default WorkflowEditor;
