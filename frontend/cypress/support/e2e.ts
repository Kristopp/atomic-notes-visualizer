// Cypress E2E support file
// Load commands, custom commands, etc.

/// <reference types="cypress" />

// Prevent TypeScript errors
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to wait for graph to render
       */
      waitForGraph(): Chainable<void>;
    }
  }
}

// Custom command to wait for D3 graph to be rendered
Cypress.Commands.add('waitForGraph', () => {
  cy.get('svg', { timeout: 10000 }).should('be.visible');
  cy.get('circle.node', { timeout: 10000 }).should('have.length.greaterThan', 0);
});

export {};
