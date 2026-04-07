"""
tests/test_diagram_editor.py

End-to-end test: builds a diagram, writes it to JSON, validates against schema.json.

Run:
    pip install jsonschema
    python -m unittest tests/test_diagram_editor.py -v
"""

import json
import os
import sys
import unittest

TESTS_DIR   = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR    = os.path.dirname(TESTS_DIR)
SCHEMA_PATH = os.path.join(ROOT_DIR, "schema.json")
OUTPUT_PATH = os.path.join(TESTS_DIR, "diagram_output.json")

sys.path.insert(0, os.path.join(ROOT_DIR, "sdk", "python"))

from diagram_editor import (
    DiagramEditor,
    NodeOptions,
    RectangleNode,
    DiamondNode,
    CircleNode,
    define_node_type,
)


class TestEndToEnd(unittest.TestCase):

    def test_build_serialize_and_validate(self):
        editor = DiagramEditor()
        editor.register_builtin_nodes()

        # Custom node type
        TaskNode = define_node_type(
            RectangleNode,
            node_class_name="TaskNode",
            defaults=NodeOptions(label="New Task", background_color="#f0f8ff"),
            schema={
                "assignee": {"label": "Assignee", "type": "text",    "default": ""},
                "done":     {"label": "Done",     "type": "boolean", "default": False},
                "priority": {
                    "label": "Priority", "type": "choice", "default": "medium",
                    "choices": {"low": "Low", "medium": "Medium", "high": "High"},
                },
            },
            name="Task",
        )
        editor.register_node_type("TaskNode", TaskNode, "Task")

        # Nodes
        start    = editor.add_node(RectangleNode("Start"),       x=0,   y=0)
        review   = editor.add_node(TaskNode("Code Review"),      x=200, y=0)
        decision = editor.add_node(DiamondNode("Approved?"),     x=400, y=0)
        end      = editor.add_node(CircleNode("End"),            x=600, y=0)

        review.label_color      = "#0000ff"
        review.background_color = "#e8f4fd"
        review.border_color     = "#2980b9"
        review.description      = "Peer review step"
        review.set_custom_property("assignee", "alice")
        review.set_custom_property("priority", "high")

        # Edges
        editor.connect(start,    review,   label="begin")
        editor.connect(review,   decision, label="submit",  line_style="dashed")
        editor.connect(decision, end,      label="yes",     target_arrow="block",
                       source_port=1, target_port=2)
        loop = editor.connect(decision, review, label="no", connector_type="curved",
                              source_arrow="classic")
        loop.add_path_point(300, 80)

        # Serialize and write to file
        json_str = editor.serialize()
        with open(OUTPUT_PATH, "w") as f:
            f.write(json_str)

        # Validate the written file against schema.json
        try:
            import jsonschema
        except ImportError:
            self.skipTest("jsonschema not installed — run: pip install jsonschema")

        with open(SCHEMA_PATH) as f:
            schema = json.load(f)

        with open(OUTPUT_PATH) as f:
            data = json.load(f)

        try:
            jsonschema.validate(instance=data, schema=schema)
        except jsonschema.ValidationError as e:
            self.fail(f"Schema validation failed: {e.message}")


if __name__ == "__main__":
    unittest.main()
