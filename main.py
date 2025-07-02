import json
import os
import warnings
from datetime import datetime, timezone
from typing import Any, Dict, List

import numpy as np
import uvicorn
from astropy import units as u
from astropy.coordinates import (AltAz, EarthLocation, SkyCoord, get_moon,
                                 get_sun)
from astropy.time import Time
from astropy.utils.iers import conf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

# Disable IERS warnings and auto-download to avoid network issues in Docker
warnings.filterwarnings('ignore', module='astropy')
conf.auto_download = False

app = FastAPI(title="Sky Interactive",
              description="A mobile-friendly night sky viewer")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Astronomical data and calculations


class AstronomicalCalculator:
    def __init__(self):
        # Observer location (default: London)
        self.location = EarthLocation(
            lat=51.5074*u.deg, lon=-0.1278*u.deg, height=0*u.m)
        # Target date: July 1st, 2024
        self.observation_time = Time('2024-07-01 22:00:00', scale='utc')

    def get_bright_stars(self) -> List[Dict[str, Any]]:
        """Get positions of ALL visible stars for the observation date"""
        # Comprehensive star catalog for complete night sky
        all_stars = [
            # Brightest stars (magnitude < 1.5)
            {"name": "Sirius", "ra": 101.287, "dec": -16.716,
                "mag": -1.46, "constellation": "Cane Maggiore"},
            {"name": "Canopus", "ra": 95.988, "dec": -52.696,
                "mag": -0.74, "constellation": "Carena"},
            {"name": "Arcturus", "ra": 213.915, "dec": 19.182,
                "mag": -0.05, "constellation": "Boote"},
            {"name": "Vega", "ra": 279.234, "dec": 38.784,
                "mag": 0.03, "constellation": "Lira"},
            {"name": "Capella", "ra": 79.172, "dec": 45.998,
                "mag": 0.08, "constellation": "Auriga"},
            {"name": "Rigel", "ra": 78.634, "dec": -8.202,
                "mag": 0.13, "constellation": "Orione"},
            {"name": "Procyon", "ra": 114.825, "dec": 5.225,
                "mag": 0.34, "constellation": "Cane Minore"},
            {"name": "Betelgeuse", "ra": 88.793, "dec": 7.407,
                "mag": 0.50, "constellation": "Orione"},
            {"name": "Altair", "ra": 297.696, "dec": 8.868,
                "mag": 0.77, "constellation": "Aquila"},
            {"name": "Aldebaran", "ra": 68.980, "dec": 16.509,
                "mag": 0.85, "constellation": "Toro"},
            {"name": "Spica", "ra": 201.298, "dec": -11.161,
                "mag": 0.97, "constellation": "Vergine"},
            {"name": "Antares", "ra": 247.352, "dec": -26.432,
                "mag": 1.09, "constellation": "Scorpione"},
            {"name": "Pollux", "ra": 116.329, "dec": 28.026,
                "mag": 1.14, "constellation": "Gemelli"},
            {"name": "Deneb", "ra": 310.358, "dec": 45.280,
                "mag": 1.25, "constellation": "Cigno"},
            {"name": "Regulus", "ra": 152.093, "dec": 11.967,
                "mag": 1.35, "constellation": "Leone"},

            # Ursa Major (Orsa Maggiore)
            {"name": "Dubhe", "ra": 165.932, "dec": 61.751,
                "mag": 1.79, "constellation": "Orsa Maggiore"},
            {"name": "Merak", "ra": 165.460, "dec": 56.382,
                "mag": 2.37, "constellation": "Orsa Maggiore"},
            {"name": "Phecda", "ra": 178.457, "dec": 53.695,
                "mag": 2.44, "constellation": "Orsa Maggiore"},
            {"name": "Megrez", "ra": 183.856, "dec": 57.026,
                "mag": 3.31, "constellation": "Orsa Maggiore"},
            {"name": "Alioth", "ra": 193.507, "dec": 55.960,
                "mag": 1.77, "constellation": "Orsa Maggiore"},
            {"name": "Mizar", "ra": 200.981, "dec": 54.925,
                "mag": 2.04, "constellation": "Orsa Maggiore"},
            {"name": "Alkaid", "ra": 206.885, "dec": 49.313,
                "mag": 1.86, "constellation": "Orsa Maggiore"},

            # Cassiopeia (Cassiopea)
            {"name": "Schedar", "ra": 10.127, "dec": 56.537,
                "mag": 2.23, "constellation": "Cassiopea"},
            {"name": "Caph", "ra": 2.295, "dec": 59.150,
                "mag": 2.27, "constellation": "Cassiopea"},
            {"name": "Gamma Cas", "ra": 14.177, "dec": 60.717,
                "mag": 2.47, "constellation": "Cassiopea"},
            {"name": "Ruchbah", "ra": 20.769, "dec": 60.235,
                "mag": 2.66, "constellation": "Cassiopea"},
            {"name": "Segin", "ra": 23.396, "dec": 63.670,
                "mag": 3.38, "constellation": "Cassiopea"},

            # Orion (Orione)
            {"name": "Bellatrix", "ra": 81.283, "dec": 6.350,
                "mag": 1.64, "constellation": "Orione"},
            {"name": "Mintaka", "ra": 83.002, "dec": -0.299,
                "mag": 2.23, "constellation": "Orione"},
            {"name": "Alnilam", "ra": 84.053, "dec": -1.202,
                "mag": 1.70, "constellation": "Orione"},
            {"name": "Alnitak", "ra": 85.190, "dec": -1.943,
                "mag": 1.79, "constellation": "Orione"},
            {"name": "Saiph", "ra": 86.939, "dec": -9.670,
                "mag": 2.09, "constellation": "Orione"},

            # Cygnus (Cigno)
            {"name": "Sadr", "ra": 305.557, "dec": 40.257,
                "mag": 2.20, "constellation": "Cigno"},
            {"name": "Gienah", "ra": 311.553, "dec": 33.970,
                "mag": 2.46, "constellation": "Cigno"},
            {"name": "Delta Cyg", "ra": 292.680, "dec": 45.131,
                "mag": 2.87, "constellation": "Cigno"},
            {"name": "Albireo", "ra": 292.176, "dec": 27.960,
                "mag": 3.18, "constellation": "Cigno"},

            # Lyra (Lira)
            {"name": "Sheliak", "ra": 282.520, "dec": 33.363,
                "mag": 3.45, "constellation": "Lira"},
            {"name": "Sulafat", "ra": 284.736, "dec": 32.690,
                "mag": 3.24, "constellation": "Lira"},

            # Aquila (Aquila)
            {"name": "Tarazed", "ra": 296.565, "dec": 10.613,
                "mag": 2.72, "constellation": "Aquila"},
            {"name": "Alshain", "ra": 299.689, "dec": 6.407,
                "mag": 3.71, "constellation": "Aquila"},

            # Additional bright stars across constellations
            {"name": "Castor", "ra": 113.649, "dec": 31.888,
                "mag": 1.57, "constellation": "Gemelli"},
            {"name": "Elnath", "ra": 84.411, "dec": 28.608,
                "mag": 1.68, "constellation": "Toro"},
            {"name": "Bellatrix", "ra": 81.283, "dec": 6.350,
                "mag": 1.64, "constellation": "Orione"},
            {"name": "Alnath", "ra": 84.411, "dec": 28.608,
                "mag": 1.68, "constellation": "Toro"},
            {"name": "Miaplacidus", "ra": 138.300, "dec": -
                69.717, "mag": 1.68, "constellation": "Carena"},
            {"name": "Alphard", "ra": 141.897, "dec": -
                8.659, "mag": 1.98, "constellation": "Idra"},
            {"name": "Hamal", "ra": 31.793, "dec": 23.462,
                "mag": 2.00, "constellation": "Ariete"},
            {"name": "Algenib", "ra": 3.308, "dec": 15.183,
                "mag": 2.83, "constellation": "Pegaso"},
            {"name": "Markab", "ra": 346.190, "dec": 15.205,
                "mag": 2.49, "constellation": "Pegaso"},
            {"name": "Scheat", "ra": 345.944, "dec": 28.083,
                "mag": 2.42, "constellation": "Pegaso"},
            {"name": "Alpheratz", "ra": 2.097, "dec": 29.091,
                "mag": 2.06, "constellation": "Andromeda"},

            # Fainter stars (magnitude 2-4) for complete sky coverage
            {"name": "Polaris", "ra": 37.946, "dec": 89.264,
                "mag": 1.98, "constellation": "Orsa Minore"},
            {"name": "Kochab", "ra": 222.676, "dec": 74.156,
                "mag": 2.08, "constellation": "Orsa Minore"},
            {"name": "Mirfak", "ra": 51.081, "dec": 49.861,
                "mag": 1.80, "constellation": "Perseo"},
            {"name": "Algol", "ra": 47.042, "dec": 40.956,
                "mag": 2.12, "constellation": "Perseo"},
            {"name": "Menkar", "ra": 45.570, "dec": 4.089,
                "mag": 2.54, "constellation": "Balena"},
            {"name": "Diphda", "ra": 10.897, "dec": -17.987,
                "mag": 2.04, "constellation": "Balena"},
            {"name": "Achernar", "ra": 24.429, "dec": -57.237,
                "mag": 0.46, "constellation": "Eridano"},
            {"name": "Acamar", "ra": 44.565, "dec": -40.305,
                "mag": 2.88, "constellation": "Eridano"},
            {"name": "Fomalhaut", "ra": 344.413, "dec": -29.622,
                "mag": 1.16, "constellation": "Pesce Australe"},

            # More constellation stars for richness
            {"name": "Ras Alhague", "ra": 263.734, "dec": 12.560,
                "mag": 2.08, "constellation": "Ofiuco"},
            {"name": "Sabik", "ra": 258.032, "dec": -15.725,
                "mag": 2.43, "constellation": "Ofiuco"},
            {"name": "Kornephoros", "ra": 247.555, "dec": 21.490,
                "mag": 2.77, "constellation": "Ercole"},
            {"name": "Zeta Her", "ra": 248.110, "dec": 31.603,
                "mag": 2.81, "constellation": "Ercole"},
            {"name": "Alphecca", "ra": 233.672, "dec": 26.715,
                "mag": 2.23, "constellation": "Corona Boreale"},
            {"name": "Gemma", "ra": 233.672, "dec": 26.715,
                "mag": 2.23, "constellation": "Corona Boreale"},

            # Southern hemisphere stars
            {"name": "Alpha Cen A", "ra": 219.902, "dec": -
                60.834, "mag": -0.01, "constellation": "Centauro"},
            {"name": "Beta Cen", "ra": 210.956, "dec": -60.373,
                "mag": 0.61, "constellation": "Centauro"},
            {"name": "Gacrux", "ra": 187.791, "dec": -57.113,
                "mag": 1.63, "constellation": "Croce del Sud"},
            {"name": "Acrux", "ra": 186.650, "dec": -63.099,
                "mag": 0.77, "constellation": "Croce del Sud"},

            # Milky Way region stars
            {"name": "Shaula", "ra": 263.402, "dec": -37.104,
                "mag": 1.63, "constellation": "Scorpione"},
            {"name": "Sargas", "ra": 264.330, "dec": -42.998,
                "mag": 1.87, "constellation": "Scorpione"},
            {"name": "Kaus Australis", "ra": 276.043, "dec": -
                34.385, "mag": 1.85, "constellation": "Sagittario"},
            {"name": "Nunki", "ra": 283.816, "dec": -26.297,
                "mag": 2.02, "constellation": "Sagittario"},

            # Additional northern stars
            {"name": "Capella", "ra": 79.172, "dec": 45.998,
                "mag": 0.08, "constellation": "Auriga"},
            {"name": "Menkalinan", "ra": 89.882, "dec": 44.947,
                "mag": 1.90, "constellation": "Auriga"},
            {"name": "Mahasim", "ra": 84.411, "dec": 33.166,
                "mag": 2.99, "constellation": "Auriga"},
        ]

        stars_data = []
        for star in all_stars:
            try:
                coord = SkyCoord(ra=star["ra"]*u.deg,
                                 dec=star["dec"]*u.deg, frame='icrs')
                altaz = coord.transform_to(
                    AltAz(obstime=self.observation_time, location=self.location))

                # Include all stars, even those below horizon for complete sky view
                stars_data.append({
                    "name": star["name"],
                    "ra": float(star["ra"]),
                    "dec": float(star["dec"]),
                    "magnitude": float(star["mag"]),
                    "azimuth": float(altaz.az.deg),
                    "altitude": float(altaz.alt.deg),
                    "constellation": star.get("constellation", "Sconosciuta"),
                    # Include stars slightly below horizon
                    "visible": bool(altaz.alt.deg > -5)
                })
            except Exception as e:
                # If coordinate transformation fails, include star anyway with basic data
                print(
                    f"Warning: Could not transform coordinates for {star['name']}: {e}")
                stars_data.append({
                    "name": star["name"],
                    "ra": float(star["ra"]),
                    "dec": float(star["dec"]),
                    "magnitude": float(star["mag"]),
                    "azimuth": 0.0,  # Default values
                    "altitude": 45.0,  # Assume visible
                    "constellation": star.get("constellation", "Sconosciuta"),
                    "visible": True
                })

        return stars_data

    def get_constellations(self) -> Dict[str, Any]:
        """Get constellation data with emphasis on Leo and Sagittarius"""
        constellations = {
            "Leo": {
                "stars": [
                    {"name": "Regulus", "ra": 152.093, "dec": 11.967, "mag": 1.35},
                    {"name": "Algieba", "ra": 154.993, "dec": 19.842, "mag": 2.28},
                    {"name": "Denebola", "ra": 177.265,
                        "dec": 14.572, "mag": 2.14},
                    {"name": "Zosma", "ra": 169.619, "dec": 20.524, "mag": 2.56},
                    {"name": "Chertan", "ra": 165.045, "dec": 15.429, "mag": 3.33},
                ],
                "highlighted": True,
                "color": "#FFD700"
            },
            "Sagittarius": {
                "stars": [
                    {"name": "Kaus Australis", "ra": 276.043,
                        "dec": -34.385, "mag": 1.85},
                    {"name": "Nunki", "ra": 283.816, "dec": -26.297, "mag": 2.02},
                    {"name": "Ascella", "ra": 290.972,
                        "dec": -29.880, "mag": 2.60},
                    {"name": "Kaus Media", "ra": 273.440,
                        "dec": -29.828, "mag": 2.70},
                    {"name": "Kaus Borealis", "ra": 271.452,
                        "dec": -25.421, "mag": 2.81},
                    {"name": "Albaldah", "ra": 276.990,
                        "dec": -25.421, "mag": 2.82},
                ],
                "highlighted": True,
                "color": "#FF6B6B"
            }
        }

        # Calculate positions for current observation time
        for constellation_name, constellation in constellations.items():
            for star in constellation["stars"]:
                try:
                    coord = SkyCoord(ra=star["ra"]*u.deg,
                                     dec=star["dec"]*u.deg, frame='icrs')
                    altaz = coord.transform_to(
                        AltAz(obstime=self.observation_time, location=self.location))
                    star["azimuth"] = float(altaz.az.deg)
                    star["altitude"] = float(altaz.alt.deg)
                    star["visible"] = bool(altaz.alt.deg > 0)
                except Exception as e:
                    print(
                        f"Warning: Could not transform coordinates for {star['name']} in {constellation_name}: {e}")
                    star["azimuth"] = 0.0
                    star["altitude"] = 45.0
                    star["visible"] = True

        return constellations

    def get_moon_position(self) -> Dict[str, Any]:
        """Get moon position for the observation date"""
        try:
            moon = get_moon(self.observation_time, self.location)
            altaz = moon.transform_to(
                AltAz(obstime=self.observation_time, location=self.location))

            return {
                "ra": float(moon.ra.deg),
                "dec": float(moon.dec.deg),
                "azimuth": float(altaz.az.deg),
                "altitude": float(altaz.alt.deg),
                "visible": bool(altaz.alt.deg > 0),
                "phase": self.calculate_moon_phase()
            }
        except Exception as e:
            print(f"Warning: Could not get moon position: {e}")
            return {
                "ra": 180.0,
                "dec": 0.0,
                "azimuth": 180.0,
                "altitude": 30.0,
                "visible": True,
                "phase": 0.5  # Default to half moon
            }

    def calculate_moon_phase(self) -> float:
        """Calculate moon phase (0 = new moon, 0.5 = full moon)"""
        # Simplified moon phase calculation
        days_since_new_moon = (self.observation_time.jd - 2460492.2) % 29.53
        return (days_since_new_moon / 29.53)


# Initialize calculator
astro_calc = AstronomicalCalculator()


@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main HTML page"""
    return FileResponse('static/index.html')


@app.get("/api/stars")
async def get_stars():
    """Get bright stars data"""
    try:
        stars = astro_calc.get_bright_stars()
        return {"stars": stars}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/constellations")
async def get_constellations():
    """Get constellation data"""
    try:
        constellations = astro_calc.get_constellations()
        return {"constellations": constellations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/moon")
async def get_moon():
    """Get moon position and phase"""
    try:
        moon_data = astro_calc.get_moon_position()
        return moon_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sky-data")
async def get_all_sky_data():
    """Get all astronomical data in one request"""
    try:
        return {
            "stars": astro_calc.get_bright_stars(),
            "constellations": astro_calc.get_constellations(),
            "moon": astro_calc.get_moon_position(),
            "observation_date": "2024-07-01",
            "observation_time": "22:00:00 UTC"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(
        os.environ.get("PORT", 8000)), reload=True)
