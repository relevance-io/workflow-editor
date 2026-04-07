// Package workfloweditor is a headless Go mirror of @relevance/workflow-editor.
// It produces and consumes JSON that passes schema.json validation.
//
// Requirements: Go 1.21+, no third-party dependencies for core functionality.
// Optional:     github.com/santhosh-tekuri/jsonschema/v6  (for Validate)
//
// Usage:
//
//	editor := workfloweditor.New()
//	editor.RegisterBuiltInNodes()
//
//	start, _ := editor.AddNode(workfloweditor.NewNode("RectangleNode", "Start"), nil, nil)
//	end,   _ := editor.AddNode(workfloweditor.NewNode("CircleNode",    "End"),   ptr(300.0), ptr(0.0))
//	editor.Connect(start, end, nil)
//
//	json, _ := editor.Serialize(true)
package workfloweditor

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"
)

func init() { rand.Seed(time.Now().UnixNano()) } //nolint:staticcheck

// ── Helpers ───────────────────────────────────────────────────────────────────

func randomID(prefix string) string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 10)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return prefix + string(b)
}

// Ptr returns a pointer to v. Useful for optional coordinate arguments.
func Ptr[T any](v T) *T { return &v }

// ── Config (mirrors src/config.ts) ────────────────────────────────────────────

const (
	ColorNodeBackground    = "#ffffff"
	ColorNodeBorder        = "#adb5bd"
	ColorLabel             = "#212529"
	ColorDescription       = "#6c757d"
	ColorEdgeLine          = "#495057"
	ColorEdgeLabel         = "#333333"
	FontSizePercentDefault = 100
	ImageDefaultWidth      = 32
	ImageDefaultHeight     = 32
)

// Built-in nodeClass names.
var builtinNodeClasses = map[string]bool{
	"RectangleNode": true, "SquareNode": true, "EllipseNode": true,
	"CircleNode": true, "DiamondNode": true, "TriangleNode": true,
	"HexagonNode": true, "PentagonNode": true, "OctagonNode": true,
}

// ── Enum types ────────────────────────────────────────────────────────────────

type ArrowMarker string

const (
	ArrowNone    ArrowMarker = "none"
	ArrowClassic ArrowMarker = "classic"
	ArrowBlock   ArrowMarker = "block"
)

type LineStyle string

const (
	LineSolid  LineStyle = "solid"
	LineDashed LineStyle = "dashed"
	LineDotted LineStyle = "dotted"
)

type ConnectorType string

const (
	ConnectorElbow    ConnectorType = "elbow"
	ConnectorStraight ConnectorType = "straight"
	ConnectorCurved   ConnectorType = "curved"
)

// ── Point ─────────────────────────────────────────────────────────────────────

// Point is a 2-D canvas coordinate, used for edge bend points.
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// ── NodeOptions ───────────────────────────────────────────────────────────────

// NodeOptions holds all built-in visual properties for a node.
// Mirrors the TS NodeOptions interface.
type NodeOptions struct {
	Label            string `json:"label"`
	LabelColor       string `json:"labelColor"`
	LabelFontSize    int    `json:"labelFontSize"`
	Description      string `json:"description"`
	DescriptionColor string `json:"descriptionColor"`
	BackgroundColor  string `json:"backgroundColor"`
	BorderColor      string `json:"borderColor"`
	BorderWidth      int    `json:"borderWidth"`
	ImageURL         string `json:"imageUrl"`
	ImageWidth       int    `json:"imageWidth"`
	ImageHeight      int    `json:"imageHeight"`
}

// DefaultNodeOptions returns a NodeOptions populated with config defaults.
func DefaultNodeOptions() NodeOptions {
	return NodeOptions{
		LabelColor:       ColorLabel,
		LabelFontSize:    FontSizePercentDefault,
		DescriptionColor: ColorDescription,
		BackgroundColor:  ColorNodeBackground,
		BorderColor:      ColorNodeBorder,
		BorderWidth:      2,
		ImageWidth:       ImageDefaultWidth,
		ImageHeight:      ImageDefaultHeight,
	}
}

// WithLabel returns a copy of opts with the label set.
func (opts NodeOptions) WithLabel(label string) NodeOptions {
	opts.Label = label
	return opts
}

// merge applies non-default fields from override on top of base.
func (base NodeOptions) merge(override NodeOptions) NodeOptions {
	d := DefaultNodeOptions()
	result := base
	if override.Label != d.Label                       { result.Label            = override.Label }
	if override.LabelColor != d.LabelColor             { result.LabelColor       = override.LabelColor }
	if override.LabelFontSize != d.LabelFontSize       { result.LabelFontSize    = override.LabelFontSize }
	if override.Description != d.Description           { result.Description      = override.Description }
	if override.DescriptionColor != d.DescriptionColor { result.DescriptionColor = override.DescriptionColor }
	if override.BackgroundColor != d.BackgroundColor   { result.BackgroundColor  = override.BackgroundColor }
	if override.BorderColor != d.BorderColor           { result.BorderColor      = override.BorderColor }
	if override.BorderWidth != d.BorderWidth           { result.BorderWidth      = override.BorderWidth }
	if override.ImageURL != d.ImageURL                 { result.ImageURL         = override.ImageURL }
	if override.ImageWidth != d.ImageWidth             { result.ImageWidth       = override.ImageWidth }
	if override.ImageHeight != d.ImageHeight           { result.ImageHeight      = override.ImageHeight }
	return result
}

// ── FieldDefinition ───────────────────────────────────────────────────────────

// FieldDefinition describes one entry in a custom node type's schema.
// serialize/deserialize/onChange are intentionally omitted — they are
// function values and must be re-registered after deserialization.
type FieldDefinition struct {
	Label        string            `json:"label,omitempty"`
	Type         string            `json:"type,omitempty"`
	DefaultValue any               `json:"default,omitempty"`
	Choices      map[string]string `json:"choices,omitempty"`
	Min          *float64          `json:"min,omitempty"`
	Max          *float64          `json:"max,omitempty"`
	Visible      *bool             `json:"visible,omitempty"`
	Readonly     *bool             `json:"readonly,omitempty"`
}

// ── DiagramNode ───────────────────────────────────────────────────────────────

// DiagramNode is a headless node. All visual properties are stored directly.
// Mirrors the public DiagramNode API.
type DiagramNode struct {
	id          string
	NodeClass   string
	Props       NodeOptions
	CustomProps map[string]any
	Schema      map[string]FieldDefinition
	X           *float64
	Y           *float64
}

// NewNode creates a DiagramNode with the given nodeClass and label.
func NewNode(nodeClass, label string) *DiagramNode {
	opts := DefaultNodeOptions().WithLabel(label)
	return newNodeFromOpts(nodeClass, opts)
}

// NewNodeFromOptions creates a DiagramNode from explicit NodeOptions.
func NewNodeFromOptions(nodeClass string, opts NodeOptions) *DiagramNode {
	return newNodeFromOpts(nodeClass, opts)
}

func newNodeFromOpts(nodeClass string, opts NodeOptions) *DiagramNode {
	return &DiagramNode{
		id:          randomID("node-"),
		NodeClass:   nodeClass,
		Props:       opts,
		CustomProps: make(map[string]any),
		Schema:      make(map[string]FieldDefinition),
	}
}

func (n *DiagramNode) ID() string { return n.id }

// GetCustomProperty returns a custom property value by key.
func (n *DiagramNode) GetCustomProperty(key string) any {
	return n.CustomProps[key]
}

// SetCustomProperty sets a custom property value by key.
func (n *DiagramNode) SetCustomProperty(key string, value any) {
	n.CustomProps[key] = value
}

// GetSchema returns the custom property schema.
func (n *DiagramNode) GetSchema() map[string]FieldDefinition {
	return n.Schema
}

func (n *DiagramNode) String() string {
	return fmt.Sprintf("<DiagramNode id=%s nodeClass=%s label=%q>", n.id, n.NodeClass, n.Props.Label)
}

// serializedNode is the wire format for a node — matches schema.json exactly.
type serializedNode struct {
	ID          string         `json:"id"`
	NodeClass   string         `json:"nodeClass"`
	X           *float64       `json:"x,omitempty"`
	Y           *float64       `json:"y,omitempty"`
	Props       NodeOptions    `json:"props"`
	CustomProps map[string]any `json:"customProps"`
}

func (n *DiagramNode) toSerialized() serializedNode {
	cp := make(map[string]any, len(n.CustomProps))
	for k, v := range n.CustomProps {
		cp[k] = v
	}
	return serializedNode{
		ID:          n.id,
		NodeClass:   n.NodeClass,
		X:           n.X,
		Y:           n.Y,
		Props:       n.Props,
		CustomProps: cp,
	}
}

// ── EdgeOptions ───────────────────────────────────────────────────────────────

// EdgeOptions carries all optional fields for Connect().
// Unset fields fall back to their defaults (mirrors JS optional params).
type EdgeOptions struct {
	Label         string
	LabelColor    string
	LabelFontSize int
	LineColor     string
	LineWidth     int
	LineStyle     LineStyle
	SourceArrow   ArrowMarker
	TargetArrow   ArrowMarker
	ConnectorType ConnectorType
	Description   string
	SourcePort    *int
	TargetPort    *int
}

// DefaultEdgeOptions returns an EdgeOptions populated with config defaults.
func DefaultEdgeOptions() EdgeOptions {
	return EdgeOptions{
		LabelColor:    ColorEdgeLabel,
		LabelFontSize: FontSizePercentDefault,
		LineColor:     ColorEdgeLine,
		LineWidth:     2,
		LineStyle:     LineSolid,
		SourceArrow:   ArrowNone,
		TargetArrow:   ArrowClassic,
		ConnectorType: ConnectorElbow,
	}
}

// ── Edge ──────────────────────────────────────────────────────────────────────

// Edge is a connection between two DiagramNodes.
// Mirrors the public Edge API.
type Edge struct {
	id            string
	Source        *DiagramNode
	Target        *DiagramNode
	Label         string
	LabelColor    string
	LabelFontSize int
	LineColor     string
	LineWidth     int
	LineStyle     LineStyle
	SourceArrow   ArrowMarker
	TargetArrow   ArrowMarker
	ConnectorType ConnectorType
	Description   string
	SourcePort    *int
	TargetPort    *int
	vertices      []Point
}

func newEdge(source, target *DiagramNode, opts EdgeOptions) *Edge {
	return &Edge{
		id:            randomID("edge-"),
		Source:        source,
		Target:        target,
		Label:         opts.Label,
		LabelColor:    opts.LabelColor,
		LabelFontSize: opts.LabelFontSize,
		LineColor:     opts.LineColor,
		LineWidth:     opts.LineWidth,
		LineStyle:     opts.LineStyle,
		SourceArrow:   opts.SourceArrow,
		TargetArrow:   opts.TargetArrow,
		ConnectorType: opts.ConnectorType,
		Description:   opts.Description,
		SourcePort:    opts.SourcePort,
		TargetPort:    opts.TargetPort,
	}
}

func (e *Edge) ID() string { return e.id }

// AddPathPoint appends a bend point to the edge path.
// Mirrors addPathPoint(x, y).
func (e *Edge) AddPathPoint(x, y float64) Point {
	pt := Point{X: x, Y: y}
	e.vertices = append(e.vertices, pt)
	return pt
}

// GetPathPoints returns all bend points on the edge path.
func (e *Edge) GetPathPoints() []Point {
	result := make([]Point, len(e.vertices))
	copy(result, e.vertices)
	return result
}

func (e *Edge) String() string {
	return fmt.Sprintf("<Edge id=%s %q → %q>", e.id, e.Source.Props.Label, e.Target.Props.Label)
}

// serializedEdge is the wire format — matches schema.json exactly.
type serializedEdge struct {
	SourceID      string        `json:"sourceId"`
	TargetID      string        `json:"targetId"`
	SourcePort    *int          `json:"sourcePort"`
	TargetPort    *int          `json:"targetPort"`
	Label         string        `json:"label"`
	LabelColor    string        `json:"labelColor"`
	LabelFontSize int           `json:"labelFontSize"`
	LineColor     string        `json:"lineColor"`
	LineWidth     int           `json:"lineWidth"`
	LineStyle     LineStyle     `json:"lineStyle"`
	SourceArrow   ArrowMarker   `json:"sourceArrow"`
	TargetArrow   ArrowMarker   `json:"targetArrow"`
	ConnectorType ConnectorType `json:"connectorType"`
	Description   string        `json:"description"`
	Vertices      []Point       `json:"vertices"`
}

func (e *Edge) toSerialized() serializedEdge {
	verts := make([]Point, len(e.vertices))
	copy(verts, e.vertices)
	return serializedEdge{
		SourceID:      e.Source.id,
		TargetID:      e.Target.id,
		SourcePort:    e.SourcePort,
		TargetPort:    e.TargetPort,
		Label:         e.Label,
		LabelColor:    e.LabelColor,
		LabelFontSize: e.LabelFontSize,
		LineColor:     e.LineColor,
		LineWidth:     e.LineWidth,
		LineStyle:     e.LineStyle,
		SourceArrow:   e.SourceArrow,
		TargetArrow:   e.TargetArrow,
		ConnectorType: e.ConnectorType,
		Description:   e.Description,
		Vertices:      verts,
	}
}

// ── NodeTypeDefinition ────────────────────────────────────────────────────────

// NodeTypeDefinition holds metadata for a custom node type.
// Mirrors DiagramNode.define() in JS.
type NodeTypeDefinition struct {
	NodeClass      string
	BaseClass      string
	DefaultOptions NodeOptions
	Schema         map[string]FieldDefinition
	Name           string
	VisibleProps   []string
	EditProp       string
}

// Instantiate creates a new DiagramNode for this custom type, merging
// defaultOptions with callerOpts and seeding customProps from schema defaults.
func (def *NodeTypeDefinition) Instantiate(callerOpts *NodeOptions) *DiagramNode {
	resolved := def.DefaultOptions
	if callerOpts != nil {
		resolved = resolved.merge(*callerOpts)
	}

	node := newNodeFromOpts(def.NodeClass, resolved)
	schemaCopy := make(map[string]FieldDefinition, len(def.Schema))
	for k, v := range def.Schema {
		schemaCopy[k] = v
		if v.DefaultValue != nil {
			node.CustomProps[k] = v.DefaultValue
		}
	}
	node.Schema = schemaCopy
	return node
}

// InstantiateWithLabel is a convenience wrapper around Instantiate.
func (def *NodeTypeDefinition) InstantiateWithLabel(label string) *DiagramNode {
	opts := DefaultNodeOptions().WithLabel(label)
	return def.Instantiate(&opts)
}

// serializedNodeType is the wire format for SerializedNodeType.
// Built-in types encode as plain JSON strings; custom types as objects.
// We use a custom MarshalJSON / UnmarshalJSON on the wrapper below.
type serializedNodeTypeEntry struct {
	isBuiltin bool
	builtin   string
	custom    *serializedCustomNodeType
}

type serializedCustomNodeType struct {
	NodeClass      string                     `json:"nodeClass"`
	Name           string                     `json:"name,omitempty"`
	BaseClass      string                     `json:"baseClass"`
	DefaultOptions NodeOptions                `json:"defaultOptions"`
	Schema         map[string]FieldDefinition `json:"schema"`
	VisibleProps   []string                   `json:"visibleProps,omitempty"`
	EditProp       string                     `json:"editProp,omitempty"`
}

func (e serializedNodeTypeEntry) MarshalJSON() ([]byte, error) {
	if e.isBuiltin {
		return json.Marshal(e.builtin)
	}
	return json.Marshal(e.custom)
}

func (e *serializedNodeTypeEntry) UnmarshalJSON(data []byte) error {
	// Detect whether this entry is a plain string (built-in) or object (custom).
	if len(data) > 0 && data[0] == '"' {
		return json.Unmarshal(data, &e.builtin)
	}
	e.isBuiltin = false
	e.custom = &serializedCustomNodeType{}
	return json.Unmarshal(data, e.custom)
}

// ── serializedDiagram — the top-level wire type ───────────────────────────────

type serializedDiagram struct {
	Nodes     []serializedNode          `json:"nodes"`
	Edges     []serializedEdge          `json:"edges"`
	NodeTypes []serializedNodeTypeEntry `json:"nodeTypes,omitempty"`
}

// ── DiagramEditor ─────────────────────────────────────────────────────────────

// registeredEntry is either a built-in nodeClass string or a custom definition.
type registeredEntry struct {
	isBuiltin  bool
	nodeClass  string
	definition *NodeTypeDefinition
}

// DiagramEditor is the headless diagram controller.
// Mirrors the public DiagramEditor API (headless mode).
type DiagramEditor struct {
	// nodeOrder preserves insertion order for deterministic serialization.
	nodeOrder []string
	nodes     map[string]*DiagramNode
	edges     []*Edge
	// registeredTypes maps nodeClass → registeredEntry.
	registeredTypes map[string]registeredEntry
	// typeOrder preserves registration order for serializeTypes().
	typeOrder []string
}

// New creates an empty DiagramEditor.
func New() *DiagramEditor {
	return &DiagramEditor{
		nodes:           make(map[string]*DiagramNode),
		registeredTypes: make(map[string]registeredEntry),
	}
}

// ── Node type registration ────────────────────────────────────────────────────

// RegisterBuiltInNodes registers all nine built-in shapes.
// Mirrors registerBuiltInNodes().
func (ed *DiagramEditor) RegisterBuiltInNodes() *DiagramEditor {
	for nc := range builtinNodeClasses {
		ed.registerBuiltin(nc)
	}
	return ed
}

func (ed *DiagramEditor) registerBuiltin(nodeClass string) {
	if _, exists := ed.registeredTypes[nodeClass]; !exists {
		ed.typeOrder = append(ed.typeOrder, nodeClass)
	}
	ed.registeredTypes[nodeClass] = registeredEntry{isBuiltin: true, nodeClass: nodeClass}
}

// RegisterCustomNodeType registers a custom node type definition.
// Mirrors registerNodeType(label, NodeClass) + DiagramNode.define().
func (ed *DiagramEditor) RegisterCustomNodeType(def *NodeTypeDefinition) *DiagramEditor {
	if _, exists := ed.registeredTypes[def.NodeClass]; !exists {
		ed.typeOrder = append(ed.typeOrder, def.NodeClass)
	}
	ed.registeredTypes[def.NodeClass] = registeredEntry{isBuiltin: false, definition: def}
	return ed
}

// ClearRegisteredNodes removes all registered node types.
func (ed *DiagramEditor) ClearRegisteredNodes() *DiagramEditor {
	ed.registeredTypes = make(map[string]registeredEntry)
	ed.typeOrder = nil
	return ed
}

// ── Node management ───────────────────────────────────────────────────────────

// AddNode adds a node with optional canvas coordinates.
// Mirrors addNode(node, x?, y?).
// Returns the node and an error (always nil, kept for idiomatic Go).
func (ed *DiagramEditor) AddNode(node *DiagramNode, x, y *float64) (*DiagramNode, error) {
	node.X = x
	node.Y = y
	ed.nodeOrder = append(ed.nodeOrder, node.id)
	ed.nodes[node.id] = node
	return node, nil
}

// RemoveNode removes a node and all edges connected to it.
// Mirrors removeNode(node).
func (ed *DiagramEditor) RemoveNode(node *DiagramNode) {
	delete(ed.nodes, node.id)
	ed.nodeOrder = filterStrings(ed.nodeOrder, func(id string) bool { return id != node.id })
	ed.edges = filterEdges(ed.edges, func(e *Edge) bool {
		return e.Source != node && e.Target != node
	})
}

// GetNodes returns all nodes in insertion order.
func (ed *DiagramEditor) GetNodes() []*DiagramNode {
	result := make([]*DiagramNode, 0, len(ed.nodeOrder))
	for _, id := range ed.nodeOrder {
		if n, ok := ed.nodes[id]; ok {
			result = append(result, n)
		}
	}
	return result
}

// ── Edge management ───────────────────────────────────────────────────────────

// Connect creates an edge between source and target.
// Pass nil for opts to use all defaults.
// Mirrors the JS connect / addEdge mechanism.
func (ed *DiagramEditor) Connect(source, target *DiagramNode, opts *EdgeOptions) *Edge {
	resolved := DefaultEdgeOptions()
	if opts != nil {
		resolved = applyEdgeOptions(resolved, *opts)
	}
	edge := newEdge(source, target, resolved)
	ed.edges = append(ed.edges, edge)
	return edge
}

// applyEdgeOptions overlays non-zero fields from override onto base.
func applyEdgeOptions(base, override EdgeOptions) EdgeOptions {
	d := DefaultEdgeOptions()
	if override.Label != d.Label                 { base.Label         = override.Label }
	if override.LabelColor != d.LabelColor       { base.LabelColor    = override.LabelColor }
	if override.LabelFontSize != d.LabelFontSize { base.LabelFontSize = override.LabelFontSize }
	if override.LineColor != d.LineColor         { base.LineColor     = override.LineColor }
	if override.LineWidth != d.LineWidth         { base.LineWidth     = override.LineWidth }
	if override.LineStyle != d.LineStyle         { base.LineStyle     = override.LineStyle }
	if override.SourceArrow != d.SourceArrow     { base.SourceArrow   = override.SourceArrow }
	if override.TargetArrow != d.TargetArrow     { base.TargetArrow   = override.TargetArrow }
	if override.ConnectorType != d.ConnectorType { base.ConnectorType = override.ConnectorType }
	if override.Description != d.Description     { base.Description   = override.Description }
	if override.SourcePort != nil                { base.SourcePort    = override.SourcePort }
	if override.TargetPort != nil                { base.TargetPort    = override.TargetPort }
	return base
}

// RemoveEdge removes a specific edge.
func (ed *DiagramEditor) RemoveEdge(edge *Edge) {
	ed.edges = filterEdges(ed.edges, func(e *Edge) bool { return e != edge })
}

// GetEdges returns all edges.
func (ed *DiagramEditor) GetEdges() []*Edge {
	result := make([]*Edge, len(ed.edges))
	copy(result, ed.edges)
	return result
}

// Clear removes all nodes and edges. Mirrors clear().
func (ed *DiagramEditor) Clear() *DiagramEditor {
	ed.nodes = make(map[string]*DiagramNode)
	ed.nodeOrder = nil
	ed.edges = nil
	return ed
}

// ── Serialisation ─────────────────────────────────────────────────────────────

// SerializeNodes returns the nodes and edges wire structs without type definitions.
// Mirrors serializeNodes().
func (ed *DiagramEditor) SerializeNodes() (nodes []serializedNode, edges []serializedEdge) {
	for _, id := range ed.nodeOrder {
		if n, ok := ed.nodes[id]; ok {
			nodes = append(nodes, n.toSerialized())
		}
	}
	for _, e := range ed.edges {
		edges = append(edges, e.toSerialized())
	}
	return nodes, edges
}

// SerializeTypes returns the registered node type descriptors.
// Built-in types → plain string entries. Custom → full objects.
// Mirrors serializeTypes().
func (ed *DiagramEditor) SerializeTypes() []serializedNodeTypeEntry {
	entries := make([]serializedNodeTypeEntry, 0, len(ed.typeOrder))
	for _, nc := range ed.typeOrder {
		entry, ok := ed.registeredTypes[nc]
		if !ok {
			continue
		}
		if entry.isBuiltin {
			entries = append(entries, serializedNodeTypeEntry{isBuiltin: true, builtin: nc})
		} else {
			def := entry.definition
			safeSchema := make(map[string]FieldDefinition, len(def.Schema))
			for k, fd := range def.Schema {
				safeSchema[k] = fd
			}
			entries = append(entries, serializedNodeTypeEntry{
				isBuiltin: false,
				custom: &serializedCustomNodeType{
					NodeClass:      def.NodeClass,
					Name:           def.Name,
					BaseClass:      def.BaseClass,
					DefaultOptions: def.DefaultOptions,
					Schema:         safeSchema,
					VisibleProps:   def.VisibleProps,
					EditProp:       def.EditProp,
				},
			})
		}
	}
	return entries
}

// Serialize encodes the diagram to a JSON string.
// Mirrors serialize(includeTypes?).
func (ed *DiagramEditor) Serialize(includeTypes bool) (string, error) {
	nodes, edges := ed.SerializeNodes()
	if nodes == nil {
		nodes = []serializedNode{}
	}
	if edges == nil {
		edges = []serializedEdge{}
	}

	diagram := serializedDiagram{Nodes: nodes, Edges: edges}
	if includeTypes {
		diagram.NodeTypes = ed.SerializeTypes()
	}

	data, err := json.MarshalIndent(diagram, "", "  ")
	if err != nil {
		return "", fmt.Errorf("serialize: %w", err)
	}
	return string(data), nil
}

// Deserialize restores a diagram from a JSON string.
// Re-registers any custom node types found in the data.
// Mirrors deserialize(json).
func (ed *DiagramEditor) Deserialize(jsonStr string) error {
	var raw serializedDiagram
	if err := json.Unmarshal([]byte(jsonStr), &raw); err != nil {
		return fmt.Errorf("deserialize: failed to parse JSON: %w", err)
	}

	ed.Clear()

	// ── Re-register node types ────────────────────────────────────────────────
	for _, entry := range raw.NodeTypes {
		if entry.isBuiltin {
			nc := entry.builtin
			if builtinNodeClasses[nc] {
				ed.registerBuiltin(nc)
			}
		} else {
			ct := entry.custom
			if _, exists := ed.registeredTypes[ct.NodeClass]; exists {
				continue
			}
			if !builtinNodeClasses[ct.BaseClass] {
				if _, known := ed.registeredTypes[ct.BaseClass]; !known {
					return fmt.Errorf("deserialize: unknown base class %q for type %q", ct.BaseClass, ct.NodeClass)
				}
			}
			def := &NodeTypeDefinition{
				NodeClass:      ct.NodeClass,
				BaseClass:      ct.BaseClass,
				DefaultOptions: ct.DefaultOptions,
				Schema:         ct.Schema,
				Name:           ct.Name,
				VisibleProps:   ct.VisibleProps,
				EditProp:       ct.EditProp,
			}
			ed.RegisterCustomNodeType(def)
		}
	}

	// ── Restore nodes ─────────────────────────────────────────────────────────
	idMap := make(map[string]*DiagramNode, len(raw.Nodes))

	for _, sn := range raw.Nodes {
		var node *DiagramNode

		entry, registered := ed.registeredTypes[sn.NodeClass]
		switch {
		case registered && !entry.isBuiltin:
			node = entry.definition.Instantiate(&sn.Props)
		case builtinNodeClasses[sn.NodeClass]:
			node = newNodeFromOpts(sn.NodeClass, sn.Props)
		default:
			node = newNodeFromOpts(sn.NodeClass, sn.Props)
		}

		// Overwrite the auto-generated id with the persisted value.
		node.id = sn.ID
		node.X = sn.X
		node.Y = sn.Y

		if sn.CustomProps != nil {
			for k, v := range sn.CustomProps {
				node.CustomProps[k] = v
			}
		}

		ed.nodeOrder = append(ed.nodeOrder, node.id)
		ed.nodes[node.id] = node
		idMap[node.id] = node
	}

	// ── Restore edges ─────────────────────────────────────────────────────────
	for _, se := range raw.Edges {
		source, srcOK := idMap[se.SourceID]
		target, tgtOK := idMap[se.TargetID]
		if !srcOK {
			return fmt.Errorf("deserialize: edge references unknown sourceId %q", se.SourceID)
		}
		if !tgtOK {
			return fmt.Errorf("deserialize: edge references unknown targetId %q", se.TargetID)
		}

		edge := &Edge{
			id:            randomID("edge-"),
			Source:        source,
			Target:        target,
			Label:         se.Label,
			LabelColor:    se.LabelColor,
			LabelFontSize: se.LabelFontSize,
			LineColor:     se.LineColor,
			LineWidth:     se.LineWidth,
			LineStyle:     se.LineStyle,
			SourceArrow:   se.SourceArrow,
			TargetArrow:   se.TargetArrow,
			ConnectorType: se.ConnectorType,
			Description:   se.Description,
			SourcePort:    se.SourcePort,
			TargetPort:    se.TargetPort,
			vertices:      se.Vertices,
		}

		ed.edges = append(ed.edges, edge)
	}

	return nil
}

// ── File I/O ──────────────────────────────────────────────────────────────────

// ExportToFile writes the serialized diagram to a file at path.
func (ed *DiagramEditor) ExportToFile(path string, includeTypes bool) error {
	data, err := ed.Serialize(includeTypes)
	if err != nil {
		return err
	}
	return os.WriteFile(path, []byte(data), 0o644)
}

// ImportFromFile loads and deserializes a diagram from a file at path.
func (ed *DiagramEditor) ImportFromFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("importFromFile: %w", err)
	}
	return ed.Deserialize(string(data))
}

// ── Schema validation ─────────────────────────────────────────────────────────

// Validate validates the serialized diagram against schema.json.
// Requires: github.com/santhosh-tekuri/jsonschema/v6
//
// To keep this file dependency-free, validation is invoked via a pluggable
// ValidatorFunc. Wire in the real validator at startup:
//
//	workfloweditor.RegisterValidator(func(schemaPath, jsonData string) error {
//	    compiler := jsonschema.NewCompiler()
//	    schema, _  := compiler.Compile(schemaPath)
//	    var v any
//	    json.Unmarshal([]byte(jsonData), &v)
//	    return schema.Validate(v)
//	})
var globalValidator func(schemaPath, jsonData string) error

// RegisterValidator sets the validation backend used by Validate().
func RegisterValidator(fn func(schemaPath, jsonData string) error) {
	globalValidator = fn
}

// Validate validates the current diagram against the given schema file.
func (ed *DiagramEditor) Validate(schemaPath string) error {
	if globalValidator == nil {
		return fmt.Errorf(
			"no validator registered — call workfloweditor.RegisterValidator() first.\n" +
				"See: github.com/santhosh-tekuri/jsonschema/v6",
		)
	}
	data, err := ed.Serialize(true)
	if err != nil {
		return err
	}
	if err := globalValidator(schemaPath, data); err != nil {
		return fmt.Errorf("schema validation failed: %w", err)
	}
	return nil
}

func (ed *DiagramEditor) String() string {
	return fmt.Sprintf("<DiagramEditor nodes=%d edges=%d>", len(ed.nodes), len(ed.edges))
}

// ── Internal slice helpers ────────────────────────────────────────────────────

func filterStrings(ss []string, keep func(string) bool) []string {
	result := ss[:0:0]
	for _, s := range ss {
		if keep(s) {
			result = append(result, s)
		}
	}
	return result
}

func filterEdges(es []*Edge, keep func(*Edge) bool) []*Edge {
	result := es[:0:0]
	for _, e := range es {
		if keep(e) {
			result = append(result, e)
		}
	}
	return result
}

// ── Demo / smoke-test (main) ──────────────────────────────────────────────────

func main() {
	editor := New()
	editor.RegisterBuiltInNodes()

	// Define a custom node type
	taskDef := &NodeTypeDefinition{
		NodeClass:      "TaskNode",
		BaseClass:      "RectangleNode",
		DefaultOptions: DefaultNodeOptions().WithLabel("New Task"),
		Schema: map[string]FieldDefinition{
			"assignee": {Label: "Assignee", Type: "text",    DefaultValue: ""},
			"done":     {Label: "Done",     Type: "boolean", DefaultValue: false},
			"priority": {
				Label:        "Priority",
				Type:         "choice",
				DefaultValue: "medium",
				Choices:      map[string]string{"low": "Low", "medium": "Medium", "high": "High"},
			},
		},
		Name: "Task",
	}
	editor.RegisterCustomNodeType(taskDef)

	// Build the diagram
	opts := DefaultNodeOptions()
	opts.BackgroundColor = "#f0f8ff"

	start, _  := editor.AddNode(NewNode("RectangleNode", "Start"),              Ptr(0.0),   Ptr(0.0))
	review, _ := editor.AddNode(taskDef.InstantiateWithLabel("Code Review"),    Ptr(200.0), Ptr(0.0))
	done, _   := editor.AddNode(NewNode("DiamondNode", "Done?"),                Ptr(400.0), Ptr(0.0))
	end, _    := editor.AddNode(NewNode("CircleNode", "End"),                   Ptr(600.0), Ptr(0.0))

	review.SetCustomProperty("assignee", "alice")
	review.SetCustomProperty("priority", "high")

	editor.Connect(start,  review, &EdgeOptions{Label: "begin"})
	editor.Connect(review, done,   &EdgeOptions{Label: "submit", LineStyle: LineDashed})
	editor.Connect(done,   end,    &EdgeOptions{Label: "yes",    TargetArrow: ArrowBlock})

	loopEdge := editor.Connect(done, review, &EdgeOptions{
		Label:         "no",
		ConnectorType: ConnectorCurved,
		SourceArrow:   ArrowClassic,
	})
	loopEdge.AddPathPoint(400, 80)

	jsonStr, err := editor.Serialize(true)
	if err != nil {
		panic(err)
	}

	fmt.Println("── Serialized (first 600 chars) ─────────────────")
	cut := jsonStr
	if len(cut) > 600 {
		cut = cut[:600] + "..."
	}
	fmt.Println(cut)

	// Round-trip
	editor2 := New()
	if err := editor2.Deserialize(jsonStr); err != nil {
		panic(err)
	}
	fmt.Println("\n── Round-trip ───────────────────────────────────")
	for _, n := range editor2.GetNodes() {
		fmt.Println(" ", n)
	}
	for _, e := range editor2.GetEdges() {
		fmt.Println(" ", e)
	}

	// File export / import
	tmpPath := os.TempDir() + "/diagram.json"
	if err := editor.ExportToFile(tmpPath, true); err != nil {
		panic(err)
	}
	editor3 := New()
	if err := editor3.ImportFromFile(tmpPath); err != nil {
		panic(err)
	}
	fmt.Printf("\n── Imported from file ───────────────────────────\n%s\n", editor3)

	// Schema validation (plug in a validator to enable)
	if err := editor.Validate("schema.json"); err != nil {
		prefix := "no validator registered"
		if strings.HasPrefix(err.Error(), prefix) {
			fmt.Println("\n(Skipping validation: no validator registered)")
		} else {
			fmt.Println("\nValidation error:", err)
		}
	}
}
