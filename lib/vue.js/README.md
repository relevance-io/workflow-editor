# @relevance/workflow-editor — Vue 3 SDK

Vue 3 wrapper for `@relevance/workflow-editor`. Uses the Composition API with `defineExpose` to surface the full public API on a template ref.

---

## Requirements

- Vue 3.3+
- TypeScript 5+ (recommended)

---

## Installation

```bash
npm install @relevance/workflow-editor
```

---

## Minimal example — from scratch

### 1. Scaffold the project

```bash
npm create vite@latest my-diagram-app -- --template vue-ts
cd my-diagram-app
npm install
npm install @relevance/workflow-editor
```

### 2. Import the editor styles

In `src/main.ts`:

```typescript
import '@relevance/workflow-editor/index.css';
```

### 3. Add `WorkflowEditor.vue` to your project

Place the component at `src/components/WorkflowEditor.vue`. The source is in `sdk/vue/WorkflowEditor.vue` in the repository.

### 4. Edit `src/App.vue`

```vue
<script setup lang="ts">
import { useTemplateRef, onMounted } from 'vue';
import { RectangleNode, DiamondNode, DiagramNode, Edge } from '@relevance/workflow-editor';
import WorkflowEditor from './components/WorkflowEditor.vue';

const editorRef = useTemplateRef('editorRef');

onMounted(async () => {
  const editor = editorRef.value;
  if (!editor) return;

  const start    = new RectangleNode({ label: 'Start',     backgroundColor: '#d4edda' });
  const decision = new DiamondNode({   label: 'Decision?' });
  const end      = new RectangleNode({ label: 'End',       backgroundColor: '#f8d7da' });

  await editor.addNode(start);
  await editor.addNode(decision);
  await editor.addNode(end);

  start.connectTo(decision);
  decision.connectTo(end);

  await editor.autoArrange();

  // Restore a previously saved diagram
  const saved = localStorage.getItem('diagram');
  if (saved) await editor.deserialize(saved);
});

function onDiagramChange() {
  const json = editorRef.value?.serialize();
  if (json) localStorage.setItem('diagram', json);
}

function onNodeAdd(node: DiagramNode) {
  console.log('Node added:', node.label);
}

function onSelectionChange(item: DiagramNode | Edge | null) {
  console.log('Selection:', item);
}
</script>

<template>
  <WorkflowEditor
    ref="editorRef"
    width="100%"
    height="100vh"
    @change="onDiagramChange"
    @node-add="onNodeAdd"
    @selection-change="onSelectionChange"
  />
</template>
```

### 5. Run

```bash
npm run dev
```

---

## Component API

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `width` | `string` | `'100%'` | CSS width of the editor container |
| `height` | `string` | `'100%'` | CSS height of the editor container |

### Events

| Event | Payload | Description |
| --- | --- | --- |
| `change` | — | Fired on any diagram change |
| `node-add` | `DiagramNode` | Fired when a node is added |
| `node-remove` | `DiagramNode` | Fired when a node is removed |
| `node-change` | `DiagramNode` | Fired when a node's properties change |
| `node-move` | `DiagramNode` | Fired when a node is moved |
| `edge-add` | `Edge` | Fired when an edge is added |
| `edge-remove` | `Edge` | Fired when an edge is removed |
| `edge-change` | `Edge` | Fired when an edge's properties change |
| `selection-change` | `DiagramNode \| Edge \| null` | Fired when selection changes |

### Exposed methods (via template ref)

Access via `useTemplateRef('editorRef')` and `editorRef.value`.

| Method | Returns | Description |
| --- | --- | --- |
| `getEditor()` | `DiagramEditor` | Direct access to the underlying editor instance |
| `addNode(node, x?, y?)` | `Promise<DiagramNode>` | Add a node to the canvas |
| `removeNode(node)` | `void` | Remove a node |
| `clear()` | `void` | Remove all nodes and edges |
| `getNodes()` | `DiagramNode[]` | All nodes |
| `getEdges()` | `Edge[]` | All edges |
| `serialize(includeTypes?)` | `string` | Serialize to JSON |
| `serializeNodes()` | `{ nodes, edges }` | Serialize nodes and edges only |
| `serializeTypes()` | `SerializedNodeType[]` | Serialize type definitions only |
| `deserialize(json)` | `Promise<DiagramEditor>` | Restore from JSON |
| `registerNodeType(label, NodeClass, name?)` | `void` | Register a custom node type |
| `registerBuiltInNodes()` | `void` | Register all built-in shapes |
| `clearRegisteredNodes()` | `void` | Unregister all node types |
| `autoArrange()` | `Promise<DiagramEditor>` | Dagre auto-layout |
| `zoomToFit()` | `void` | Zoom to fit all content |
| `zoomIn(factor?)` | `void` | Zoom in |
| `zoomOut(factor?)` | `void` | Zoom out |
| `zoomReset()` | `void` | Reset zoom to 1:1 |
| `getZoomLevel()` | `number` | Current zoom scale |
| `centerContent()` | `void` | Center the canvas |
| `panTo(x, y)` | `void` | Pan to a position |
| `clearSelection()` | `void` | Clear current selection |
| `getSelectedItem()` | `DiagramNode \| Edge \| null` | Currently selected item |
| `setAutoPortSwitching(enabled)` | `void` | Toggle automatic port switching |

> For the full `DiagramNode`, `Edge`, and `FieldDefinition` API see the [JS/TS SDK README](../js/README.md).
