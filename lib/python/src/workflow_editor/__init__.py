"""
diagram_editor.py
Headless Python mirror of @relevance/workflow-editor's public API.
Produces and consumes JSON that passes schema.json validation.

Usage:
    pip install jsonschema
"""

from __future__ import annotations

import json
import uuid
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Literal, Optional

# ── jsonschema is optional — validation only runs when requested ─────────────
try:
    import jsonschema
    _JSONSCHEMA_AVAILABLE = True
except ImportError:
    _JSONSCHEMA_AVAILABLE = False


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

class _Config:
    COLOR_NODE_BACKGROUND   = "#ffffff"
    COLOR_NODE_BORDER       = "#adb5bd"
    COLOR_LABEL             = "#212529"
    COLOR_DESCRIPTION       = "#6c757d"
    COLOR_EDGE_LINE         = "#495057"
    COLOR_EDGE_LABEL        = "#333333"
    FONT_SIZE_PERCENT_DEFAULT = 100
    IMAGE_DEFAULT_WIDTH     = 32
    IMAGE_DEFAULT_HEIGHT    = 32

cfg = _Config()


# ── Data classes (mirror SerializedNode / SerializedEdge / SerializedDiagram) ─

@dataclass
class NodeOptions:
    label:            str   = ""
    labelColor:       str   = cfg.COLOR_LABEL
    labelFontSize:    int   = cfg.FONT_SIZE_PERCENT_DEFAULT
    description:      str   = ""
    descriptionColor: str   = cfg.COLOR_DESCRIPTION
    backgroundColor:  str   = cfg.COLOR_NODE_BACKGROUND
    borderColor:      str   = cfg.COLOR_NODE_BORDER
    borderWidth:      int   = 2
    imageUrl:         str   = ""
    imageWidth:       int   = cfg.IMAGE_DEFAULT_WIDTH
    imageHeight:      int   = cfg.IMAGE_DEFAULT_HEIGHT

    def to_dict(self) -> dict:
        return {
            "label":            self.label,
            "labelColor":       self.labelColor,
            "labelFontSize":    self.labelFontSize,
            "description":      self.description,
            "descriptionColor": self.descriptionColor,
            "backgroundColor":  self.backgroundColor,
            "borderColor":      self.borderColor,
            "borderWidth":      self.borderWidth,
            "imageUrl":         self.imageUrl,
            "imageWidth":       self.imageWidth,
            "imageHeight":      self.imageHeight,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "NodeOptions":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


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

    def __init__(self, options: NodeOptions | str | None = None):
        self.id: str = f"node-{uuid.uuid4().hex[:10]}"

        if isinstance(options, str):
            opts = NodeOptions(label=options)
        elif options is None:
            opts = NodeOptions()
        else:
            opts = options

        self._props = opts
        self.custom_props: dict[str, Any] = {}
        self._schema: dict[str, Any] = {}
        self.x: Optional[float] = None
        self.y: Optional[float] = None

    # ── Built-in props ───────────────────────────────────────────────────────

    @property
    def label(self) -> str:            return self._props.label
    @label.setter
    def label(self, v: str):           self._props.label = v

    @property
    def label_color(self) -> str:      return self._props.labelColor
    @label_color.setter
    def label_color(self, v: str):     self._props.labelColor = v

    @property
    def label_font_size(self) -> int:  return self._props.labelFontSize
    @label_font_size.setter
    def label_font_size(self, v: int): self._props.labelFontSize = v

    @property
    def description(self) -> str:      return self._props.description
    @description.setter
    def description(self, v: str):     self._props.description = v

    @property
    def description_color(self) -> str:     return self._props.descriptionColor
    @description_color.setter
    def description_color(self, v: str):    self._props.descriptionColor = v

    @property
    def background_color(self) -> str:      return self._props.backgroundColor
    @background_color.setter
    def background_color(self, v: str):     self._props.backgroundColor = v

    @property
    def border_color(self) -> str:     return self._props.borderColor
    @border_color.setter
    def border_color(self, v: str):    self._props.borderColor = v

    @property
    def border_width(self) -> int:     return self._props.borderWidth
    @border_width.setter
    def border_width(self, v: int):    self._props.borderWidth = v

    @property
    def image_url(self) -> str:        return self._props.imageUrl
    @image_url.setter
    def image_url(self, v: str):       self._props.imageUrl = v

    @property
    def image_width(self) -> int:      return self._props.imageWidth
    @image_width.setter
    def image_width(self, v: int):     self._props.imageWidth = v

    @property
    def image_height(self) -> int:     return self._props.imageHeight
    @image_height.setter
    def image_height(self, v: int):    self._props.imageHeight = v

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
            "props":       self._props.to_dict(),
            "customProps": deepcopy(self.custom_props),
        }
        if self.x is not None:
            d["x"] = self.x
        if self.y is not None:
            d["y"] = self.y
        return d

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} id={self.id!r} label={self.label!r}>"


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
            defaults=NodeOptions(label="New Task", backgroundColor="#f0f8ff"),
            schema={"assignee": {"label": "Assignee", "type": "text", "default": ""}},
            name="Task",
        )
    """
    _defaults   = defaults or NodeOptions()
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

    original_init = CustomNode.__init__

    def _init(self, options: NodeOptions | str | None = None):
        # Merge defaults then caller options
        merged = deepcopy(_defaults)
        if isinstance(options, str):
            merged.label = options
        elif isinstance(options, NodeOptions):
            for f in NodeOptions.__dataclass_fields__:
                caller_val = getattr(options, f)
                if caller_val != getattr(NodeOptions(), f):
                    setattr(merged, f, caller_val)
        base_class.__init__(self, merged)
        self._schema = deepcopy(_schema)
        # Set custom prop defaults
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
        label:          str           = "",
        label_color:    str           = cfg.COLOR_EDGE_LABEL,
        label_font_size: int          = cfg.FONT_SIZE_PERCENT_DEFAULT,
        line_color:     str           = cfg.COLOR_EDGE_LINE,
        line_width:     int           = 2,
        line_style:     LineStyle     = "solid",
        source_arrow:   ArrowMarkerName = "none",
        target_arrow:   ArrowMarkerName = "classic",
        connector_type: ConnectorType = "elbow",
        description:    str           = "",
        source_port:    Optional[int] = None,
        target_port:    Optional[int] = None,
        vertices:       list[Point]   | None = None,
    ):
        self.id            = f"edge-{uuid.uuid4().hex[:10]}"
        self.source        = source
        self.target        = target
        self.label         = label
        self.label_color   = label_color
        self.label_font_size = label_font_size
        self.line_color    = line_color
        self.line_width    = line_width
        self.line_style    = line_style
        self.source_arrow  = source_arrow
        self.target_arrow  = target_arrow
        self.connector_type = connector_type
        self.description   = description
        self.source_port   = source_port
        self.target_port   = target_port
        self.vertices: list[Point] = vertices or []

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
        editor.connect(a, b)

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

    def connect(
        self,
        source: DiagramNode,
        target: DiagramNode,
        *,
        label:           str           = "",
        label_color:     str           = cfg.COLOR_EDGE_LABEL,
        label_font_size: int           = cfg.FONT_SIZE_PERCENT_DEFAULT,
        line_color:      str           = cfg.COLOR_EDGE_LINE,
        line_width:      int           = 2,
        line_style:      LineStyle     = "solid",
        source_arrow:    ArrowMarkerName = "none",
        target_arrow:    ArrowMarkerName = "classic",
        connector_type:  ConnectorType = "elbow",
        description:     str           = "",
        source_port:     Optional[int] = None,
        target_port:     Optional[int] = None,
        vertices:        list[Point]   | None = None,
    ) -> Edge:
        """Connect two nodes and return the new Edge."""
        edge = Edge(
            source, target,
            label=label,
            label_color=label_color,
            label_font_size=label_font_size,
            line_color=line_color,
            line_width=line_width,
            line_style=line_style,
            source_arrow=source_arrow,
            target_arrow=target_arrow,
            connector_type=connector_type,
            description=description,
            source_port=source_port,
            target_port=target_port,
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
                    "defaultOptions": getattr(cls, "_default_options", NodeOptions()).to_dict(),
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
                # Built-in type
                if type_data in _BUILTIN_CLASS_MAP:
                    cls = _BUILTIN_CLASS_MAP[type_data]
                    self._registered_node_types[type_data] = cls
            else:
                # Custom type — reconstruct a class dynamically
                nc   = type_data["nodeClass"]
                bc   = type_data.get("baseClass", "RectangleNode")
                base = (
                    _BUILTIN_CLASS_MAP.get(bc)
                    or self._registered_node_types.get(bc)
                )
                if base is None:
                    raise ValueError(f"Unknown base class '{bc}' for type '{nc}'.")
                opts = NodeOptions.from_dict(type_data.get("defaultOptions") or {})
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
            props = NodeOptions.from_dict(nd.get("props") or {})
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
                label_color=ed.get("labelColor", cfg.COLOR_EDGE_LABEL),
                label_font_size=ed.get("labelFontSize", cfg.FONT_SIZE_PERCENT_DEFAULT),
                line_color=ed.get("lineColor", cfg.COLOR_EDGE_LINE),
                line_width=ed.get("lineWidth", 2),
                line_style=ed.get("lineStyle", "solid"),
                source_arrow=ed.get("sourceArrow", "none"),
                target_arrow=ed.get("targetArrow", "classic"),
                connector_type=ed.get("connectorType", "elbow"),
                description=ed.get("description", ""),
                source_port=ed.get("sourcePort"),
                target_port=ed.get("targetPort"),
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

    # ── Schema validation ─────────────────────────────────────────────────────

    def validate(self, schema_path: str = "schema.json") -> None:
        """
        Validate the current diagram against schema.json.
        Requires: pip install jsonschema
        """
        if not _JSONSCHEMA_AVAILABLE:
            raise RuntimeError("jsonschema not installed — run: pip install jsonschema")
        with open(schema_path, encoding="utf-8") as f:
            schema = json.load(f)
        data = json.loads(self.serialize())
        jsonschema.validate(instance=data, schema=schema)
        print("✓ Diagram is valid against schema.json")

    # ── Misc ──────────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return (f"<DiagramEditor nodes={len(self._nodes)} "
                f"edges={len(self._edges)}>")


# ── Demo / smoke-test ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Build a small diagram programmatically
    editor = DiagramEditor()
    editor.register_builtin_nodes()

    # Define a custom node type
    TaskNode = define_node_type(
        RectangleNode,
        node_class_name="TaskNode",
        defaults=NodeOptions(label="New Task", background_color="#f0f8ff"),
        schema={
            "assignee": {"label": "Assignee", "type": "text",   "default": ""},
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

    start  = editor.add_node(RectangleNode("Start"),        x=0,   y=0)
    review = editor.add_node(TaskNode("Code Review"),       x=200, y=0)
    done   = editor.add_node(DiamondNode("Done?"),          x=400, y=0)
    end    = editor.add_node(CircleNode("End"),             x=600, y=0)

    review.set_custom_property("assignee", "alice")
    review.set_custom_property("priority", "high")

    editor.connect(start,  review, label="begin")
    editor.connect(review, done,   label="submit", line_style="dashed")
    editor.connect(done,   end,    label="yes",    target_arrow="block")
    editor.connect(done,   review, label="no",     connector_type="curved",
                   source_arrow="classic")

    json_str = editor.serialize()
    print("── Serialized ──────────────────────────────")
    print(json_str[:600], "...\n")

    # Round-trip: deserialize into a fresh editor
    editor2 = DiagramEditor()
    editor2.deserialize(json_str)
    print("── Round-trip ──────────────────────────────")
    print("Nodes:", editor2.get_nodes())
    print("Edges:", editor2.get_edges())

    # Export / import via file
    editor.export_to_file("/tmp/diagram.json")
    editor3 = DiagramEditor().import_from_file("/tmp/diagram.json")
    print("\n── Import from file ────────────────────────")
    print(editor3)

    # Optional schema validation
    try:
        editor.validate("schema.json")
    except FileNotFoundError:
        print("(schema.json not found in cwd — skipping validation)")
    except RuntimeError as e:
        print(e)
