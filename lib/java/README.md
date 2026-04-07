# @relevance/workflow-editor — Java SDK

Headless Java mirror of the `@relevance/workflow-editor` public API. Produces and consumes JSON that passes `schema.json` validation. No browser or DOM required.

---

## Requirements

- Java 17+
- Jackson Databind 2.17+

Optional:

- `com.networknt:json-schema-validator:1.4+` for `validate()`

---

## Installation

Copy `DiagramEditor.java` from `sdk/java/` into your project under `src/main/java/io/relevance/workfloweditor/`.

### Maven

```xml
<dependencies>
  <dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.17.2</version>
  </dependency>

  <!-- Optional: schema validation -->
  <dependency>
    <groupId>com.networknt</groupId>
    <artifactId>json-schema-validator</artifactId>
    <version>1.4.3</version>
  </dependency>
</dependencies>
```

### Gradle

```groovy
implementation 'com.fasterxml.jackson.core:jackson-databind:2.17.2'
implementation 'com.networknt:json-schema-validator:1.4.3' // optional
```

---

## Minimal example — from scratch

### 1. Create a Maven project

```bash
mvn archetype:generate \
  -DgroupId=io.myapp \
  -DartifactId=my-diagram-app \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DinteractiveMode=false

cd my-diagram-app
```

Add the dependencies above to `pom.xml`, then copy `DiagramEditor.java` into `src/main/java/io/relevance/workfloweditor/`.

### 2. Create `src/main/java/io/myapp/Main.java`

```java
package io.myapp;

import io.relevance.workfloweditor.DiagramEditor;
import io.relevance.workfloweditor.DiagramEditor.*;

import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

public class Main {
    public static void main(String[] args) throws Exception {
        DiagramEditor editor = new DiagramEditor().registerBuiltInNodes();

        // Define a custom node type
        Map<String, FieldDefinition> schema = new LinkedHashMap<>();
        schema.put("assignee", new FieldDefinition().label("Assignee").type("text").defaultValue(""));
        schema.put("done",     new FieldDefinition().label("Done").type("boolean").defaultValue(false));
        schema.put("priority", new FieldDefinition()
            .label("Priority").type("choice").defaultValue("medium")
            .choices(Map.of("low", "Low", "medium", "Medium", "high", "High")));

        NodeOptions taskDefaults = new NodeOptions("New Task");
        taskDefaults.backgroundColor = "#f0f8ff";

        NodeTypeDefinition taskDef = NodeTypeDefinition
            .builder("TaskNode", RectangleNode.NODE_CLASS)
            .defaultOptions(taskDefaults)
            .schema(schema)
            .name("Task")
            .build();

        editor.registerCustomNodeType(taskDef);

        // Build the diagram
        DiagramNode start    = editor.addNode(new RectangleNode("Start"),               0.0,   0.0);
        DiagramNode review   = editor.addNode(taskDef.instantiate("Code Review"),       200.0, 0.0);
        DiagramNode decision = editor.addNode(new DiamondNode("Approved?"),             400.0, 0.0);
        DiagramNode end      = editor.addNode(new CircleNode("End"),                    600.0, 0.0);

        review.setCustomProperty("assignee", "alice");
        review.setCustomProperty("priority", "high");

        editor.addEdge(Edge.from(start,    review).label("begin").build());
        editor.addEdge(Edge.from(review,   decision).label("submit").lineStyle(LineStyle.DASHED).build());
        editor.addEdge(Edge.from(decision, end).label("yes").build());
        editor.addEdge(Edge.from(decision, review)
            .label("no").connectorType(ConnectorType.CURVED).build());

        // Serialize
        System.out.println(editor.serialize().substring(0, 300));

        // Export / import
        editor.exportToFile(Path.of("/tmp/diagram.json"));
        DiagramEditor editor2 = new DiagramEditor().importFromFile(Path.of("/tmp/diagram.json"));
        System.out.println(editor2.getNodes().size() + " nodes restored");

        // Validate against schema.json
        editor.validate(Path.of("schema.json"));
    }
}
```

### 3. Build and run

```bash
mvn compile exec:java -Dexec.mainClass=io.myapp.Main
```

---

## API Reference

### `DiagramEditor`

| Method | Returns | Description |
| --- | --- | --- |
| `new DiagramEditor()` | `DiagramEditor` | Create a headless editor |
| `registerBuiltInNodes()` | `DiagramEditor` | Register all nine built-in shapes |
| `registerNodeType(nodeClass)` | `DiagramEditor` | Register a built-in type by nodeClass string |
| `registerCustomNodeType(def)` | `DiagramEditor` | Register a `NodeTypeDefinition` |
| `clearRegisteredNodes()` | `DiagramEditor` | Unregister all node types |
| `addNode(node, x, y)` | `DiagramNode` | Add a node with optional position (pass `null` to omit) |
| `addNode(node)` | `DiagramNode` | Add a node without a position |
| `removeNode(node)` | `void` | Remove a node and its edges |
| `getNodes()` | `List<DiagramNode>` | All nodes |
| `getEdges()` | `List<Edge>` | All edges |
| `addEdge(edge)` | `Edge` | Add a pre-built edge |
| `connect(source, target)` | `Edge` | Add an edge with default styling |
| `removeEdge(edge)` | `void` | Remove a specific edge |
| `clear()` | `DiagramEditor` | Remove all nodes and edges |
| `serialize(includeTypes?)` | `String` | Serialize to JSON string |
| `deserialize(json)` | `DiagramEditor` | Restore from JSON string |
| `deserialize(jsonNode)` | `DiagramEditor` | Restore from a pre-parsed `JsonNode` |
| `exportToFile(path, includeTypes?)` | `void` | Write JSON to file |
| `importFromFile(path)` | `DiagramEditor` | Load JSON from file |
| `validate(schemaPath)` | `void` | Validate against a schema file (requires `json-schema-validator`) |

### `Edge.Builder`

```java
Edge edge = Edge.from(source, target)
    .label("approved")
    .lineStyle(LineStyle.DASHED)
    .targetArrow(ArrowMarker.BLOCK)
    .connectorType(ConnectorType.CURVED)
    .sourcePort(2)
    .build();
```

### `NodeTypeDefinition.Builder`

```java
NodeTypeDefinition def = NodeTypeDefinition
    .builder("TaskNode", RectangleNode.NODE_CLASS)
    .defaultOptions(new NodeOptions("New Task"))
    .schema(schema)
    .name("Task")
    .visibleProps(List.of("label", "backgroundColor"))
    .editProp("label")
    .build();
```

### Enums

```java
LineStyle.SOLID | LineStyle.DASHED | LineStyle.DOTTED
ArrowMarker.NONE | ArrowMarker.CLASSIC | ArrowMarker.BLOCK
ConnectorType.ELBOW | ConnectorType.STRAIGHT | ConnectorType.CURVED
```

### Built-in node classes

`RectangleNode`, `SquareNode`, `EllipseNode`, `CircleNode`, `DiamondNode`, `TriangleNode`, `HexagonNode`, `PentagonNode`, `OctagonNode`
