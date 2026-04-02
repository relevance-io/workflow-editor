import type { SerializedDiagram, SerializedNodeType } from './types';
import { UnknownNodeTypeError } from './types';
import { DiagramNode } from './node';
import type { NodeConstructor } from './node';
import {
  CircleNode,
  DiamondNode,
  EllipseNode,
  HexagonNode,
  OctagonNode,
  PentagonNode,
  RectangleNode,
  SquareNode,
  TriangleNode,
} from './nodes';
import { DiagramEditor } from './editor';
import { Edge } from './edges';

declare global {
  interface Window {
    DiagramEditor: typeof DiagramEditor;
    DiagramNode: typeof DiagramNode;
    RectangleNode: typeof RectangleNode;
    SquareNode: typeof SquareNode;
    EllipseNode: typeof EllipseNode;
    CircleNode: typeof CircleNode;
    DiamondNode: typeof DiamondNode;
    TriangleNode: typeof TriangleNode;
    HexagonNode: typeof HexagonNode;
    PentagonNode: typeof PentagonNode;
    OctagonNode: typeof OctagonNode;
    UnknownNodeTypeError: typeof UnknownNodeTypeError;
  }
}

Object.assign(window, {
  DiagramEditor,
  DiagramNode,
  RectangleNode,
  SquareNode,
  EllipseNode,
  CircleNode,
  DiamondNode,
  TriangleNode,
  HexagonNode,
  PentagonNode,
  OctagonNode,
  UnknownNodeTypeError,
});

export {
  DiagramEditor,
  DiagramNode,
  RectangleNode,
  SquareNode,
  EllipseNode,
  CircleNode,
  DiamondNode,
  TriangleNode,
  HexagonNode,
  PentagonNode,
  OctagonNode,
  UnknownNodeTypeError,
  Edge,
  NodeConstructor,
  SerializedDiagram,
  SerializedNodeType,
};
