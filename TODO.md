# Workflow Editor Technical Audit & Roadmap

- **Memory & Lifecycle**
    - Implement `DiagramEditor.destroy()` to remove window listeners for mousemove, mouseup, and keydown
    - Call `graph.clear()` and `paper.remove()` within the destroy method to release JointJS resources
    - Manually clear `nodes` and `edges` Maps to ensure garbage collection
    - Update `workflow-editor.component.ts` `ngOnDestroy` to invoke the editor destroy logic
    - Ensure `removeNode(id)` explicitly calls `node.jointElement.remove()` before Map deletion

- **Performance & Scaling**
    - Wrap `paper.translate` logic in `requestAnimationFrame` to sync panning with display refresh rates
    - Add a `batchUpdate` method using `graph.startBatch` and `graph.stopBatch` to prevent DOM thrashing
    - Replace the O(N) scan in `getPointOnCircle` with a grid-based spatial hash for better scaling
    - Aggregate multiple attribute updates in `updateJointElement` into a single `.attr()` call

- **UX & Robustness**
    - Incorporate current `paper.scale` into `touchmove` distance math to fix pinch-to-zoom jumping
    - Add a validation layer in the `deserialize` method to handle `UnknownNodeTypeError` or invalid JSON
    - Offset auto-port switching coordinates by `borderWidth` so edges align with the shape stroke
    - Move static `schema` and `defaults` to a standalone `TypeRegistry` to prevent prototype pollution

- **Maintenance**
    - Replace remaining `any` types in JointJS event callbacks with specific internal interfaces
    - Validate that all `MARKERS` SVG path strings are correctly closed with `z` for cross-browser rendering
