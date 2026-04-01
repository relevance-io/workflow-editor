### Bug fixes

* Paste on mouse pointer
* Center to shape on duplication
* Fix vertices on imports
* Center or fit to size on import
* Fix description and label padding

### Phase 1: Core Consolidation (High Priority)
* **Unified Add/Render:** Complete the transition of all creation paths to `addNode()` and `addEdge()`. Ensure `deserialize()` and `render()` have no unique creation logic.
* **Type Registry:** Replace `any` casts and `__nodeName` constructor strings with a central `TypeRegistry` map to manage node definitions and schemas.
* **Single Source of Truth:** Remove private backing fields (e.g., `_label`, `_color`, `_x`, `_y`) from `DiagramNode` and `Edge`. Use the underlying JointJS `cell.attr()` or `cell.get()` directly in getters and setters.
* **Virtual Cell for Headless State:** Initialize a JointJS cell in the constructor immediately. This allows coordinate logic to target the cell's position even if it isn't attached to a graph, eliminating `_headlessX/Y` branching.

### Phase 2: Logic Deduplication
* **Attribute Synchronization Helper:** Implement a private `_syncAttribute(key, value)` method in base classes to handle the "update model + update UI" flow in one place.
* **Shape Factory:** Move repetitive `_buildRectangleCell`, `_buildEllipseCell`, etc., implementations into a single factory or the `DiagramNode` base class using `_getShapeType()`.
* **Port Geometry Math:** Move shape-specific port coordinate math (e.g., polygon vertex calculation) from the global `_attachPortsToCell` into a `getPortDefinitions()` method that subclasses can override.

### Phase 3: Architectural Cleanup
* **State Pattern for Editor Modes:** Refactor the massive `switch(this.mode)` blocks in pointer event handlers into separate Strategy objects (e.g., `SelectMode`, `LinkMode`, `PanMode`).
* **Centralized Coordinate Mapping:** Create a `_toPaperCoords(e: MouseEvent | Touch)` helper to handle all screen-to-canvas transformations, ensuring zoom/pan offsets are applied consistently.
* **Geometry Utilities:** Extract pure math functions (distance, midpoints, "is point in polygon") into a standalone `GeometryUtils` class to make them unit-testable without a DOM.
* **Style & SVG Decoupling:** Move hardcoded SVG selectors (e.g., `.joint-port-body`, `.connection`) into a `STYLE_CONFIG` constant to isolate JointJS-specific implementation details.

### Phase 4: Error Handling & Safety
* **Connection Validation:** Extract the "can these two nodes connect" logic into a standalone `validateConnection(source, target)` function used by both the UI and programmatic `addEdge()` calls.
* **Pre-flight Deserialization:** Implement a validation pass to check JSON integrity and type existence before starting the render process to prevent partial or corrupted diagram states.
* **Event Relay:** Replace manual string arrays for event bubbling in constructors with a centralized `_setupEventRelay()` method.

