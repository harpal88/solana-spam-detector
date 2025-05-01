/**
 * Chart.js Fallback
 * This script provides a minimal fallback for Chart.js functionality
 * when the CDN version fails to load due to CSP or other issues.
 */

// Check if Chart is already defined
if (typeof Chart === 'undefined') {
  console.log('Chart.js not loaded, using fallback');
  
  // Create a minimal Chart class
  window.Chart = class Chart {
    constructor(ctx, config) {
      this.ctx = ctx;
      this.config = config;
      this.type = config.type;
      this.data = config.data;
      this.options = config.options;
      
      // Draw a simple placeholder
      this.render();
      
      console.log(`Created fallback chart of type: ${this.type}`);
      return this;
    }
    
    render() {
      if (!this.ctx) return;
      
      const canvas = this.ctx.canvas;
      const ctx = this.ctx;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw placeholder text
      ctx.fillStyle = '#666';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Chart visualization unavailable', canvas.width / 2, canvas.height / 2 - 15);
      ctx.fillText('(Chart.js not loaded)', canvas.width / 2, canvas.height / 2 + 15);
      
      // Draw border
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    }
    
    update() {
      this.render();
    }
    
    destroy() {
      // Nothing to do in fallback
    }
  };
  
  console.log('Chart.js fallback initialized');
}
