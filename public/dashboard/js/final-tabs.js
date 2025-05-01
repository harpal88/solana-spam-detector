/**
 * Final simplified tab functionality for the dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing final tabs...');
  
  // Get all tab links
  const tabLinks = document.querySelectorAll('.nav-tabs .nav-link');
  
  // Add click event to each tab link
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get the parent tab container
      const tabContainer = this.closest('.nav-tabs');
      
      // Remove active class from all tabs in this container
      tabContainer.querySelectorAll('.nav-link').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });
      
      // Add active class to clicked tab
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      
      // Get the target tab pane
      const targetId = this.getAttribute('data-bs-target');
      
      // Get the tab content container
      const tabContentId = tabContainer.getAttribute('id') + 'Content';
      const tabContent = document.getElementById(tabContentId);
      
      if (tabContent) {
        // Remove active and show classes from all tab panes in this container
        tabContent.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active', 'show');
        });
        
        // Add active and show classes to target tab pane
        const targetPane = document.querySelector(targetId);
        if (targetPane) {
          targetPane.classList.add('active', 'show');
        }
      }
    });
  });
  
  // Activate the first tab in each tab container
  document.querySelectorAll('.nav-tabs').forEach(tabContainer => {
    const firstTab = tabContainer.querySelector('.nav-link');
    if (firstTab) {
      firstTab.click();
    }
  });
});
