class SkyEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.skyData = null;
    this.viewSettings = {
      centerRA: 180, // Right Ascension center
      centerDec: 40, // Declination center
      zoom: 1,
      showConstellations: false,
      fieldOfView: 120, // degrees
    };

    // iPhone optimization
    this.isIPhone = /iPhone|iPod/.test(navigator.userAgent);
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Limit for performance

    this.resizeCanvas();
    this.setupEventListeners();

    // Enhanced touch/mouse interaction state for iPhone
    this.isDragging = false;
    this.lastTouchPos = { x: 0, y: 0 };
    this.touchStartDistance = 0;
    this.initialZoom = 1;
    this.touchStartTime = 0;
    this.lastTouchTime = 0;
    this.touchVelocity = { x: 0, y: 0 };
    this.momentum = { x: 0, y: 0 };
    this.isZooming = false;
    this.lastPinchCenter = { x: 0, y: 0 };

    // Performance optimization
    this.lastRenderTime = 0;
    this.renderThrottle = this.isIPhone ? 16 : 8; // 60fps for iPhone, 120fps for others

    // Animation
    this.animationFrame = null;
    this.twinkleOffset = 0;
    this.isAnimating = false;

    // Smooth transitions
    this.targetView = {
      centerRA: this.viewSettings.centerRA,
      centerDec: this.viewSettings.centerDec,
      zoom: this.viewSettings.zoom,
    };

    this.startAnimation();
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.pixelRatio;
    this.canvas.height = rect.height * this.pixelRatio;
    this.ctx.scale(this.pixelRatio, this.pixelRatio);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    // iPhone specific optimizations
    if (this.isIPhone) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
  }

  setupEventListeners() {
    // Optimized touch events for iPhone
    const touchOptions = this.isIPhone ? { passive: false } : { passive: true };

    // Touch events (primary for iPhone)
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), touchOptions);
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), touchOptions);
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), touchOptions);
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), touchOptions);

    // Mouse events (fallback)
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    // Click for object selection (with touch delay consideration)
    this.canvas.addEventListener('click', this.handleClick.bind(this));

    // Resize with debouncing for performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.resizeCanvas();
        this.render();
      }, 100);
    });

    // Orientation change handling for iPhone
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.resizeCanvas();
        this.render();
      }, 300);
    });
  }

  // Coordinate conversion functions (optimized)
  raDecToXY(ra, dec) {
    // Convert RA/Dec to screen coordinates using stereographic projection
    const centerRA = (this.viewSettings.centerRA * Math.PI) / 180;
    const centerDec = (this.viewSettings.centerDec * Math.PI) / 180;
    const objRA = (ra * Math.PI) / 180;
    const objDec = (dec * Math.PI) / 180;

    // Stereographic projection
    const cosC =
      Math.sin(centerDec) * Math.sin(objDec) + Math.cos(centerDec) * Math.cos(objDec) * Math.cos(objRA - centerRA);

    if (cosC <= 0) return null; // Object is behind the view

    const k = 2 / (1 + cosC);
    const x = k * Math.cos(objDec) * Math.sin(objRA - centerRA);
    const y =
      k *
      (Math.cos(centerDec) * Math.sin(objDec) - Math.sin(centerDec) * Math.cos(objDec) * Math.cos(objRA - centerRA));

    // Convert to screen coordinates
    const scale = (Math.min(this.canvas.width, this.canvas.height) / (4 * this.pixelRatio)) * this.viewSettings.zoom;
    const screenX = this.canvas.width / (2 * this.pixelRatio) + x * scale;
    const screenY = this.canvas.height / (2 * this.pixelRatio) - y * scale;

    return { x: screenX, y: screenY };
  }

  xyToRaDec(x, y) {
    // Convert screen coordinates back to RA/Dec (for interaction)
    const scale = (Math.min(this.canvas.width, this.canvas.height) / (4 * this.pixelRatio)) * this.viewSettings.zoom;
    const normalizedX = (x - this.canvas.width / (2 * this.pixelRatio)) / scale;
    const normalizedY = -(y - this.canvas.height / (2 * this.pixelRatio)) / scale;

    const centerRA = (this.viewSettings.centerRA * Math.PI) / 180;
    const centerDec = (this.viewSettings.centerDec * Math.PI) / 180;

    const rho = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
    const c = 2 * Math.atan(rho / 2);

    const dec = Math.asin(Math.cos(c) * Math.sin(centerDec) + (normalizedY * Math.sin(c) * Math.cos(centerDec)) / rho);
    const ra =
      centerRA +
      Math.atan2(
        normalizedX * Math.sin(c),
        rho * Math.cos(centerDec) * Math.cos(c) - normalizedY * Math.sin(centerDec) * Math.sin(c)
      );

    return {
      ra: ((ra * 180) / Math.PI + 360) % 360,
      dec: (dec * 180) / Math.PI,
    };
  }

  // iPhone optimized touch handlers
  handleTouchStart(e) {
    if (this.isIPhone) {
      e.preventDefault();
    }

    this.touchStartTime = Date.now();
    this.touchVelocity = { x: 0, y: 0 };
    this.momentum = { x: 0, y: 0 };

    if (e.touches.length === 1) {
      // Single touch - pan
      this.isDragging = true;
      this.isZooming = false;
      this.lastTouchPos = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };

      // Haptic feedback on iPhone
      if (navigator.vibrate && this.isIPhone) {
        navigator.vibrate(1);
      }
    } else if (e.touches.length === 2) {
      // Dual touch - zoom
      this.isDragging = false;
      this.isZooming = true;

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      this.touchStartDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      this.initialZoom = this.viewSettings.zoom;

      // Center point of pinch
      this.lastPinchCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      // Stronger haptic feedback for zoom
      if (navigator.vibrate && this.isIPhone) {
        navigator.vibrate(2);
      }
    }
  }

  handleTouchMove(e) {
    if (this.isIPhone) {
      e.preventDefault();
    }

    const now = Date.now();
    const deltaTime = now - this.lastTouchTime;
    this.lastTouchTime = now;

    if (e.touches.length === 1 && this.isDragging && !this.isZooming) {
      // Single touch panning with momentum
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.lastTouchPos.x;
      const deltaY = touch.clientY - this.lastTouchPos.y;

      // Calculate velocity for momentum
      if (deltaTime > 0) {
        this.touchVelocity.x = deltaX / deltaTime;
        this.touchVelocity.y = deltaY / deltaTime;
      }

      this.pan(deltaX, deltaY);

      this.lastTouchPos = {
        x: touch.clientX,
        y: touch.clientY,
      };
    } else if (e.touches.length === 2 && this.isZooming) {
      // Dual touch zooming with center tracking
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      // Calculate zoom with smooth scaling
      const zoomRatio = currentDistance / this.touchStartDistance;
      const newZoom = Math.max(0.3, Math.min(8, this.initialZoom * zoomRatio));

      // Smooth zoom transition
      this.targetView.zoom = newZoom;

      // Track pinch center for zoom focus
      const currentPinchCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      // Adjust view center based on pinch movement
      const centerDeltaX = currentPinchCenter.x - this.lastPinchCenter.x;
      const centerDeltaY = currentPinchCenter.y - this.lastPinchCenter.y;

      if (Math.abs(centerDeltaX) > 5 || Math.abs(centerDeltaY) > 5) {
        const sensitivity = 0.3 / this.viewSettings.zoom;
        this.targetView.centerRA += centerDeltaX * sensitivity;
        this.targetView.centerDec -= centerDeltaY * sensitivity;

        // Keep bounds
        this.targetView.centerRA = (this.targetView.centerRA + 360) % 360;
        this.targetView.centerDec = Math.max(-90, Math.min(90, this.targetView.centerDec));

        this.lastPinchCenter = currentPinchCenter;
      }
    }
  }

  handleTouchEnd(e) {
    const touchDuration = Date.now() - this.touchStartTime;

    // Apply momentum scrolling for quick swipes on iPhone
    if (this.isDragging && touchDuration < 300 && this.isIPhone) {
      const velocityThreshold = 0.5;

      if (Math.abs(this.touchVelocity.x) > velocityThreshold || Math.abs(this.touchVelocity.y) > velocityThreshold) {
        // Apply momentum with decay
        this.momentum.x = this.touchVelocity.x * 100;
        this.momentum.y = this.touchVelocity.y * 100;
        this.applyMomentum();

        // Light haptic feedback for momentum
        if (navigator.vibrate) {
          navigator.vibrate(3);
        }
      }
    }

    this.isDragging = false;
    this.isZooming = false;
    this.touchVelocity = { x: 0, y: 0 };
  }

  applyMomentum() {
    if (Math.abs(this.momentum.x) < 0.1 && Math.abs(this.momentum.y) < 0.1) {
      this.momentum = { x: 0, y: 0 };
      return;
    }

    // Apply momentum to view
    const sensitivity = 0.002;
    this.targetView.centerRA += this.momentum.x * sensitivity;
    this.targetView.centerDec -= this.momentum.y * sensitivity;

    // Keep bounds
    this.targetView.centerRA = (this.targetView.centerRA + 360) % 360;
    this.targetView.centerDec = Math.max(-90, Math.min(90, this.targetView.centerDec));

    // Decay momentum
    this.momentum.x *= 0.95;
    this.momentum.y *= 0.95;

    // Continue momentum
    if (Math.abs(this.momentum.x) > 0.1 || Math.abs(this.momentum.y) > 0.1) {
      setTimeout(() => this.applyMomentum(), 16);
    }
  }

  // Mouse handlers (fallback for non-touch devices)
  handleMouseDown(e) {
    this.isDragging = true;
    this.lastTouchPos = { x: e.clientX, y: e.clientY };
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastTouchPos.x;
    const deltaY = e.clientY - this.lastTouchPos.y;

    this.pan(deltaX, deltaY);
    this.lastTouchPos = { x: e.clientX, y: e.clientY };
  }

  handleMouseUp(e) {
    this.isDragging = false;
  }

  handleWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoom(zoomFactor);
  }

  handleClick(e) {
    // Debounce clicks to avoid interference with touch gestures
    if (this.isIPhone && Date.now() - this.touchStartTime < 200) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.findObjectAt(x, y);
  }

  // Smooth navigation methods
  pan(deltaX, deltaY) {
    const sensitivity = 0.4 / this.viewSettings.zoom;
    this.targetView.centerRA += deltaX * sensitivity;
    this.targetView.centerDec -= deltaY * sensitivity;

    // Keep RA in bounds
    this.targetView.centerRA = (this.targetView.centerRA + 360) % 360;
    // Keep Dec in bounds
    this.targetView.centerDec = Math.max(-90, Math.min(90, this.targetView.centerDec));
  }

  zoom(factor) {
    this.targetView.zoom = Math.max(0.3, Math.min(8, this.viewSettings.zoom * factor));
  }

  // Enhanced object finding with larger touch targets for iPhone
  findObjectAt(x, y) {
    if (!this.skyData) return;

    const touchRadius = this.isIPhone ? 25 : 15; // Larger touch targets on iPhone
    let closestObject = null;
    let closestDistance = touchRadius;

    // Check stars
    this.skyData.stars?.forEach((star) => {
      const pos = this.raDecToXY(star.ra, star.dec);
      if (pos) {
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        if (distance < closestDistance) {
          closestDistance = distance;
          closestObject = {
            type: 'star',
            name: star.name,
            magnitude: star.magnitude,
            constellation: star.constellation || 'Sconosciuta',
            ra: star.ra,
            dec: star.dec,
          };
        }
      }
    });

    // Check moon with larger touch area
    if (this.skyData.moon) {
      const moonPos = this.raDecToXY(this.skyData.moon.ra, this.skyData.moon.dec);
      if (moonPos) {
        const moonRadius = this.isIPhone ? 35 : 25;
        const distance = Math.sqrt(Math.pow(x - moonPos.x, 2) + Math.pow(y - moonPos.y, 2));
        if (distance < moonRadius && distance < closestDistance) {
          closestObject = {
            type: 'moon',
            name: 'Luna',
            phase: this.skyData.moon.phase,
            illumination: Math.round(this.skyData.moon.phase * 100),
            ra: this.skyData.moon.ra,
            dec: this.skyData.moon.dec,
          };
        }
      }
    }

    if (closestObject) {
      // Haptic feedback for object selection
      if (navigator.vibrate && this.isIPhone) {
        navigator.vibrate(10);
      }

      this.showObjectInfo(closestObject, x, y);
    } else {
      // Hide tooltip if clicking empty space
      document.getElementById('objectTooltip').classList.remove('show');
    }
  }

  showObjectInfo(object, x, y) {
    const tooltip = document.getElementById('objectTooltip');
    const title = document.getElementById('tooltipTitle');
    const description = document.getElementById('tooltipDescription');
    const details = document.getElementById('tooltipDetails');

    title.textContent = object.name;

    switch (object.type) {
      case 'star':
        description.textContent = `Stella nella costellazione ${object.constellation}`;
        details.innerHTML = `
          <strong>Magnitudine:</strong> ${object.magnitude.toFixed(1)}<br>
          <strong>RA:</strong> ${object.ra.toFixed(1)}°<br>
          <strong>Dec:</strong> ${object.dec.toFixed(1)}°
        `;
        break;
      case 'moon':
        let phaseText = '';
        if (object.phase < 0.1) phaseText = 'Luna Nuova';
        else if (object.phase < 0.25) phaseText = 'Luna Crescente';
        else if (object.phase < 0.5) phaseText = 'Primo Quarto';
        else if (object.phase < 0.75) phaseText = 'Gibbosa Crescente';
        else phaseText = 'Luna Piena';

        description.textContent = phaseText;
        details.innerHTML = `
          <strong>Illuminazione:</strong> ${object.illumination}%<br>
          <strong>RA:</strong> ${object.ra.toFixed(1)}°<br>
          <strong>Dec:</strong> ${object.dec.toFixed(1)}°
        `;
        break;
    }

    // Position tooltip with iPhone-friendly placement
    const rect = this.canvas.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 120;

    let left = x + rect.left + 10;
    let top = y + rect.top - tooltipHeight - 10;

    // Keep tooltip on screen
    if (left + tooltipWidth > window.innerWidth) {
      left = x + rect.left - tooltipWidth - 10;
    }
    if (top < 0) {
      top = y + rect.top + 20;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.classList.add('show');

    // Auto-hide tooltip after delay on iPhone
    if (this.isIPhone) {
      setTimeout(() => {
        tooltip.classList.remove('show');
      }, 4000);
    }
  }

  setSkyData(data) {
    this.skyData = data;
  }

  toggleConstellations() {
    this.viewSettings.showConstellations = !this.viewSettings.showConstellations;
  }

  // Optimized render method with smooth interpolation
  render() {
    const now = Date.now();
    if (now - this.lastRenderTime < this.renderThrottle) {
      return;
    }
    this.lastRenderTime = now;

    // Smooth interpolation to target view
    const lerpFactor = this.isIPhone ? 0.15 : 0.2;

    this.viewSettings.centerRA += (this.targetView.centerRA - this.viewSettings.centerRA) * lerpFactor;
    this.viewSettings.centerDec += (this.targetView.centerDec - this.viewSettings.centerDec) * lerpFactor;
    this.viewSettings.zoom += (this.targetView.zoom - this.viewSettings.zoom) * lerpFactor;

    if (!this.skyData) return;

    this.clearCanvas();
    this.drawStars();
    if (this.viewSettings.showConstellations) {
      this.drawConstellations();
    }
    this.drawMoon();
    this.drawCompass();
  }

  clearCanvas() {
    // Properly clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width / this.pixelRatio, this.canvas.height / this.pixelRatio);

    // Optional: Add a subtle background gradient
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / (2 * this.pixelRatio),
      this.canvas.height / (2 * this.pixelRatio),
      0,
      this.canvas.width / (2 * this.pixelRatio),
      this.canvas.height / (2 * this.pixelRatio),
      Math.max(this.canvas.width, this.canvas.height) / (2 * this.pixelRatio)
    );
    gradient.addColorStop(0, 'rgba(26, 26, 46, 0.1)');
    gradient.addColorStop(1, 'rgba(12, 12, 30, 0.2)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width / this.pixelRatio, this.canvas.height / this.pixelRatio);
  }

  // Performance optimized drawing methods
  drawStars() {
    if (!this.skyData.stars) return;

    // Reset canvas state at the beginning
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;

    this.skyData.stars.forEach((star, index) => {
      const pos = this.raDecToXY(star.ra, star.dec);
      if (!pos) return;

      // Calculate star size based on magnitude and zoom
      const size = Math.max(1, Math.min(8, (6 - star.magnitude) * this.viewSettings.zoom * 0.8));

      // Star color based on magnitude
      const color = this.getStarColor(star.magnitude);

      // Reset shadow state for each star
      this.ctx.shadowBlur = 0;
      this.ctx.shadowColor = 'transparent';

      // Highlight special constellations
      if (star.constellation) {
        if (star.constellation.toLowerCase().includes('leo') || star.constellation.toLowerCase().includes('leone')) {
          this.ctx.shadowColor = '#ffd700';
          this.ctx.shadowBlur = size * 1.5;
        } else if (star.constellation.toLowerCase().includes('sagitt')) {
          this.ctx.shadowColor = '#ff6b6b';
          this.ctx.shadowBlur = size * 1.5;
        }
      }

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, size, 0, 2 * Math.PI);
      this.ctx.fill();

      // Add subtle twinkle effect for brighter stars
      if (star.magnitude < 3 && this.twinkleOffset) {
        const twinkle = Math.sin((index + this.twinkleOffset) * 0.1) * 0.3 + 0.7;
        this.ctx.globalAlpha = twinkle;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
      }
    });

    // Reset canvas state after drawing
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
    this.ctx.globalAlpha = 1;
  }

  drawConstellations() {
    if (!this.skyData.constellations) return;

    Object.entries(this.skyData.constellations).forEach(([name, stars]) => {
      this.drawConstellationLines(stars, name);
    });
  }

  drawConstellationLines(stars, constellationName) {
    if (stars.length < 2) return;

    // Save canvas state
    this.ctx.save();

    // Special colors for highlighted constellations
    let strokeColor = 'rgba(100, 181, 246, 0.6)';
    let lineWidth = 1;

    if (constellationName.toLowerCase().includes('leo') || constellationName.toLowerCase().includes('leone')) {
      strokeColor = '#ffd700';
      lineWidth = 2;
    } else if (constellationName.toLowerCase().includes('sagitt')) {
      strokeColor = '#ff6b6b';
      lineWidth = 2;
    }

    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.globalAlpha = 0.7;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Draw lines between consecutive stars
    for (let i = 0; i < stars.length - 1; i++) {
      const star1 = stars[i];
      const star2 = stars[i + 1];

      const pos1 = this.raDecToXY(star1.ra, star1.dec);
      const pos2 = this.raDecToXY(star2.ra, star2.dec);

      if (pos1 && pos2) {
        this.ctx.beginPath();
        this.ctx.moveTo(pos1.x, pos1.y);
        this.ctx.lineTo(pos2.x, pos2.y);
        this.ctx.stroke();
      }
    }

    // Restore canvas state
    this.ctx.restore();
  }

  drawMoon() {
    if (!this.skyData.moon) return;

    const pos = this.raDecToXY(this.skyData.moon.ra, this.skyData.moon.dec);
    if (!pos) return;

    const moonSize = Math.max(8, 15 * this.viewSettings.zoom);

    // Save canvas state
    this.ctx.save();

    // Moon glow
    this.ctx.shadowColor = '#f5f5f5';
    this.ctx.shadowBlur = moonSize * 0.8;

    // Draw moon disc
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, moonSize, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw phase shadow
    const phase = this.skyData.moon.phase;
    if (phase < 0.99) {
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';

      if (phase < 0.5) {
        // Waxing phases
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, moonSize, Math.PI * 0.5, Math.PI * 1.5);
        this.ctx.arc(pos.x, pos.y, moonSize * (1 - phase * 2), Math.PI * 1.5, Math.PI * 0.5, true);
        this.ctx.fill();
      } else {
        // Waning phases
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, moonSize, Math.PI * 1.5, Math.PI * 0.5);
        this.ctx.arc(pos.x, pos.y, moonSize * ((phase - 0.5) * 2), Math.PI * 0.5, Math.PI * 1.5, true);
        this.ctx.fill();
      }
    }

    // Restore canvas state
    this.ctx.restore();
  }

  drawCompass() {
    // Simple compass in bottom right (smaller on iPhone)
    const size = this.isIPhone ? 40 : 50;
    const margin = this.isIPhone ? 15 : 20;
    const x = this.canvas.width / this.pixelRatio - size - margin;
    const y = this.canvas.height / this.pixelRatio - size - margin;

    // Compass background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.beginPath();
    this.ctx.arc(x + size / 2, y + size / 2, size / 2, 0, 2 * Math.PI);
    this.ctx.fill();

    // North indicator
    this.ctx.strokeStyle = '#64b5f6';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + size / 2, y + 5);
    this.ctx.lineTo(x + size / 2, y + size / 2);
    this.ctx.stroke();

    // North label
    this.ctx.fillStyle = '#64b5f6';
    this.ctx.font = `${this.isIPhone ? '10' : '12'}px Space Grotesk`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('N', x + size / 2, y - 2);
  }

  getStarColor(magnitude) {
    // Color based on magnitude (brighter stars are more blue-white)
    if (magnitude < 1) return '#ffffff';
    if (magnitude < 2) return '#e8f4fd';
    if (magnitude < 3) return '#d1e7fa';
    if (magnitude < 4) return '#b3d9f7';
    if (magnitude < 5) return '#95ccf4';
    return '#77bef1';
  }

  // Enhanced animation loop
  startAnimation() {
    this.isAnimating = true;
    const animate = () => {
      if (!this.isAnimating) return;

      this.twinkleOffset += 0.02;
      this.render();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}
