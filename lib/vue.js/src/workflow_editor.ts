<script setup lang="ts">
/**
 * WorkflowEditor.vue
 *
 * Vue 3 mirror of lib/angular/src/workflow-editor.component.ts.
 * Wraps DiagramEditor with props, emits, and a fully-typed exposed API
 * so parent components can call editor methods via a template ref.
 *
 * Usage:
 *   <WorkflowEditor
 *     ref="editorRef"
 *     width="100%"
 *     height="600px"
 *     @change="onDiagramChange"
 *     @node-add="onNodeAdd"
 *     @selection-change="onSelectionChange"
 *   />
 *
 *   const editorRef = useTemplateRef('editorRef')
 *   await editorRef.value?.addNode(new RectangleNode({ label: 'Hello' }))
 *
 * Installation:
 *   npm install @relevance/workflow-editor
 *
 * In main.ts (or the component that imports this):
 *   import '@relevance/workflow-editor/index.css'
 */

import { ref, onMounted, onBeforeUnmount } from 'vue';
import {
  DiagramEditor,
  DiagramNode,
  Edge,
  type NodeConstructor,
  type SerializedDiagram,
  type SerializedNodeType,
} from '@relevance/workflow-editor';

// ── Props ─────────────────────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    /** CSS width of the editor container. */
    width?: string;
    /** CSS height of the editor container. */
    height?: string;
  }>(),
  {
    width: '100%',
    height: '100%',
  },
);

// ── Emits ─────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  /** Fired on any diagram change. */
  change: [];
  /** Fired when a node is added. */
  'node-add': [node: DiagramNode];
  /** Fired when a node is removed. */
  'node-remove': [node: DiagramNode];
  /** Fired when a node's properties change. */
  'node-change': [node: DiagramNode];
  /** Fired when a node is moved. */
  'node-move': [node: DiagramNode];
  /** Fired when an edge is added. */
  'edge-add': [edge: Edge];
  /** Fired when an edge is removed. */
  'edge-remove': [edge: Edge];
  /** Fired when an edge's properties change. */
  'edge-change': [edge: Edge];
  /** Fired when the selection changes. */
  'selection-change': [item: DiagramNode | Edge | null];
}>();

// ── Internal state ────────────────────────────────────────────────────────────

const containerRef = ref<HTMLDivElement | null>(null);
let _editor: DiagramEditor | null = null;

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  if (!containerRef.value) {
    return;
  }

  _editor = new DiagramEditor(containerRef.value);

  _editor.on('change',           ()                          => emit('change'));
  _editor.on('node:add',         (node: DiagramNode)         => emit('node-add',         node));
  _editor.on('node:remove',      (node: DiagramNode)         => emit('node-remove',      node));
  _editor.on('node:change',      (node: DiagramNode)         => emit('node-change',      node));
  _editor.on('node:move',        (node: DiagramNode)         => emit('node-move',        node));
  _editor.on('edge:add',         (edge: Edge)                => emit('edge-add',         edge));
  _editor.on('edge:remove',      (edge: Edge)                => emit('edge-remove',      edge));
  _editor.on('edge:change',      (edge: Edge)                => emit('edge-change',      edge));
  _editor.on('selection:change', (item: DiagramNode | Edge | null) => emit('selection-change', item));
});

onBeforeUnmount(() => {
  if (containerRef.value) {
    containerRef.value.innerHTML = '';
  }
  _editor = null;
});

// ── Internal guard ────────────────────────────────────────────────────────────

/**
 * Throws if the editor has not been initialised yet.
 * Mirrors the assertion that Angular's AfterViewInit lifecycle provides
 * implicitly via the non-null assertion on _editor.
 */
function requireEditor(): DiagramEditor {
  if (!_editor) {
    throw new Error(
      '[WorkflowEditor] The editor is not yet mounted. ' +
      'Call this method after the component has been mounted (e.g. in onMounted).',
    );
  }
  return _editor;
}

// ── Exposed public API ────────────────────────────────────────────────────────
// All methods mirror the Angular component's public API proxies exactly.

/** Direct access to the underlying DiagramEditor instance. */
function getEditor(): DiagramEditor {
  return requireEditor();
}

/** Add a node to the canvas. x and y are optional canvas-area pixel coordinates. */
function addNode(node: DiagramNode, x?: number, y?: number): Promise<DiagramNode> {
  return requireEditor().addNode(node, x, y);
}

/** Remove a node from the canvas. */
function removeNode(node: DiagramNode): void {
  requireEditor().removeNode(node);
}

/** Remove all nodes and edges. */
function clear(): void {
  requireEditor().clear();
}

/** Get all nodes currently on the canvas. */
function getNodes(): DiagramNode[] {
  return requireEditor().getNodes();
}

/** Get all edges currently on the canvas. */
function getEdges(): Edge[] {
  return requireEditor().getEdges();
}

/** Serialize diagram to a JSON string. Includes node type definitions by default. */
function serialize(includeTypes = true): string {
  return requireEditor().serialize(includeTypes);
}

/** Serialize only the nodes and edges (no type definitions). */
function serializeNodes(): { nodes: unknown[]; edges: unknown[] } {
  return requireEditor().serializeNodes();
}

/** Serialize only the registered node type definitions. */
function serializeTypes(): SerializedNodeType[] {
  return requireEditor().serializeTypes();
}

/** Restore diagram from JSON. Re-registers node types if present in the data. */
function deserialize(json: string | SerializedDiagram): Promise<DiagramEditor> {
  return requireEditor().deserialize(json);
}

/** Register a custom node type with an optional friendly display name. */
function registerNodeType(label: string, NodeClass: NodeConstructor, name?: string): void {
  requireEditor().registerNodeType(label, NodeClass, name);
}

/** Register all built-in node types. */
function registerBuiltInNodes(): void {
  requireEditor().registerBuiltInNodes();
}

/** Unregister all node types and clear the library sidebar. */
function clearRegisteredNodes(): void {
  requireEditor().clearRegisteredNodes();
}

/** Auto-arrange nodes using Dagre layout. */
function autoArrange(): Promise<DiagramEditor> {
  return requireEditor().autoArrange();
}

/** Zoom to fit all content. */
function zoomToFit(): void {
  requireEditor().zoomToFit();
}

/** Zoom in by an optional factor. */
function zoomIn(factor?: number): void {
  requireEditor().zoomIn(factor);
}

/** Zoom out by an optional factor. */
function zoomOut(factor?: number): void {
  requireEditor().zoomOut(factor);
}

/** Reset zoom to 1:1. */
function zoomReset(): void {
  requireEditor().zoomReset();
}

/** Get the current zoom level. */
function getZoomLevel(): number {
  return requireEditor().getZoomLevel();
}

/** Center the canvas content. */
function centerContent(): void {
  requireEditor().centerContent();
}

/** Pan the canvas to a specific position. */
function panTo(x: number, y: number): void {
  requireEditor().panTo(x, y);
}

/** Clear the current selection. */
function clearSelection(): void {
  requireEditor().clearSelection();
}

/** Get the currently selected node or edge (null if nothing is selected). */
function getSelectedItem(): DiagramNode | Edge | null {
  return requireEditor().getSelectedItem();
}

/** Toggle automatic port switching when nodes are moved. */
function setAutoPortSwitching(enabled: boolean): void {
  requireEditor().setAutoPortSwitching(enabled);
}

defineExpose({
  getEditor,
  addNode,
  removeNode,
  clear,
  getNodes,
  getEdges,
  serialize,
  serializeNodes,
  serializeTypes,
  deserialize,
  registerNodeType,
  registerBuiltInNodes,
  clearRegisteredNodes,
  autoArrange,
  zoomToFit,
  zoomIn,
  zoomOut,
  zoomReset,
  getZoomLevel,
  centerContent,
  panTo,
  clearSelection,
  getSelectedItem,
  setAutoPortSwitching,
});
</script>

<template>
  <div
    ref="containerRef"
    :style="{ width: props.width, height: props.height }"
  />
</template>
