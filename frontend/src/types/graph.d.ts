/**
 * Graph Data Types for D3.js v7.9.0 Visualization
 */

export interface GraphNode {
  id: string;
  name: string;
  type: 'concept' | 'technology' | 'idea' | 'person' | 'technique' | 'architecture';
  description?: string;
  color: string;
  size: number; // Node radius based on centrality/importance
  x?: number; // D3 will populate these
  y?: number;
  fx?: number | null; // Fixed positions
  fy?: number | null;
  timestamp?: number | null; // Timestamp in seconds for YouTube sync
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relationshipType: string;
  strength: number; // 0.0 to 1.0
  explanation?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// API Response types
export interface Entity {
  id: number;
  name: string;
  entity_type: string;
  description?: string;
  color?: string;
  timestamp?: number | null;
}

export interface Relationship {
  id: number;
  source_entity_id: number;
  target_entity_id: number;
  relationship_type: string;
  strength: number;
  ai_explanation?: string;
}

export interface APIGraphResponse {
  entities: Entity[];
  relationships: Relationship[];
}
