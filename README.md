# Sky Interactive - Night Sky Viewer

A mobile-friendly web application that displays the night sky as it appeared on July 1st, 2024, with interactive features highlighting the Leo and Sagittarius constellations. Built with FastAPI backend and vanilla JavaScript frontend.

## 🌟 Features

- **Interactive Sky Map**: Touch/mouse-controlled navigation with zoom and pan
- **Highlighted Constellations**: Leo and Sagittarius prominently featured
- **Real Astronomical Data**: Based on actual star positions and moon phase for July 1, 2024
- **Mobile Optimized**: Responsive design with touch gestures
- **Object Information**: Tap on stars, constellations, or the moon for details
- **Search Functionality**: Quick navigation to featured constellations
- **Modern UI**: Dark theme with space-inspired design

## 🚀 Quick Start

### Running Locally

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sky_interactive
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python main.py
   ```

4. **Open your browser**
   Navigate to `http://localhost:8000`

### Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build -t sky-interactive .
   ```

2. **Run the container**
   ```bash
   docker run -p 8000:8000 sky-interactive
   ```

### Deploy to Render

1. Connect your GitHub repository to Render
2. Select "Web Service" as the service type
3. Use the following settings:
   - **Build Command**: `docker build -t sky-interactive .`
   - **Start Command**: `docker run -p $PORT:8000 sky-interactive`
   - **Environment**: Docker

## 🎮 How to Use

### Navigation
- **Pan**: Drag to move around the sky
- **Zoom**: Use mouse wheel or pinch gesture on mobile
- **Search**: Tap the search icon to quickly find constellations
- **Info**: Tap the info button for app details and instructions

### Interactions
- **Tap Objects**: Click/tap on stars, constellations, or the moon for information
- **Toggle Constellations**: Show/hide constellation lines and highlighting
- **Responsive**: Works on desktop, tablet, and mobile devices

### Featured Elements
- **Leo Constellation**: Highlighted in gold, featuring Regulus and other bright stars
- **Sagittarius Constellation**: Highlighted in red, showing the distinctive "teapot" pattern
- **Moon**: Displays with accurate phase for July 1, 2024
- **Bright Stars**: Major stars with realistic magnitudes and colors

## 🛠 Technical Architecture

### Backend (FastAPI)
- **Main Application**: `main.py` - FastAPI server with astronomical calculations
- **Astronomical Data**: Uses Astropy for accurate celestial mechanics
- **API Endpoints**: RESTful endpoints for stars, constellations, and moon data
- **Date Fixed**: July 1, 2024, 22:00 UTC

### Frontend (Vanilla JavaScript)
- **Sky Engine**: `static/sky-engine.js` - Canvas-based rendering and interaction
- **App Logic**: `static/app.js` - UI management and API integration
- **Responsive CSS**: `static/styles.css` - Mobile-first design
- **Coordinate System**: Stereographic projection for accurate sky mapping

### Key Technologies
- **FastAPI**: High-performance Python web framework
- **Astropy**: Professional astronomy library for calculations
- **HTML5 Canvas**: High-performance 2D graphics rendering
- **CSS Grid/Flexbox**: Modern responsive layout
- **Touch Events**: Mobile-optimized interaction

## 📱 Mobile Features

- Touch-based navigation (pan, zoom, tap)
- Responsive design for all screen sizes
- Haptic feedback on supported devices
- Optimized performance for mobile browsers
- PWA-ready architecture

## 🌌 Astronomical Accuracy

The application uses real astronomical data:
- **Star Positions**: Accurate RA/Dec coordinates
- **Constellation Data**: Traditional star patterns
- **Moon Phase**: Calculated lunar phase for July 1, 2024
- **Visibility**: Objects shown only if above horizon
- **Coordinate System**: Standard celestial coordinates (J2000)

## 🎨 Design Features

- **Space Theme**: Dark background with stellar gradients
- **Color Coding**: Leo (gold), Sagittarius (red)
- **Typography**: Orbitron and Space Grotesk fonts
- **Animations**: Subtle star twinkling and smooth transitions
- **Accessibility**: High contrast and touch-friendly targets

## 🔧 Configuration

### Observation Settings
The app is configured for:
- **Date**: July 1, 2024
- **Time**: 22:00 UTC
- **Location**: London (can be modified in `main.py`)
- **Highlighted Constellations**: Leo and Sagittarius

### Customization
To modify the observation parameters, edit `main.py`:
```python
# Change location
self.location = EarthLocation(lat=YOUR_LAT*u.deg, lon=YOUR_LON*u.deg, height=0*u.m)

# Change observation time
self.observation_time = Time('YYYY-MM-DD HH:MM:SS', scale='utc')
```

## 📋 API Endpoints

- `GET /` - Main application page
- `GET /api/stars` - Bright stars data
- `GET /api/constellations` - Constellation information
- `GET /api/moon` - Moon position and phase
- `GET /api/sky-data` - All astronomical data in one request

## 🐛 Troubleshooting

### Common Issues
1. **Loading Error**: Check network connection and refresh
2. **Performance**: Close other browser tabs if rendering is slow
3. **Touch Issues**: Ensure browser supports touch events
4. **Stars Not Visible**: Zoom out or pan to find visible objects

### Development
- Check browser console for error messages
- Use browser dev tools for responsive testing
- Monitor network tab for API call issues

## 🚀 Future Enhancements

- Real-time sky updates
- Location-based viewing
- Additional constellations
- Planetary positions
- Time travel functionality
- Offline support with service worker

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

**Live Demo**: Deploy to Render or your preferred platform to see the night sky of July 1st, 2024! 🌟 