/**
 * TDD Test: Graph Data Transformation Utility
 * Tests BEFORE implementation (Test-Driven Agent pattern)
 */
import { describe, it, expect } from 'vitest';
import { transformAPIToGraphData, calculateNodeSize, getNodeColor } from '../../utils/graph-transformer';
import type { APIGraphResponse } from '../../types/graph';

describe('graph-transformer', () => {
  describe('getNodeColor', () => {
    it('should return correct color for each entity type', () => {
      expect(getNodeColor('concept')).toBe('#FF70A6');
      expect(getNodeColor('technology')).toBe('#FF9770');
      expect(getNodeColor('idea')).toBe('#FFD670');
      expect(getNodeColor('person')).toBe('#70E0FF');
      expect(getNodeColor('technique')).toBe('#A770FF');
      expect(getNodeColor('architecture')).toBe('#70FFB9');
    });

    it('should return default color for unknown types', () => {
      expect(getNodeColor('unknown')).toBe('#9CA3AF');
    });
  });

  describe('calculateNodeSize', () => {
    it('should calculate node size based on number of connections', () => {
      // Node with 0 connections = min size
      expect(calculateNodeSize(0)).toBe(8);
      
      // Node with 3 connections
      expect(calculateNodeSize(3)).toBe(14);
      
      // Node with 10+ connections = max size
      expect(calculateNodeSize(15)).toBe(24);
    });

    it('should never exceed max size', () => {
      expect(calculateNodeSize(100)).toBe(24);
    });

    it('should never go below min size', () => {
      expect(calculateNodeSize(-5)).toBe(8);
    });
  });

  describe('transformAPIToGraphData', () => {
    it('should transform empty API response correctly', () => {
      const apiResponse: APIGraphResponse = {
        entities: [],
        relationships: []
      };

      const result = transformAPIToGraphData(apiResponse);

      expect(result.nodes).toEqual([]);
      expect(result.links).toEqual([]);
    });

    it('should transform single entity without relationships', () => {
      const apiResponse: APIGraphResponse = {
        entities: [
          {
            id: 1,
            name: 'Server-Side Rendering',
            entity_type: 'concept',
            description: 'Renders pages on the server',
            color: '#FF70A6'
          }
        ],
        relationships: []
      };

      const result = transformAPIToGraphData(apiResponse);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]).toMatchObject({
        id: '1',
        name: 'Server-Side Rendering',
        type: 'concept',
        description: 'Renders pages on the server',
        color: '#FF70A6',
        size: 8 // No connections
      });
      expect(result.links).toHaveLength(0);
    });

    it('should transform multiple entities with relationships', () => {
      const apiResponse: APIGraphResponse = {
        entities: [
          { id: 1, name: 'SSR', entity_type: 'concept', color: '#FF70A6' },
          { id: 2, name: 'React', entity_type: 'technology', color: '#FF9770' },
          { id: 3, name: 'Next.js', entity_type: 'technology', color: '#FF9770' }
        ],
        relationships: [
          {
            id: 1,
            source_entity_id: 1,
            target_entity_id: 2,
            relationship_type: 'related_to',
            strength: 0.8,
            ai_explanation: 'SSR is implemented using React'
          },
          {
            id: 2,
            source_entity_id: 2,
            target_entity_id: 3,
            relationship_type: 'prerequisite',
            strength: 0.9,
            ai_explanation: 'Next.js is built on React'
          }
        ]
      };

      const result = transformAPIToGraphData(apiResponse);

      // Verify nodes
      expect(result.nodes).toHaveLength(3);
      
      // SSR has 1 connection
      const ssrNode = result.nodes.find(n => n.id === '1');
      expect(ssrNode?.size).toBe(10); // calculateNodeSize(1)
      
      // React has 2 connections (most connected)
      const reactNode = result.nodes.find(n => n.id === '2');
      expect(reactNode?.size).toBe(12); // calculateNodeSize(2)
      
      // Verify links
      expect(result.links).toHaveLength(2);
      expect(result.links[0]).toMatchObject({
        source: '1',
        target: '2',
        relationshipType: 'related_to',
        strength: 0.8,
        explanation: 'SSR is implemented using React'
      });
    });

    it('should handle entities without explicit color by using type-based color', () => {
      const apiResponse: APIGraphResponse = {
        entities: [
          { id: 1, name: 'Architecture Pattern', entity_type: 'architecture' }
        ],
        relationships: []
      };

      const result = transformAPIToGraphData(apiResponse);

      expect(result.nodes[0].color).toBe('#70FFB9'); // architecture color
    });

    it('should correctly count bidirectional relationships for node size', () => {
      const apiResponse: APIGraphResponse = {
        entities: [
          { id: 1, name: 'A', entity_type: 'concept' },
          { id: 2, name: 'B', entity_type: 'concept' }
        ],
        relationships: [
          {
            id: 1,
            source_entity_id: 1,
            target_entity_id: 2,
            relationship_type: 'related_to',
            strength: 0.5
          }
        ]
      };

      const result = transformAPIToGraphData(apiResponse);

      // Both A and B should have 1 connection
      expect(result.nodes[0].size).toBe(10); // calculateNodeSize(1)
      expect(result.nodes[1].size).toBe(10); // calculateNodeSize(1)
    });
  });
});
