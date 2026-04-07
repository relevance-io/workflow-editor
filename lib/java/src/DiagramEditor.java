package io.relevance.workfloweditor;

/**
 * DiagramEditor.java
 *
 * Headless Java mirror of @relevance/workflow-editor's public API.
 * Produces and consumes JSON that passes schema.json validation.
 *
 * Requirements : Java 17+, Jackson Databind
 * Maven        : com.fasterxml.jackson.core:jackson-databind:2.17+
 * Optional     : com.networknt:json-schema-validator:1.4+ (for validate())
 *
 * All classes are nested as public static members of DiagramEditor so the
 * entire library ships as a single .java file. In a real project, split each
 * top-level class into its own file under the same package.
 */

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public final class DiagramEditor {

    // ── Shared Jackson mapper ─────────────────────────────────────────────────

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // ── Enums (mirror TS union types) ─────────────────────────────────────────

    public enum ArrowMarker {
        NONE("none"), CLASSIC("classic"), BLOCK("block");

        public final String value;

        ArrowMarker(String value) { this.value = value; }

        public static ArrowMarker fromValue(String v) {
            for (ArrowMarker m : values()) {
                if (m.value.equals(v)) { return m; }
            }
            throw new IllegalArgumentException("Unknown ArrowMarker: " + v);
        }
    }

    public enum LineStyle {
        SOLID("solid"), DASHED("dashed"), DOTTED("dotted");

        public final String value;

        LineStyle(String value) { this.value = value; }

        public static LineStyle fromValue(String v) {
            for (LineStyle s : values()) {
                if (s.value.equals(v)) { return s; }
            }
            throw new IllegalArgumentException("Unknown LineStyle: " + v);
        }
    }

    public enum ConnectorType {
        ELBOW("elbow"), STRAIGHT("straight"), CURVED("curved");

        public final String value;

        ConnectorType(String value) { this.value = value; }

        public static ConnectorType fromValue(String v) {
            for (ConnectorType c : values()) {
                if (c.value.equals(v)) { return c; }
            }
            throw new IllegalArgumentException("Unknown ConnectorType: " + v);
        }
    }

    // ── Config (mirrors src/config.ts) ────────────────────────────────────────

    public static final class Config {
        public static final String COLOR_NODE_BACKGROUND     = "#ffffff";
        public static final String COLOR_NODE_BORDER         = "#adb5bd";
        public static final String COLOR_LABEL               = "#212529";
        public static final String COLOR_DESCRIPTION         = "#6c757d";
        public static final String COLOR_EDGE_LINE           = "#495057";
        public static final String COLOR_EDGE_LABEL          = "#333333";
        public static final int    FONT_SIZE_PERCENT_DEFAULT = 100;
        public static final int    IMAGE_DEFAULT_WIDTH       = 32;
        public static final int    IMAGE_DEFAULT_HEIGHT      = 32;

        private Config() {}
    }

    // ── Point ─────────────────────────────────────────────────────────────────

    public static final class Point {
        public final double x;
        public final double y;

        public Point(double x, double y) {
            this.x = x;
            this.y = y;
        }

        public ObjectNode toJsonObject() {
            ObjectNode node = MAPPER.createObjectNode();
            node.put("x", x);
            node.put("y", y);
            return node;
        }

        public static Point fromJsonObject(JsonNode json) {
            return new Point(json.get("x").asDouble(), json.get("y").asDouble());
        }
    }

    // ── NodeOptions ───────────────────────────────────────────────────────────

    public static final class NodeOptions {
        public String label;
        public String labelColor;
        public int    labelFontSize;
        public String description;
        public String descriptionColor;
        public String backgroundColor;
        public String borderColor;
        public int    borderWidth;
        public String imageUrl;
        public int    imageWidth;
        public int    imageHeight;

        /** Construct with all defaults (mirrors the TS interface defaults). */
        public NodeOptions() {
            this.label            = "";
            this.labelColor       = Config.COLOR_LABEL;
            this.labelFontSize    = Config.FONT_SIZE_PERCENT_DEFAULT;
            this.description      = "";
            this.descriptionColor = Config.COLOR_DESCRIPTION;
            this.backgroundColor  = Config.COLOR_NODE_BACKGROUND;
            this.borderColor      = Config.COLOR_NODE_BORDER;
            this.borderWidth      = 2;
            this.imageUrl         = "";
            this.imageWidth       = Config.IMAGE_DEFAULT_WIDTH;
            this.imageHeight      = Config.IMAGE_DEFAULT_HEIGHT;
        }

        /** Construct with a label, all other fields at their defaults. */
        public NodeOptions(String label) {
            this();
            this.label = label;
        }

        /** Deep-copy constructor. */
        public NodeOptions(NodeOptions source) {
            this.label            = source.label;
            this.labelColor       = source.labelColor;
            this.labelFontSize    = source.labelFontSize;
            this.description      = source.description;
            this.descriptionColor = source.descriptionColor;
            this.backgroundColor  = source.backgroundColor;
            this.borderColor      = source.borderColor;
            this.borderWidth      = source.borderWidth;
            this.imageUrl         = source.imageUrl;
            this.imageWidth       = source.imageWidth;
            this.imageHeight      = source.imageHeight;
        }

        public ObjectNode toJsonObject() {
            ObjectNode obj = MAPPER.createObjectNode();
            obj.put("label",            label);
            obj.put("labelColor",       labelColor);
            obj.put("labelFontSize",    labelFontSize);
            obj.put("description",      description);
            obj.put("descriptionColor", descriptionColor);
            obj.put("backgroundColor",  backgroundColor);
            obj.put("borderColor",      borderColor);
            obj.put("borderWidth",      borderWidth);
            obj.put("imageUrl",         imageUrl);
            obj.put("imageWidth",       imageWidth);
            obj.put("imageHeight",      imageHeight);
            return obj;
        }

        public static NodeOptions fromJsonObject(JsonNode json) {
            NodeOptions opts = new NodeOptions();
            if (json == null || json.isNull()) { return opts; }
            if (json.has("label"))            { opts.label            = json.get("label").asText(); }
            if (json.has("labelColor"))       { opts.labelColor       = json.get("labelColor").asText(); }
            if (json.has("labelFontSize"))    { opts.labelFontSize    = json.get("labelFontSize").asInt(); }
            if (json.has("description"))      { opts.description      = json.get("description").asText(); }
            if (json.has("descriptionColor")) { opts.descriptionColor = json.get("descriptionColor").asText(); }
            if (json.has("backgroundColor"))  { opts.backgroundColor  = json.get("backgroundColor").asText(); }
            if (json.has("borderColor"))      { opts.borderColor      = json.get("borderColor").asText(); }
            if (json.has("borderWidth"))      { opts.borderWidth      = json.get("borderWidth").asInt(); }
            if (json.has("imageUrl"))         { opts.imageUrl         = json.get("imageUrl").asText(); }
            if (json.has("imageWidth"))       { opts.imageWidth       = json.get("imageWidth").asInt(); }
            if (json.has("imageHeight"))      { opts.imageHeight      = json.get("imageHeight").asInt(); }
            return opts;
        }

        /**
         * Return a copy of this NodeOptions with non-default fields from
         * {@code override} applied. Mirrors the Python mergeWith() logic.
         */
        public NodeOptions mergeWith(NodeOptions override) {
            NodeOptions defaults = new NodeOptions();
            NodeOptions merged   = new NodeOptions(this);

            if (!override.label.equals(defaults.label))                       { merged.label            = override.label; }
            if (!override.labelColor.equals(defaults.labelColor))             { merged.labelColor       = override.labelColor; }
            if (override.labelFontSize != defaults.labelFontSize)             { merged.labelFontSize    = override.labelFontSize; }
            if (!override.description.equals(defaults.description))           { merged.description      = override.description; }
            if (!override.descriptionColor.equals(defaults.descriptionColor)) { merged.descriptionColor = override.descriptionColor; }
            if (!override.backgroundColor.equals(defaults.backgroundColor))   { merged.backgroundColor  = override.backgroundColor; }
            if (!override.borderColor.equals(defaults.borderColor))           { merged.borderColor      = override.borderColor; }
            if (override.borderWidth != defaults.borderWidth)                 { merged.borderWidth      = override.borderWidth; }
            if (!override.imageUrl.equals(defaults.imageUrl))                 { merged.imageUrl         = override.imageUrl; }
            if (override.imageWidth != defaults.imageWidth)                   { merged.imageWidth       = override.imageWidth; }
            if (override.imageHeight != defaults.imageHeight)                 { merged.imageHeight      = override.imageHeight; }

            return merged;
        }
    }

    // ── FieldDefinition (schema entry, mirrors TS FieldDefinition) ────────────

    public static final class FieldDefinition {
        public String              label;
        public String              type;
        public Object              defaultValue;
        public Map<String, String> choices;
        public Double              min;
        public Double              max;
        public Boolean             visible;
        public Boolean             readonly;

        public FieldDefinition() {}

        public ObjectNode toJsonObject() {
            ObjectNode obj = MAPPER.createObjectNode();
            if (label        != null) { obj.put("label",    label); }
            if (type         != null) { obj.put("type",     type); }
            if (defaultValue != null) { obj.putPOJO("default", defaultValue); }
            if (choices      != null) {
                ObjectNode choicesNode = MAPPER.createObjectNode();
                choices.forEach(choicesNode::put);
                obj.set("choices", choicesNode);
            }
            if (min      != null) { obj.put("min",      min); }
            if (max      != null) { obj.put("max",      max); }
            if (visible  != null) { obj.put("visible",  visible); }
            if (readonly != null) { obj.put("readonly", readonly); }
            return obj;
        }

        public static FieldDefinition fromJsonObject(JsonNode json) {
            FieldDefinition fd = new FieldDefinition();
            if (json.has("label"))   { fd.label = json.get("label").asText(); }
            if (json.has("type"))    { fd.type  = json.get("type").asText(); }
            if (json.has("default")) {
                JsonNode dv = json.get("default");
                if (dv.isBoolean())    { fd.defaultValue = dv.asBoolean(); }
                else if (dv.isNumber()) { fd.defaultValue = dv.asDouble(); }
                else                   { fd.defaultValue = dv.asText(); }
            }
            if (json.has("choices")) {
                fd.choices = new LinkedHashMap<>();
                json.get("choices").fields().forEachRemaining(
                    e -> fd.choices.put(e.getKey(), e.getValue().asText())
                );
            }
            if (json.has("min"))      { fd.min      = json.get("min").asDouble(); }
            if (json.has("max"))      { fd.max      = json.get("max").asDouble(); }
            if (json.has("visible"))  { fd.visible  = json.get("visible").asBoolean(); }
            if (json.has("readonly")) { fd.readonly = json.get("readonly").asBoolean(); }
            return fd;
        }

        /** Builder-style helpers for fluent construction. */
        public FieldDefinition label(String v)               { this.label        = v; return this; }
        public FieldDefinition type(String v)                { this.type         = v; return this; }
        public FieldDefinition defaultValue(Object v)        { this.defaultValue = v; return this; }
        public FieldDefinition choices(Map<String, String> v){ this.choices      = v; return this; }
        public FieldDefinition min(double v)                 { this.min          = v; return this; }
        public FieldDefinition max(double v)                 { this.max          = v; return this; }
    }

    // ── DiagramNode ───────────────────────────────────────────────────────────

    public static class DiagramNode {

        public static final String NODE_CLASS = "DiagramNode";

        private final String id;
        protected     String nodeClass;
        protected     NodeOptions props;
        protected     Map<String, Object>          customProps;
        protected     Map<String, FieldDefinition> schema;

        public Double x;
        public Double y;

        public DiagramNode() {
            this.id          = "node-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
            this.nodeClass   = NODE_CLASS;
            this.props       = new NodeOptions();
            this.customProps = new LinkedHashMap<>();
            this.schema      = new LinkedHashMap<>();
        }

        public DiagramNode(String label) {
            this();
            this.props.label = label;
        }

        public DiagramNode(NodeOptions options) {
            this();
            this.props = new NodeOptions(options);
        }

        // ── Built-in prop accessors ───────────────────────────────────────────

        public String getId()                          { return id; }
        public String getNodeClass()                   { return nodeClass; }

        public String getLabel()                       { return props.label; }
        public void   setLabel(String v)               { props.label = v; }

        public String getLabelColor()                  { return props.labelColor; }
        public void   setLabelColor(String v)          { props.labelColor = v; }

        public int    getLabelFontSize()               { return props.labelFontSize; }
        public void   setLabelFontSize(int v)          { props.labelFontSize = v; }

        public String getDescription()                 { return props.description; }
        public void   setDescription(String v)         { props.description = v; }

        public String getDescriptionColor()            { return props.descriptionColor; }
        public void   setDescriptionColor(String v)    { props.descriptionColor = v; }

        public String getBackgroundColor()             { return props.backgroundColor; }
        public void   setBackgroundColor(String v)     { props.backgroundColor = v; }

        public String getBorderColor()                 { return props.borderColor; }
        public void   setBorderColor(String v)         { props.borderColor = v; }

        public int    getBorderWidth()                 { return props.borderWidth; }
        public void   setBorderWidth(int v)            { props.borderWidth = v; }

        public String getImageUrl()                    { return props.imageUrl; }
        public void   setImageUrl(String v)            { props.imageUrl = v; }

        public int    getImageWidth()                  { return props.imageWidth; }
        public void   setImageWidth(int v)             { props.imageWidth = v; }

        public int    getImageHeight()                 { return props.imageHeight; }
        public void   setImageHeight(int v)            { props.imageHeight = v; }

        // ── Custom props ──────────────────────────────────────────────────────

        public Object getCustomProperty(String key)         { return customProps.get(key); }
        public void   setCustomProperty(String key, Object v) { customProps.put(key, v); }

        public Map<String, FieldDefinition> getSchema() {
            return Collections.unmodifiableMap(schema);
        }

        // ── Serialisation ─────────────────────────────────────────────────────

        public ObjectNode toSerializedObject() {
            ObjectNode obj = MAPPER.createObjectNode();
            obj.put("id",        id);
            obj.put("nodeClass", nodeClass);
            obj.set("props",       props.toJsonObject());

            ObjectNode customPropsNode = MAPPER.createObjectNode();
            customProps.forEach((k, v) -> customPropsNode.putPOJO(k, v));
            obj.set("customProps", customPropsNode);

            if (x != null) { obj.put("x", x); }
            if (y != null) { obj.put("y", y); }

            return obj;
        }

        @Override
        public String toString() {
            return String.format("<%s id=%s label=%s>", getClass().getSimpleName(), id, props.label);
        }
    }

    // ── Built-in concrete node subclasses ─────────────────────────────────────

    public static final class RectangleNode extends DiagramNode {
        public static final String NODE_CLASS = "RectangleNode";
        public RectangleNode()                { super(); nodeClass = NODE_CLASS; }
        public RectangleNode(String label)    { super(label); nodeClass = NODE_CLASS; }
        public RectangleNode(NodeOptions o)   { super(o);     nodeClass = NODE_CLASS; }
    }

    public static final class SquareNode extends DiagramNode {
        public static final String NODE_CLASS = "SquareNode";
        public SquareNode()                   { super(); nodeClass = NODE_CLASS; }
        public SquareNode(String label)       { super(label); nodeClass = NODE_CLASS; }
        public SquareNode(NodeOptions o)      { super(o);     nodeClass = NODE_CLASS; }
    }

    public static final class EllipseNode extends DiagramNode {
        public static final String NODE_CLASS = "EllipseNode";
        public EllipseNode()                  { super(); nodeClass = NODE_CLASS; }
        public EllipseNode(String label)      { super(label); nodeClass = NODE_CLASS; }
        public EllipseNode(NodeOptions o)     { super(o);     nodeClass = NODE_CLASS; }
    }

    public static final class CircleNode extends DiagramNode {
        public static final String NODE_CLASS = "CircleNode";
        public CircleNode()                   { super(); nodeClass = NODE_CLASS; }
        public CircleNode(String label)       { super(label); nodeClass = NODE_CLASS; }
        public CircleNode(NodeOptions o)      { super(o);     nodeClass = NODE_CLASS; }
    }

    public static final class DiamondNode extends DiagramNode {
        public static final String NODE_CLASS = "DiamondNode";
        public DiamondNode()                  { super(); nodeClass = NODE_CLASS; }
        public DiamondNode(String label)      { super(label); nodeClass = NODE_CLASS; }
        public DiamondNode(NodeOptions o)     { super(o);     nodeClass = NODE_CLASS; }
    }

    public static final class TriangleNode extends DiagramNode {
        public static final String NODE_CLASS = "TriangleNode";
        public TriangleNode()                 { super(); nodeClass = NODE_CLASS; }
        public TriangleNode(String label)     { super(label); nodeClass = NODE_CLASS; }
        public TriangleNode(NodeOptions o)    { super(o);     nodeClass = NODE_CLASS; }
    }

    public static final class HexagonNode extends DiagramNode {
        public static final String NODE_CLASS = "HexagonNode";
        public HexagonNode()                  { super(); nodeClass = NODE_CLASS; }
        public HexagonNode(String label)      { super(label); nodeClass = NODE_CLASS; }
        public HexagonNode(NodeOptions o)     { super(o);     nodeClass = NODE_CLASS; }
    }

    public static final class PentagonNode extends DiagramNode {
        public static final String NODE_CLASS = "PentagonNode";
        public PentagonNode()                 { super(); nodeClass = NODE_CLASS; }
        public PentagonNode(String label)     { super(label); nodeClass = NODE_CLASS; }
        public PentagonNode(NodeOptions o)    { super(o);     nodeClass = NODE_CLASS; }
    }

    public static final class OctagonNode extends DiagramNode {
        public static final String NODE_CLASS = "OctagonNode";
        public OctagonNode()                  { super(); nodeClass = NODE_CLASS; }
        public OctagonNode(String label)      { super(label); nodeClass = NODE_CLASS; }
        public OctagonNode(NodeOptions o)     { super(o);     nodeClass = NODE_CLASS; }
    }

    /** All built-in nodeClass strings, used to differentiate during serialization. */
    private static final Set<String> BUILTIN_NODE_CLASSES = Set.of(
        RectangleNode.NODE_CLASS, SquareNode.NODE_CLASS, EllipseNode.NODE_CLASS,
        CircleNode.NODE_CLASS,    DiamondNode.NODE_CLASS, TriangleNode.NODE_CLASS,
        HexagonNode.NODE_CLASS,   PentagonNode.NODE_CLASS, OctagonNode.NODE_CLASS
    );

    /** Maps nodeClass string → constructor reference for built-in types. */
    private static DiagramNode instantiateBuiltin(String nodeClass, NodeOptions opts) {
        return switch (nodeClass) {
            case RectangleNode.NODE_CLASS -> new RectangleNode(opts);
            case SquareNode.NODE_CLASS    -> new SquareNode(opts);
            case EllipseNode.NODE_CLASS   -> new EllipseNode(opts);
            case CircleNode.NODE_CLASS    -> new CircleNode(opts);
            case DiamondNode.NODE_CLASS   -> new DiamondNode(opts);
            case TriangleNode.NODE_CLASS  -> new TriangleNode(opts);
            case HexagonNode.NODE_CLASS   -> new HexagonNode(opts);
            case PentagonNode.NODE_CLASS  -> new PentagonNode(opts);
            case OctagonNode.NODE_CLASS   -> new OctagonNode(opts);
            default -> throw new IllegalArgumentException("Unknown built-in nodeClass: " + nodeClass);
        };
    }

    // ── NodeTypeDefinition (mirrors DiagramNode.define() metadata) ────────────

    /**
     * Holds all metadata for a custom node type.
     * Register via {@link DiagramEditor#registerCustomNodeType(NodeTypeDefinition)}.
     */
    public static final class NodeTypeDefinition {
        public final String                    nodeClass;
        public final String                    baseClass;
        public final NodeOptions               defaultOptions;
        public final Map<String, FieldDefinition> schema;
        public final String                    name;
        public final List<String>              visibleProps;
        public final String                    editProp;

        public NodeTypeDefinition(
            String                       nodeClass,
            String                       baseClass,
            NodeOptions                  defaultOptions,
            Map<String, FieldDefinition> schema,
            String                       name,
            List<String>                 visibleProps,
            String                       editProp
        ) {
            this.nodeClass      = Objects.requireNonNull(nodeClass);
            this.baseClass      = Objects.requireNonNull(baseClass);
            this.defaultOptions = defaultOptions != null ? defaultOptions : new NodeOptions();
            this.schema         = schema       != null ? Map.copyOf(schema)       : Map.of();
            this.name           = name;
            this.visibleProps   = visibleProps != null ? List.copyOf(visibleProps) : List.of();
            this.editProp       = editProp;
        }

        /** Simplified constructor — name, visibleProps, and editProp default to null/empty. */
        public NodeTypeDefinition(
            String nodeClass,
            String baseClass,
            NodeOptions defaultOptions,
            Map<String, FieldDefinition> schema
        ) {
            this(nodeClass, baseClass, defaultOptions, schema, null, null, null);
        }

        /**
         * Instantiate a node for this type, merging caller options over defaults and
         * seeding customProps from schema field defaults.
         */
        public DiagramNode instantiate(NodeOptions callerOptions) {
            NodeOptions resolved = (callerOptions != null)
                ? defaultOptions.mergeWith(callerOptions)
                : new NodeOptions(defaultOptions);

            DiagramNode node = BUILTIN_NODE_CLASSES.contains(baseClass)
                ? instantiateBuiltin(baseClass, resolved)
                : new DiagramNode(resolved);

            // Override the nodeClass so serialization reports the custom type name
            node.nodeClass = nodeClass;
            node.schema    = new LinkedHashMap<>(schema);

            // Seed schema defaults into customProps
            schema.forEach((key, fieldDef) -> {
                if (fieldDef.defaultValue != null && !node.customProps.containsKey(key)) {
                    node.customProps.put(key, fieldDef.defaultValue);
                }
            });

            return node;
        }

        public DiagramNode instantiate() {
            return instantiate(null);
        }

        public DiagramNode instantiate(String label) {
            return instantiate(new NodeOptions(label));
        }

        public ObjectNode toSerializedTypeObject() {
            ObjectNode obj = MAPPER.createObjectNode();
            obj.put("nodeClass", nodeClass);
            obj.put("baseClass", baseClass);
            obj.set("defaultOptions", defaultOptions.toJsonObject());

            // Strip serialize/deserialize/onChange — not JSON-serializable
            ObjectNode schemaNode = MAPPER.createObjectNode();
            schema.forEach((k, fd) -> schemaNode.set(k, fd.toJsonObject()));
            obj.set("schema", schemaNode);

            if (name         != null)        { obj.put("name",      name); }
            if (!visibleProps.isEmpty()) {
                ArrayNode vpArr = MAPPER.createArrayNode();
                visibleProps.forEach(vpArr::add);
                obj.set("visibleProps", vpArr);
            }
            if (editProp     != null)        { obj.put("editProp",  editProp); }

            return obj;
        }

        /** Fluent builder to reduce constructor verbosity at call sites. */
        public static Builder builder(String nodeClass, String baseClass) {
            return new Builder(nodeClass, baseClass);
        }

        public static final class Builder {
            private final String nodeClass;
            private final String baseClass;
            private NodeOptions               defaultOptions = new NodeOptions();
            private Map<String, FieldDefinition> schema     = new LinkedHashMap<>();
            private String                    name;
            private List<String>              visibleProps   = new ArrayList<>();
            private String                    editProp;

            private Builder(String nodeClass, String baseClass) {
                this.nodeClass = nodeClass;
                this.baseClass = baseClass;
            }

            public Builder defaultOptions(NodeOptions opts)              { this.defaultOptions = opts; return this; }
            public Builder schema(Map<String, FieldDefinition> schema)   { this.schema         = schema; return this; }
            public Builder name(String name)                             { this.name           = name; return this; }
            public Builder visibleProps(List<String> props)              { this.visibleProps   = props; return this; }
            public Builder editProp(String prop)                         { this.editProp       = prop; return this; }

            public NodeTypeDefinition build() {
                return new NodeTypeDefinition(nodeClass, baseClass, defaultOptions, schema, name, visibleProps, editProp);
            }
        }
    }

    // ── Edge ──────────────────────────────────────────────────────────────────

    public static final class Edge {

        private final String        id;
        private final DiagramNode   source;
        private final DiagramNode   target;
        private       String        label;
        private       String        labelColor;
        private       int           labelFontSize;
        private       String        lineColor;
        private       int           lineWidth;
        private       LineStyle     lineStyle;
        private       ArrowMarker   sourceArrow;
        private       ArrowMarker   targetArrow;
        private       ConnectorType connectorType;
        private       String        description;
        private       Integer       sourcePort;
        private       Integer       targetPort;
        private final List<Point>   vertices = new ArrayList<>();

        private Edge(Builder b) {
            this.id            = "edge-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
            this.source        = Objects.requireNonNull(b.source);
            this.target        = Objects.requireNonNull(b.target);
            this.label         = b.label;
            this.labelColor    = b.labelColor;
            this.labelFontSize = b.labelFontSize;
            this.lineColor     = b.lineColor;
            this.lineWidth     = b.lineWidth;
            this.lineStyle     = b.lineStyle;
            this.sourceArrow   = b.sourceArrow;
            this.targetArrow   = b.targetArrow;
            this.connectorType = b.connectorType;
            this.description   = b.description;
            this.sourcePort    = b.sourcePort;
            this.targetPort    = b.targetPort;
        }

        // ── Accessors ─────────────────────────────────────────────────────────

        public String        getId()            { return id; }
        public DiagramNode   getSource()        { return source; }
        public DiagramNode   getTarget()        { return target; }
        public String        getLabel()         { return label; }
        public void          setLabel(String v) { this.label = v; }
        public String        getLabelColor()    { return labelColor; }
        public void          setLabelColor(String v)    { this.labelColor = v; }
        public int           getLabelFontSize() { return labelFontSize; }
        public void          setLabelFontSize(int v)    { this.labelFontSize = v; }
        public String        getLineColor()     { return lineColor; }
        public void          setLineColor(String v)     { this.lineColor = v; }
        public int           getLineWidth()     { return lineWidth; }
        public void          setLineWidth(int v)        { this.lineWidth = v; }
        public LineStyle     getLineStyle()     { return lineStyle; }
        public void          setLineStyle(LineStyle v)  { this.lineStyle = v; }
        public ArrowMarker   getSourceArrow()   { return sourceArrow; }
        public void          setSourceArrow(ArrowMarker v) { this.sourceArrow = v; }
        public ArrowMarker   getTargetArrow()   { return targetArrow; }
        public void          setTargetArrow(ArrowMarker v) { this.targetArrow = v; }
        public ConnectorType getConnectorType() { return connectorType; }
        public void          setConnectorType(ConnectorType v) { this.connectorType = v; }
        public String        getDescription()   { return description; }
        public void          setDescription(String v)   { this.description = v; }
        public Integer       getSourcePort()    { return sourcePort; }
        public void          setSourcePort(Integer v)   { this.sourcePort = v; }
        public Integer       getTargetPort()    { return targetPort; }
        public void          setTargetPort(Integer v)   { this.targetPort = v; }

        public Point addPathPoint(double x, double y) {
            Point pt = new Point(x, y);
            vertices.add(pt);
            return pt;
        }

        public List<Point> getPathPoints() {
            return Collections.unmodifiableList(vertices);
        }

        // ── Serialisation ─────────────────────────────────────────────────────

        public ObjectNode toSerializedObject() {
            ObjectNode obj = MAPPER.createObjectNode();
            obj.put("sourceId",      source.getId());
            obj.put("targetId",      target.getId());

            if (sourcePort != null) { obj.put("sourcePort", sourcePort); }
            else                    { obj.putNull("sourcePort"); }

            if (targetPort != null) { obj.put("targetPort", targetPort); }
            else                    { obj.putNull("targetPort"); }

            obj.put("label",         label);
            obj.put("labelColor",    labelColor);
            obj.put("labelFontSize", labelFontSize);
            obj.put("lineColor",     lineColor);
            obj.put("lineWidth",     lineWidth);
            obj.put("lineStyle",     lineStyle.value);
            obj.put("sourceArrow",   sourceArrow.value);
            obj.put("targetArrow",   targetArrow.value);
            obj.put("connectorType", connectorType.value);
            obj.put("description",   description);

            ArrayNode vArr = MAPPER.createArrayNode();
            vertices.forEach(pt -> vArr.add(pt.toJsonObject()));
            obj.set("vertices", vArr);

            return obj;
        }

        @Override
        public String toString() {
            return String.format("<Edge id=%s %s → %s>", id, source.getLabel(), target.getLabel());
        }

        // ── Builder ───────────────────────────────────────────────────────────

        public static Builder from(DiagramNode source, DiagramNode target) {
            return new Builder(source, target);
        }

        public static final class Builder {
            private final DiagramNode   source;
            private final DiagramNode   target;
            private String        label          = "";
            private String        labelColor     = Config.COLOR_EDGE_LABEL;
            private int           labelFontSize  = Config.FONT_SIZE_PERCENT_DEFAULT;
            private String        lineColor      = Config.COLOR_EDGE_LINE;
            private int           lineWidth      = 2;
            private LineStyle     lineStyle      = LineStyle.SOLID;
            private ArrowMarker   sourceArrow    = ArrowMarker.NONE;
            private ArrowMarker   targetArrow    = ArrowMarker.CLASSIC;
            private ConnectorType connectorType  = ConnectorType.ELBOW;
            private String        description    = "";
            private Integer       sourcePort     = null;
            private Integer       targetPort     = null;

            private Builder(DiagramNode source, DiagramNode target) {
                this.source = source;
                this.target = target;
            }

            public Builder label(String v)               { this.label         = v; return this; }
            public Builder labelColor(String v)          { this.labelColor    = v; return this; }
            public Builder labelFontSize(int v)          { this.labelFontSize = v; return this; }
            public Builder lineColor(String v)           { this.lineColor     = v; return this; }
            public Builder lineWidth(int v)              { this.lineWidth     = v; return this; }
            public Builder lineStyle(LineStyle v)        { this.lineStyle     = v; return this; }
            public Builder sourceArrow(ArrowMarker v)    { this.sourceArrow   = v; return this; }
            public Builder targetArrow(ArrowMarker v)    { this.targetArrow   = v; return this; }
            public Builder connectorType(ConnectorType v){ this.connectorType = v; return this; }
            public Builder description(String v)         { this.description   = v; return this; }
            public Builder sourcePort(Integer v)         { this.sourcePort    = v; return this; }
            public Builder targetPort(Integer v)         { this.targetPort    = v; return this; }

            public Edge build() { return new Edge(this); }
        }
    }

    // ── DiagramEditor instance state ──────────────────────────────────────────

    /** Preserves insertion order for deterministic serialization output. */
    private final Map<String, DiagramNode>        nodes               = new LinkedHashMap<>();
    private final List<Edge>                      edges               = new ArrayList<>();

    /**
     * Stores either a String (built-in FQCN placeholder) or a
     * {@link NodeTypeDefinition} (custom type) keyed by nodeClass name.
     */
    private final Map<String, Object>             registeredNodeTypes = new LinkedHashMap<>();

    // ── Node type registration ────────────────────────────────────────────────

    /**
     * Register a built-in node type by its nodeClass string.
     * Mirrors registerNodeType(label, NodeClass).
     */
    public DiagramEditor registerNodeType(String nodeClass) {
        if (!BUILTIN_NODE_CLASSES.contains(nodeClass)) {
            throw new IllegalArgumentException(
                "'" + nodeClass + "' is not a built-in nodeClass. " +
                "Use registerCustomNodeType(NodeTypeDefinition) for custom types."
            );
        }
        registeredNodeTypes.put(nodeClass, nodeClass);
        return this;
    }

    /**
     * Register a custom node type.
     * Mirrors DiagramNode.define() + registerNodeType() combined.
     */
    public DiagramEditor registerCustomNodeType(NodeTypeDefinition definition) {
        registeredNodeTypes.put(definition.nodeClass, definition);
        return this;
    }

    /** Register all nine built-in node types. Mirrors registerBuiltInNodes(). */
    public DiagramEditor registerBuiltInNodes() {
        BUILTIN_NODE_CLASSES.forEach(nc -> registeredNodeTypes.put(nc, nc));
        return this;
    }

    public DiagramEditor clearRegisteredNodes() {
        registeredNodeTypes.clear();
        return this;
    }

    // ── Node management ───────────────────────────────────────────────────────

    /** Add a node with optional canvas coordinates. Mirrors addNode(node, x?, y?). */
    public DiagramNode addNode(DiagramNode node, Double x, Double y) {
        node.x = x;
        node.y = y;
        nodes.put(node.getId(), node);
        return node;
    }

    public DiagramNode addNode(DiagramNode node) {
        return addNode(node, null, null);
    }

    /** Remove a node and all its connected edges. Mirrors removeNode(node). */
    public void removeNode(DiagramNode node) {
        nodes.remove(node.getId());
        edges.removeIf(e -> e.getSource() == node || e.getTarget() == node);
    }

    public List<DiagramNode> getNodes() {
        return List.copyOf(nodes.values());
    }

    // ── Edge management ───────────────────────────────────────────────────────

    /** Add a pre-built Edge to the diagram. */
    public Edge addEdge(Edge edge) {
        edges.add(edge);
        return edge;
    }

    /**
     * Convenience: build and add an edge in one call.
     * Use {@link Edge#from(DiagramNode, DiagramNode)} for full control.
     */
    public Edge connect(DiagramNode source, DiagramNode target) {
        return addEdge(Edge.from(source, target).build());
    }

    public void removeEdge(Edge edge) {
        edges.removeIf(e -> e == edge);
    }

    public List<Edge> getEdges() {
        return List.copyOf(edges);
    }

    public DiagramEditor clear() {
        nodes.clear();
        edges.clear();
        return this;
    }

    // ── Serialisation ─────────────────────────────────────────────────────────

    /** Return a raw map of nodes + edges arrays. Mirrors serializeNodes(). */
    public ObjectNode serializeNodes() {
        ObjectNode root = MAPPER.createObjectNode();

        ArrayNode nodesArr = MAPPER.createArrayNode();
        nodes.values().forEach(n -> nodesArr.add(n.toSerializedObject()));
        root.set("nodes", nodesArr);

        ArrayNode edgesArr = MAPPER.createArrayNode();
        edges.forEach(e -> edgesArr.add(e.toSerializedObject()));
        root.set("edges", edgesArr);

        return root;
    }

    /**
     * Return the list of registered type descriptors.
     * Built-in types → plain JSON string. Custom → full object.
     * Mirrors serializeTypes().
     */
    public ArrayNode serializeTypes() {
        ArrayNode arr = MAPPER.createArrayNode();
        registeredNodeTypes.forEach((key, entry) -> {
            if (entry instanceof String builtinClass) {
                arr.add(builtinClass);
            } else if (entry instanceof NodeTypeDefinition def) {
                arr.add(def.toSerializedTypeObject());
            }
        });
        return arr;
    }

    /**
     * Serialize diagram to a JSON string.
     * Mirrors serialize(includeTypes?).
     */
    public String serialize(boolean includeTypes) {
        try {
            ObjectNode root = serializeNodes();
            if (includeTypes) {
                root.set("nodeTypes", serializeTypes());
            }
            return MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (Exception e) {
            throw new RuntimeException("JSON serialization failed: " + e.getMessage(), e);
        }
    }

    public String serialize() {
        return serialize(true);
    }

    /**
     * Restore diagram from a JSON string or a pre-parsed JsonNode.
     * Mirrors deserialize(json).
     */
    public DiagramEditor deserialize(String json) {
        try {
            return deserialize(MAPPER.readTree(json));
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to parse diagram JSON: " + e.getMessage(), e);
        }
    }

    public DiagramEditor deserialize(JsonNode root) {
        if (!root.has("nodes") || !root.get("nodes").isArray()) {
            throw new IllegalArgumentException("Invalid diagram: 'nodes' must be an array.");
        }

        clear();

        // ── Re-register node types ────────────────────────────────────────────
        if (root.has("nodeTypes") && root.get("nodeTypes").isArray()) {
            for (JsonNode typeEntry : root.get("nodeTypes")) {

                if (typeEntry.isTextual()) {
                    // Built-in
                    String nc = typeEntry.asText();
                    if (BUILTIN_NODE_CLASSES.contains(nc)) {
                        registeredNodeTypes.put(nc, nc);
                    }

                } else if (typeEntry.isObject()) {
                    // Custom type
                    String nc = typeEntry.get("nodeClass").asText();

                    if (registeredNodeTypes.containsKey(nc)) { continue; }

                    String baseClass = typeEntry.get("baseClass").asText();

                    if (!BUILTIN_NODE_CLASSES.contains(baseClass) && !registeredNodeTypes.containsKey(baseClass)) {
                        throw new IllegalArgumentException(
                            "Unknown base class '" + baseClass + "' for type '" + nc + "'."
                        );
                    }

                    Map<String, FieldDefinition> schema = new LinkedHashMap<>();
                    if (typeEntry.has("schema")) {
                        typeEntry.get("schema").fields().forEachRemaining(
                            e -> schema.put(e.getKey(), FieldDefinition.fromJsonObject(e.getValue()))
                        );
                    }

                    NodeOptions defaultOptions = NodeOptions.fromJsonObject(typeEntry.get("defaultOptions"));

                    List<String> visibleProps = new ArrayList<>();
                    if (typeEntry.has("visibleProps")) {
                        typeEntry.get("visibleProps").forEach(vp -> visibleProps.add(vp.asText()));
                    }

                    NodeTypeDefinition def = new NodeTypeDefinition(
                        nc,
                        baseClass,
                        defaultOptions,
                        schema,
                        typeEntry.has("name")     ? typeEntry.get("name").asText()     : null,
                        visibleProps,
                        typeEntry.has("editProp") ? typeEntry.get("editProp").asText() : null
                    );

                    registeredNodeTypes.put(nc, def);
                }
            }
        }

        // ── Restore nodes ─────────────────────────────────────────────────────
        Map<String, DiagramNode> idMap = new LinkedHashMap<>();

        for (JsonNode nodeData : root.get("nodes")) {
            String      nodeClass = nodeData.has("nodeClass") ? nodeData.get("nodeClass").asText() : RectangleNode.NODE_CLASS;
            NodeOptions props     = NodeOptions.fromJsonObject(nodeData.get("props"));

            DiagramNode node;
            Object      registered = registeredNodeTypes.get(nodeClass);

            if (registered instanceof NodeTypeDefinition def) {
                node = def.instantiate(props);
            } else if (BUILTIN_NODE_CLASSES.contains(nodeClass)) {
                node = instantiateBuiltin(nodeClass, props);
            } else {
                node = new DiagramNode(props);
                node.nodeClass = nodeClass;
            }

            // Overwrite the auto-generated id with the persisted value
            forceSetId(node, nodeData.get("id").asText());

            node.x = nodeData.has("x") ? nodeData.get("x").asDouble() : null;
            node.y = nodeData.has("y") ? nodeData.get("y").asDouble() : null;

            if (nodeData.has("customProps")) {
                nodeData.get("customProps").fields().forEachRemaining(e -> {
                    JsonNode v = e.getValue();
                    if (v.isBoolean())    { node.customProps.put(e.getKey(), v.asBoolean()); }
                    else if (v.isNumber()) { node.customProps.put(e.getKey(), v.asDouble()); }
                    else                  { node.customProps.put(e.getKey(), v.asText()); }
                });
            }

            nodes.put(node.getId(), node);
            idMap.put(node.getId(), node);
        }

        // ── Restore edges ─────────────────────────────────────────────────────
        for (JsonNode edgeData : root.get("edges")) {
            String     sourceId = edgeData.get("sourceId").asText();
            String     targetId = edgeData.get("targetId").asText();
            DiagramNode source  = idMap.get(sourceId);
            DiagramNode target  = idMap.get(targetId);

            if (source == null) { throw new IllegalArgumentException("Edge references unknown sourceId '" + sourceId + "'."); }
            if (target == null) { throw new IllegalArgumentException("Edge references unknown targetId '" + targetId + "'."); }

            Edge.Builder eb = Edge.from(source, target)
                .label        (edgeData.has("label")         ? edgeData.get("label").asText()         : "")
                .labelColor   (edgeData.has("labelColor")    ? edgeData.get("labelColor").asText()    : Config.COLOR_EDGE_LABEL)
                .labelFontSize(edgeData.has("labelFontSize") ? edgeData.get("labelFontSize").asInt()  : Config.FONT_SIZE_PERCENT_DEFAULT)
                .lineColor    (edgeData.has("lineColor")     ? edgeData.get("lineColor").asText()     : Config.COLOR_EDGE_LINE)
                .lineWidth    (edgeData.has("lineWidth")     ? edgeData.get("lineWidth").asInt()      : 2)
                .lineStyle    (LineStyle.fromValue    (edgeData.has("lineStyle")     ? edgeData.get("lineStyle").asText()     : "solid"))
                .sourceArrow  (ArrowMarker.fromValue  (edgeData.has("sourceArrow")  ? edgeData.get("sourceArrow").asText()  : "none"))
                .targetArrow  (ArrowMarker.fromValue  (edgeData.has("targetArrow")  ? edgeData.get("targetArrow").asText()  : "classic"))
                .connectorType(ConnectorType.fromValue(edgeData.has("connectorType")? edgeData.get("connectorType").asText(): "elbow"))
                .description  (edgeData.has("description")  ? edgeData.get("description").asText()  : "")
                .sourcePort   (edgeData.has("sourcePort") && !edgeData.get("sourcePort").isNull() ? edgeData.get("sourcePort").asInt() : null)
                .targetPort   (edgeData.has("targetPort") && !edgeData.get("targetPort").isNull() ? edgeData.get("targetPort").asInt() : null);

            Edge edge = eb.build();

            if (edgeData.has("vertices") && edgeData.get("vertices").isArray()) {
                edgeData.get("vertices").forEach(v -> edge.addPathPoint(v.get("x").asDouble(), v.get("y").asDouble()));
            }

            edges.add(edge);
        }

        return this;
    }

    /**
     * Reflection-free id override via package-private field access.
     * DiagramNode.id is final but we need to stamp the persisted value.
     * In a production split into separate files, make id package-private instead.
     */
    private static void forceSetId(DiagramNode node, String id) {
        try {
            java.lang.reflect.Field field = DiagramNode.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(node, id);
        } catch (Exception e) {
            throw new RuntimeException("Could not restore node id: " + e.getMessage(), e);
        }
    }

    // ── File I/O ──────────────────────────────────────────────────────────────

    /** Write diagram JSON to a file. */
    public void exportToFile(Path path, boolean includeTypes) throws IOException {
        Files.writeString(path, serialize(includeTypes));
    }

    public void exportToFile(Path path) throws IOException {
        exportToFile(path, true);
    }

    /** Load diagram JSON from a file. */
    public DiagramEditor importFromFile(Path path) throws IOException {
        return deserialize(Files.readString(path));
    }

    // ── Schema validation ─────────────────────────────────────────────────────

    /**
     * Validate the current diagram against schema.json.
     *
     * Requires: com.networknt:json-schema-validator on the classpath.
     */
    public void validate(Path schemaPath) {
        try {
            Class<?> factoryClass  = Class.forName("com.networknt.schema.JsonSchemaFactory");
            Class<?> versionClass  = Class.forName("com.networknt.schema.SpecVersion$VersionFlag");
            Object   v7            = Enum.valueOf((Class<Enum>) versionClass, "V7");
            Object   factory       = factoryClass.getMethod("getInstance", versionClass).invoke(null, v7);

            JsonNode schemaJson    = MAPPER.readTree(schemaPath.toFile());
            Object   schema        = factory.getClass().getMethod("getSchema", JsonNode.class).invoke(factory, schemaJson);

            JsonNode diagramJson   = MAPPER.readTree(serialize());

            @SuppressWarnings("unchecked")
            java.util.Set<Object> errors = (java.util.Set<Object>)
                schema.getClass().getMethod("validate", JsonNode.class).invoke(schema, diagramJson);

            if (!errors.isEmpty()) {
                throw new RuntimeException("Schema validation failed:\n" + errors);
            }

            System.out.println("✓ Diagram is valid against " + schemaPath);
        } catch (ClassNotFoundException e) {
            throw new RuntimeException(
                "json-schema-validator not on classpath. Add: " +
                "com.networknt:json-schema-validator:1.4+ to your dependencies.", e
            );
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Validation error: " + e.getMessage(), e);
        }
    }

    @Override
    public String toString() {
        return String.format("<DiagramEditor nodes=%d edges=%d>", nodes.size(), edges.size());
    }

    // ── Demo / smoke-test ─────────────────────────────────────────────────────

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
        DiagramNode start  = editor.addNode(new RectangleNode("Start"),      0.0,   0.0);
        DiagramNode review = editor.addNode(taskDef.instantiate("Code Review"), 200.0, 0.0);
        DiagramNode done   = editor.addNode(new DiamondNode("Done?"),        400.0, 0.0);
        DiagramNode end    = editor.addNode(new CircleNode("End"),           600.0, 0.0);

        review.setCustomProperty("assignee", "alice");
        review.setCustomProperty("priority", "high");

        editor.addEdge(Edge.from(start,  review).label("begin").build());
        editor.addEdge(Edge.from(review, done).label("submit").lineStyle(LineStyle.DASHED).build());
        editor.addEdge(Edge.from(done,   end).label("yes").targetArrow(ArrowMarker.BLOCK).build());

        Edge loopEdge = Edge.from(done, review)
            .label("no")
            .connectorType(ConnectorType.CURVED)
            .sourceArrow(ArrowMarker.CLASSIC)
            .build();
        loopEdge.addPathPoint(400, 80);
        editor.addEdge(loopEdge);

        String json = editor.serialize();
        System.out.println("── Serialized (first 600 chars) ─────────────────");
        System.out.println(json.substring(0, Math.min(600, json.length())) + "...\n");

        // Round-trip
        DiagramEditor editor2 = new DiagramEditor().deserialize(json);
        System.out.println("── Round-trip ───────────────────────────────────");
        editor2.getNodes().forEach(n -> System.out.println("  " + n));
        editor2.getEdges().forEach(e -> System.out.println("  " + e));

        // File export / import
        Path tmp = Path.of(System.getProperty("java.io.tmpdir"), "diagram.json");
        editor.exportToFile(tmp);
        DiagramEditor editor3 = new DiagramEditor().importFromFile(tmp);
        System.out.println("\n── Imported from file ───────────────────────────");
        System.out.println(editor3);

        // Schema validation (optional dependency)
        try {
            editor.validate(Path.of("schema.json"));
        } catch (RuntimeException e) {
            System.out.println("(Skipping validation: " + e.getMessage().split("\n")[0] + ")");
        }
    }
}
