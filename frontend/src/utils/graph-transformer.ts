/**
 * Graph Data Transformation Utility
 * Transforms backend API responses into D3.js-compatible graph data
 */
import type { APIGraphResponse, GraphData, GraphNode, GraphLink } from '../types/graph';

/**
 * Color mapping for entity types
 * Maps to Tailwind custom colors from tailwind.config.js
 */
const ENTITY_TYPE_COLORS: Record<string, string> = {
  concept: '#FF70A6',      // Pink
  technology: '#FF9770',   // Orange
  idea: '#FFD670',         // Yellow
  person: '#70E0FF',       // Cyan
  technique: '#A770FF',    // Purple
  architecture: '#70FFB9', // Green
};

const DEFAULT_COLOR = '#9CA3AF'; // Gray-400 for unknown types

/**
 * Get color for an entity type
 * @param entityType - The entity type (concept, technology, etc.)
 * @returns Hex color code
 */
export function getNodeColor(entityType: string): string {
  return ENTITY_TYPE_COLORS[entityType] || DEFAULT_COLOR;
}

/**
 * Calculate node size based on number of connections (centrality)
 * Each connection adds 2px to the base size, capped at max
 * @param connections - Number of edges connected to this node
 * @returns Node radius in pixels
 */
export function calculateNodeSize(connections: number): number {
  const MIN_SIZE = 8;
  const MAX_SIZE = 24;
  const SIZE_PER_CONNECTION = 2;

  // Handle negative connections
  if (connections < 0) return MIN_SIZE;

  // Calculate size: base + (connections * increment)
  const size = MIN_SIZE + (connections * SIZE_PER_CONNECTION);

  // Clamp to max size
  return Math.min(size, MAX_SIZE);
}

/**
 * Transform API response into D3.js-compatible graph data
 * @param apiResponse - Raw API response with entities and relationships
 * @returns GraphData ready for D3.js force simulation
 */
export function transformAPIToGraphData(apiResponse: APIGraphResponse): GraphData {
  const { entities, relationships } = apiResponse;

  // Count connections for each entity to calculate node size
  const connectionCounts = new Map<number, number>();

  relationships.forEach((rel) => {
    connectionCounts.set(
      rel.source_entity_id,
      (connectionCounts.get(rel.source_entity_id) || 0) + 1
    );
    connectionCounts.set(
      rel.target_entity_id,
      (connectionCounts.get(rel.target_entity_id) || 0) + 1
    );
  });

  // Transform entities to graph nodes
  const nodes: GraphNode[] = entities.map((entity) => {
    const connections = connectionCounts.get(entity.id) || 0;
    const color = entity.color || getNodeColor(entity.entity_type);

    return {
      id: String(entity.id),
      name: entity.name,
      type: entity.entity_type as GraphNode['type'],
      description: entity.description,
      color,
      size: calculateNodeSize(connections),
    };
  });

  // Transform relationships to graph links
  const links: GraphLink[] = relationships.map((rel) => ({
    source: String(rel.source_entity_id),
    target: String(rel.target_entity_id),
    relationshipType: rel.relationship_type,
    strength: rel.strength,
    explanation: rel.ai_explanation,
  }));

  return { nodes, links };
}
