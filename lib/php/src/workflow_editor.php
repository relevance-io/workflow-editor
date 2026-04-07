<?php

declare(strict_types=1);

/**
 * DiagramEditor.php
 *
 * Headless PHP mirror of @relevance/workflow-editor's public API.
 * Produces and consumes JSON that passes schema.json validation.
 *
 * Requirements: PHP 8.1+
 * Optional:     composer require justinrainbow/json-schema  (for validate())
 */

namespace Relevance\WorkflowEditor;


// ── Enums (PHP 8.1) ──────────────────────────────────────────────────────────

enum ArrowMarker: string
{
    case None    = 'none';
    case Classic = 'classic';
    case Block   = 'block';
}

enum LineStyle: string
{
    case Solid  = 'solid';
    case Dashed = 'dashed';
    case Dotted = 'dotted';
}

enum ConnectorType: string
{
    case Elbow    = 'elbow';
    case Straight = 'straight';
    case Curved   = 'curved';
}


// ── Config (mirrors src/config.ts) ───────────────────────────────────────────

final class Config
{
    public const COLOR_NODE_BACKGROUND    = '#ffffff';
    public const COLOR_NODE_BORDER        = '#adb5bd';
    public const COLOR_LABEL              = '#212529';
    public const COLOR_DESCRIPTION        = '#6c757d';
    public const COLOR_EDGE_LINE          = '#495057';
    public const COLOR_EDGE_LABEL         = '#333333';
    public const FONT_SIZE_PERCENT_DEFAULT = 100;
    public const IMAGE_DEFAULT_WIDTH      = 32;
    public const IMAGE_DEFAULT_HEIGHT     = 32;
}


// ── Value objects ─────────────────────────────────────────────────────────────

final class Point
{
    public function __construct(
        public readonly float $x,
        public readonly float $y,
    ) {}

    public function toArray(): array
    {
        return ['x' => $this->x, 'y' => $this->y];
    }

    public static function fromArray(array $data): self
    {
        return new self((float) $data['x'], (float) $data['y']);
    }
}

final class NodeOptions
{
    public function __construct(
        public string $label            = '',
        public string $labelColor       = Config::COLOR_LABEL,
        public int    $labelFontSize    = Config::FONT_SIZE_PERCENT_DEFAULT,
        public string $description      = '',
        public string $descriptionColor = Config::COLOR_DESCRIPTION,
        public string $backgroundColor  = Config::COLOR_NODE_BACKGROUND,
        public string $borderColor      = Config::COLOR_NODE_BORDER,
        public int    $borderWidth      = 2,
        public string $imageUrl         = '',
        public int    $imageWidth       = Config::IMAGE_DEFAULT_WIDTH,
        public int    $imageHeight      = Config::IMAGE_DEFAULT_HEIGHT,
    ) {}

    public function toArray(): array
    {
        return [
            'label'            => $this->label,
            'labelColor'       => $this->labelColor,
            'labelFontSize'    => $this->labelFontSize,
            'description'      => $this->description,
            'descriptionColor' => $this->descriptionColor,
            'backgroundColor'  => $this->backgroundColor,
            'borderColor'      => $this->borderColor,
            'borderWidth'      => $this->borderWidth,
            'imageUrl'         => $this->imageUrl,
            'imageWidth'       => $this->imageWidth,
            'imageHeight'      => $this->imageHeight,
        ];
    }

    public static function fromArray(array $data): self
    {
        $opts = new self();

        foreach (get_object_vars($opts) as $prop => $_) {
            if (array_key_exists($prop, $data)) {
                $opts->$prop = $data[$prop];
            }
        }

        return $opts;
    }

    public function mergeWith(NodeOptions $override): self
    {
        $base     = $this->toArray();
        $defaults = (new self())->toArray();

        foreach ($override->toArray() as $key => $value) {
            if ($value !== ($defaults[$key] ?? null)) {
                $base[$key] = $value;
            }
        }

        return self::fromArray($base);
    }
}


// ── DiagramNode ───────────────────────────────────────────────────────────────

class DiagramNode
{
    public static string $nodeClass = 'DiagramNode';

    public readonly string $id;

    protected NodeOptions $props;

    /** @var array<string, mixed> */
    public array $customProps = [];

    /** @var array<string, array<string, mixed>> */
    protected array $schema = [];

    public ?float $x = null;
    public ?float $y = null;

    public function __construct(NodeOptions|string|null $options = null)
    {
        $this->id = 'node-' . bin2hex(random_bytes(5));

        if (is_string($options)) {
            $this->props = new NodeOptions(label: $options);
        } elseif ($options instanceof NodeOptions) {
            $this->props = $options;
        } else {
            $this->props = new NodeOptions();
        }
    }

    // ── Built-in prop accessors ───────────────────────────────────────────────

    public function getLabel(): string            { return $this->props->label; }
    public function setLabel(string $v): void     { $this->props->label = $v; }

    public function getLabelColor(): string        { return $this->props->labelColor; }
    public function setLabelColor(string $v): void { $this->props->labelColor = $v; }

    public function getLabelFontSize(): int        { return $this->props->labelFontSize; }
    public function setLabelFontSize(int $v): void { $this->props->labelFontSize = $v; }

    public function getDescription(): string        { return $this->props->description; }
    public function setDescription(string $v): void { $this->props->description = $v; }

    public function getDescriptionColor(): string        { return $this->props->descriptionColor; }
    public function setDescriptionColor(string $v): void { $this->props->descriptionColor = $v; }

    public function getBackgroundColor(): string        { return $this->props->backgroundColor; }
    public function setBackgroundColor(string $v): void { $this->props->backgroundColor = $v; }

    public function getBorderColor(): string        { return $this->props->borderColor; }
    public function setBorderColor(string $v): void { $this->props->borderColor = $v; }

    public function getBorderWidth(): int        { return $this->props->borderWidth; }
    public function setBorderWidth(int $v): void { $this->props->borderWidth = $v; }

    public function getImageUrl(): string        { return $this->props->imageUrl; }
    public function setImageUrl(string $v): void { $this->props->imageUrl = $v; }

    public function getImageWidth(): int        { return $this->props->imageWidth; }
    public function setImageWidth(int $v): void { $this->props->imageWidth = $v; }

    public function getImageHeight(): int        { return $this->props->imageHeight; }
    public function setImageHeight(int $v): void { $this->props->imageHeight = $v; }

    // ── Custom props ──────────────────────────────────────────────────────────

    public function getCustomProperty(string $key): mixed
    {
        return $this->customProps[$key] ?? null;
    }

    public function setCustomProperty(string $key, mixed $value): void
    {
        $this->customProps[$key] = $value;
    }

    /** @return array<string, array<string, mixed>> */
    public function getSchema(): array
    {
        return $this->schema;
    }

    // ── Serialisation ─────────────────────────────────────────────────────────

    public function toSerialized(): array
    {
        $data = [
            'id'          => $this->id,
            'nodeClass'   => static::$nodeClass,
            'props'       => $this->props->toArray(),
            'customProps' => $this->customProps,
        ];

        if ($this->x !== null) {
            $data['x'] = $this->x;
        }

        if ($this->y !== null) {
            $data['y'] = $this->y;
        }

        return $data;
    }

    public function __toString(): string
    {
        return sprintf(
            '<%s id=%s label=%s>',
            static::class,
            $this->id,
            $this->props->label,
        );
    }
}


// ── Built-in concrete node classes ────────────────────────────────────────────

class RectangleNode extends DiagramNode { public static string $nodeClass = 'RectangleNode'; }
class SquareNode    extends DiagramNode { public static string $nodeClass = 'SquareNode'; }
class EllipseNode   extends DiagramNode { public static string $nodeClass = 'EllipseNode'; }
class CircleNode    extends DiagramNode { public static string $nodeClass = 'CircleNode'; }
class DiamondNode   extends DiagramNode { public static string $nodeClass = 'DiamondNode'; }
class TriangleNode  extends DiagramNode { public static string $nodeClass = 'TriangleNode'; }
class HexagonNode   extends DiagramNode { public static string $nodeClass = 'HexagonNode'; }
class PentagonNode  extends DiagramNode { public static string $nodeClass = 'PentagonNode'; }
class OctagonNode   extends DiagramNode { public static string $nodeClass = 'OctagonNode'; }

/** Map of nodeClass string → FQCN for built-in types. */
const BUILTIN_CLASS_MAP = [
    'RectangleNode' => RectangleNode::class,
    'SquareNode'    => SquareNode::class,
    'EllipseNode'   => EllipseNode::class,
    'CircleNode'    => CircleNode::class,
    'DiamondNode'   => DiamondNode::class,
    'TriangleNode'  => TriangleNode::class,
    'HexagonNode'   => HexagonNode::class,
    'PentagonNode'  => PentagonNode::class,
    'OctagonNode'   => OctagonNode::class,
];


// ── Custom node type definition (mirrors DiagramNode.define()) ────────────────

/**
 * Holds all metadata for a dynamically-registered custom node type.
 * The generated class is stored on DiagramEditor::registerNodeType().
 */
final class NodeTypeDefinition
{
    /**
     * @param array<string, array<string, mixed>> $schema
     * @param string[]                            $visibleProps
     */
    public function __construct(
        public readonly string      $nodeClass,
        public readonly string      $baseClass,
        public readonly NodeOptions $defaultOptions,
        public readonly array       $schema       = [],
        public readonly ?string     $name         = null,
        public readonly array       $visibleProps = [],
        public readonly ?string     $editProp     = null,
    ) {}

    /**
     * Instantiate a node of this custom type, applying default options and
     * seeding custom properties from schema defaults.
     */
    public function instantiate(NodeOptions|string|null $options = null): DiagramNode
    {
        if (is_string($options)) {
            $resolved = $this->defaultOptions->mergeWith(new NodeOptions(label: $options));
        } elseif ($options instanceof NodeOptions) {
            $resolved = $this->defaultOptions->mergeWith($options);
        } else {
            $resolved = clone $this->defaultOptions;
        }

        $baseClass = BUILTIN_CLASS_MAP[$this->baseClass]
            ?? throw new \InvalidArgumentException(
                "Unknown base class '{$this->baseClass}'."
            );

        $node            = new $baseClass($resolved);
        $node->schema    = $this->schema;
        // phpcs:ignore — dynamic static property assignment via anonymous subclass
        $nodeClassValue  = $this->nodeClass;

        // Seed schema defaults into customProps
        foreach ($this->schema as $key => $fieldDef) {
            if (isset($fieldDef['default']) && !array_key_exists($key, $node->customProps)) {
                $node->customProps[$key] = $fieldDef['default'];
            }
        }

        // Override the nodeClass reported during serialization
        (function () use ($nodeClassValue): void {
            // Bind to node to allow writing protected-equivalent data
        })->bindTo($node, $node)();

        // We use a thin wrapper to override toSerialized()'s nodeClass
        return new class($node, $nodeClassValue) extends DiagramNode {
            private DiagramNode $wrapped;
            private string      $customNodeClass;

            public function __construct(DiagramNode $node, string $customNodeClass)
            {
                // Copy all state from the wrapped node
                parent::__construct();

                $this->id              = $node->id;
                $this->props           = (fn() => $this->props)->call($node); // access protected
                $this->customProps     = $node->customProps;
                $this->schema          = $node->schema;
                $this->x               = $node->x;
                $this->y               = $node->y;
                $this->wrapped         = $node;
                $this->customNodeClass = $customNodeClass;
            }

            public function toSerialized(): array
            {
                $data              = parent::toSerialized();
                $data['nodeClass'] = $this->customNodeClass;
                return $data;
            }
        };
    }

    public function toSerializedType(): array
    {
        $safeSchema = [];

        foreach ($this->schema as $key => $fieldDef) {
            $safeSchema[$key] = array_filter(
                $fieldDef,
                static fn(string $k) => !in_array($k, ['serialize', 'deserialize', 'onChange'], true),
                ARRAY_FILTER_USE_KEY,
            );
        }

        $entry = [
            'nodeClass'      => $this->nodeClass,
            'baseClass'      => $this->baseClass,
            'defaultOptions' => $this->defaultOptions->toArray(),
            'schema'         => $safeSchema,
        ];

        if ($this->name !== null) {
            $entry['name'] = $this->name;
        }

        if (!empty($this->visibleProps)) {
            $entry['visibleProps'] = $this->visibleProps;
        }

        if ($this->editProp !== null) {
            $entry['editProp'] = $this->editProp;
        }

        return $entry;
    }
}


// ── Edge ──────────────────────────────────────────────────────────────────────

final class Edge
{
    public readonly string $id;

    /** @var Point[] */
    private array $vertices = [];

    public function __construct(
        public readonly DiagramNode $source,
        public readonly DiagramNode $target,
        public string        $label          = '',
        public string        $labelColor     = Config::COLOR_EDGE_LABEL,
        public int           $labelFontSize  = Config::FONT_SIZE_PERCENT_DEFAULT,
        public string        $lineColor      = Config::COLOR_EDGE_LINE,
        public int           $lineWidth      = 2,
        public LineStyle     $lineStyle      = LineStyle::Solid,
        public ArrowMarker   $sourceArrow    = ArrowMarker::None,
        public ArrowMarker   $targetArrow    = ArrowMarker::Classic,
        public ConnectorType $connectorType  = ConnectorType::Elbow,
        public string        $description   = '',
        public ?int          $sourcePort     = null,
        public ?int          $targetPort     = null,
    ) {
        $this->id = 'edge-' . bin2hex(random_bytes(5));
    }

    public function addPathPoint(float $x, float $y): Point
    {
        $point           = new Point($x, $y);
        $this->vertices[] = $point;
        return $point;
    }

    /** @return Point[] */
    public function getPathPoints(): array
    {
        return $this->vertices;
    }

    /** @param Point[] $vertices */
    public function setVertices(array $vertices): void
    {
        $this->vertices = $vertices;
    }

    public function toSerialized(): array
    {
        return [
            'sourceId'      => $this->source->id,
            'targetId'      => $this->target->id,
            'sourcePort'    => $this->sourcePort,
            'targetPort'    => $this->targetPort,
            'label'         => $this->label,
            'labelColor'    => $this->labelColor,
            'labelFontSize' => $this->labelFontSize,
            'lineColor'     => $this->lineColor,
            'lineWidth'     => $this->lineWidth,
            'lineStyle'     => $this->lineStyle->value,
            'sourceArrow'   => $this->sourceArrow->value,
            'targetArrow'   => $this->targetArrow->value,
            'connectorType' => $this->connectorType->value,
            'description'   => $this->description,
            'vertices'      => array_map(fn(Point $p) => $p->toArray(), $this->vertices),
        ];
    }

    public function __toString(): string
    {
        return sprintf(
            '<Edge id=%s %s → %s>',
            $this->id,
            $this->source->getLabel(),
            $this->target->getLabel(),
        );
    }
}


// ── DiagramEditor ─────────────────────────────────────────────────────────────

final class DiagramEditor
{
    /** @var array<string, DiagramNode> */
    private array $nodes = [];

    /** @var Edge[] */
    private array $edges = [];

    /**
     * Stores both built-in class names and custom NodeTypeDefinition objects.
     *
     * @var array<string, string|NodeTypeDefinition>
     */
    private array $registeredNodeTypes = [];

    // ── Node type registration ────────────────────────────────────────────────

    /**
     * Register a built-in node type by its nodeClass string and FQCN.
     * Mirrors registerNodeType(label, NodeClass).
     */
    public function registerNodeType(string $label, string $fqcn): static
    {
        $this->registeredNodeTypes[$label] = $fqcn;
        return $this;
    }

    /**
     * Register a custom node type from a NodeTypeDefinition.
     * Mirrors DiagramNode.define() + registerNodeType().
     */
    public function registerCustomNodeType(NodeTypeDefinition $definition): static
    {
        $this->registeredNodeTypes[$definition->nodeClass] = $definition;
        return $this;
    }

    /**
     * Register all nine built-in node types.
     * Mirrors registerBuiltInNodes().
     */
    public function registerBuiltInNodes(): static
    {
        foreach (BUILTIN_CLASS_MAP as $nodeClass => $fqcn) {
            $this->registeredNodeTypes[$nodeClass] = $fqcn;
        }

        return $this;
    }

    public function clearRegisteredNodes(): static
    {
        $this->registeredNodeTypes = [];
        return $this;
    }

    // ── Node management ───────────────────────────────────────────────────────

    /**
     * Add a node to the diagram. Optionally set its canvas position.
     * Mirrors addNode(node, x?, y?).
     */
    public function addNode(DiagramNode $node, ?float $x = null, ?float $y = null): DiagramNode
    {
        if ($x !== null) {
            $node->x = $x;
        }

        if ($y !== null) {
            $node->y = $y;
        }

        $this->nodes[$node->id] = $node;
        return $node;
    }

    /** Mirrors removeNode(node). */
    public function removeNode(DiagramNode $node): void
    {
        unset($this->nodes[$node->id]);

        $this->edges = array_values(array_filter(
            $this->edges,
            static fn(Edge $e) => $e->source !== $node && $e->target !== $node,
        ));
    }

    /** @return DiagramNode[] */
    public function getNodes(): array
    {
        return array_values($this->nodes);
    }

    // ── Edge management ───────────────────────────────────────────────────────

    /**
     * Connect two nodes and return the created Edge.
     * Mirrors node.connectTo() / the internal addEdge mechanism.
     */
    public function connect(
        DiagramNode  $source,
        DiagramNode  $target,
        string       $label          = '',
        string       $labelColor     = Config::COLOR_EDGE_LABEL,
        int          $labelFontSize  = Config::FONT_SIZE_PERCENT_DEFAULT,
        string       $lineColor      = Config::COLOR_EDGE_LINE,
        int          $lineWidth      = 2,
        LineStyle    $lineStyle      = LineStyle::Solid,
        ArrowMarker  $sourceArrow    = ArrowMarker::None,
        ArrowMarker  $targetArrow    = ArrowMarker::Classic,
        ConnectorType $connectorType = ConnectorType::Elbow,
        string       $description   = '',
        ?int         $sourcePort     = null,
        ?int         $targetPort     = null,
    ): Edge {
        $edge = new Edge(
            source:        $source,
            target:        $target,
            label:         $label,
            labelColor:    $labelColor,
            labelFontSize: $labelFontSize,
            lineColor:     $lineColor,
            lineWidth:     $lineWidth,
            lineStyle:     $lineStyle,
            sourceArrow:   $sourceArrow,
            targetArrow:   $targetArrow,
            connectorType: $connectorType,
            description:   $description,
            sourcePort:    $sourcePort,
            targetPort:    $targetPort,
        );

        $this->edges[] = $edge;
        return $edge;
    }

    public function removeEdge(Edge $edge): void
    {
        $this->edges = array_values(
            array_filter($this->edges, static fn(Edge $e) => $e !== $edge),
        );
    }

    /** @return Edge[] */
    public function getEdges(): array
    {
        return $this->edges;
    }

    /** Mirrors clear(). */
    public function clear(): static
    {
        $this->nodes = [];
        $this->edges = [];
        return $this;
    }

    // ── Serialisation ─────────────────────────────────────────────────────────

    /**
     * Return ['nodes' => [...], 'edges' => [...]].
     * Mirrors serializeNodes().
     */
    public function serializeNodes(): array
    {
        return [
            'nodes' => array_map(fn(DiagramNode $n) => $n->toSerialized(), $this->nodes),
            'edges' => array_map(fn(Edge $e) => $e->toSerialized(), $this->edges),
        ];
    }

    /**
     * Return the list of registered node type descriptors.
     * Built-in types → plain string. Custom types → full definition array.
     * Mirrors serializeTypes().
     *
     * @return array<int, string|array<string, mixed>>
     */
    public function serializeTypes(): array
    {
        $result = [];

        foreach ($this->registeredNodeTypes as $label => $entry) {
            if (is_string($entry)) {
                // Built-in — serialize as its nodeClass string
                $result[] = $label;
            } else {
                // Custom NodeTypeDefinition
                $result[] = $entry->toSerializedType();
            }
        }

        return $result;
    }

    /**
     * Serialize the full diagram to a JSON string.
     * Mirrors serialize(includeTypes?).
     */
    public function serialize(bool $includeTypes = true): string
    {
        $data = $this->serializeNodes();

        if ($includeTypes) {
            $data['nodeTypes'] = $this->serializeTypes();
        }

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($json === false) {
            throw new \RuntimeException('JSON encoding failed: ' . json_last_error_msg());
        }

        return $json;
    }

    /**
     * Restore diagram from a JSON string or decoded array.
     * Re-registers custom node types found in the data.
     * Mirrors deserialize(json).
     */
    public function deserialize(string|array $input): static
    {
        if (is_string($input)) {
            $raw = json_decode($input, associative: true, flags: JSON_THROW_ON_ERROR);
        } else {
            $raw = $input;
        }

        if (!is_array($raw['nodes'] ?? null)) {
            throw new \InvalidArgumentException("Invalid diagram: 'nodes' must be an array.");
        }

        $this->clear();

        // ── Re-register node types ────────────────────────────────────────────
        foreach ($raw['nodeTypes'] ?? [] as $typeData) {
            if (is_string($typeData)) {
                // Built-in
                $fqcn = BUILTIN_CLASS_MAP[$typeData] ?? null;

                if ($fqcn !== null) {
                    $this->registeredNodeTypes[$typeData] = $fqcn;
                }
            } else {
                // Custom type definition
                $nodeClass = $typeData['nodeClass'];

                if (isset($this->registeredNodeTypes[$nodeClass])) {
                    continue;
                }

                $baseClass = $typeData['baseClass'];

                if (!isset(BUILTIN_CLASS_MAP[$baseClass]) && !isset($this->registeredNodeTypes[$baseClass])) {
                    throw new \InvalidArgumentException(
                        "Unknown base class '{$baseClass}' for type '{$nodeClass}'."
                    );
                }

                $definition = new NodeTypeDefinition(
                    nodeClass:      $nodeClass,
                    baseClass:      $baseClass,
                    defaultOptions: NodeOptions::fromArray($typeData['defaultOptions'] ?? []),
                    schema:         $typeData['schema'] ?? [],
                    name:           $typeData['name'] ?? null,
                    visibleProps:   $typeData['visibleProps'] ?? [],
                    editProp:       $typeData['editProp'] ?? null,
                );

                $this->registeredNodeTypes[$nodeClass] = $definition;
            }
        }

        // ── Restore nodes ─────────────────────────────────────────────────────
        /** @var array<string, DiagramNode> $idMap */
        $idMap = [];

        foreach ($raw['nodes'] as $nodeData) {
            $nodeClass = $nodeData['nodeClass'] ?? 'RectangleNode';
            $props     = NodeOptions::fromArray($nodeData['props'] ?? []);

            $registeredEntry = $this->registeredNodeTypes[$nodeClass] ?? null;

            if ($registeredEntry instanceof NodeTypeDefinition) {
                $node = $registeredEntry->instantiate($props);
            } elseif (is_string($registeredEntry)) {
                $node = new $registeredEntry($props);
            } elseif (isset(BUILTIN_CLASS_MAP[$nodeClass])) {
                $fqcn = BUILTIN_CLASS_MAP[$nodeClass];
                $node = new $fqcn($props);
            } else {
                $node = new DiagramNode($props);
            }

            // Overwrite the auto-generated id with the persisted one
            (function (string $id): void { $this->id = $id; })
                ->bindTo($node, DiagramNode::class)($nodeData['id']);

            $node->x           = isset($nodeData['x']) ? (float) $nodeData['x'] : null;
            $node->y           = isset($nodeData['y']) ? (float) $nodeData['y'] : null;
            $node->customProps = $nodeData['customProps'] ?? [];

            $this->nodes[$node->id] = $node;
            $idMap[$node->id]       = $node;
        }

        // ── Restore edges ─────────────────────────────────────────────────────
        foreach ($raw['edges'] as $edgeData) {
            $sourceId = $edgeData['sourceId'];
            $targetId = $edgeData['targetId'];

            $source = $idMap[$sourceId]
                ?? throw new \InvalidArgumentException("Edge references unknown sourceId '{$sourceId}'.");
            $target = $idMap[$targetId]
                ?? throw new \InvalidArgumentException("Edge references unknown targetId '{$targetId}'.");

            $edge = new Edge(
                source:        $source,
                target:        $target,
                label:         $edgeData['label']         ?? '',
                labelColor:    $edgeData['labelColor']    ?? Config::COLOR_EDGE_LABEL,
                labelFontSize: $edgeData['labelFontSize'] ?? Config::FONT_SIZE_PERCENT_DEFAULT,
                lineColor:     $edgeData['lineColor']     ?? Config::COLOR_EDGE_LINE,
                lineWidth:     $edgeData['lineWidth']     ?? 2,
                lineStyle:     LineStyle::from($edgeData['lineStyle']         ?? 'solid'),
                sourceArrow:   ArrowMarker::from($edgeData['sourceArrow']     ?? 'none'),
                targetArrow:   ArrowMarker::from($edgeData['targetArrow']     ?? 'classic'),
                connectorType: ConnectorType::from($edgeData['connectorType'] ?? 'elbow'),
                description:   $edgeData['description']  ?? '',
                sourcePort:    isset($edgeData['sourcePort']) ? (int) $edgeData['sourcePort'] : null,
                targetPort:    isset($edgeData['targetPort']) ? (int) $edgeData['targetPort'] : null,
            );

            $vertices = array_map(
                static fn(array $v) => Point::fromArray($v),
                $edgeData['vertices'] ?? [],
            );
            $edge->setVertices($vertices);

            $this->edges[] = $edge;
        }

        return $this;
    }

    // ── File I/O ──────────────────────────────────────────────────────────────

    /** Write diagram JSON to a file. */
    public function exportToFile(string $path, bool $includeTypes = true): void
    {
        file_put_contents($path, $this->serialize($includeTypes));
    }

    /** Load diagram JSON from a file. */
    public function importFromFile(string $path): static
    {
        if (!file_exists($path)) {
            throw new \InvalidArgumentException("File not found: {$path}");
        }

        return $this->deserialize(file_get_contents($path));
    }

    // ── Schema validation ─────────────────────────────────────────────────────

    /**
     * Validate the current diagram against schema.json.
     *
     * Requires: composer require justinrainbow/json-schema
     */
    public function validate(string $schemaPath = 'schema.json'): void
    {
        if (!class_exists(\JsonSchema\Validator::class)) {
            throw new \RuntimeException(
                'justinrainbow/json-schema not installed. ' .
                'Run: composer require justinrainbow/json-schema'
            );
        }

        $schema = json_decode(file_get_contents($schemaPath));
        $data   = json_decode($this->serialize());

        $validator = new \JsonSchema\Validator();
        $validator->validate($data, $schema);

        if (!$validator->isValid()) {
            $errors = array_map(
                static fn(array $e) => "[{$e['property']}] {$e['message']}",
                $validator->getErrors(),
            );

            throw new \RuntimeException(
                "Schema validation failed:\n" . implode("\n", $errors)
            );
        }

        echo "✓ Diagram is valid against {$schemaPath}\n";
    }

    public function __toString(): string
    {
        return sprintf(
            '<DiagramEditor nodes=%d edges=%d>',
            count($this->nodes),
            count($this->edges),
        );
    }
}


// ── Demo / smoke-test ─────────────────────────────────────────────────────────

(static function (): void {
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

    $start  = $editor->addNode(new RectangleNode('Start'),        x: 0,   y: 0);
    $review = $editor->addNode($taskDefinition->instantiate('Code Review'), x: 200, y: 0);
    $done   = $editor->addNode(new DiamondNode('Done?'),          x: 400, y: 0);
    $end    = $editor->addNode(new CircleNode('End'),             x: 600, y: 0);

    $review->setCustomProperty('assignee', 'alice');
    $review->setCustomProperty('priority', 'high');

    $editor->connect($start,  $review, label: 'begin');
    $editor->connect($review, $done,   label: 'submit', lineStyle: LineStyle::Dashed);
    $editor->connect($done,   $end,    label: 'yes',    targetArrow: ArrowMarker::Block);

    $loopEdge = $editor->connect(
        $done,   $review,
        label:         'no',
        connectorType: ConnectorType::Curved,
        sourceArrow:   ArrowMarker::Classic,
    );
    $loopEdge->addPathPoint(400, 80);

    $json = $editor->serialize();
    echo "── Serialized (first 600 chars) ─────────────────\n";
    echo substr($json, 0, 600) . "...\n\n";

    // Round-trip
    $editor2 = new DiagramEditor();
    $editor2->deserialize($json);

    echo "── Round-trip ───────────────────────────────────\n";
    echo 'Nodes: ' . implode(', ', array_map(fn($n) => $n->getLabel(), $editor2->getNodes())) . "\n";
    echo 'Edges: ' . count($editor2->getEdges()) . "\n\n";

    // File export / import
    $tmpPath = sys_get_temp_dir() . '/diagram.json';
    $editor->exportToFile($tmpPath);

    $editor3 = (new DiagramEditor())->importFromFile($tmpPath);
    echo "── Imported from file ───────────────────────────\n";
    echo $editor3 . "\n\n";

    // Schema validation (requires justinrainbow/json-schema)
    try {
        $editor->validate('schema.json');
    } catch (\RuntimeException $e) {
        echo $e->getMessage() . "\n";
    }
})();
