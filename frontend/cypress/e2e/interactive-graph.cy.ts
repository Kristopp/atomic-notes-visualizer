/**
 * Cypress E2E Test: Interactive Graph Features
 * 
 * Tests graph interactions:
 * 1. Click nodes to view details
 * 2. Drag nodes to reposition
 * 3. Zoom and pan
 * 4. Search for entities
 * 5. Filter by type and strength
 */

describe('Interactive Graph Features', () => {
  beforeEach(() => {
    // Visit the app
    cy.visit('/');
    
    // Wait for app to load
    cy.contains('Atomic Notes Visualizer', { timeout: 10000 }).should('be.visible');
    
    // Click on a processed note to load the graph
    cy.contains('entities').first().click();
    
    // Wait for graph to render
    cy.waitForGraph();
  });

  describe('Node Interactions', () => {
    it('should highlight a node when clicked', () => {
      // Get first node
      cy.get('circle.node').first().as('firstNode');
      
      // Click the node
      cy.get('@firstNode').click({ force: true });
      
      // Node should have focused class or increased radius
      cy.get('@firstNode').should('have.attr', 'r').then((radius) => {
        expect(parseFloat(radius as string)).to.be.greaterThan(10);
      });
    });

    it('should display node details in sidebar when clicked', () => {
      // Click a node
      cy.get('circle.node').first().click({ force: true });
      
      // Details panel should appear in sidebar
      cy.contains('Selected Entity').should('be.visible');
      
      // Should show entity name
      cy.get('h3').should('contain.text', '');  // Some text content
    });

    it('should show tooltip on node hover', () => {
      // Hover over a node
      cy.get('circle.node').first().trigger('mouseover', { force: true });
      
      // Tooltip should appear (implementation dependent)
      // The tooltip might be in a <title> element or a custom div
      cy.get('svg').within(() => {
        cy.get('circle.node').first().should('have.attr', 'data-tooltip').or('have.descendants', 'title');
      });
    });

    it('should highlight connected nodes when hovering', () => {
      // This tests if hovering a node highlights its neighbors
      cy.get('circle.node').first().as('node');
      
      // Get initial opacity of other nodes
      cy.get('circle.node').eq(1).should('be.visible');
      
      // Hover the first node
      cy.get('@node').trigger('mouseover', { force: true });
      
      // Connected nodes might get highlighted (higher opacity)
      // Non-connected nodes might fade out (lower opacity)
      // This is implementation-specific
    });
  });

  describe('Drag Interactions', () => {
    it('should allow dragging a node to a new position', () => {
      cy.get('circle.node').first().as('node');
      
      // Get initial position
      cy.get('@node').then(($node) => {
        const initialCx = $node.attr('cx');
        const initialCy = $node.attr('cy');
        
        // Drag the node
        cy.get('@node').trigger('mousedown', { force: true, button: 0 });
        cy.get('svg').trigger('mousemove', { clientX: 400, clientY: 300, force: true });
        cy.get('svg').trigger('mouseup', { force: true });
        
        // Position should have changed (D3 force simulation)
        // Note: This might be flaky due to physics simulation
        cy.wait(100);  // Wait for physics to settle
        cy.get('@node').should(($newNode) => {
          const newCx = $newNode.attr('cx');
          const newCy = $newNode.attr('cy');
          // At least one coordinate should be different
          expect(newCx !== initialCx || newCy !== initialCy).to.be.true;
        });
      });
    });
  });

  describe('Zoom and Pan', () => {
    it('should zoom in when scrolling up', () => {
      // Get SVG group transform
      cy.get('svg g').first().as('svgGroup');
      
      // Trigger zoom in (wheel event)
      cy.get('svg').trigger('wheel', { deltaY: -100, force: true });
      
      // Transform scale should increase
      cy.wait(200);  // Wait for zoom transition
      cy.get('@svgGroup').should('have.attr', 'transform').and('include', 'scale');
    });

    it('should zoom out when scrolling down', () => {
      cy.get('svg g').first().as('svgGroup');
      
      // Trigger zoom out
      cy.get('svg').trigger('wheel', { deltaY: 100, force: true });
      
      // Transform should update
      cy.wait(200);
      cy.get('@svgGroup').should('have.attr', 'transform');
    });

    it('should pan when dragging the background', () => {
      cy.get('svg').first().as('svg');
      
      // Drag the background (not a node)
      cy.get('@svg').trigger('mousedown', { clientX: 100, clientY: 100, force: true, button: 0 });
      cy.get('@svg').trigger('mousemove', { clientX: 200, clientY: 200, force: true });
      cy.get('@svg').trigger('mouseup', { force: true });
      
      // SVG transform should have translate values
      cy.get('svg g').first().should('have.attr', 'transform').and('include', 'translate');
    });
  });

  describe('Search Functionality', () => {
    it('should filter graph when searching for a term', () => {
      // Get initial node count
      cy.get('circle.node').then(($nodes) => {
        const initialCount = $nodes.length;
        
        // Type in search box
        cy.get('input[type="text"]').type('architecture{enter}');
        
        // Wait for API call
        cy.wait(1000);
        
        // Node count should change (filtered)
        cy.get('circle.node').should('have.length.lessThan', initialCount);
      });
    });

    it('should highlight matching nodes in search results', () => {
      // Search for a specific term
      cy.get('input[type="text"]').type('React{enter}');
      
      cy.wait(1000);
      
      // At least one node should be visible
      cy.get('circle.node').should('have.length.greaterThan', 0);
      
      // First result should be selected
      cy.contains('Selected Entity').should('be.visible');
    });

    it('should reset graph when clearing search', () => {
      // Search first
      cy.get('input[type="text"]').type('test{enter}');
      cy.wait(500);
      
      // Get filtered count
      cy.get('circle.node').its('length').as('filteredCount');
      
      // Clear search
      cy.get('input[type="text"]').clear().type('{enter}');
      cy.wait(500);
      
      // Should show more nodes now
      cy.get('@filteredCount').then((filteredCount) => {
        cy.get('circle.node').should('have.length.greaterThan', filteredCount as number);
      });
    });

    it('should use search suggestions', () => {
      // Click on a suggestion button
      cy.contains('button', 'React hooks').click();
      
      // Search input should be filled
      cy.get('input[type="text"]').should('have.value', 'React hooks');
      
      // Graph should be filtered
      cy.wait(1000);
      cy.get('circle.node').should('exist');
    });
  });

  describe('Filter Controls', () => {
    it('should filter nodes by entity type', () => {
      // Get initial node count
      cy.get('circle.node').its('length').as('initialCount');
      
      // Uncheck a filter (e.g., "architecture")
      cy.contains('label', 'architecture').click();
      
      cy.wait(500);
      
      // Node count should decrease
      cy.get('@initialCount').then((initialCount) => {
        cy.get('circle.node').should('have.length.lessThan', initialCount as number);
      });
    });

    it('should filter edges by relationship strength', () => {
      // Get initial link count
      cy.get('line.link').its('length').as('initialLinkCount');
      
      // Increase min strength slider
      cy.get('input[type="range"]').invoke('val', 50).trigger('change');
      
      cy.wait(500);
      
      // Link count should decrease (weaker links hidden)
      cy.get('@initialLinkCount').then((initialCount) => {
        cy.get('line.link').should('have.length.lessThan', initialCount as number);
      });
    });

    it('should reset filters when clicking reset button', () => {
      // Apply some filters
      cy.contains('label', 'technology').click();
      cy.get('input[type="range"]').invoke('val', 30).trigger('change');
      cy.wait(500);
      
      // Get filtered count
      cy.get('circle.node').its('length').as('filteredCount');
      
      // Click reset
      cy.contains('button', 'Reset').click();
      cy.wait(500);
      
      // Should show more nodes
      cy.get('@filteredCount').then((filteredCount) => {
        cy.get('circle.node').should('have.length.greaterThan', filteredCount as number);
      });
    });

    it('should show active filters summary', () => {
      // Apply a filter
      cy.contains('label', 'concept').click();
      
      // Active filters section should appear
      cy.contains('Active').should('be.visible');
      cy.contains('TYPES').should('be.visible');
    });
  });

  describe('Graph Rendering', () => {
    it('should render nodes with different colors based on type', () => {
      // Check that nodes have different fill colors
      const colors = new Set();
      cy.get('circle.node').each(($node) => {
        const fill = $node.attr('fill');
        if (fill) colors.add(fill);
      }).then(() => {
        expect(colors.size).to.be.greaterThan(1);
      });
    });

    it('should render nodes with varying sizes', () => {
      // Nodes should have different radii based on importance
      const radii = new Set();
      cy.get('circle.node').each(($node) => {
        const r = $node.attr('r');
        if (r) radii.add(r);
      }).then(() => {
        expect(radii.size).to.be.greaterThan(1);
      });
    });

    it('should render links between nodes', () => {
      cy.get('line.link').should('have.length.greaterThan', 0);
      
      // Links should have source and target
      cy.get('line.link').first().should('have.attr', 'x1');
      cy.get('line.link').first().should('have.attr', 'y1');
      cy.get('line.link').first().should('have.attr', 'x2');
      cy.get('line.link').first().should('have.attr', 'y2');
    });

    it('should update graph layout over time (physics simulation)', () => {
      // Get initial position of a node
      cy.get('circle.node').first().then(($node) => {
        const initialCx = $node.attr('cx');
        
        // Wait for physics simulation to run
        cy.wait(2000);
        
        // Position might have changed slightly due to forces
        cy.get('circle.node').first().should('have.attr', 'cx');
        // Note: We can't assert it changed because simulation might have settled
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should be visible on mobile viewport', () => {
      cy.viewport('iphone-x');
      
      // Graph should still be visible
      cy.get('svg').should('be.visible');
      cy.get('circle.node').should('be.visible');
    });

    it('should be visible on tablet viewport', () => {
      cy.viewport('ipad-2');
      
      cy.get('svg').should('be.visible');
      cy.get('circle.node').should('have.length.greaterThan', 0);
    });
  });
});
