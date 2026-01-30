/**
 * Cypress E2E Test: Upload → Process → View Graph Flow
 * 
 * Tests the complete user journey of:
 * 1. Uploading a note file
 * 2. Processing it with AI (with mock)
 * 3. Viewing the resulting knowledge graph
 */

describe('Upload and Process Note Flow', () => {
  beforeEach(() => {
    // Visit the app
    cy.visit('/');
    
    // Wait for initial load
    cy.contains('Atomic Notes Visualizer', { timeout: 10000 }).should('be.visible');
  });

  it('should display the upload panel on initial load', () => {
    cy.contains('Upload Atomic Notes').should('be.visible');
    cy.contains('Drag & drop your').should('be.visible');
  });

  it('should show existing notes in the sidebar', () => {
    // Check if notes list is visible
    cy.contains('Your Notes').should('be.visible');
    
    // Should show at least one note (from seed data)
    cy.get('[class*="glass"]').contains('entities').should('be.visible');
  });

  it('should load and display a graph when clicking on a processed note', () => {
    // Find and click on a processed note (one with entities)
    cy.contains('entities').first().click();
    
    // Wait for graph to render
    cy.waitForGraph();
    
    // Verify graph elements are present
    cy.get('svg').within(() => {
      cy.get('circle.node').should('have.length.greaterThan', 5);
      cy.get('line.link').should('have.length.greaterThan', 0);
    });
  });

  it('should upload a new note file', () => {
    // Create a test file
    const fileName = 'test-note.txt';
    const fileContent = `# Test Note on React Hooks

useState is a React Hook that lets you add state to functional components.

useEffect is a Hook for performing side effects in function components.

They revolutionized React development by making functional components powerful.`;

    // Intercept the upload API call
    cy.intercept('POST', '/api/notes/upload').as('uploadNote');
    
    // Upload file using selectFile (Cypress 10+)
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(fileContent),
      fileName: fileName,
      mimeType: 'text/plain'
    }, { force: true });
    
    // Wait for upload to complete
    cy.wait('@uploadNote').its('response.statusCode').should('eq', 200);
    
    // Verify success message or new note appears
    cy.contains(fileName, { timeout: 5000 }).should('be.visible');
  });

  it('should process an unprocessed note with AI', () => {
    // First upload a note
    const fileName = 'process-test.txt';
    const fileContent = 'React hooks are amazing. useState and useEffect changed everything.';
    
    cy.intercept('POST', '/api/notes/upload').as('uploadNote');
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(fileContent),
      fileName: fileName,
      mimeType: 'text/plain'
    }, { force: true });
    
    cy.wait('@uploadNote');
    
    // Find the unprocessed note and click process button
    cy.contains(fileName).parent().within(() => {
      // Look for "Unprocessed" badge
      cy.contains('Unprocessed').should('be.visible');
      
      // Click the process button (lightning bolt icon)
      cy.get('button[title="Process with AI"]').click();
    });
    
    // Intercept SSE processing stream
    cy.intercept('POST', '/api/notes/*/process').as('processNote');
    
    // Wait for processing to complete (this might take a while with real AI)
    // For testing, we should mock the AI responses
    cy.contains('Processing', { timeout: 60000 }).should('not.exist');
    
    // Verify the note now shows entities
    cy.contains(fileName).parent().within(() => {
      cy.contains('entities').should('be.visible');
    });
  });

  it('should display graph after successful processing', () => {
    // Assuming we have a processed note, click it
    cy.contains('entities').first().click();
    
    // Wait for graph to load
    cy.waitForGraph();
    
    // Verify graph visualization
    cy.get('svg').should('be.visible');
    
    // Check that nodes are colorful (have fill color)
    cy.get('circle.node').first().should('have.attr', 'fill').and('not.be.empty');
    
    // Check that links exist
    cy.get('line.link').should('exist');
  });

  it('should show error if backend is unreachable', () => {
    // Intercept and force error
    cy.intercept('GET', '/api/notes/', { forceNetworkError: true }).as('getNotes');
    
    // Reload the page
    cy.reload();
    
    // Should show connection error
    cy.contains('Failed to connect to backend', { timeout: 10000 }).should('be.visible');
  });

  it('should allow deleting a note', () => {
    // Find a note and click delete button
    cy.get('[class*="glass"]').contains('entities').first().parent().within(() => {
      // Hover to show delete button
      cy.get('button[title*="Delete"]').click({ force: true });
    });
    
    // Confirm deletion in modal
    cy.contains('Delete Note').should('be.visible');
    cy.contains('button', 'Delete').click();
    
    // Intercept delete API call
    cy.intercept('DELETE', '/api/notes/*').as('deleteNote');
    cy.wait('@deleteNote').its('response.statusCode').should('eq', 200);
    
    // Note should disappear from list
    // (we can't verify specific note without knowing its title)
  });
});
