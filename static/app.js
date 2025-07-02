class SkyInteractiveApp {
  constructor() {
    this.skyEngine = null;
    this.isLoading = true;
    this.skyData = null;

    this.initializeApp();
  }

  async initializeApp() {
    try {
      // Initialize sky engine
      this.skyEngine = new SkyEngine('skyCanvas');

      // Setup UI event listeners
      this.setupUIEventListeners();

      // Load sky data
      await this.loadSkyData();

      // Initialize view
      this.initializeView();

      // Hide loading indicator
      this.hideLoading();

      console.log('App Cielo Interattivo inizializzata con successo');
    } catch (error) {
      console.error("Errore nell'inizializzazione dell'app:", error);
      this.showError('Errore nel caricamento dei dati del cielo. Ricarica la pagina.');
    }
  }

  setupUIEventListeners() {
    // Constellation toggle
    document.getElementById('toggleConstellations').addEventListener('click', () => {
      this.toggleConstellations();
    });

    // Info panel toggle
    document.getElementById('toggleInfo').addEventListener('click', () => {
      this.toggleInfoPanel();
    });

    // Close info panel
    document.getElementById('closeInfo').addEventListener('click', () => {
      this.closeInfoPanel();
    });

    // Bottom navigation
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.handleNavigation(e.target.closest('.nav-btn').dataset.view);
      });
    });

    // Handle orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.skyEngine.resizeCanvas();
        this.skyEngine.render();
      }, 100);
    });

    // Close tooltip when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#objectTooltip')) {
        document.getElementById('objectTooltip').classList.remove('show');
      }
    });
  }

  async loadSkyData() {
    try {
      const response = await fetch('/api/sky-data');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.skyData = await response.json();
      this.skyEngine.setSkyData(this.skyData);

      // Update moon phase display
      this.updateMoonDisplay();

      console.log('Sky data loaded:', this.skyData);
    } catch (error) {
      console.error('Error loading sky data:', error);
      throw error;
    }
  }

  initializeView() {
    // Set initial view to show Leo and Sagittarius prominently
    // Leo is around RA 152°, Dec 12°
    // Sagittarius is around RA 276°, Dec -30°
    // Position view to show both if possible, or Leo by default
    this.skyEngine.viewSettings.centerRA = 180;
    this.skyEngine.viewSettings.centerDec = 15;
    this.skyEngine.viewSettings.zoom = 1.2;

    // Start with constellations shown
    this.skyEngine.viewSettings.showConstellations = true;
    document.getElementById('toggleConstellations').classList.add('active');

    this.skyEngine.render();
  }

  updateMoonDisplay() {
    if (!this.skyData?.moon) return;

    const moonIcon = document.getElementById('moonIcon');
    const moonPhase = document.getElementById('moonPhase');

    const phase = this.skyData.moon.phase;
    let phaseText = '';
    let iconStyle = '';

    if (phase < 0.1) {
      phaseText = 'Luna Nuova';
      iconStyle = 'background: #333;';
    } else if (phase < 0.25) {
      phaseText = 'Luna Crescente';
      iconStyle = `background: linear-gradient(90deg, #333 50%, #f5f5f5 50%);`;
    } else if (phase < 0.5) {
      phaseText = 'Primo Quarto';
      iconStyle = `background: linear-gradient(90deg, #333 50%, #f5f5f5 50%);`;
    } else if (phase < 0.75) {
      phaseText = 'Gibbosa Crescente';
      iconStyle = `background: linear-gradient(270deg, #333 25%, #f5f5f5 25%);`;
    } else {
      phaseText = 'Luna Piena';
      iconStyle = 'background: #f5f5f5;';
    }

    moonPhase.textContent = phaseText;
    moonIcon.style.cssText = iconStyle;
  }

  toggleConstellations() {
    this.skyEngine.toggleConstellations();
    const btn = document.getElementById('toggleConstellations');
    btn.classList.toggle('active');

    // Provide haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  toggleInfoPanel() {
    const panel = document.getElementById('infoPanel');
    panel.classList.toggle('open');

    // Provide haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  closeInfoPanel() {
    document.getElementById('infoPanel').classList.remove('open');
  }

  handleNavigation(view) {
    // Update active navigation
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    switch (view) {
      case 'sky':
        // Already on sky view
        break;
      case 'search':
        this.showSearchDialog();
        break;
      case 'time':
        this.showTimeDialog();
        break;
    }

    // Provide haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  showSearchDialog() {
    // Create and show search dialog
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog';
    dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Cerca Oggetti Celesti</h3>
                <div class="search-options">
                    <button class="search-option" data-target="leo">Trova Leone</button>
                    <button class="search-option" data-target="sagittarius">Trova Sagittario</button>
                    <button class="search-option" data-target="moon">Trova Luna</button>
                    <button class="search-option" data-target="bright-stars">Stelle Brillanti</button>
                </div>
                <button class="close-dialog">Chiudi</button>
            </div>
        `;

    // Add styles
    dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 300;
        `;

    const content = dialog.querySelector('.dialog-content');
    content.style.cssText = `
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 20px;
            max-width: 300px;
            width: 90%;
            color: white;
            text-align: center;
        `;

    // Style search options
    dialog.querySelectorAll('.search-option').forEach((btn) => {
      btn.style.cssText = `
                display: block;
                width: 100%;
                padding: 12px;
                margin: 8px 0;
                background: rgba(100, 181, 246, 0.1);
                border: 1px solid rgba(100, 181, 246, 0.3);
                color: #64b5f6;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
    });

    // Add event listeners
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.classList.contains('close-dialog')) {
        document.body.removeChild(dialog);
      } else if (e.target.classList.contains('search-option')) {
        this.searchFor(e.target.dataset.target);
        document.body.removeChild(dialog);
      }
    });

    document.body.appendChild(dialog);
  }

  searchFor(target) {
    switch (target) {
      case 'leo':
        this.skyEngine.viewSettings.centerRA = 152;
        this.skyEngine.viewSettings.centerDec = 15;
        this.skyEngine.viewSettings.zoom = 2;
        break;
      case 'sagittarius':
        this.skyEngine.viewSettings.centerRA = 276;
        this.skyEngine.viewSettings.centerDec = -30;
        this.skyEngine.viewSettings.zoom = 2;
        break;
      case 'moon':
        if (this.skyData?.moon && this.skyData.moon.visible) {
          this.skyEngine.viewSettings.centerRA = this.skyData.moon.ra;
          this.skyEngine.viewSettings.centerDec = this.skyData.moon.dec;
          this.skyEngine.viewSettings.zoom = 3;
        }
        break;
      case 'bright-stars':
        this.skyEngine.viewSettings.centerRA = 180;
        this.skyEngine.viewSettings.centerDec = 40;
        this.skyEngine.viewSettings.zoom = 0.8;
        break;
    }

    this.skyEngine.render();

    // Flash the constellations if searching for them
    if (target === 'leo' || target === 'sagittarius') {
      this.flashConstellations();
    }
  }

  flashConstellations() {
    const wasVisible = this.skyEngine.viewSettings.showConstellations;

    // Ensure constellations are visible
    this.skyEngine.viewSettings.showConstellations = true;
    document.getElementById('toggleConstellations').classList.add('active');

    // Flash effect
    let flashCount = 0;
    const flashInterval = setInterval(() => {
      this.skyEngine.viewSettings.showConstellations = !this.skyEngine.viewSettings.showConstellations;
      this.skyEngine.render();
      flashCount++;

      if (flashCount >= 6) {
        clearInterval(flashInterval);
        this.skyEngine.viewSettings.showConstellations = true;
        this.skyEngine.render();
      }
    }, 300);
  }

  showTimeDialog() {
    // Create time dialog (placeholder for future time travel feature)
    const dialog = document.createElement('div');
    dialog.className = 'time-dialog';
    dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Impostazioni Temporali</h3>
                <p>Attuale: 1 Luglio 2024 - 22:00 UTC</p>
                <div class="time-info">
                    <p>Questa app mostra il cielo notturno come appariva il 1° luglio 2024 alle 22:00 UTC.</p>
                    <p>Le costellazioni del Leone e del Sagittario sono evidenziate nelle loro posizioni estive.</p>
                </div>
                <button class="close-dialog">Chiudi</button>
            </div>
        `;

    // Add styles
    dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 300;
        `;

    const content = dialog.querySelector('.dialog-content');
    content.style.cssText = `
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 20px;
            max-width: 350px;
            width: 90%;
            color: white;
            text-align: center;
        `;

    content.querySelector('.time-info').style.cssText = `
            background: rgba(100, 181, 246, 0.1);
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            font-size: 0.9rem;
            line-height: 1.4;
        `;

    // Add event listener
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.classList.contains('close-dialog')) {
        document.body.removeChild(dialog);
      }
    });

    document.body.appendChild(dialog);
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    loading.style.display = 'none';
    this.isLoading = false;
  }

  showError(message) {
    const loading = document.getElementById('loading');
    loading.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    background: #64b5f6;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 10px;
                ">Retry</button>
            </div>
        `;
    loading.style.display = 'block';
  }

  // Public methods for external access
  focusOnConstellation(name) {
    this.searchFor(name.toLowerCase());
  }

  getCurrentView() {
    return {
      centerRA: this.skyEngine.viewSettings.centerRA,
      centerDec: this.skyEngine.viewSettings.centerDec,
      zoom: this.skyEngine.viewSettings.zoom,
      showConstellations: this.skyEngine.viewSettings.showConstellations,
    };
  }

  setView(centerRA, centerDec, zoom = 1) {
    this.skyEngine.viewSettings.centerRA = centerRA;
    this.skyEngine.viewSettings.centerDec = centerDec;
    this.skyEngine.viewSettings.zoom = zoom;
    this.skyEngine.render();
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.skyApp = new SkyInteractiveApp();
});

// Add some useful global functions for debugging/development
window.skyUtils = {
  focusLeo: () => window.skyApp?.focusOnConstellation('leo'),
  focusSagittarius: () => window.skyApp?.focusOnConstellation('sagittarius'),
  getCurrentView: () => window.skyApp?.getCurrentView(),
  setView: (ra, dec, zoom) => window.skyApp?.setView(ra, dec, zoom),
};

// Handle page visibility changes to pause/resume animations
document.addEventListener('visibilitychange', () => {
  if (window.skyApp?.skyEngine) {
    if (document.hidden) {
      window.skyApp.skyEngine.stopAnimation();
    } else {
      window.skyApp.skyEngine.startAnimation();
    }
  }
});

// Add service worker registration for offline support (if needed)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Service worker could be added here for offline functionality
    console.log('Service Worker support detected');
  });
}
