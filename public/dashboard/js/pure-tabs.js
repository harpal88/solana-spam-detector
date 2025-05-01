/**
 * Pure JavaScript tab functionality for the dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing pure tabs...');
  
  // First tab set
  setupPureTabs('collectionTabs');
  
  // Second tab set
  setupPureTabs('dataCollectionTabs');
});

/**
 * Set up pure tabs
 * @param {string} tabsId - ID of the tabs container
 */
function setupPureTabs(tabsId) {
  // Get the tab container
  const tabContainer = document.getElementById(tabsId);
  if (!tabContainer) {
    console.warn(`Tab container not found: ${tabsId}`);
    return;
  }
  
  // Get all tab links in this container
  const tabLinks = tabContainer.querySelectorAll('.nav-link');
  
  // Get the tab content container
  const tabContentId = tabsId + 'Content';
  const tabContent = document.getElementById(tabContentId);
  if (!tabContent) {
    console.warn(`Tab content container not found: ${tabContentId}`);
    return;
  }
  
  // Get all tab panes in this container
  const tabPanes = tabContent.querySelectorAll('.tab-pane');
  
  // Add click event to each tab link
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all tabs
      tabLinks.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });
      
      // Add active class to clicked tab
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      
      // Get the target tab pane
      const targetId = this.getAttribute('data-bs-target');
      
      // Remove active and show classes from all tab panes
      tabPanes.forEach(pane => {
        pane.classList.remove('active', 'show');
      });
      
      // Add active and show classes to target tab pane
      const targetPane = document.querySelector(targetId);
      if (targetPane) {
        targetPane.classList.add('active', 'show');
      } else {
        console.warn(`Target pane not found: ${targetId}`);
      }
    });
  });
  
  // Activate the first tab by default
  if (tabLinks.length > 0) {
    tabLinks[0].click();
  }
}
