# @relevance/workflow-editor — PHP SDK

Headless PHP mirror of the `@relevance/workflow-editor` public API. Produces and consumes JSON that passes `schema.json` validation. No browser or DOM required.

---

## Requirements

- PHP 8.1+
- No required Composer dependencies for core usage

Optional:

```bash
composer require justinrainbow/json-schema   # for DiagramEditor::validate()
```

---

## Installation

Copy `DiagramEditor.php` from `sdk/php/` into your project, or install from Packagist once published:

```bash
composer require relevance/workflow-editor   # coming soon
```

---

## Minimal example — from scratch

### 1. Create a project directory

```bash
mkdir my-diagram-app && cd my-diagram-app
composer init --no-interaction
composer require justinrainbow/json-schema
cp /path/to/sdk/php/DiagramEditor.php src/
```

### 2. Create `src/main.php`

```php
<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/DiagramEditor.php';

use Relevance\WorkflowEditor\DiagramEditor;
use Relevance\WorkflowEditor\NodeOptions;
use Relevance\WorkflowEditor\NodeTypeDefinition;
use Relevance\WorkflowEditor\RectangleNode;
use Relevance\WorkflowEditor\DiamondNode;
use Relevance\WorkflowEditor\CircleNode;
use Relevance\WorkflowEditor\LineStyle;
use Relevance\WorkflowEditor\ArrowMarker;
use Relevance\WorkflowEditor\ConnectorType;

$editor = new DiagramEditor();
$editor->registerBuiltInNodes();

// Define a custom node type
$taskDefinition = new NodeTypeDefinition(
    nodeClass:      'TaskNode',
    baseClass:      'RectangleNode',
    defaultOptions: new NodeOptions(label: 'New Task', backgroundColor: '#f0f8ff'),
    schema: [
        'assignee' => ['label' => 'Assignee', 'type' => 'text',    'default' => ''],
        'done'     => ['label' => 'Done',     'type' => 'boolean', 'default' => false],
        'priority' => [
            'label'   => 'Priority',
            'type'    => 'choice',
            'default' => 'medium',
            'choices' => ['low' => 'Low', 'medium' => 'Medium', 'high' => 'High'],
        ],
    ],
    name: 'Task',
);
$editor->registerCustomNodeType($taskDefinition);

// Build the diagram
$start    = $editor->addNode(new RectangleNode('Start'),                 x: 0,   y: 0);
$review   = $editor->addNode($taskDefinition->instantiate('Code Review'), x: 200, y: 0);
$decision = $editor->addNode(new DiamondNode('Approved?'),               x: 400, y: 0);
$end      = $editor->addNode(new CircleNode('End'),                      x: 600, y: 0);

$review->setCustomProperty('assignee', 'alice');
$review->setCustomProperty('priority', 'high');

$editor->connect($start,    $review,   label: 'begin');
$editor->connect($review,   $decision, label: 'submit', lineStyle: LineStyle::Dashed);
$editor->connect($decision, $end,      label: 'yes');
$editor->connect($decision, $review,   label: 'no', connectorType: ConnectorType::Curved);

// Serialize
echo substr($editor->serialize(), 0, 300) . "\n";

// Export / import
$editor->exportToFile('/tmp/diagram.json');
$editor2 = (new DiagramEditor())->importFromFile('/tmp/diagram.json');
echo count($editor2->getNodes()) . " nodes restored\n";

// Validate against schema.json
$editor->validate('schema.json');
```

### 3. Run

```bash
php src/main.php
```

---

## API Reference

### `DiagramEditor`

| Method | Returns | Description |
| --- | --- | --- |
| `new DiagramEditor()` | `DiagramEditor` | Create a headless editor |
| `registerBuiltInNodes()` | `static` | Register all nine built-in shapes |
| `registerNodeType(label, fqcn)` | `static` | Register a built-in class by FQCN |
| `registerCustomNodeType(definition)` | `static` | Register a custom `NodeTypeDefinition` |
| `clearRegisteredNodes()` | `static` | Unregister all node types |
| `addNode(node, x?, y?)` | `DiagramNode` | Add a node with optional position |
| `removeNode(node)` | `void` | Remove a node and its edges |
| `getNodes()` | `DiagramNode[]` | All nodes |
| `getEdges()` | `Edge[]` | All edges |
| `connect(source, target, ...args)` | `Edge` | Connect two nodes |
| `removeEdge(edge)` | `void` | Remove a specific edge |
| `clear()` | `static` | Remove all nodes and edges |
| `serialize(includeTypes?)` | `string` | Serialize to JSON string |
| `serializeNodes()` | `array` | Serialize nodes and edges only |
| `serializeTypes()` | `array` | Serialize type definitions only |
| `deserialize(input)` | `static` | Restore from JSON string or decoded array |
| `exportToFile(path, includeTypes?)` | `void` | Write JSON to file |
| `importFromFile(path)` | `static` | Load JSON from file |
| `validate(schemaPath?)` | `void` | Validate against schema.json (requires `justinrainbow/json-schema`) |

### `connect()` named arguments

| Argument | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | `''` | Edge label |
| `labelColor` | `string` | `'#333333'` | Label color |
| `labelFontSize` | `int` | `100` | Label font size (%) |
| `lineColor` | `string` | `'#495057'` | Line color |
| `lineWidth` | `int` | `2` | Line width in pixels |
| `lineStyle` | `LineStyle` | `LineStyle::Solid` | Line style enum |
| `sourceArrow` | `ArrowMarker` | `ArrowMarker::None` | Source arrow enum |
| `targetArrow` | `ArrowMarker` | `ArrowMarker::Classic` | Target arrow enum |
| `connectorType` | `ConnectorType` | `ConnectorType::Elbow` | Routing style enum |
| `sourcePort`, `targetPort` | `?int` | `null` | Pinned port index |

### `NodeTypeDefinition`

```php
$definition = new NodeTypeDefinition(
    nodeClass:      'TaskNode',
    baseClass:      'RectangleNode',   // must be a registered built-in nodeClass
    defaultOptions: new NodeOptions(label: 'New Task'),
    schema:         ['assignee' => ['label' => 'Assignee', 'type' => 'text', 'default' => '']],
    name:           'Task',            // optional display name
    visibleProps:   [],                // optional subset of built-in props to show
    editProp:       'label',           // optional focus prop
);

$node = $definition->instantiate('My Task');
$node = $definition->instantiate(new NodeOptions(label: 'My Task', backgroundColor: '#fff'));
```

### Enums

```php
LineStyle::Solid | LineStyle::Dashed | LineStyle::Dotted
ArrowMarker::None | ArrowMarker::Classic | ArrowMarker::Block
ConnectorType::Elbow | ConnectorType::Straight | ConnectorType::Curved
```

### Built-in node classes

`RectangleNode`, `SquareNode`, `EllipseNode`, `CircleNode`, `DiamondNode`, `TriangleNode`, `HexagonNode`, `PentagonNode`, `OctagonNode`
