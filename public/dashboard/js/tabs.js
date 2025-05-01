/**
 * Simple tab functionality for the dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing tabs...');
  
  // Initialize tabs
  initTabs('#collectionTabs');
  initTabs('#dataCollectionTabs');
  
  // Show status message
  showStatus('Dashboard loaded successfully.', false, 3000);
});

/**
 * Initialize tabs for a given tab container
 * @param {string} tabContainerId - ID of the tab container
 */
function initTabs(tabContainerId) {
  const tabs = document.querySelectorAll(`${tabContainerId} [data-bs-toggle="tab"]`);
  
  if (tabs.length === 0) {
    console.warn(`No tabs found for container: ${tabContainerId}`);
    return;
  }
  
  console.log(`Initializing ${tabs.length} tabs for ${tabContainerId}`);
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function(event) {
      event.preventDefault();
      
      // Remove active class from all tabs in this container
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      
      // Add active class to clicked tab
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      
      // Hide all tab panes for this container
      const tabContent = document.querySelector(tabContainerId + 'Content');
      if (tabContent) {
        const tabPanes = tabContent.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
          pane.classList.remove('show', 'active');
        });
      }
      
      // Show the target tab pane
      const targetId = this.getAttribute('data-bs-target');
      const targetPane = document.querySelector(targetId);
      if (targetPane) {
        targetPane.classList.add('show', 'active');
      } else {
        console.warn(`Target pane not found: ${targetId}`);
      }
    });
  });
  
  // Activate the first tab by default
  if (tabs.length > 0) {
    console.log(`Activating first tab for ${tabContainerId}`);
    tabs[0].click();
  }
}

/**
 * Show status message
 * @param {string} message - Status message
 * @param {boolean} loading - Whether to show loading spinner
 * @param {number} timeout - Timeout in milliseconds
 */
function showStatus(message, loading, timeout = 0) {
  const statusMessages = document.getElementById('statusMessages');
  const statusText = document.getElementById('statusText');
  
  if (statusMessages && statusText) {
    statusText.textContent = message;
    statusMessages.classList.remove('d-none');
    
    const spinner = statusMessages.querySelector('.spinner-border');
    if (spinner) {
      if (loading) {
        spinner.classList.remove('d-none');
      } else {
        spinner.classList.add('d-none');
      }
    }
    
    if (timeout > 0) {
      setTimeout(() => {
        statusMessages.classList.add('d-none');
      }, timeout);
    }
  }
}
