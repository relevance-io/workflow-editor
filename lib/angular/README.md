# @relevance/workflow-editor — Angular SDK

Angular wrapper for `@relevance/workflow-editor`. Ships as a standalone component with full TypeScript types.

---

## Requirements

- Angular 15+
- Node.js 18+

---

## Installation

```bash
npm install @relevance/workflow-editor
```

---

## Minimal example — from scratch

### 1. Scaffold the project

```bash
npm install -g @angular/cli
ng new my-diagram-app --standalone --style=scss --routing=false
cd my-diagram-app
npm install @relevance/workflow-editor
```

### 2. Import the editor styles

In `src/styles.scss`:

```scss
@use '@relevance/workflow-editor/style';
```

### 3. Wire up `app.component.ts`

```typescript
import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { DiagramEditorComponent } from '@relevance/workflow-editor/angular';
import { RectangleNode, DiamondNode, DiagramNode, Edge } from '@relevance/workflow-editor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DiagramEditorComponent],
  template: `
    <workflow-editor
      #editor
      width="100%"
      height="100vh"
      (change)="onDiagramChange()"
      (nodeAdd)="onNodeAdd($event)"
      (selectionChange)="onSelectionChange($event)"
    />
  `,
})
export class AppComponent implements AfterViewInit {
  @ViewChild('editor') editor!: DiagramEditorComponent;

  async ngAfterViewInit() {
    const start = new RectangleNode({ label: 'Start', backgroundColor: '#d4edda' });
    const decision = new DiamondNode({ label: 'Decision?' });
    const end = new RectangleNode({ label: 'End', backgroundColor: '#f8d7da' });

    await this.editor.addNode(start);
    await this.editor.addNode(decision);
    await this.editor.addNode(end);

    start.connectTo(decision);
    decision.connectTo(end);

    await this.editor.autoArrange();

    // Restore a previously saved diagram
    const saved = localStorage.getItem('diagram');
    if (saved) await this.editor.deserialize(saved);
  }

  onDiagramChange() {
    localStorage.setItem('diagram', this.editor.serialize());
  }

  onNodeAdd(node: DiagramNode) {
    console.log('Node added:', node.label);
  }

  onSelectionChange(item: DiagramNode | Edge | null) {
    console.log('Selection:', item);
  }
}
```

### 5. Run

```bash
ng serve
```

---

## Component API

### Inputs

| Input    | Type     | Default  | Description                        |
| -------- | -------- | -------- | ---------------------------------- |
| `width`  | `string` | `'100%'` | CSS width of the editor container  |
| `height` | `string` | `'100%'` | CSS height of the editor container |

### Outputs

| Output            | Payload                       | Description                            |
| ----------------- | ----------------------------- | -------------------------------------- |
| `change`          | `void`                        | Fired on any diagram change            |
| `nodeAdd`         | `DiagramNode`                 | Fired when a node is added             |
| `nodeRemove`      | `DiagramNode`                 | Fired when a node is removed           |
| `nodeChange`      | `DiagramNode`                 | Fired when a node's properties change  |
| `nodeMove`        | `DiagramNode`                 | Fired when a node is moved             |
| `edgeAdd`         | `Edge`                        | Fired when an edge is added            |
| `edgeRemove`      | `Edge`                        | Fired when an edge is removed          |
| `edgeChange`      | `Edge`                        | Fired when an edge's properties change |
| `selectionChange` | `DiagramNode \| Edge \| null` | Fired when selection changes           |

### Public methods (via `@ViewChild`)

All methods are proxies to the underlying `DiagramEditor` instance.

| Method                                      | Returns                       | Description                                     |
| ------------------------------------------- | ----------------------------- | ----------------------------------------------- |
| `editor`                                    | `DiagramEditor`               | Direct access to the underlying editor instance |
| `addNode(node, x?, y?)`                     | `Promise<DiagramNode>`        | Add a node to the canvas                        |
| `removeNode(node)`                          | `void`                        | Remove a node                                   |
| `clear()`                                   | `void`                        | Remove all nodes and edges                      |
| `getNodes()`                                | `DiagramNode[]`               | All nodes                                       |
| `getEdges()`                                | `Edge[]`                      | All edges                                       |
| `serialize(includeTypes?)`                  | `string`                      | Serialize to JSON                               |
| `serializeNodes()`                          | `{ nodes, edges }`            | Serialize nodes and edges only                  |
| `serializeTypes()`                          | `SerializedNodeType[]`        | Serialize type definitions only                 |
| `deserialize(json)`                         | `Promise<DiagramEditor>`      | Restore from JSON                               |
| `registerNodeType(label, NodeClass, name?)` | `void`                        | Register a custom node type                     |
| `registerBuiltInNodes()`                    | `void`                        | Register all built-in shapes                    |
| `clearRegisteredNodes()`                    | `void`                        | Unregister all node types                       |
| `autoArrange()`                             | `void`                        | Dagre auto-layout                               |
| `zoomToFit()`                               | `void`                        | Zoom to fit all content                         |
| `zoomIn(factor?)`                           | `void`                        | Zoom in                                         |
| `zoomOut(factor?)`                          | `void`                        | Zoom out                                        |
| `zoomReset()`                               | `void`                        | Reset zoom to 1:1                               |
| `getZoomLevel()`                            | `number`                      | Current zoom scale                              |
| `centerContent()`                           | `void`                        | Center the canvas                               |
| `panTo(x, y)`                               | `void`                        | Pan to a position                               |
| `clearSelection()`                          | `void`                        | Clear current selection                         |
| `getSelectedItem()`                         | `DiagramNode \| Edge \| null` | Currently selected item                         |
| `setAutoPortSwitching(enabled)`             | `void`                        | Toggle automatic port switching                 |

> For the full API reference, see the [README](../../README.md).
