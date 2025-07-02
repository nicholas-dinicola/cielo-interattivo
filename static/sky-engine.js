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

    this.resizeCanvas();
    this.setupEventListeners();

    // Touch/mouse interaction state
    this.isDragging = false;
    this.lastTouchPos = { x: 0, y: 0 };
    this.touchStartDistance = 0;
    this.initialZoom = 1;

    // Animation
    this.animationFrame = null;
    this.twinkleOffset = 0;
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Click for object selection
    this.canvas.addEventListener('click', this.handleClick.bind(this));

    // Resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });
  }

  // Coordinate conversion functions
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
    const scale = (Math.min(this.canvas.width, this.canvas.height) / 4) * this.viewSettings.zoom;
    const screenX = this.canvas.width / (2 * window.devicePixelRatio) + x * scale;
    const screenY = this.canvas.height / (2 * window.devicePixelRatio) - y * scale;

    return { x: screenX, y: screenY };
  }

  xyToRaDec(x, y) {
    // Convert screen coordinates back to RA/Dec (for interaction)
    const scale = (Math.min(this.canvas.width, this.canvas.height) / 4) * this.viewSettings.zoom;
    const normalizedX = (x - this.canvas.width / (2 * window.devicePixelRatio)) / scale;
    const normalizedY = -(y - this.canvas.height / (2 * window.devicePixelRatio)) / scale;

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

  // Event handlers
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

  handleTouchStart(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.touchStartDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      this.initialZoom = this.viewSettings.zoom;
    }
  }

  handleTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 1 && this.isDragging) {
      const deltaX = e.touches[0].clientX - this.lastTouchPos.x;
      const deltaY = e.touches[0].clientY - this.lastTouchPos.y;

      this.pan(deltaX, deltaY);
      this.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      const zoomRatio = currentDistance / this.touchStartDistance;
      this.viewSettings.zoom = Math.max(0.5, Math.min(5, this.initialZoom * zoomRatio));
      this.render();
    }
  }

  handleTouchEnd(e) {
    this.isDragging = false;
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.findObjectAt(x, y);
  }

  // Navigation methods
  pan(deltaX, deltaY) {
    const sensitivity = 0.5 / this.viewSettings.zoom;
    this.viewSettings.centerRA += deltaX * sensitivity;
    this.viewSettings.centerDec -= deltaY * sensitivity;

    // Keep RA in bounds
    this.viewSettings.centerRA = (this.viewSettings.centerRA + 360) % 360;
    // Keep Dec in bounds
    this.viewSettings.centerDec = Math.max(-90, Math.min(90, this.viewSettings.centerDec));

    this.render();
  }

  zoom(factor) {
    this.viewSettings.zoom = Math.max(0.5, Math.min(5, this.viewSettings.zoom * factor));
    this.render();
  }

  // Object detection
  findObjectAt(x, y) {
    if (!this.skyData) return;

    const threshold = 20; // pixels
    let closestObject = null;
    let closestDistance = Infinity;

    // Check stars
    this.skyData.stars.forEach((star) => {
      const pos = this.raDecToXY(star.ra, star.dec);
      if (pos) {
        const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
        if (distance < threshold && distance < closestDistance) {
          closestDistance = distance;
          closestObject = { type: 'star', data: star };
        }
      }
    });

    // Check constellation stars
    Object.values(this.skyData.constellations).forEach((constellation) => {
      constellation.stars.forEach((star) => {
        if (!star.visible) return;
        const pos = this.raDecToXY(star.ra, star.dec);
        if (pos) {
          const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
          if (distance < threshold && distance < closestDistance) {
            closestDistance = distance;
            closestObject = { type: 'constellation_star', data: star };
          }
        }
      });
    });

    // Check moon
    if (this.skyData.moon && this.skyData.moon.visible) {
      const pos = this.raDecToXY(this.skyData.moon.ra, this.skyData.moon.dec);
      if (pos) {
        const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
        if (distance < threshold && distance < closestDistance) {
          closestDistance = distance;
          closestObject = { type: 'moon', data: this.skyData.moon };
        }
      }
    }

    if (closestObject) {
      this.showObjectInfo(closestObject, x, y);
    }
  }

  showObjectInfo(object, x, y) {
    const tooltip = document.getElementById('objectTooltip');
    const title = document.getElementById('tooltipTitle');
    const description = document.getElementById('tooltipDescription');
    const details = document.getElementById('tooltipDetails');

    switch (object.type) {
      case 'star':
      case 'constellation_star':
        title.textContent = object.data.name;
        description.textContent = `Magnitudine: ${object.data.magnitude || object.data.mag}`;
        details.innerHTML = `
                    AR: ${object.data.ra.toFixed(2)}°<br>
                    Dec: ${object.data.dec.toFixed(2)}°<br>
                    Alt: ${object.data.altitude ? object.data.altitude.toFixed(1) + '°' : 'N/D'}
                `;
        break;
      case 'moon':
        title.textContent = 'Luna';
        const phase = object.data.phase;
        let phaseDescription = '';
        if (phase < 0.1) phaseDescription = 'Luna Nuova';
        else if (phase < 0.3) phaseDescription = 'Luna Crescente';
        else if (phase < 0.7) phaseDescription = 'Luna Piena';
        else phaseDescription = 'Luna Calante';

        description.textContent = phaseDescription;
        details.innerHTML = `
                    AR: ${object.data.ra.toFixed(2)}°<br>
                    Dec: ${object.data.dec.toFixed(2)}°<br>
                    Alt: ${object.data.altitude.toFixed(1)}°
                `;
        break;
    }

    tooltip.style.left = x + 10 + 'px';
    tooltip.style.top = y - 10 + 'px';
    tooltip.classList.add('show');

    // Hide tooltip after 3 seconds
    setTimeout(() => {
      tooltip.classList.remove('show');
    }, 3000);
  }

  // Rendering methods
  setSkyData(data) {
    this.skyData = data;
    this.render();
  }

  toggleConstellations() {
    this.viewSettings.showConstellations = !this.viewSettings.showConstellations;
    this.render();
  }

  render() {
    if (!this.skyData) return;

    this.clearCanvas();
    this.drawStars();
    this.drawConstellations();
    this.drawMoon();
    this.drawCompass();
  }

  clearCanvas() {
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / (2 * window.devicePixelRatio),
      this.canvas.height / (2 * window.devicePixelRatio),
      0,
      this.canvas.width / (2 * window.devicePixelRatio),
      this.canvas.height / (2 * window.devicePixelRatio),
      Math.max(this.canvas.width, this.canvas.height) / (2 * window.devicePixelRatio)
    );
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0c0c1e');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio);
  }

  drawStars() {
    this.skyData.stars.forEach((star) => {
      const pos = this.raDecToXY(star.ra, star.dec);
      if (!pos) return;

      // Star size based on magnitude (brighter = larger)
      const size = Math.max(1, 4 - star.magnitude);
      const opacity = Math.max(0.3, 1 - star.magnitude / 5);

      // Star color based on temperature (simplified)
      let color = this.getStarColor(star.magnitude);

      this.ctx.save();
      this.ctx.globalAlpha = opacity;
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = size * 2;

      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, size, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  drawConstellations() {
    if (!this.viewSettings.showConstellations) return;

    Object.entries(this.skyData.constellations).forEach(([name, constellation]) => {
      if (!constellation.highlighted) return;

      const visibleStars = constellation.stars.filter((star) => star.visible);
      if (visibleStars.length < 2) return;

      this.ctx.strokeStyle = constellation.color;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.8;

      // Draw constellation lines (simplified connecting pattern)
      this.drawConstellationLines(visibleStars, name);

      // Draw constellation stars with special highlighting
      visibleStars.forEach((star) => {
        const pos = this.raDecToXY(star.ra, star.dec);
        if (!pos) return;

        const size = Math.max(2, 5 - star.mag);

        this.ctx.save();
        this.ctx.fillStyle = constellation.color;
        this.ctx.shadowColor = constellation.color;
        this.ctx.shadowBlur = size * 3;

        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, size, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.restore();
      });

      this.ctx.globalAlpha = 1;
    });
  }

  drawConstellationLines(stars, constellationName) {
    // Simplified constellation line patterns
    const linePatterns = {
      Leo: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [1, 4],
      ], // Connecting Leo stars
      Sagittarius: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [0, 5],
      ], // Connecting Sagittarius stars
    };

    const pattern = linePatterns[constellationName];
    if (!pattern) return;

    this.ctx.beginPath();
    pattern.forEach(([i, j]) => {
      if (i >= stars.length || j >= stars.length) return;

      const pos1 = this.raDecToXY(stars[i].ra, stars[i].dec);
      const pos2 = this.raDecToXY(stars[j].ra, stars[j].dec);

      if (pos1 && pos2) {
        this.ctx.moveTo(pos1.x, pos1.y);
        this.ctx.lineTo(pos2.x, pos2.y);
      }
    });
    this.ctx.stroke();
  }

  drawMoon() {
    if (!this.skyData.moon || !this.skyData.moon.visible) return;

    const pos = this.raDecToXY(this.skyData.moon.ra, this.skyData.moon.dec);
    if (!pos) return;

    const size = 8;
    const phase = this.skyData.moon.phase;

    this.ctx.save();

    // Draw moon body
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.shadowColor = '#f5f5f5';
    this.ctx.shadowBlur = 10;

    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, size, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw phase shadow
    if (phase < 0.5) {
      this.ctx.fillStyle = '#333';
      this.ctx.beginPath();
      this.ctx.arc(pos.x + size * (0.5 - phase) * 2, pos.y, size, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawCompass() {
    const size = 60;
    const x = this.canvas.width / window.devicePixelRatio - size - 20;
    const y = size + 20;

    this.ctx.save();
    this.ctx.globalAlpha = 0.7;

    // Compass background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    this.ctx.fill();

    // North indicator
    this.ctx.strokeStyle = '#64b5f6';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size / 2 + 5);
    this.ctx.lineTo(x, y - 10);
    this.ctx.stroke();

    // N label
    this.ctx.fillStyle = '#64b5f6';
    this.ctx.font = '12px Space Grotesk';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('N', x, y - size / 2 - 5);

    this.ctx.restore();
  }

  getStarColor(magnitude) {
    // Simplified star color based on magnitude
    const colors = [
      '#b3d9ff', // Very bright blue-white
      '#e6f2ff', // Blue-white
      '#ffffff', // White
      '#fff4e6', // Yellow-white
      '#ffcc80', // Orange
      '#ff8a65', // Red
    ];

    const index = Math.min(Math.floor(magnitude + 1), colors.length - 1);
    return colors[Math.max(0, index)];
  }

  // Animation loop
  startAnimation() {
    const animate = () => {
      this.twinkleOffset += 0.02;
      // Add subtle twinkling effect to bright stars
      this.render();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}
