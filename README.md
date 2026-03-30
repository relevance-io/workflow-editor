# @relevance/workflow-editor

A lightweight, framework-agnostic diagram editor built on JointJS. Supports vanilla JS/TS and Angular.

## Demo

[demo.relevance.io](https://demo.relevance.io)

---

## Installation

### npm

```bash
npm install @relevance/workflow-editor
```

### CDN

```html
<link rel="stylesheet" href="https://unpkg.com/@relevance/workflow-editor/index.css" />
<div id="editor" style="width: 100%; height: 600px;"></div>
<script type="module">
    import { DiagramEditor, RectangleNode } from "https://unpkg.com/@relevance/workflow-editor/index.es.js";

    const editor = new DiagramEditor(document.getElementById("editor"));
    const node = new RectangleNode({ label: "Hello World" });
    await editor.addNode(node);
</script>
```

## Usage

### Vanilla JS / TypeScript

```typescript
import { DiagramEditor, RectangleNode, DiamondNode } from "@relevance/workflow-editor";
import "@relevance/workflow-editor/index.css";

const editor = new DiagramEditor(document.getElementById("editor")!);

const start = new RectangleNode({ label: "Start", backgroundColor: "#d4edda" });
const decision = new DiamondNode({ label: "Decision?" });
const end = new RectangleNode({ label: "End", backgroundColor: "#f8d7da" });

await editor.addNode(start);
await editor.addNode(decision);
await editor.addNode(end);

start.connect(decision);
decision.connect(end);

editor.autoArrange();

// Save
editor.on("change", () => {
    localStorage.setItem("diagram", editor.serialize());
});

// Restore
const saved = localStorage.getItem("diagram");
if (saved) await editor.deserialize(saved);
```

### Angular

```typescript
// app.component.ts
import { Component, ViewChild } from "@angular/core";
import { DiagramEditorComponent } from "@relevance/workflow-editor/angular";
import { RectangleNode } from "@relevance/workflow-editor";

@Component({
    selector: "app-root",
    standalone: true,
    imports: [DiagramEditorComponent],
    template: ` <workflow-editor #editor width="100%" height="600px" (change)="onDiagramChange()" (nodeAdd)="onNodeAdd($event)" (selectionChange)="onSelectionChange($event)" /> `,
})
export class AppComponent {
    @ViewChild("editor") editor!: DiagramEditorComponent;

    async ngAfterViewInit() {
        const node = new RectangleNode({ label: "Hello World" });
        await this.editor.addNode(node);
    }

    onDiagramChange() {
        localStorage.setItem("diagram", this.editor.serialize());
    }
}
```

In `src/styles.scss`:

```scss
@use "@relevance/workflow-editor/style";
```

#### Inputs

| Input    | Type     | Default  | Description                        |
| -------- | -------- | -------- | ---------------------------------- |
| `width`  | `string` | `'100%'` | CSS width of the editor container  |
| `height` | `string` | `'100%'` | CSS height of the editor container |

#### Outputs

| Output            | Type                          | Description                            |
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

---

## API Reference

### DiagramEditor

| Name                                                          | Type                          | Description                           |
| ------------------------------------------------------------- | ----------------------------- | ------------------------------------- |
| `addNode(node: DiagramNode, x?: number, y?: number)`          | `Promise<DiagramNode>`        | Add a node to the canvas              |
| `removeNode(node: DiagramNode)`                               | `void`                        | Remove a node                         |
| `getNodes()`                                                  | `DiagramNode[]`               | Get all nodes                         |
| `getEdges()`                                                  | `Edge[]`                      | Get all edges                         |
| `serialize()`                                                 | `string`                      | Serialize diagram to JSON string      |
| `deserialize(json: string)`                                   | `Promise<DiagramEditor>`      | Restore diagram from JSON string      |
| `registerNodeType(label: string, NodeClass: NodeConstructor)` | `void`                        | Register a custom node type           |
| `autoArrange()`                                               | `DiagramEditor`               | Auto-arrange nodes using Dagre layout |
| `zoomToFit()`                                                 | `DiagramEditor`               | Zoom to fit all content               |
| `zoomIn(factor?: number)`                                     | `DiagramEditor`               | Zoom in                               |
| `zoomOut(factor?: number)`                                    | `DiagramEditor`               | Zoom out                              |
| `centerContent()`                                             | `DiagramEditor`               | Center the canvas                     |
| `clearSelection()`                                            | `DiagramEditor`               | Clear current selection               |
| `getSelectedItem()`                                           | `DiagramNode \| Edge \| null` | Get selected node or edge             |
| `setAutoPortSwitching(enabled: boolean)`                      | `DiagramEditor`               | Toggle automatic port switching       |
| `panTo(x: number, y: number)`                                 | `DiagramEditor`               | Pan canvas to position                |
| `getZoomLevel()`                                              | `number`                      | Get current zoom level                |

### Nodes

All node classes extend `DiagramNode` and share the following properties and methods:

| Name                                                                     | Type             | Description                             |
| ------------------------------------------------------------------------ | ---------------- | --------------------------------------- |
| `id`                                                                     | `string \| null` | Unique identifier                       |
| `x`                                                                      | `number`         | X position on canvas                    |
| `y`                                                                      | `number`         | Y position on canvas                    |
| `width`                                                                  | `number`         | Width of the node                       |
| `height`                                                                 | `number`         | Height of the node                      |
| `label`                                                                  | `string`         | Display label                           |
| `labelColor`                                                             | `string`         | Label text color                        |
| `labelFontSize`                                                          | `number`         | Label font size (%)                     |
| `description`                                                            | `string`         | Secondary text below label              |
| `descriptionColor`                                                       | `string`         | Description text color                  |
| `backgroundColor`                                                        | `string`         | Fill color                              |
| `borderColor`                                                            | `string`         | Border color                            |
| `borderWidth`                                                            | `number`         | Border width in pixels                  |
| `imageUrl`                                                               | `string`         | URL of an icon/image to display         |
| `imageWidth`                                                             | `number`         | Image width in pixels                   |
| `imageHeight`                                                            | `number`         | Image height in pixels                  |
| `status`                                                                 | `string`         | Arbitrary status string                 |
| `priority`                                                               | `number`         | Arbitrary priority number               |
| `moveTo(x: number, y: number)`                                           | `DiagramNode`    | Move node to absolute position          |
| `moveBy(dx: number, dy: number)`                                         | `DiagramNode`    | Move node by relative offset            |
| `toFront()`                                                              | `DiagramNode`    | Bring node to front                     |
| `toBack()`                                                               | `DiagramNode`    | Send node to back                       |
| `select()`                                                               | `DiagramNode`    | Select this node                        |
| `deselect()`                                                             | `DiagramNode`    | Deselect this node                      |
| `remove()`                                                               | `void`           | Remove node from canvas                 |
| `connect(target: DiagramNode, sourcePort?: number, targetPort?: number)` | `Edge \| null`   | Connect to another node                 |
| `getEdges()`                                                             | `Edge[]`         | Get all edges connected to this node    |
| `getIncomingEdges()`                                                     | `Edge[]`         | Get edges where this node is the target |
| `getOutgoingEdges()`                                                     | `Edge[]`         | Get edges where this node is the source |
| `getCustomProperty(key: string)`                                         | `any`            | Get a custom property value             |
| `setCustomProperty(key: string, value: any)`                             | `void`           | Set a custom property value             |
| `getSchema()`                                                            | `Schema`         | Get the custom properties schema        |

### Edges

| Name                                 | Type                                | Description                       |
| ------------------------------------ | ----------------------------------- | --------------------------------- |
| `id`                                 | `string`                            | Unique identifier                 |
| `source`                             | `DiagramNode`                       | Source node                       |
| `target`                             | `DiagramNode`                       | Target node                       |
| `label`                              | `string`                            | Edge label                        |
| `labelColor`                         | `string`                            | Label text color                  |
| `labelFontSize`                      | `number`                            | Label font size (%)               |
| `lineColor`                          | `string`                            | Line color                        |
| `lineWidth`                          | `number`                            | Line width in pixels              |
| `lineStyle`                          | `'solid' \| 'dashed' \| 'dotted'`   | Line style                        |
| `sourceArrow`                        | `'none' \| 'classic' \| 'block'`    | Arrow at source end               |
| `targetArrow`                        | `'none' \| 'classic' \| 'block'`    | Arrow at target end               |
| `connectorType`                      | `'elbow' \| 'straight' \| 'curved'` | Routing style                     |
| `description`                        | `string`                            | Edge description                  |
| `sourcePort`                         | `number \| null`                    | Pinned source port index          |
| `targetPort`                         | `number \| null`                    | Pinned target port index          |
| `select()`                           | `Edge`                              | Select this edge                  |
| `deselect()`                         | `Edge`                              | Deselect this edge                |
| `remove()`                           | `void`                              | Remove edge from canvas           |
| `addPathPoint(x: number, y: number)` | `PathPoint`                         | Add a bend point to the edge path |
| `getPathPoints()`                    | `PathPoint[]`                       | Get all bend points               |

### Events

```typescript
editor.on("change", () => {});
editor.on("node:add", (node) => {});
editor.on("node:remove", (node) => {});
editor.on("node:change", (node) => {});
editor.on("node:move", (node) => {});
editor.on("edge:add", (edge) => {});
editor.on("edge:remove", (edge) => {});
editor.on("edge:change", (edge) => {});
editor.on("selection:change", (item) => {});
```

### Built-in Node Types

| Class           | Shape     |
| --------------- | --------- |
| `RectangleNode` | Rectangle |
| `SquareNode`    | Square    |
| `EllipseNode`   | Ellipse   |
| `CircleNode`    | Circle    |
| `DiamondNode`   | Diamond   |
| `TriangleNode`  | Triangle  |
| `HexagonNode`   | Hexagon   |
| `PentagonNode`  | Pentagon  |
| `OctagonNode`   | Octagon   |

### Custom Node Types

Use `DiagramNode.define()` to create custom node types with a schema and render function:

```typescript
import { DiagramNode, RectangleNode } from "@relevance/workflow-editor";

const TaskNode = (DiagramNode as any).define(
    RectangleNode,
    // Default options
    { label: "New Task", backgroundColor: "#f0f8ff" },
    // Schema
    {
        assignee: { label: "Assignee", type: "text", default: "" },
        effort: { label: "Effort", type: "number", default: 1, min: 1, max: 10 },
        done: { label: "Done", type: "boolean", default: false },
        priority: {
            label: "Priority",
            type: "choice",
            default: "medium",
            choices: { low: "Low", medium: "Medium", high: "High" },
        },
    },
    // Render function — called when custom props change
    (node) => {
        node.backgroundColor = node.getCustomProperty("done") ? "#d4edda" : "#f0f8ff";
        node.borderColor = node.getCustomProperty("done") ? "#28a745" : "#adb5bd";
    },
);

// Register so it appears in the shape library and survives serialize/deserialize
editor.registerNodeType("Task", TaskNode);

const task = new TaskNode({ label: "My Task" });
await editor.addNode(task);

task.setCustomProperty("done", true);
```

---

## Contributing

### Prerequisites

- Node.js 24+
- npm

### Setup

```bash
git clone https://github.com/relevance-io/workflow-editor.git
cd workflow-editor
npm run install:all  # for development
npm run ci:all       # for CI
```

### Build

```bash
# Build everything (lib, demo app, Angular component)
npm run build

# Build individually
npm run build:lib      # core library → dist/
npm run build:app      # demo app → dist/
npm run build:angular  # Angular component → dist/angular/
```

### Development Server

```bash
npm start
```

Opens the demo app at `http://localhost:5173` with hot reload.

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Push to your branch and open a pull request

---

## License

[MIT](https://opensource.org/licenses/MIT)
