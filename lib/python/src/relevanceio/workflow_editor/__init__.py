"""
Headless Python mirror of @relevance/workflow-editor's public API.
Produces and consumes JSON that passes schema.json validation.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import os
import uuid
from copy import deepcopy
from typing import TypedDict
from typing import Any, Literal, Optional, TypedDict

import jsonschema


# ── Types ────────────────────────────────────────────────────────────────────

ArrowMarkerName = Literal["none", "classic", "block"]
LineStyle       = Literal["solid", "dashed", "dotted"]
ConnectorType   = Literal["elbow", "straight", "curved"]

# Built-in node classes (mirrors src/nodes.ts)
BUILTIN_NODE_CLASSES = {
    "RectangleNode", "SquareNode", "EllipseNode", "CircleNode",
    "DiamondNode",   "TriangleNode", "HexagonNode", "PentagonNode",
    "OctagonNode",
}

# ── Default values (mirrors src/config.ts) ───────────────────────────────────

_SEARCH_PATHS = [
  os.path.join(os.path.dirname(__file__), "..", "..", ".."),
  os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."),
]

def _get_asset(filename: str) -> str:
    """
    Load a file by searching _SEARCH_PATHS.
    JSON files (.json) are parsed and returned as a dict.
    All other files are returned as a raw string.
    """
    for path in _SEARCH_PATHS:
        filepath = os.path.join(path, filename)
        if os.path.exists(filepath):
            with open(filepath, encoding="utf-8") as fp:
                return json.load(fp) if filename.endswith(".json") else fp.read()
    raise FileNotFoundError(f'{filename} not found along search paths')


config  = _get_asset("config.json")
_schema = _get_asset("schema.json")


# ── Data classes (mirror SerializedNode / SerializedEdge / SerializedDiagram) ─

class NodeOptions(TypedDict, total=False):
    label:            str
    labelColor:       str
    labelFontSize:    int
    description:      str
    descriptionColor: str
    backgroundColor:  str
    borderColor:      str
    borderWidth:      int
    imageUrl:         str
    imageWidth:       int
    imageHeight:      int


_NODE_OPTIONS_DEFAULTS: NodeOptions = {
    'label':            '',
    'labelColor':       config['colors']['label'],
    'labelFontSize':    config['font_sizes']['percent_default'],
    'description':      '',
    'descriptionColor': config['colors']['description'],
    'backgroundColor':  config['colors']['node_background'],
    'borderColor':      config['colors']['node_border'],
    'borderWidth':      config['node_sizes']['border_width'],
    'imageUrl':         '',
    'imageWidth':       config['image_dimensions']['default_width'],
    'imageHeight':      config['image_dimensions']['default_height'],
}


def make_node_options(**kwargs) -> NodeOptions:
    """Return a fully-populated NodeOptions dict, filling missing keys from defaults."""
    return {**_NODE_OPTIONS_DEFAULTS, **{k: v for k, v in kwargs.items() if k in _NODE_OPTIONS_DEFAULTS}}


@dataclass
class Point:
    x: float
    y: float

    def to_dict(self) -> dict:
        return {"x": self.x, "y": self.y}


# ── DiagramNode ──────────────────────────────────────────────────────────────

class DiagramNode:
    """
    Headless node, mirrors the public DiagramNode API.
    All properties read/write directly (no DOM, no JointJS).
    """

    node_class: str = "DiagramNode"

    def __init__(self, options: NodeOptions | str | None = None, *, _editor: DiagramEditor | None = None):
        self.id: str = f"node-{uuid.uuid4().hex[:10]}"
        self._editor = _editor

        if isinstance(options, str):
            opts = make_node_options(label=options)
        elif options is None:
            opts = make_node_options()
        elif isinstance(options, dict):
            opts = {**_NODE_OPTIONS_DEFAULTS, **{k: v for k, v in options.items() if k in _NODE_OPTIONS_DEFAULTS}}
        else:
            opts = make_node_options()

        self._props: NodeOptions = opts
        self.custom_props: dict[str, Any] = {}
        self._schema: dict[str, Any] = {}
        self.x: Optional[float] = None
        self.y: Optional[float] = None

    # ── Built-in props ───────────────────────────────────────────────────────

    @property
    def label(self) -> str:             return self._props['label']
    @label.setter
    def label(self, v: str):            self._props['label'] = v

    @property
    def label_color(self) -> str:        return self._props['labelColor']
    @label_color.setter
    def label_color(self, v: str):       self._props['labelColor'] = v

    @property
    def label_font_size(self) -> int:    return self._props['labelFontSize']
    @label_font_size.setter
    def label_font_size(self, v: int):   self._props['labelFontSize'] = v

    @property
    def description(self) -> str:        return self._props['description']
    @description.setter
    def description(self, v: str):       self._props['description'] = v

    @property
    def description_color(self) -> str:  return self._props['descriptionColor']
    @description_color.setter
    def description_color(self, v: str): self._props['descriptionColor'] = v

    @property
    def background_color(self) -> str:   return self._props['backgroundColor']
    @background_color.setter
    def background_color(self, v: str):  self._props['backgroundColor'] = v

    @property
    def border_color(self) -> str:       return self._props['borderColor']
    @border_color.setter
    def border_color(self, v: str):      self._props['borderColor'] = v

    @property
    def border_width(self) -> int:       return self._props['borderWidth']
    @border_width.setter
    def border_width(self, v: int):      self._props['borderWidth'] = v

    @property
    def image_url(self) -> str:          return self._props['imageUrl']
    @image_url.setter
    def image_url(self, v: str):         self._props['imageUrl'] = v

    @property
    def image_width(self) -> int:        return self._props['imageWidth']
    @image_width.setter
    def image_width(self, v: int):       self._props['imageWidth'] = v

    @property
    def image_height(self) -> int:       return self._props['imageHeight']
    @image_height.setter
    def image_height(self, v: int):      self._props['imageHeight'] = v

    # ── Custom props ─────────────────────────────────────────────────────────

    def get_custom_property(self, key: str) -> Any:
        return self.custom_props.get(key)

    def set_custom_property(self, key: str, value: Any) -> None:
        self.custom_props[key] = value

    def get_schema(self) -> dict:
        return self._schema

    # ── Serialisation helpers ─────────────────────────────────────────────────

    def _to_serialized(self) -> dict:
        d: dict = {
            "id":          self.id,
            "nodeClass":   self.__class__.node_class,
            "props":       dict(self._props),
            "customProps": deepcopy(self.custom_props),
        }
        if self.x is not None:
            d["x"] = self.x
        if self.y is not None:
            d["y"] = self.y
        return d

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} id={self.id!r} label={self.label!r}>"

    def connect_to(self, node: DiagramNode, **kwargs) -> None:
        self._editor.connect_to(self, node, **kwargs)

    def remove(self) -> None:
        self._editor.remove_node(self)


# ── Built-in concrete node classes ────────────────────────────────────────────

class RectangleNode(DiagramNode): node_class = "RectangleNode"
class SquareNode(DiagramNode):    node_class = "SquareNode"
class EllipseNode(DiagramNode):   node_class = "EllipseNode"
class CircleNode(DiagramNode):    node_class = "CircleNode"
class DiamondNode(DiagramNode):   node_class = "DiamondNode"
class TriangleNode(DiagramNode):  node_class = "TriangleNode"
class HexagonNode(DiagramNode):   node_class = "HexagonNode"
class PentagonNode(DiagramNode):  node_class = "PentagonNode"
class OctagonNode(DiagramNode):   node_class = "OctagonNode"

_BUILTIN_CLASS_MAP: dict[str, type[DiagramNode]] = {
    cls.node_class: cls for cls in [
        RectangleNode, SquareNode, EllipseNode, CircleNode, DiamondNode,
        TriangleNode, HexagonNode, PentagonNode, OctagonNode,
    ]
}


# ── Custom node type factory (mirrors DiagramNode.define()) ───────────────────

def define_node_type(
    base_class: type[DiagramNode],
    node_class_name: str,
    defaults: NodeOptions | None = None,
    schema: dict | None = None,
    name: str | None = None,
) -> type[DiagramNode]:
    """
    Create a custom node type, mirroring DiagramNode.define() in JS.

    Example:
        TaskNode = define_node_type(
            RectangleNode,
            node_class_name="TaskNode",
            defaults={'label': 'New Task', 'backgroundColor': '#f0f8ff'},
            schema={"assignee": {"label": "Assignee", "type": "text", "default": ""}},
            name="Task",
        )
    """
    _defaults   = defaults or make_node_options()
    _schema     = schema or {}
    _name       = name or node_class_name

    class CustomNode(base_class):  # type: ignore[valid-type]
        pass

    CustomNode.__name__  = node_class_name
    CustomNode.node_class = node_class_name            # type: ignore[attr-defined]
    CustomNode._base_class_name = base_class.node_class  # type: ignore[attr-defined]
    CustomNode._default_options = _defaults            # type: ignore[attr-defined]
    CustomNode._schema_def = _schema                   # type: ignore[attr-defined]
    CustomNode._display_name = _name                   # type: ignore[attr-defined]

    def _init(self, options: NodeOptions | str | None = None):
        merged: NodeOptions = {**_defaults}
        if isinstance(options, str):
            merged['label'] = options
        elif isinstance(options, dict):
            merged.update({k: v for k, v in options.items() if k in _NODE_OPTIONS_DEFAULTS})
        base_class.__init__(self, merged)
        self._schema = deepcopy(_schema)
        for key, field_def in _schema.items():
            if "default" in field_def and key not in self.custom_props:
                self.custom_props[key] = field_def["default"]

    CustomNode.__init__ = _init  # type: ignore[method-assign]
    return CustomNode


# ── Edge ──────────────────────────────────────────────────────────────────────

class Edge:
    """Headless edge, mirrors the public Edge API."""

    def __init__(
        self,
        source: DiagramNode,
        target: DiagramNode,
        *,
        label:          str             = "",
        labelColor:     str             = config['colors']['edge_label'],
        labelFontSize:  int             = config['font_sizes']['percent_default'],
        lineColor:      str             = config['colors']['edge_line'],
        lineWidth:      int             = config['node_sizes']['edge_line_width'],
        lineStyle:      LineStyle       = "solid",
        sourceArrow:    ArrowMarkerName = "none",
        targetArrow:    ArrowMarkerName = "classic",
        connectorType:  ConnectorType   = "elbow",
        description:    str             = "",
        sourcePort:     Optional[int]   = None,
        targetPort:     Optional[int]   = None,
        vertices:       list[Point]     | None = None,
        _editor:        DiagramEditor   | None = None,
    ):
        self.id             = f"edge-{uuid.uuid4().hex[:10]}"
        self.source         = source
        self.target         = target
        self.label          = label
        self.label_color    = labelColor
        self.label_font_size = labelFontSize
        self.line_color     = lineColor
        self.line_width     = lineWidth
        self.line_style     = lineStyle
        self.source_arrow   = sourceArrow
        self.target_arrow   = targetArrow
        self.connector_type = connectorType
        self.description    = description
        self.source_port    = sourcePort
        self.target_port    = targetPort
        self.vertices: list[Point] = vertices or []
        self._editor = _editor

    def add_path_point(self, x: float, y: float) -> Point:
        pt = Point(x, y)
        self.vertices.append(pt)
        return pt

    def get_path_points(self) -> list[Point]:
        return list(self.vertices)

    def _to_serialized(self) -> dict:
        return {
            "sourceId":      self.source.id,
            "targetId":      self.target.id,
            "sourcePort":    self.source_port,
            "targetPort":    self.target_port,
            "label":         self.label,
            "labelColor":    self.label_color,
            "labelFontSize": self.label_font_size,
            "lineColor":     self.line_color,
            "lineWidth":     self.line_width,
            "lineStyle":     self.line_style,
            "sourceArrow":   self.source_arrow,
            "targetArrow":   self.target_arrow,
            "connectorType": self.connector_type,
            "description":   self.description,
            "vertices":      [v.to_dict() for v in self.vertices],
        }

    def __repr__(self) -> str:
        return (f"<Edge id={self.id!r} "
                f"{self.source.label!r} → {self.target.label!r}>")

    def remove(self) -> None:
        self._editor.remove_edge(self)


# ── DiagramEditor ─────────────────────────────────────────────────────────────

class DiagramEditor:
    """
    Headless Python diagram editor.

    Mirrors the public API of @relevance/workflow-editor's DiagramEditor
    (headless mode — no DOM, no JointJS).

    Quickstart:
        editor = DiagramEditor()
        editor.register_builtin_nodes()

        a = editor.add_node(RectangleNode("Start"))
        b = editor.add_node(RectangleNode("End"), x=300, y=0)
        editor.connect_to(a, b)

        json_str = editor.serialize()
        editor2 = DiagramEditor()
        editor2.deserialize(json_str)
    """

    def __init__(self):
        self._nodes: dict[str, DiagramNode] = {}
        self._edges: list[Edge] = []
        self._registered_node_types: dict[str, type[DiagramNode]] = {}

    # ── Node type registration ────────────────────────────────────────────────

    def register_node_type(
        self,
        label: str,
        node_class: type[DiagramNode],
        name: str | None = None,
    ) -> None:
        """Register a node type by label (mirrors registerNodeType)."""
        node_class.node_class = label           # type: ignore[attr-defined]
        self._registered_node_types[label] = node_class

    def register_builtin_nodes(self) -> "DiagramEditor":
        """Register all built-in node types (mirrors registerBuiltInNodes)."""
        for cls in _BUILTIN_CLASS_MAP.values():
            self._registered_node_types[cls.node_class] = cls
        return self

    def clear_registered_nodes(self) -> "DiagramEditor":
        self._registered_node_types.clear()
        return self

    # ── Node management ───────────────────────────────────────────────────────

    def add_node(
        self,
        node: DiagramNode,
        x: Optional[float] = None,
        y: Optional[float] = None,
    ) -> DiagramNode:
        """Add a node. x/y are optional canvas-pixel coordinates."""
        if x is not None:
            node.x = x
        if y is not None:
            node.y = y
        self._nodes[node.id] = node
        node._editor = self
        return node

    def remove_node(self, node: DiagramNode) -> None:
        """Remove a node and all its connected edges."""
        self._nodes.pop(node.id, None)
        self._edges = [
            e for e in self._edges
            if e.source is not node and e.target is not node
        ]

    def get_nodes(self) -> list[DiagramNode]:
        return list(self._nodes.values())

    # ── Edge management ───────────────────────────────────────────────────────

    def connect_to(
        self,
        source: DiagramNode,
        target: DiagramNode,
        *,
        label:           str             = "",
        labelColor:      str             = config['colors']['edge_label'],
        labelFontSize:   int             = config['font_sizes']['percent_default'],
        lineColor:       str             = config['colors']['edge_line'],
        lineWidth:       int             = config['node_sizes']['edge_line_width'],
        lineStyle:       LineStyle       = "solid",
        sourceArrow:     ArrowMarkerName = "none",
        targetArrow:     ArrowMarkerName = "classic",
        connectorType:   ConnectorType   = "elbow",
        description:     str             = "",
        sourcePort:      Optional[int]   = None,
        targetPort:      Optional[int]   = None,
        vertices:        list[Point]     | None = None,
    ) -> Edge:
        """Connect two nodes and return the new Edge."""
        edge = Edge(
            source, target,
            label=label,
            labelColor=labelColor,
            labelFontSize=labelFontSize,
            lineColor=lineColor,
            lineWidth=lineWidth,
            lineStyle=lineStyle,
            sourceArrow=sourceArrow,
            targetArrow=targetArrow,
            connectorType=connectorType,
            description=description,
            sourcePort=sourcePort,
            targetPort=targetPort,
            vertices=vertices,
        )
        self._edges.append(edge)
        return edge

    def remove_edge(self, edge: Edge) -> None:
        self._edges = [e for e in self._edges if e is not edge]

    def get_edges(self) -> list[Edge]:
        return list(self._edges)

    # ── Clear ─────────────────────────────────────────────────────────────────

    def clear(self) -> "DiagramEditor":
        self._nodes.clear()
        self._edges.clear()
        return self

    # ── Serialisation ─────────────────────────────────────────────────────────

    def serialize_nodes(self) -> dict:
        """Return {"nodes": [...], "edges": [...]} — no type definitions."""
        return {
            "nodes": [n._to_serialized() for n in self._nodes.values()],
            "edges": [e._to_serialized() for e in self._edges],
        }

    def serialize_types(self) -> list:
        """
        Return the list of registered node type definitions.
        Built-in types → plain string (nodeClass name).
        Custom types   → full definition dict.
        """
        result = []
        for label, cls in self._registered_node_types.items():
            if cls.node_class in BUILTIN_NODE_CLASSES:
                result.append(cls.node_class)
            else:
                entry: dict = {
                    "nodeClass": cls.node_class,
                    "baseClass": getattr(cls, "_base_class_name", "RectangleNode"),
                    "defaultOptions": dict(getattr(cls, "_default_options", {})),
                    "schema": {
                        k: {fk: fv for fk, fv in fd.items()
                            if fk not in ("serialize", "deserialize", "onChange")}
                        for k, fd in getattr(cls, "_schema_def", {}).items()
                    },
                }
                if hasattr(cls, "_display_name"):
                    entry["name"] = cls._display_name     # type: ignore[attr-defined]
                result.append(entry)
        return result

    def serialize(self, include_types: bool = True) -> str:
        """
        Serialize diagram to a JSON string (mirrors serialize(includeTypes?)).
        Passes schema.json validation.
        """
        data = self.serialize_nodes()
        if include_types:
            data["nodeTypes"] = self.serialize_types()
        return json.dumps(data, ensure_ascii=False, indent=2)

    def deserialize(self, json_data: str | dict) -> "DiagramEditor":
        """
        Restore diagram from JSON (mirrors deserialize(json)).
        Re-registers custom node types present in the data.
        """
        if isinstance(json_data, str):
            raw = json.loads(json_data)
        else:
            raw = deepcopy(json_data)

        if not isinstance(raw.get("nodes"), list):
            raise ValueError("Invalid diagram: 'nodes' must be an array.")

        self.clear()

        # ── Re-register node types ────────────────────────────────────────────
        for type_data in raw.get("nodeTypes") or []:
            if isinstance(type_data, str):
                if type_data in _BUILTIN_CLASS_MAP:
                    cls = _BUILTIN_CLASS_MAP[type_data]
                    self._registered_node_types[type_data] = cls
            else:
                nc   = type_data["nodeClass"]
                bc   = type_data.get("baseClass", "RectangleNode")
                base = (
                    _BUILTIN_CLASS_MAP.get(bc)
                    or self._registered_node_types.get(bc)
                )
                if base is None:
                    raise ValueError(f"Unknown base class '{bc}' for type '{nc}'.")
                opts = make_node_options(**{k: v for k, v in (type_data.get("defaultOptions") or {}).items() if k in _NODE_OPTIONS_DEFAULTS})
                custom_cls = define_node_type(
                    base,
                    node_class_name=nc,
                    defaults=opts,
                    schema=type_data.get("schema") or {},
                    name=type_data.get("name"),
                )
                self._registered_node_types[nc] = custom_cls

        # ── Restore nodes ─────────────────────────────────────────────────────
        id_map: dict[str, DiagramNode] = {}
        for nd in raw["nodes"]:
            nc = nd.get("nodeClass", "RectangleNode")
            cls = (
                self._registered_node_types.get(nc)
                or _BUILTIN_CLASS_MAP.get(nc)
                or DiagramNode
            )
            props = {**_NODE_OPTIONS_DEFAULTS, **{k: v for k, v in (nd.get("props") or {}).items() if k in _NODE_OPTIONS_DEFAULTS}}
            node  = cls(props)
            node.id = nd["id"]
            node.x  = nd.get("x")
            node.y  = nd.get("y")
            node.custom_props = deepcopy(nd.get("customProps") or {})
            self._nodes[node.id] = node
            id_map[node.id] = node

        # ── Restore edges ─────────────────────────────────────────────────────
        for ed in raw["edges"]:
            src = id_map.get(ed["sourceId"])
            tgt = id_map.get(ed["targetId"])
            if src is None or tgt is None:
                raise ValueError(
                    f"Edge references unknown node ids: "
                    f"{ed['sourceId']!r} → {ed['targetId']!r}"
                )
            verts = [Point(v["x"], v["y"]) for v in ed.get("vertices") or []]
            self._edges.append(Edge(
                src, tgt,
                label=ed.get("label", ""),
                labelColor=ed.get("labelColor", config['colors']['edge_label']),
                labelFontSize=ed.get("labelFontSize", config['font_sizes']['percent_default']),
                lineColor=ed.get("lineColor", config['colors']['edge_line']),
                lineWidth=ed.get("lineWidth", config['node_sizes']['edge_line_width']),
                lineStyle=ed.get("lineStyle", "solid"),
                sourceArrow=ed.get("sourceArrow", "none"),
                targetArrow=ed.get("targetArrow", "classic"),
                connectorType=ed.get("connectorType", "elbow"),
                description=ed.get("description", ""),
                sourcePort=ed.get("sourcePort"),
                targetPort=ed.get("targetPort"),
                vertices=verts,
            ))

        return self

    # ── Export / Import helpers ───────────────────────────────────────────────

    def export_to_file(self, path: str, include_types: bool = True) -> None:
        """Write diagram JSON to a file."""
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.serialize(include_types=include_types))

    def import_from_file(self, path: str) -> "DiagramEditor":
        """Load diagram JSON from a file."""
        with open(path, encoding="utf-8") as f:
            return self.deserialize(f.read())

    # ── HTML render ───────────────────────────────────────────────────────────

    def render(
        self,
        width: str = "100%",
        height: str = "600px",
        *,
        auto_arrange: bool = False,
        center: bool = False,
    ) -> str:
        """
        Return a self-contained HTML string that renders the current diagram
        in the browser using the bundled JS and CSS assets.

        Parameters
        ----------
        width, height:
            CSS dimensions of the editor container.
        auto_arrange:
            When True, calls editor.autoArrange() after the diagram loads.
            Useful for diagrams built headlessly without explicit coordinates.
        center:
            When True, calls editor.zoomToFit() after the diagram loads so
            the full canvas is visible on open.

        Usage in a Jupyter notebook:
            from IPython.display import HTML
            display(HTML(editor.render()))

        Usage as a standalone file:
            with open("diagram.html", "w") as f:
                f.write(editor.render())
        """
        js  = _get_asset("dist/index.es.js")
        css = _get_asset("dist/index.css")

        container_id = f"wf-{uuid.uuid4().hex[:8]}"
        diagram_json = self.serialize()

        # Escape </script> sequences that would break the inline script block.
        safe_json = diagram_json.replace("</", "<\\/")

        post_load_calls = ""
        if auto_arrange:
            post_load_calls += "\n    await editor.autoArrange();"
        if center:
            post_load_calls += "\n    await editor.zoomToFit();"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
{css}
  </style>
</head>
<body>
  <div id="{container_id}" style="width:{width};height:{height};"></div>
  <script type="module">
{js}

    const container = document.getElementById('{container_id}');
    const diagram   = {safe_json};

    const editor = new DiagramEditor(container);
    editor.registerBuiltInNodes();
    await editor.deserialize(diagram);{post_load_calls}

    editor.on('change', () => {{
      window.parent.postMessage(
        {{ type: 'workflow:change', diagram: editor.serialize() }},
        '*',
      );
    }});
  </script>
</body>
</html>"""

    # ── Schema validation ─────────────────────────────────────────────────────

    def validate(self, schema: dict = _schema) -> None:
        """
        Validate the current diagram against schema.json.
        Requires: pip install jsonschema
        """
        data = json.loads(self.serialize())
        jsonschema.validate(instance=data, schema=schema)
        print("✓ Diagram is valid against schema.json")

    # ── Misc ──────────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return (f"<DiagramEditor nodes={len(self._nodes)} "
                f"edges={len(self._edges)}>")


# ── Demo / smoke-test ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    editor = DiagramEditor()
    editor.register_builtin_nodes()

    TaskNode = define_node_type(
        RectangleNode,
        node_class_name="TaskNode",
        defaults={'label': 'New Task', 'backgroundColor': '#f0f8ff'},
        schema={
            "assignee": {"label": "Assignee", "type": "text",    "default": ""},
            "done":     {"label": "Done",     "type": "boolean", "default": False},
            "priority": {
                "label":   "Priority",
                "type":    "choice",
                "default": "medium",
                "choices": {"low": "Low", "medium": "Medium", "high": "High"},
            },
        },
        name="Task",
    )
    editor.register_node_type("TaskNode", TaskNode, "Task")

    start  = editor.add_node(RectangleNode("Start"),  x=0,   y=0)
    review = editor.add_node(TaskNode("Code Review"), x=200, y=0)
    done   = editor.add_node(DiamondNode("Done?"),    x=400, y=0)
    end    = editor.add_node(CircleNode("End"),       x=600, y=0)

    review.set_custom_property("assignee", "alice")
    review.set_custom_property("priority", "high")

    editor.connect_to(start,  review, label="begin")
    editor.connect_to(review, done,   label="submit", lineStyle="dashed")
    editor.connect_to(done,   end,    label="yes",    targetArrow="block")
    editor.connect_to(done,   review, label="no",     connectorType="curved",
                      sourceArrow="classic")

    with open("/tmp/diagram.html", "w", encoding="utf-8") as f:
        f.write(editor.render(height="800px"))

    print("✓ Wrote /tmp/diagram.html")
    editor.validate()
