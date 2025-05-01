/**
 * Very simple tab functionality for the dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing simple tabs...');
  
  // First tab set
  setupSimpleTabs('#collectionTabs', '#collectionTabsContent');
  
  // Second tab set
  setupSimpleTabs('#dataCollectionTabs', '#dataCollectionTabsContent');
});

/**
 * Set up simple tabs
 * @param {string} tabsSelector - Selector for the tabs container
 * @param {string} contentSelector - Selector for the tab content container
 */
function setupSimpleTabs(tabsSelector, contentSelector) {
  // Get all tab links
  const tabLinks = document.querySelectorAll(`${tabsSelector} .nav-link`);
  
  // Get all tab panes
  const tabPanes = document.querySelectorAll(`${contentSelector} .tab-pane`);
  
  // Add click event to each tab link
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all tabs
      tabLinks.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });
      
      // Remove active and show classes from all tab panes
      tabPanes.forEach(pane => {
        pane.classList.remove('active', 'show');
      });
      
      // Add active class to clicked tab
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      
      // Get the target tab pane and activate it
      const targetId = this.getAttribute('data-bs-target');
      const targetPane = document.querySelector(targetId);
      if (targetPane) {
        targetPane.classList.add('active', 'show');
      }
    });
  });
  
  // Activate the first tab by default
  if (tabLinks.length > 0) {
    tabLinks[0].click();
  }
}
