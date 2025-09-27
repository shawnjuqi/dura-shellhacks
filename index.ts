/*
 * Copyright 2021 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as THREE from "three";
import { ThreeJSOverlayView } from "@googlemaps/three";
import { Car } from "./components/Car";

let map: google.maps.Map;
// References for the 3D model and the overlay to allow dynamic updates
let carPlaceholder: Car; 
let threeJsOverlay: ThreeJSOverlayView | undefined; 

const mapOptions = {
  tilt: 70, // High tilt for driving perspective
  heading: 0,
  zoom: 18,
  center: { lat: 29.651634, lng: -82.324829},
  mapId: "15431d2b469f209e",
  // disable interactions for clean simulation experience
  disableDefaultUI: true,
  gestureHandling: "none",
  keyboardShortcuts: false,
};


// ----------------------------------------------------------------------
// NEW: VEHICLE STATE AND PHYSICS CONSTANTS
// ----------------------------------------------------------------------

let vehicleState = {
  lat: mapOptions.center.lat,
  lng: mapOptions.center.lng,
  heading: 0, // In degrees (0 is North/Up)
  speed: 0,   // In meters per second (m/s)
  tilt: mapOptions.tilt,
  zoom: mapOptions.zoom,
};

// Physics/Control Constants
const ACCELERATION_RATE = 2.0; // m/s² 
const DECELERATION_RATE = 4.0; // m/s² (for braking)
const COASTING_RATE = 1.0;     // m/s² (for natural slowdown)
const MAX_SPEED = 25;          // m/s (approx 56 mph)
const TURN_RATE = 60;          // degrees per second
const TIME_STEP = 1000 / 60;   // Assumed time step (60 FPS) in milliseconds

// Input State
const keysPressed: { [key: string]: boolean } = {};


// ----------------------------------------------------------------------
// NEW: HELPER FUNCTIONS
// ----------------------------------------------------------------------

const degToRad = (degrees: number) => degrees * (Math.PI / 180);
const METERS_TO_LAT = 1 / 111111; // 1 degree of latitude is ~111,111 meters


// ----------------------------------------------------------------------
// NEW: INPUT HANDLING SETUP
// ----------------------------------------------------------------------

function setupInputHandling() {
  document.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
    }
    keysPressed[event.key] = true;
  });

  document.addEventListener("keyup", (event) => {
    keysPressed[event.key] = false;
  });
}


// ----------------------------------------------------------------------
// NEW: CONTINUOUS GAME LOOP (TICK)
// ----------------------------------------------------------------------

function tick() {
  const timeSeconds = TIME_STEP / 1000; // time step in seconds

  // -------------------------
  // 1. UPDATE VEHICLE STATE (Physics)
  // -------------------------

  // Acceleration/Braking
  let acceleration = 0;
  if (keysPressed["ArrowUp"] || keysPressed["w"]) {
    acceleration = ACCELERATION_RATE;
  } else if (keysPressed["ArrowDown"] || keysPressed["s"]) {
    acceleration = -DECELERATION_RATE; 
  } else if (Math.abs(vehicleState.speed) > 0.01) {
    acceleration = -Math.sign(vehicleState.speed) * COASTING_RATE;
  }

  vehicleState.speed += acceleration * timeSeconds;
  
  // Clamp speed and handle stop
  if (vehicleState.speed > MAX_SPEED) {
    vehicleState.speed = MAX_SPEED;
  } else if (vehicleState.speed < 0) {
    vehicleState.speed = 0; // Prevent reverse for now
  } else if (Math.abs(vehicleState.speed) < 0.1 && acceleration === 0) {
    vehicleState.speed = 0;
  }


  // Steering (only if moving)
  if (Math.abs(vehicleState.speed) > 0.1) {
    const turningEffect = TURN_RATE * timeSeconds;

    if (keysPressed["ArrowLeft"] || keysPressed["a"]) {
      vehicleState.heading -= turningEffect;
    }
    if (keysPressed["ArrowRight"] || keysPressed["d"]) {
      vehicleState.heading += turningEffect;
    }
    vehicleState.heading %= 360;
  }

  // Update Position based on Heading and Speed
  const distance = vehicleState.speed * timeSeconds; 
  const headingRad = degToRad(vehicleState.heading);

  // Calculate change in Latitude (North/South)
  const dLat = distance * Math.cos(headingRad) * METERS_TO_LAT;
  vehicleState.lat += dLat;

  // Calculate change in Longitude (East/West), accounting for latitude
  const dLng =
    (distance * Math.sin(headingRad) * METERS_TO_LAT) /
    Math.cos(degToRad(vehicleState.lat));
  vehicleState.lng += dLng;

  // -------------------------
  // 2. UPDATE CAMERA & 3D MODEL
  // -------------------------

  // A) Move the map camera to follow the vehicle's position and heading
  map.moveCamera({
    tilt: vehicleState.tilt,
    heading: vehicleState.heading,
    zoom: vehicleState.zoom,
    center: { lat: vehicleState.lat, lng: vehicleState.lng },
  });

  // B) Move the Three.js scene anchor (which holds the red circle)
  if (threeJsOverlay) {
    threeJsOverlay.setAnchor({ 
        lat: vehicleState.lat, 
        lng: vehicleState.lng, 
        altitude: 1 // Keep the object on the road
    });

    carPlaceholder.updateHeading(vehicleState.heading)

  }

  // -------------------------
  // 3. GAME LOGIC (Triggers/Questions will be added here later)
  // -------------------------

  requestAnimationFrame(tick);
}


// ----------------------------------------------------------------------
// initMap FUNCTION (Integrated with new setup)
// ----------------------------------------------------------------------

function initMap(): void {
  const mapDiv = document.getElementById("map") as HTMLElement;

  map = new google.maps.Map(mapDiv, mapOptions);

  const scene = new THREE.Scene();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
  directionalLight.position.set(0, 10, 50);
  scene.add(directionalLight);

  // ------------------------------------------------------------------
  // Create the Car Component
  // ------------------------------------------------------------------
  carPlaceholder = new Car();
  scene.add(carPlaceholder);

  // ------------------------------------------------------------------
  // START THE GAME
  // ------------------------------------------------------------------
  setupInputHandling();
  requestAnimationFrame(tick);

  // ------------------------------------------------------------------
  // ThreeJSOverlayView Setup (Store reference for dynamic movement)
  // ------------------------------------------------------------------
   threeJsOverlay = new ThreeJSOverlayView({
     map,
     scene,
     anchor: { ...mapOptions.center, altitude: 1 }, 
   });
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
export { initMap };