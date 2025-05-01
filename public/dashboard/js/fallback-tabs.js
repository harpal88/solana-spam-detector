/**
 * Fallback tab functionality for the dashboard
 * This script provides basic tab functionality if Bootstrap's JavaScript fails to load
 */

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Fallback tabs initialized');
  
  // Get all tab elements
  const tabLinks = document.querySelectorAll('[data-bs-toggle="tab"]');
  
  // Add click event listener to each tab
  tabLinks.forEach(function(tabLink) {
    tabLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get the target tab pane
      const targetId = this.getAttribute('data-bs-target');
      const targetPane = document.querySelector(targetId);
      
      if (!targetPane) return;
      
      // Remove active class from all tabs and tab panes
      document.querySelectorAll('[data-bs-toggle="tab"]').forEach(function(tab) {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });
      
      document.querySelectorAll('.tab-pane').forEach(function(pane) {
        pane.classList.remove('show', 'active');
      });
      
      // Add active class to clicked tab and its tab pane
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      targetPane.classList.add('show', 'active');
    });
  });
  
  // Activate the first tab by default
  if (tabLinks.length > 0) {
    tabLinks[0].click();
  }
});
