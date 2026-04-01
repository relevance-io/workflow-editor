# @relevance/workflow-editor

A lightweight, framework-agnostic diagram editor built on JointJS. Supports vanilla JS/TS and Angular.

## Demo

[demo.relevance.io](https://demo.relevance.io)

---

## Features

- Extensible
    - **Framework agnostic** — works with vanilla JS/TS; includes a first-class Angular component
    - **Event-driven API** — subscribe to node, edge, and selection lifecycle events
    - **Built-in node shapes** — Rectangle, Square, Ellipse, Circle, Diamond, Triangle, Hexagon, Pentagon, and Octagon
    - **Custom node types** — define your own shapes with typed schemas, default options, and change handlers via `DiagramNode.define()`
    - **Edge styling** — configurable line color, width, style (solid/dashed/dotted), arrow markers, and connector routing (elbow/straight/curved)
- UX friendly
    - **Auto port switching** — edges automatically connect to the nearest port as nodes are moved
    - **Auto arrange** — one-call Dagre-powered layout with `autoArrange()`
    - **Zoom and pan** — mouse wheel zoom, click-and-drag pan, zoom to fit, and keyboard shortcuts
    - **Keyboard shortcuts** — arrow keys to nudge, Delete/Backspace to remove, Ctrl+C/V to copy/paste, Tab to cycle selection, +/- to zoom, 0 to reset zoom, Enter/F2 to edit
    - **Duplicate** — duplicate nodes via the properties panel, context menu, or Ctrl+V after Ctrl+C
    - **Touch support** — single-finger pan and two-finger pinch-to-zoom on mobile
    - **Properties panel** — built-in sidebar for editing node and edge properties, including image upload
- Data friendly
    - **Serialize / deserialize** — save and restore full diagram state as JSON, including node type definitions
    - **Headless mode** — build diagrams programmatically without a DOM, then render later
    - **Import / export** — download and re-upload diagrams as JSON files

### Roadmap

- Language SDKs: add additional language support to be able to export/import diagrams in various languages
    - Python
    - PHP
    - Java
- Additional validators (min, max, choices, etc.)
- Node trees: be able to programmatically go through the workflow in any language
    - Circular trees: support iteration through circular node trees
- More keyboard shortcuts
- Path finding improvements
- UX Improvements
    - Improved mobile/tablet UX
    - Improved context menu

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

---

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

start.connectTo(decision);
decision.connectTo(end);

editor.autoArrange();

// Save
editor.on("change", () => {
    localStorage.setItem("diagram", editor.serialize());
});

// Restore
const saved = localStorage.getItem("diagram");
if (saved) await editor.deserialize(saved);
```

### Headless mode

Create and manipulate a diagram without a DOM container, then render it later:

```typescript
import { DiagramEditor, RectangleNode, EllipseNode } from "@relevance/workflow-editor";

// No container — headless mode
const editor = new DiagramEditor();
editor.registerBuiltInNodes();

const start = await editor.addNode(new EllipseNode({ label: "Start" }));
const process = await editor.addNode(new RectangleNode({ label: "Process" }));
start.connectTo(process);

// Render into the DOM when ready
await editor.render(document.getElementById("editor")!);
```

### Angular

Tested with Angular 21. May work with Angular 15+.

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

| Name                                                                         | Type                                              | Description                                                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `addNode(node: DiagramNode, x?: number, y?: number)`                         | `Promise<DiagramNode>`                            | Add a node to the canvas. `x` and `y` are canvas-area pixel coordinates; omit to place at the canvas center         |
| `removeNode(node: DiagramNode)`                                              | `void`                                            | Remove a node                                                                                                        |
| `clear()`                                                                    | `DiagramEditor`                                   | Remove all nodes and edges                                                                                           |
| `getNodes()`                                                                 | `DiagramNode[]`                                   | Get all nodes                                                                                                        |
| `getEdges()`                                                                 | `Edge[]`                                          | Get all edges                                                                                                        |
| `serialize(includeTypes?: boolean)`                                          | `string`                                          | Serialize diagram to JSON string. Includes node type definitions by default                                          |
| `serializeNodes()`                                                           | `{ nodes: SerializedNode[], edges: SerializedEdge[] }` | Serialize only the nodes and edges (no type definitions)                                                        |
| `serializeTypes()`                                                           | `SerializedNodeType[]`                            | Serialize only the registered node type definitions                                                                  |
| `deserialize(json: string \| SerializedDiagram)`                             | `Promise<DiagramEditor>`                          | Restore diagram from JSON. Re-registers node types if present in the data                                            |
| `render(container: HTMLElement)`                                             | `Promise<DiagramEditor>`                          | Render a headless editor into a DOM container                                                                        |
| `registerNodeType(label: string, NodeClass: NodeConstructor, name?: string)` | `void`                                            | Register a custom node type with an optional friendly display name                                                   |
| `registerBuiltInNodes()`                                                     | `void`                                            | Register all built-in node types (Rectangle, Square, Ellipse, Circle, Diamond, Triangle, Hexagon, Pentagon, Octagon) |
| `clearRegisteredNodes()`                                                     | `DiagramEditor`                                   | Unregister all node types and clear the library sidebar                                                              |
| `autoArrange()`                                                              | `Promise<DiagramEditor>`                          | Auto-arrange nodes using Dagre layout. Clears all custom edge vertices before laying out                             |
| `zoomToFit()`                                                                | `DiagramEditor`                                   | Zoom to fit all content                                                                                              |
| `zoomIn(factor?: number)`                                                    | `DiagramEditor`                                   | Zoom in                                                                                                              |
| `zoomOut(factor?: number)`                                                   | `DiagramEditor`                                   | Zoom out                                                                                                             |
| `zoomReset()`                                                                | `DiagramEditor`                                   | Reset zoom to 1:1                                                                                                    |
| `centerContent()`                                                            | `DiagramEditor`                                   | Center the canvas                                                                                                    |
| `clearSelection()`                                                           | `DiagramEditor`                                   | Clear current selection                                                                                              |
| `getSelectedItem()`                                                          | `DiagramNode \| Edge \| null`                     | Get selected node or edge                                                                                            |
| `setAutoPortSwitching(enabled: boolean)`                                     | `DiagramEditor`                                   | Toggle automatic port switching                                                                                      |
| `panTo(x: number, y: number)`                                                | `DiagramEditor`                                   | Pan canvas to position                                                                                               |
| `getZoomLevel()`                                                             | `number`                                          | Get current zoom level                                                                                               |

### Keyboard Shortcuts

| Shortcut                  | Action                                      |
| ------------------------- | ------------------------------------------- |
| `Arrow keys`              | Nudge selected node by one grid unit        |
| `Delete` / `Backspace`    | Remove selected node or edge                |
| `Ctrl+C`                  | Copy selected node                          |
| `Ctrl+V`                  | Paste copied node                           |
| `Tab` / `Shift+Tab`       | Cycle selection forward / backward          |
| `Enter` / `F2`            | Open properties panel and focus label field |
| `Escape`                  | Deselect                                    |
| `+` / `=`                 | Zoom in                                     |
| `-`                       | Zoom out                                    |
| `0`                       | Reset zoom to 1:1                           |

### Nodes

All node classes extend `DiagramNode` and share the following properties and methods:

| Name                                                                       | Type                  | Description                                                |
| -------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| `id`                                                                       | `string \| null`      | Unique identifier                                          |
| `x`                                                                        | `number \| undefined` | X position on canvas (undefined in headless mode if unset) |
| `y`                                                                        | `number \| undefined` | Y position on canvas (undefined in headless mode if unset) |
| `width`                                                                    | `number`              | Width of the node (read-only)                              |
| `height`                                                                   | `number`              | Height of the node (read-only)                             |
| `label`                                                                    | `string`              | Display label                                              |
| `labelColor`                                                               | `string`              | Label text color                                           |
| `labelFontSize`                                                            | `number`              | Label font size (%)                                        |
| `description`                                                              | `string`              | Secondary text below label                                 |
| `descriptionColor`                                                         | `string`              | Description text color                                     |
| `backgroundColor`                                                          | `string`              | Fill color                                                 |
| `borderColor`                                                              | `string`              | Border color                                               |
| `borderWidth`                                                              | `number`              | Border width in pixels                                     |
| `imageUrl`                                                                 | `string`              | URL or data URI of an icon/image to display                |
| `imageWidth`                                                               | `number`              | Image width in pixels                                      |
| `imageHeight`                                                              | `number`              | Image height in pixels                                     |
| `moveTo(x: number, y: number)`                                             | `DiagramNode`         | Move node to absolute position                             |
| `moveBy(dx: number, dy: number)`                                           | `DiagramNode`         | Move node by relative offset                               |
| `toFront()`                                                                | `DiagramNode`         | Bring node to front                                        |
| `toBack()`                                                                 | `DiagramNode`         | Send node to back                                          |
| `select()`                                                                 | `DiagramNode`         | Select this node                                           |
| `deselect()`                                                               | `DiagramNode`         | Deselect this node                                         |
| `remove()`                                                                 | `void`                | Remove node from canvas                                    |
| `connectTo(target: DiagramNode, sourcePort?: number, targetPort?: number)` | `Edge \| null`        | Connect to another node                                    |
| `getEdges()`                                                               | `Edge[]`              | Get all edges connected to this node                       |
| `getIncomingEdges()`                                                       | `Edge[]`              | Get edges where this node is the target                    |
| `getOutgoingEdges()`                                                       | `Edge[]`              | Get edges where this node is the source                    |
| `getCustomProperty(key: string)`                                           | `any`                 | Get a custom property value                                |
| `setCustomProperty(key: string, value: any)`                               | `void`                | Set a custom property value                                |
| `getSchema()`                                                              | `Schema`              | Get the custom properties schema                           |

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

### Serialization types

```typescript
// A registered node type entry in serialized data.
// Built-in types are serialized as plain strings (their nodeClass).
// Custom types include their full definition. serialize/deserialize/onChange
// fields are stripped from the schema — re-register the type with the same
// handlers after import and they will be preserved automatically.
type SerializedNodeType =
    | string
    | {
          nodeClass: string;
          name?: string;           // friendly display name
          baseClass: string;       // nodeClass of the base shape
          defaultOptions: NodeOptions;
          schema: Schema;          // serialize/deserialize/onChange fields are stripped
          visibleProps?: BuiltInNodeProp[];
          editProp?: string;       // which prop Enter/F2 focuses in the properties panel
      };

interface SerializedDiagram {
    nodes: SerializedNode[];
    edges: SerializedEdge[];
    nodeTypes?: SerializedNodeType[]; // omitted when serialize(false) is called
}
```

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

Use `DiagramNode.define()` to create custom node types with a schema and change handlers:

```typescript
import { DiagramNode, RectangleNode } from "@relevance/workflow-editor";

const TaskNode = (DiagramNode as any).define(
    RectangleNode,
    {
        // Default options applied to every new instance
        defaults: { label: "New Task", backgroundColor: "#f0f8ff" },

        // Schema defines custom properties shown in the properties panel
        schema: {
            assignee: { label: "Assignee", type: "text", default: "" },
            effort: { label: "Effort", type: "number", default: 1, min: 1, max: 10 },
            done: {
                label: "Done",
                type: "boolean",
                default: false,
                // onChange is called whenever this property changes.
                // Not serialized — re-register the type with the same schema after import.
                onChange: (node, value) => {
                    node.backgroundColor = value ? "#d4edda" : "#f0f8ff";
                    node.borderColor = value ? "#28a745" : "#adb5bd";
                },
            },
            priority: {
                label: "Priority",
                type: "choice",
                default: "medium",
                choices: { low: "Low", medium: "Medium", high: "High" },
            },
        },

        // Optional: restrict which built-in props appear in the properties panel.
        // Omit this field entirely to show all built-in props.
        // Pass an empty array to hide all built-in props.
        visibleProps: ["label", "backgroundColor", "borderColor"],

        // Optional: which prop Enter/F2 focuses in the properties panel (default: "label")
        editProp: "label",

        // Optional: called on keyup when this node is selected
        onKeyUp: (node, key) => { /* handle key */ },
    },
);

// Register so it appears in the shape library and survives serialize/deserialize.
// The optional third argument sets the friendly name shown in the library.
editor.registerNodeType("Task", TaskNode, "My Task");

const task = new TaskNode({ label: "My Task" });
await editor.addNode(task);

task.setCustomProperty("done", true);
```

#### `DefineOptions`

| Field          | Type                                          | Description                                                                                     |
| -------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `defaults`     | `NodeOptions`                                 | Default built-in property values applied to every new instance                                  |
| `schema`       | `Schema`                                      | Custom property definitions                                                                     |
| `visibleProps` | `BuiltInNodeProp[]`                           | Which built-in props appear in the panel. Omit to show all; pass `[]` to hide all              |
| `editProp`     | `string`                                      | Which prop Enter/F2 focuses in the properties panel. Defaults to `"label"`                      |
| `onKeyUp`      | `(node: DiagramNode, key: string) => void`    | Called on keyup when this node type is selected                                                 |

#### `BuiltInNodeProp`

The `visibleProps` array accepts any combination of:

```typescript
type BuiltInNodeProp =
    | "label"
    | "labelColor"
    | "labelFontSize"
    | "description"
    | "descriptionColor"
    | "backgroundColor"
    | "borderColor"
    | "imageUrl"
    | "imageWidth"
    | "imageHeight";
```

#### `FieldDefinition`

Each key in `schema` is a `FieldDefinition`:

| Field         | Type                                                                                    | Description                                                                           |
| ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `label`       | `string`                                                                                | Display name in the properties panel                                                  |
| `type`        | `'text' \| 'number' \| 'textarea' \| 'boolean' \| 'choice' \| 'color' \| 'object'`    | Input type. `object` fields are not shown in the panel and are not synced to the cell |
| `default`     | `any`                                                                                   | Initial value                                                                         |
| `choices`     | `Record<string, string>`                                                                | Options map for `choice` type (`{ value: label }`)                                    |
| `min`         | `number`                                                                                | Minimum value for `number` type                                                       |
| `max`         | `number`                                                                                | Maximum value for `number` type                                                       |
| `visible`     | `boolean`                                                                               | Set to `false` to hide from the properties panel                                      |
| `readonly`    | `boolean`                                                                               | Renders the field as disabled in the properties panel                                 |
| `serialize`   | `(value: any, node: DiagramNode) => any`                                               | Transform value before serialization. Not written to JSON                             |
| `deserialize` | `(raw: any, node: DiagramNode) => any`                                                 | Transform value after deserialization. Not written to JSON                            |
| `onChange`    | `(node: DiagramNode, newValue: any, oldValue: any) => void`                            | Called after the value changes. Not written to JSON                                   |

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
