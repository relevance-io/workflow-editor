# @relevance/workflow-editor — Go SDK

Headless Go mirror of the `@relevance/workflow-editor` public API. Produces and consumes JSON that passes `schema.json` validation. No browser or DOM required.

---

## Requirements

- Go 1.21+
- No third-party dependencies for core usage

Optional:

```bash
go get github.com/santhosh-tekuri/jsonschema/v6   # for Validate()
```

---

## Installation

Copy `diagram_editor.go` from `sdk/go/` into your project as a Go file in the `workfloweditor` package, or use the module once published:

```bash
go get github.com/relevance-io/workflow-editor/go   # coming soon
```

---

## Minimal example — from scratch

### 1. Initialise a Go module

```bash
mkdir my-diagram-app && cd my-diagram-app
go mod init myapp
cp /path/to/sdk/go/diagram_editor.go .
```

### 2. Create `main.go`

```go
package main

import (
	"fmt"
	"os"

	we "myapp" // adjust import path if diagram_editor.go is in a sub-package
)

func main() {
	editor := we.New()
	editor.RegisterBuiltInNodes()

	// Define a custom node type
	schema := map[string]we.FieldDefinition{
		"assignee": {Label: "Assignee", Type: "text",    DefaultValue: ""},
		"done":     {Label: "Done",     Type: "boolean", DefaultValue: false},
		"priority": {
			Label:        "Priority",
			Type:         "choice",
			DefaultValue: "medium",
			Choices:      map[string]string{"low": "Low", "medium": "Medium", "high": "High"},
		},
	}

	taskDefaults := we.DefaultNodeOptions().WithLabel("New Task")
	taskDefaults.BackgroundColor = "#f0f8ff"

	taskDef := &we.NodeTypeDefinition{
		NodeClass:      "TaskNode",
		BaseClass:      "RectangleNode",
		DefaultOptions: taskDefaults,
		Schema:         schema,
		Name:           "Task",
	}
	editor.RegisterCustomNodeType(taskDef)

	// Build the diagram
	start,    _ := editor.AddNode(we.NewNode("RectangleNode", "Start"),          we.Ptr(0.0),   we.Ptr(0.0))
	review,   _ := editor.AddNode(taskDef.InstantiateWithLabel("Code Review"),   we.Ptr(200.0), we.Ptr(0.0))
	decision, _ := editor.AddNode(we.NewNode("DiamondNode", "Approved?"),        we.Ptr(400.0), we.Ptr(0.0))
	end,      _ := editor.AddNode(we.NewNode("CircleNode", "End"),               we.Ptr(600.0), we.Ptr(0.0))

	review.SetCustomProperty("assignee", "alice")
	review.SetCustomProperty("priority", "high")

	editor.Connect(start,    review,   &we.EdgeOptions{Label: "begin"})
	editor.Connect(review,   decision, &we.EdgeOptions{Label: "submit", LineStyle: we.LineDashed})
	editor.Connect(decision, end,      &we.EdgeOptions{Label: "yes"})
	editor.Connect(decision, review,   &we.EdgeOptions{
		Label:         "no",
		ConnectorType: we.ConnectorCurved,
		SourceArrow:   we.ArrowClassic,
	})

	// Serialize
	json, err := editor.Serialize(true)
	if err != nil {
		panic(err)
	}
	fmt.Println(json[:min(300, len(json))])

	// Export / import
	if err := editor.ExportToFile("/tmp/diagram.json", true); err != nil {
		panic(err)
	}
	editor2 := we.New()
	if err := editor2.ImportFromFile("/tmp/diagram.json"); err != nil {
		panic(err)
	}
	fmt.Printf("%d nodes restored\n", len(editor2.GetNodes()))

	// Validate against schema.json (requires RegisterValidator to be called first)
	if err := editor.Validate("schema.json"); err != nil {
		fmt.Println("Validation:", err)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
```

### 3. Run

```bash
go run .
```

---

## API Reference

### `DiagramEditor`

| Method | Returns | Description |
| --- | --- | --- |
| `New()` | `*DiagramEditor` | Create a headless editor |
| `RegisterBuiltInNodes()` | `*DiagramEditor` | Register all nine built-in shapes |
| `RegisterCustomNodeType(def)` | `*DiagramEditor` | Register a `NodeTypeDefinition` |
| `ClearRegisteredNodes()` | `*DiagramEditor` | Unregister all node types |
| `AddNode(node, x, y)` | `(*DiagramNode, error)` | Add a node. Pass `nil` for x/y to omit position |
| `RemoveNode(node)` | `void` | Remove a node and its edges |
| `GetNodes()` | `[]*DiagramNode` | All nodes in insertion order |
| `Connect(src, tgt, opts)` | `*Edge` | Connect two nodes. Pass `nil` for opts to use defaults |
| `RemoveEdge(edge)` | `void` | Remove a specific edge |
| `GetEdges()` | `[]*Edge` | All edges |
| `Clear()` | `*DiagramEditor` | Remove all nodes and edges |
| `Serialize(includeTypes)` | `(string, error)` | Serialize to JSON string |
| `Deserialize(jsonStr)` | `error` | Restore from JSON string |
| `ExportToFile(path, includeTypes)` | `error` | Write JSON to file |
| `ImportFromFile(path)` | `error` | Load JSON from file |
| `Validate(schemaPath)` | `error` | Validate against schema.json (requires `RegisterValidator`) |

### `EdgeOptions`

```go
opts := &we.EdgeOptions{
    Label:         "approved",
    LineStyle:     we.LineDashed,
    TargetArrow:   we.ArrowBlock,
    ConnectorType: we.ConnectorCurved,
    SourcePort:    we.Ptr(2),
}
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `Label` | `string` | `""` | Edge label |
| `LabelColor` | `string` | `"#333333"` | Label color |
| `LabelFontSize` | `int` | `100` | Label font size (%) |
| `LineColor` | `string` | `"#495057"` | Line color |
| `LineWidth` | `int` | `2` | Line width in pixels |
| `LineStyle` | `LineStyle` | `LineSolid` | `LineSolid \| LineDashed \| LineDotted` |
| `SourceArrow` | `ArrowMarker` | `ArrowNone` | `ArrowNone \| ArrowClassic \| ArrowBlock` |
| `TargetArrow` | `ArrowMarker` | `ArrowClassic` | `ArrowNone \| ArrowClassic \| ArrowBlock` |
| `ConnectorType` | `ConnectorType` | `ConnectorElbow` | `ConnectorElbow \| ConnectorStraight \| ConnectorCurved` |
| `SourcePort`, `TargetPort` | `*int` | `nil` | Pinned port index |

### `NodeTypeDefinition`

```go
def := &we.NodeTypeDefinition{
    NodeClass:      "TaskNode",
    BaseClass:      "RectangleNode",   // must be a built-in nodeClass string
    DefaultOptions: we.DefaultNodeOptions().WithLabel("New Task"),
    Schema:         schema,
    Name:           "Task",           // optional display name
    VisibleProps:   []string{"label", "backgroundColor"},  // optional
    EditProp:       "label",          // optional
}

node  := def.Instantiate(nil)
node2 := def.InstantiateWithLabel("My Task")
```

### Schema validation (optional)

```go
import "github.com/santhosh-tekuri/jsonschema/v6"

we.RegisterValidator(func(schemaPath, jsonData string) error {
    c := jsonschema.NewCompiler()
    s, err := c.Compile(schemaPath)
    if err != nil { return err }
    var v any
    json.Unmarshal([]byte(jsonData), &v)
    return s.Validate(v)
})
```

### `Ptr[T]` helper

```go
we.Ptr(300.0)   // *float64
we.Ptr(2)       // *int
```

### Built-in nodeClass strings

`"RectangleNode"`, `"SquareNode"`, `"EllipseNode"`, `"CircleNode"`, `"DiamondNode"`, `"TriangleNode"`, `"HexagonNode"`, `"PentagonNode"`, `"OctagonNode"`
