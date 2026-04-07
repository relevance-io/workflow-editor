# @relevance/workflow-editor — React SDK

React wrapper for `@relevance/workflow-editor`. Uses `forwardRef` + `useImperativeHandle` to expose the full imperative API on a ref — the correct pattern for DOM-owning libraries like this one.

---

## Requirements

- React 18+
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
npm create vite@latest my-diagram-app -- --template react-ts
cd my-diagram-app
npm install
npm install @relevance/workflow-editor
```

### 2. Import the editor styles

In `src/main.tsx`:

```typescript
import '@relevance/workflow-editor/index.css';
```

### 3. Add `WorkflowEditor.tsx` to your project

Place the component at `src/components/WorkflowEditor.tsx`. The source is in `sdk/react/WorkflowEditor.tsx` in the repository.

### 4. Edit `src/App.tsx`

```tsx
import { useRef, useEffect } from 'react';
import { RectangleNode, DiamondNode, DiagramNode, Edge } from '@relevance/workflow-editor';
import WorkflowEditor, { type WorkflowEditorHandle } from './components/WorkflowEditor';

export default function App() {
  const editorRef = useRef<WorkflowEditorHandle>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    async function buildDiagram() {
      const start    = new RectangleNode({ label: 'Start',     backgroundColor: '#d4edda' });
      const decision = new DiamondNode({   label: 'Decision?' });
      const end      = new RectangleNode({ label: 'End',       backgroundColor: '#f8d7da' });

      await editor!.addNode(start);
      await editor!.addNode(decision);
      await editor!.addNode(end);

      start.connectTo(decision);
      decision.connectTo(end);

      await editor!.autoArrange();

      // Restore a previously saved diagram
      const saved = localStorage.getItem('diagram');
      if (saved) await editor!.deserialize(saved);
    }

    buildDiagram();
  }, []);

  function handleChange() {
    const json = editorRef.current?.serialize();
    if (json) localStorage.setItem('diagram', json);
  }

  function handleNodeAdd(node: DiagramNode) {
    console.log('Node added:', node.label);
  }

  function handleSelectionChange(item: DiagramNode | Edge | null) {
    console.log('Selection:', item);
  }

  return (
    <WorkflowEditor
      ref={editorRef}
      width="100%"
      height="100vh"
      onChange={handleChange}
      onNodeAdd={handleNodeAdd}
      onSelectionChange={handleSelectionChange}
    />
  );
}
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
| `onChange` | `() => void` | — | Fired on any diagram change |
| `onNodeAdd` | `(node: DiagramNode) => void` | — | Fired when a node is added |
| `onNodeRemove` | `(node: DiagramNode) => void` | — | Fired when a node is removed |
| `onNodeChange` | `(node: DiagramNode) => void` | — | Fired when a node's properties change |
| `onNodeMove` | `(node: DiagramNode) => void` | — | Fired when a node is moved |
| `onEdgeAdd` | `(edge: Edge) => void` | — | Fired when an edge is added |
| `onEdgeRemove` | `(edge: Edge) => void` | — | Fired when an edge is removed |
| `onEdgeChange` | `(edge: Edge) => void` | — | Fired when an edge's properties change |
| `onSelectionChange` | `(item: DiagramNode \| Edge \| null) => void` | — | Fired when selection changes |

### `WorkflowEditorHandle` (ref methods)

Access via `useRef<WorkflowEditorHandle>(null)` and `ref.current`.

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

### Why a ref and not props?

`DiagramEditor` is an imperative, DOM-owning library — it manages its own rendering and state internally, similar to a map or a code editor. React's declarative, prop-driven model does not fit it naturally. The `useImperativeHandle` pattern is the standard React solution for wrapping such libraries (also used by `@monaco-editor/react`, `react-player`, and similar packages).

> For the full `DiagramNode`, `Edge`, and `FieldDefinition` API see the [JS/TS SDK README](../js/README.md).
