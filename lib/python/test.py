from relevanceio.workflow_editor import *

d = DiagramEditor()
d.register_builtin_nodes()
a = d.add_node(RectangleNode({ 'label': 'Rect' }))
b = d.add_node(EllipseNode({ 'label': 'Ellipse' }))
a.connect_to(b)
c = d.add_node(CircleNode({ 'label': 'Circle' }))
a.connect_to(c)
b.remove()

print(d.serialize())
