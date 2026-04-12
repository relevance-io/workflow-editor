# @relevance/workflow-editor — Python SDK

Headless Python mirror of the `@relevance/workflow-editor` public API. Produces and consumes JSON that passes `schema.json` validation. No browser or DOM required.

---

## Requirements

- Python 3.10+
- No required third-party dependencies for core usage

Optional:

```bash
pip install jsonschema   # for DiagramEditor.validate()
```

---

## Installation

Copy `diagram_editor.py` from `sdk/python/` into your project, or install from the package once published:

```bash
pip install relevanceio-workflow-editor
```

---

## Minimal example — from scratch

### 1. Create a project directory

```bash
mkdir my-diagram-app && cd my-diagram-app
python -m venv .venv && source .venv/bin/activate
pip install jsonschema
cp /path/to/sdk/python/diagram_editor.py .
```

### 2. Create `main.py`

```python
from diagram_editor import (
    DiagramEditor, RectangleNode, DiamondNode, CircleNode,
    NodeOptions, define_node_type,
)

editor = DiagramEditor()
editor.register_builtin_nodes()

# Define a custom node type
TaskNode = define_node_type(
    RectangleNode,
    node_class_name='TaskNode',
    defaults=NodeOptions(label='New Task', background_color='#f0f8ff'),
    schema={
        'assignee': {'label': 'Assignee', 'type': 'text',    'default': ''},
        'done':     {'label': 'Done',     'type': 'boolean', 'default': False},
        'priority': {
            'label': 'Priority', 'type': 'choice', 'default': 'medium',
            'choices': {'low': 'Low', 'medium': 'Medium', 'high': 'High'},
        },
    },
    name='Task',
)
editor.register_node_type('TaskNode', TaskNode, 'Task')

# Build the diagram
start    = editor.add_node(RectangleNode('Start'),          x=0,   y=0)
review   = editor.add_node(TaskNode('Code Review'),         x=200, y=0)
decision = editor.add_node(DiamondNode('Approved?'),        x=400, y=0)
end      = editor.add_node(CircleNode('End'),               x=600, y=0)

review.set_custom_property('assignee', 'alice')
review.set_custom_property('priority', 'high')

editor.connect(start,    review,   label='begin')
editor.connect(review,   decision, label='submit')
editor.connect(decision, end,      label='yes')
editor.connect(decision, review,   label='no', connector_type='curved')

# Serialize
json_str = editor.serialize()
print(json_str[:300])

# Export to file
editor.export_to_file('diagram.json')

# Import from file
editor2 = DiagramEditor()
editor2.import_from_file('diagram.json')
print(editor2.get_nodes())

# Validate against schema.json
editor.validate('schema.json')
```

### 3. Run

```bash
python main.py
```

---

## API Reference

### `DiagramEditor`

| Method                                  | Returns             | Description                                          |
| --------------------------------------- | ------------------- | ---------------------------------------------------- |
| `DiagramEditor()`                       | `DiagramEditor`     | Create a headless editor                             |
| `register_builtin_nodes()`              | `DiagramEditor`     | Register all nine built-in shapes                    |
| `register_node_type(label, cls, name?, category?, subcategory?)` | `None` | Register a node type class           |
| `clear_registered_nodes()`              | `DiagramEditor`     | Unregister all node types                            |
| `add_node(node, x?, y?)`                | `DiagramNode`       | Add a node with optional position                    |
| `remove_node(node)`                     | `None`              | Remove a node and its edges                          |
| `get_nodes()`                           | `list[DiagramNode]` | All nodes                                            |
| `get_edges()`                           | `list[Edge]`        | All edges                                            |
| `connect_to(source, target, **kwargs)`  | `Edge`              | Connect two nodes                                    |
| `remove_edge(edge)`                     | `None`              | Remove a specific edge                               |
| `auto_arrange()`                        | `DiagramEditor`     | Clear node positions for Dagre re-layout on load     |
| `clear()`                               | `DiagramEditor`     | Remove all nodes and edges                           |
| `serialize(include_types?)`             | `str`               | Serialize to JSON string                             |
| `serialize_nodes()`                     | `dict`              | Serialize nodes and edges only                       |
| `serialize_types()`                     | `list`              | Serialize type definitions only                      |
| `deserialize(json_data, auto_arrange?, center?)` | `DiagramEditor` | Restore from JSON string or dict              |
| `export_to_file(path, include_types?)`  | `None`              | Write JSON to file                                   |
| `import_from_file(path)`                | `DiagramEditor`     | Load JSON from file                                  |
| `validate(schema_path?)`                | `None`              | Validate against schema.json (requires `jsonschema`) |

### `DiagramNode`

| Property / Method                                  | Description                            |
| -------------------------------------------------- | -------------------------------------- |
| `id`                                               | Unique identifier string               |
| `x`, `y`                                           | Canvas position (`float \| None`)      |
| `label`, `label_color`, `label_font_size`          | Label properties                       |
| `description`, `description_color`                 | Description properties                 |
| `background_color`, `border_color`, `border_width` | Visual style                           |
| `image_url`, `image_width`, `image_height`         | Image properties                       |
| `move_to(x, y)`                                   | Move to absolute canvas coordinates    |
| `move_by(dx, dy)`                                  | Move by a relative offset              |
| `get_edges()`                                      | All connected edges                    |
| `get_incoming_edges()`                             | Edges where this node is the target    |
| `get_outgoing_edges()`                             | Edges where this node is the source    |
| `connect_to(target, **kwargs)`                     | Connect to another node, returns Edge  |
| `get_custom_property(key)`                         | Get a custom property value            |
| `set_custom_property(key, value)`                  | Set a custom property value            |
| `get_schema()`                                     | Return the custom property schema dict |

### `Edge` keyword arguments for `connect_to()`

| Argument                     | Type                                | Default     | Description          |
| ---------------------------- | ----------------------------------- | ----------- | -------------------- |
| `label`                      | `str`                               | `''`        | Edge label           |
| `label_color`                | `str`                               | `'#333333'` | Label color          |
| `label_font_size`            | `int`                               | `100`       | Label font size (%)  |
| `line_color`                 | `str`                               | `'#495057'` | Line color           |
| `line_width`                 | `int`                               | `2`         | Line width in pixels |
| `line_style`                 | `'solid' \| 'dashed' \| 'dotted'`   | `'solid'`   | Line style           |
| `source_arrow`               | `'none' \| 'classic' \| 'block'`    | `'none'`    | Source arrow         |
| `target_arrow`               | `'none' \| 'classic' \| 'block'`    | `'classic'` | Target arrow         |
| `connector_type`             | `'elbow' \| 'straight' \| 'curved'` | `'elbow'`   | Routing style        |
| `source_port`, `target_port` | `int \| None`                       | `None`      | Pinned port index    |

### `define_node_type()`

```python
TaskNode = define_node_type(
    base_class=RectangleNode,
    node_class_name='TaskNode',
    defaults=NodeOptions(label='New Task'),
    schema={ 'assignee': {'label': 'Assignee', 'type': 'text', 'default': ''} },
    name='Task',          # optional display name
    visible_props=['label', 'backgroundColor'],  # optional: restrict panel fields
    edit_prop='label',    # optional: which prop Enter/F2 focuses
)
```
