class SkyInteractiveApp {
  constructor() {
    this.skyEngine = null;
    this.isLoading = true;
    this.skyData = null;
    this.isIPhone = /iPhone|iPod/.test(navigator.userAgent);
    this.touchHintsShown = false;

    this.initializeApp();
  }

  async initializeApp() {
    try {
      // Show loading with iPhone-optimized messaging
      this.showLoading('Inizializzazione del cielo stellato...');

      // Initialize sky engine
      this.skyEngine = new SkyEngine('skyCanvas');

      // Setup UI event listeners
      this.setupUIEventListeners();

      // iPhone specific optimizations
      if (this.isIPhone) {
        this.setupiPhoneOptimizations();
      }

      // Load sky data
      await this.loadSkyData();

      // Initialize view
      this.initializeView();

      // Show touch hints on iPhone
      if (this.isIPhone && !this.touchHintsShown) {
        this.showTouchHints();
      }

      // Hide loading indicator
      this.hideLoading();

      console.log('App Cielo Interattivo inizializzata con successo per iPhone');
    } catch (error) {
      console.error("Errore nell'inizializzazione dell'app:", error);
      this.showError('Errore nel caricamento dei dati del cielo. Controlla la connessione e ricarica la pagina.');
    }
  }

  setupiPhoneOptimizations() {
    // Prevent iOS Safari from bouncing
    document.body.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
      },
      { passive: false }
    );

    // Handle iOS viewport changes
    const handleViewportChange = () => {
      // Update CSS custom property for real viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);

      if (this.skyEngine) {
        setTimeout(() => {
          this.skyEngine.resizeCanvas();
          this.skyEngine.render();
        }, 150);
      }
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleViewportChange, 300);
    });

    // Initial call
    handleViewportChange();

    // Add haptic feedback support
    this.setupHapticFeedback();

    // Optimize for iPhone performance
    this.optimizePerformance();
  }

  setupHapticFeedback() {
    // Enhanced haptic patterns for different interactions
    this.hapticPatterns = {
      light: [1],
      medium: [3],
      heavy: [10],
      double: [3, 50, 3],
      success: [10, 50, 10, 50, 10],
      error: [100, 50, 100],
    };
  }

  triggerHaptic(pattern = 'light') {
    if (!this.isIPhone || !navigator.vibrate) return;

    const haptic = this.hapticPatterns[pattern] || this.hapticPatterns.light;
    navigator.vibrate(haptic);
  }

  optimizePerformance() {
    // Reduce animations when battery is low
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        if (battery.level < 0.2) {
          document.body.classList.add('low-battery');
        }
      });
    }

    // Pause animations when app is not visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.skyEngine?.stopAnimation();
      } else {
        this.skyEngine?.startAnimation();
      }
    });
  }

  showTouchHints() {
    const hints = document.querySelector('.touch-indicators');
    if (hints) {
      hints.style.display = 'flex';
      this.touchHintsShown = true;

      // Store that hints were shown
      localStorage.setItem('touchHintsShown', 'true');
    }
  }

  setupUIEventListeners() {
    // Enhanced constellation toggle with haptic feedback
    document.getElementById('toggleConstellations').addEventListener('click', () => {
      this.toggleConstellations();
      this.triggerHaptic('medium');
    });

    // Enhanced info panel toggle
    document.getElementById('toggleInfo').addEventListener('click', () => {
      this.toggleInfoPanel();
      this.triggerHaptic('light');
    });

    // Close info panel
    document.getElementById('closeInfo').addEventListener('click', () => {
      this.closeInfoPanel();
      this.triggerHaptic('light');
    });

    // Enhanced bottom navigation with haptic feedback
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const view = e.target.closest('.nav-btn').dataset.view;
        this.handleNavigation(view);
        this.triggerHaptic('light');
      });
    });

    // iPhone orientation handling
    if (this.isIPhone) {
      window.addEventListener('orientationchange', () => {
        this.handleOrientationChange();
      });
    }

    // Close tooltip when tapping elsewhere (iPhone optimized)
    document.addEventListener(
      'touchstart',
      (e) => {
        if (!e.target.closest('#objectTooltip') && !e.target.closest('#skyCanvas')) {
          document.getElementById('objectTooltip').classList.remove('show');
        }
      },
      { passive: true }
    );

    // Prevent context menu on long press (iPhone)
    if (this.isIPhone) {
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    }
  }

  handleOrientationChange() {
    // Handle iPhone orientation changes smoothly
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    loading.querySelector('p').textContent = "Adattamento all'orientamento...";

    setTimeout(() => {
      if (this.skyEngine) {
        this.skyEngine.resizeCanvas();
        this.skyEngine.render();
      }
      loading.style.display = 'none';
    }, 500);
  }

  async loadSkyData() {
    try {
      this.showLoadingProgress('Caricamento dati stellari...', 20);

      const response = await fetch('/api/sky-data');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.showLoadingProgress('Elaborazione coordinate...', 60);

      this.skyData = await response.json();
      this.skyEngine.setSkyData(this.skyData);

      this.showLoadingProgress('Configurazione costellazioni...', 80);

      // Update moon phase display
      this.updateMoonDisplay();

      this.showLoadingProgress('Finalizzazione...', 100);

      console.log('Sky data loaded:', this.skyData);

      // Success haptic feedback
      this.triggerHaptic('success');
    } catch (error) {
      console.error('Error loading sky data:', error);
      this.triggerHaptic('error');
      throw error;
    }
  }

  showLoading(message) {
    const loading = document.getElementById('loading');
    const loadingText = loading.querySelector('p');
    loadingText.textContent = message;
    loading.style.display = 'block';
  }

  showLoadingProgress(message, progress) {
    const loading = document.getElementById('loading');
    const loadingText = loading.querySelector('p');

    // Create or update progress bar
    let progressBar = loading.querySelector('.progress-bar');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.innerHTML = '<div class="progress-fill"></div>';
      loading.appendChild(progressBar);
    }

    const progressFill = progressBar.querySelector('.progress-fill');
    progressFill.style.width = `${progress}%`;
    loadingText.textContent = message;
  }

  initializeView() {
    // iPhone-optimized initial view
    if (this.isIPhone) {
      // Adjust for iPhone screen ratios
      const isLandscape = window.innerWidth > window.innerHeight;

      if (isLandscape) {
        this.skyEngine.viewSettings.centerRA = 200;
        this.skyEngine.viewSettings.centerDec = 20;
        this.skyEngine.viewSettings.zoom = 1.0;
      } else {
        // Portrait - better view of Leo and Sagittarius
        this.skyEngine.viewSettings.centerRA = 180;
        this.skyEngine.viewSettings.centerDec = 15;
        this.skyEngine.viewSettings.zoom = 1.2;
      }
    } else {
      // Default view
      this.skyEngine.viewSettings.centerRA = 180;
      this.skyEngine.viewSettings.centerDec = 15;
      this.skyEngine.viewSettings.zoom = 1.2;
    }

    // Set target view to match
    this.skyEngine.targetView.centerRA = this.skyEngine.viewSettings.centerRA;
    this.skyEngine.targetView.centerDec = this.skyEngine.viewSettings.centerDec;
    this.skyEngine.targetView.zoom = this.skyEngine.viewSettings.zoom;

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

    // Enhanced visual feedback for iPhone
    if (this.isIPhone) {
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        btn.style.transform = '';
      }, 100);
    }
  }

  toggleInfoPanel() {
    const panel = document.getElementById('infoPanel');
    const isOpening = !panel.classList.contains('open');

    panel.classList.toggle('open');

    // iPhone specific handling
    if (this.isIPhone) {
      if (isOpening) {
        // Pause sky animation to save battery when panel is open
        this.skyEngine?.stopAnimation();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
      } else {
        // Resume animation
        this.skyEngine?.startAnimation();

        // Restore body scroll
        document.body.style.overflow = '';
      }
    }
  }

  closeInfoPanel() {
    const panel = document.getElementById('infoPanel');
    panel.classList.remove('open');

    if (this.isIPhone) {
      // Resume animation and restore scroll
      this.skyEngine?.startAnimation();
      document.body.style.overflow = '';
    }
  }

  handleNavigation(view) {
    // Update active navigation with enhanced feedback
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`[data-view="${view}"]`);
    activeBtn.classList.add('active');

    // iPhone-specific visual feedback
    if (this.isIPhone) {
      activeBtn.style.transform = 'scale(0.9)';
      setTimeout(() => {
        activeBtn.style.transform = '';
      }, 150);
    }

    switch (view) {
      case 'sky':
        // Already on sky view
        this.focusOnSky();
        break;
      case 'search':
        this.showSearchDialog();
        break;
      case 'time':
        this.showTimeDialog();
        break;
    }
  }

  focusOnSky() {
    // Close any open panels and focus on sky
    this.closeInfoPanel();
    document.getElementById('objectTooltip').classList.remove('show');

    // Flash constellation highlights briefly
    this.flashConstellations();
  }

  showSearchDialog() {
    // Enhanced search dialog for iPhone
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>Cerca Oggetti Celesti</h3>
          <button class="close-dialog-btn">×</button>
        </div>
        <div class="search-options">
          <button class="search-option primary" data-target="leo">
            <span class="search-icon">🦁</span>
            <div class="search-info">
              <strong>Trova Leone</strong>
              <span>Costellazione principale</span>
            </div>
          </button>
          <button class="search-option primary" data-target="sagittarius">
            <span class="search-icon">🏹</span>
            <div class="search-info">
              <strong>Trova Sagittario</strong>
              <span>Costellazione principale</span>
            </div>
          </button>
          <button class="search-option" data-target="moon">
            <span class="search-icon">🌙</span>
            <div class="search-info">
              <strong>Trova Luna</strong>
              <span>Satellite naturale</span>
            </div>
          </button>
          <button class="search-option" data-target="bright-stars">
            <span class="search-icon">⭐</span>
            <div class="search-info">
              <strong>Stelle Brillanti</strong>
              <span>Magnitudine &lt; 2</span>
            </div>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Add iPhone-specific styling
    if (this.isIPhone) {
      dialog.style.paddingTop = 'env(safe-area-inset-top)';
      dialog.style.paddingBottom = 'env(safe-area-inset-bottom)';
    }

    // Animate in
    setTimeout(() => dialog.classList.add('show'), 10);

    // Setup event listeners
    dialog.querySelector('.close-dialog-btn').addEventListener('click', () => {
      this.closeDialog(dialog);
    });

    dialog.querySelectorAll('.search-option').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.target;
        this.searchFor(target);
        this.closeDialog(dialog);
        this.triggerHaptic('medium');
      });
    });

    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        this.closeDialog(dialog);
      }
    });
  }

  closeDialog(dialog) {
    dialog.classList.remove('show');
    setTimeout(() => {
      if (dialog.parentNode) {
        document.body.removeChild(dialog);
      }
    }, 300);
  }

  searchFor(target) {
    switch (target) {
      case 'leo':
        // Center on Leo constellation
        this.skyEngine.targetView.centerRA = 165;
        this.skyEngine.targetView.centerDec = 15;
        this.skyEngine.targetView.zoom = 1.8;
        this.showSearchSuccess('Leone trovato! Osserva le stelle dorate che formano la testa del leone.');
        this.highlightConstellation('leo');
        break;
      case 'sagittarius':
        // Center on Sagittarius constellation
        this.skyEngine.targetView.centerRA = 280;
        this.skyEngine.targetView.centerDec = -25;
        this.skyEngine.targetView.zoom = 1.6;
        this.showSearchSuccess('Sagittario trovato! Osserva le stelle rosse che formano la "teiera".');
        this.highlightConstellation('sagittarius');
        break;
      case 'moon':
        if (this.skyData?.moon) {
          this.skyEngine.targetView.centerRA = this.skyData.moon.ra;
          this.skyEngine.targetView.centerDec = this.skyData.moon.dec;
          this.skyEngine.targetView.zoom = 2.0;
          this.showSearchSuccess('Luna trovata! Osserva la sua fase attuale.');
        }
        break;
      case 'bright-stars':
        // Show overview of bright stars
        this.skyEngine.targetView.centerRA = 180;
        this.skyEngine.targetView.centerDec = 30;
        this.skyEngine.targetView.zoom = 0.8;
        this.showSearchSuccess('Vista panoramica delle stelle più brillanti del cielo.');
        break;
    }
  }

  showSearchSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">✨</span>
        <span class="toast-message">${message}</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto hide
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }

  highlightConstellation(constellationName) {
    // Store original constellation state
    const wasConstellationHidden = !this.skyEngine.viewSettings.showConstellations;

    // Enable constellation lines
    this.skyEngine.viewSettings.showConstellations = true;

    // Update the toggle button to reflect active state
    const toggleBtn = document.getElementById('toggleConstellations');
    toggleBtn.classList.add('active');

    // Set the target constellation for special highlighting
    this.skyEngine.highlightedConstellation = constellationName;

    // Trigger haptic feedback
    this.triggerHaptic('success');

    // Wait for view to settle, then start highlighting sequence
    setTimeout(() => {
      // Start pulsing effect for highlighted constellation
      this.skyEngine.startConstellationPulse(constellationName);

      // Show success message with constellation visible
      this.showConstellationHighlightToast(constellationName);

      // Auto-hide after 8 seconds if constellations were originally hidden
      if (wasConstellationHidden) {
        setTimeout(() => {
          // Stop highlighting
          this.skyEngine.highlightedConstellation = null;
          this.skyEngine.stopConstellationPulse();

          // Hide constellations again
          setTimeout(() => {
            this.skyEngine.viewSettings.showConstellations = false;
            toggleBtn.classList.remove('active');
          }, 1000);
        }, 8000);
      } else {
        // Just stop highlighting after 5 seconds if constellations stay visible
        setTimeout(() => {
          this.skyEngine.highlightedConstellation = null;
          this.skyEngine.stopConstellationPulse();
        }, 5000);
      }
    }, 1500); // Wait for smooth view transition
  }

  showConstellationHighlightToast(constellationName) {
    const constellationNames = {
      leo: 'Leone',
      sagittarius: 'Sagittario',
    };

    const toast = document.createElement('div');
    toast.className = 'constellation-highlight-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${constellationName === 'leo' ? '🦁' : '🏹'}</span>
        <span class="toast-message">
          <strong>${constellationNames[constellationName]} evidenziato!</strong><br>
          <small>Le linee scompariranno automaticamente</small>
        </span>
      </div>
    `;

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto hide
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  flashConstellations() {
    // Temporarily show constellations if hidden
    const wasHidden = !this.skyEngine.viewSettings.showConstellations;

    if (wasHidden) {
      this.skyEngine.viewSettings.showConstellations = true;
    }

    // Flash effect
    const canvas = document.getElementById('skyCanvas');
    canvas.style.filter = 'brightness(1.3) contrast(1.2)';

    setTimeout(() => {
      canvas.style.filter = '';

      // Hide constellations again if they were hidden
      if (wasHidden) {
        setTimeout(() => {
          this.skyEngine.viewSettings.showConstellations = false;
        }, 1000);
      }
    }, 500);
  }

  showTimeDialog() {
    // Time dialog for iPhone
    const dialog = document.createElement('div');
    dialog.className = 'time-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>Informazioni Temporali</h3>
          <button class="close-dialog-btn">×</button>
        </div>
        <div class="time-info">
          <div class="time-item">
            <div class="time-icon">📅</div>
            <div class="time-details">
              <strong>Data Simulata</strong>
              <span>1 Luglio 2024</span>
            </div>
          </div>
          <div class="time-item">
            <div class="time-icon">🌍</div>
            <div class="time-details">
              <strong>Posizione</strong>
              <span>Roma, Italia</span>
            </div>
          </div>
          <div class="time-item">
            <div class="time-icon">🌌</div>
            <div class="time-details">
              <strong>Condizioni</strong>
              <span>Cielo sereno, visibilità ottimale</span>
            </div>
          </div>
        </div>
        <div class="time-note">
          <p><strong>Nota:</strong> Questa è una simulazione del cielo notturno per la data e ora specificate. Le posizioni degli oggetti celesti corrispondono alla realtà astronomica del momento.</p>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // iPhone safe areas
    if (this.isIPhone) {
      dialog.style.paddingTop = 'env(safe-area-inset-top)';
      dialog.style.paddingBottom = 'env(safe-area-inset-bottom)';
    }

    // Animate in
    setTimeout(() => dialog.classList.add('show'), 10);

    // Close button
    dialog.querySelector('.close-dialog-btn').addEventListener('click', () => {
      this.closeDialog(dialog);
    });

    // Close on backdrop
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        this.closeDialog(dialog);
      }
    });
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    loading.style.opacity = '0';

    setTimeout(() => {
      loading.style.display = 'none';
      loading.style.opacity = '1'; // Reset for future use
    }, 300);
  }

  showError(message) {
    // iPhone-optimized error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <div class="error-text">
          <strong>Errore</strong>
          <p>${message}</p>
        </div>
        <button class="error-retry" onclick="location.reload()">
          Riprova
        </button>
      </div>
    `;

    document.body.appendChild(errorDiv);

    // Show error
    setTimeout(() => errorDiv.classList.add('show'), 10);

    // Trigger error haptic
    this.triggerHaptic('error');

    // Hide loading
    document.getElementById('loading').style.display = 'none';
  }

  // Utility methods for enhanced iPhone experience
  focusOnConstellation(name) {
    // Implementation would focus on specific constellation
    console.log(`Focusing on constellation: ${name}`);
  }

  getCurrentView() {
    return {
      centerRA: this.skyEngine.viewSettings.centerRA,
      centerDec: this.skyEngine.viewSettings.centerDec,
      zoom: this.skyEngine.viewSettings.zoom,
    };
  }

  setView(centerRA, centerDec, zoom = 1) {
    this.skyEngine.targetView.centerRA = centerRA;
    this.skyEngine.targetView.centerDec = centerDec;
    this.skyEngine.targetView.zoom = zoom;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.skyApp = new SkyInteractiveApp();
});

// Handle page visibility changes for iPhone battery optimization
document.addEventListener('visibilitychange', () => {
  if (window.skyApp) {
    if (document.hidden) {
      // Page is hidden - pause expensive operations
      window.skyApp.skyEngine?.stopAnimation();
    } else {
      // Page is visible - resume operations
      window.skyApp.skyEngine?.startAnimation();
    }
  }
});

// Handle low memory situations on iPhone
window.addEventListener('pagehide', () => {
  if (window.skyApp) {
    window.skyApp.skyEngine?.stopAnimation();
  }
});

window.addEventListener('pageshow', () => {
  if (window.skyApp) {
    window.skyApp.skyEngine?.startAnimation();
  }
});
