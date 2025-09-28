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
import { ColorDetector } from "./components/ColorDetector";
import { PointSystem } from "./components/PointSystem";
import { CONFIG, validateApiKey } from "./config";
import { gameBoyDialog } from "./components/GameBoyDialog";

let map: google.maps.Map;
// References for the 3D model and the overlay to allow dynamic updates
let carPlaceholder: Car; 
let threeJsOverlay: ThreeJSOverlayView | undefined;
// Point system components
let colorDetector: ColorDetector;
let pointSystem: PointSystem; 

const mapOptions = {
  tilt: 70, // High tilt for driving perspective
  heading: 0,
  zoom: 20,
  center: { lat: 29.651634, lng: -82.324829},
  mapId: "15431d2b469f209e",
  // disable interactions for clean simulation experience
  disableDefaultUI: true,
  gestureHandling: "none",
  keyboardShortcuts: false,
};

// ----------------------------------------------------------------------
// VEHICLE STATE AND PHYSICS CONSTANTS
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
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

const degToRad = (degrees: number) => degrees * (Math.PI / 180);
const METERS_TO_LAT = 1 / 111111; // 1 degree of latitude is ~111,111 meters

// ----------------------------------------------------------------------
// INPUT HANDLING SETUP
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
// BACKEND COORDINATE SYNC SYSTEM
// ----------------------------------------------------------------------

let lastBackendSync = 0;
const BACKEND_SYNC_INTERVAL = 1000; // Send every 1 second

async function sendCarCoordinatesToBackend(lat: number, lng: number, heading: number, speed: number): Promise<void> {
  const now = Date.now();
  if (now - lastBackendSync < BACKEND_SYNC_INTERVAL) return;
  lastBackendSync = now;
  
  const carData = {
    timestamp: now,
    coordinates: { latitude: lat, longitude: lng },
    heading: heading,
    speed: speed,
    playerId: "player_001"
  };

  try {
    await dummyBackendSync(carData);
  } catch (error) {
    console.error("Backend sync failed:", error);
  }
}

async function dummyBackendSync(carData: any): Promise<void> {
  console.log("DUMMY BACKEND SYNC:", {
    lat: carData.coordinates.latitude.toFixed(6),
    lng: carData.coordinates.longitude.toFixed(6),
    heading: carData.heading.toFixed(1),
    speed: carData.speed.toFixed(2),
    timestamp: new Date(carData.timestamp).toLocaleTimeString()
  });
  await new Promise(resolve => setTimeout(resolve, 50));
}

// ----------------------------------------------------------------------
// NEW: QUESTION SYSTEM ❓
// ----------------------------------------------------------------------

// --- Configuration ---
const QUESTION_INTERVAL = 15000; // Ask a question every 15 seconds
const FEEDBACK_DELAY = 2000;     // Show feedback for 2 seconds

// --- DOM Element References ---
let questionOverlay: HTMLElement;
let questionText: HTMLElement;
let answerButtonsContainer: HTMLElement;
let feedbackText: HTMLElement;

// --- Question Data ---
const QUESTIONS = [
  {
    question: "What is the speed limit in a typical US residential area unless otherwise posted?",
    answers: [
      { text: "25 mph", correct: true },
      { text: "35 mph", correct: false },
      { text: "15 mph", correct: false },
      { text: "45 mph", correct: false },
    ],
  },
  {
    question: "A flashing red traffic light at an intersection means:",
    answers: [
      { text: "Stop and proceed when safe.", correct: true },
      { text: "Slow down and proceed with caution.", correct: false },
      { text: "Speed up to clear the intersection.", correct: false },
      { text: "The traffic light is broken.", correct: false },
    ],
  },
  {
    question: "What does a solid yellow line on your side of the road mean?",
    answers: [
      { text: "Do not pass.", correct: true },
      { text: "Passing is allowed.", correct: false },
      { text: "Upcoming merge.", correct: false },
      { text: "School zone ahead.", correct: false },
    ],
  },
];

let currentQuestionIndex = -1;
let isGamePaused = false;

function setupQuestionSystem() {
    questionOverlay = document.getElementById('question-overlay')!;
    questionText = document.getElementById('question-text')!;
    answerButtonsContainer = document.getElementById('answer-buttons')!;
    feedbackText = document.getElementById('feedback-text')!;

    // Add Game Boy screen effect
    gameBoyDialog.addScanLineEffect();

    // Start the timer for the first question
    setTimeout(askQuestion, QUESTION_INTERVAL);
    
    // Add some example Game Boy dialogs for demonstration
    setTimeout(() => {
      // Show an alert about the game controls
      gameBoyDialog.showAlert("CONTROLS", "USE ARROW KEYS OR WASD TO DRIVE. ANSWER TRAFFIC QUESTIONS!");
    }, 5000);
}

function askQuestion() {
    isGamePaused = true; // Pause the game
    
    // Pick a new, random question
    currentQuestionIndex = (currentQuestionIndex + 1) % QUESTIONS.length;
    const question = QUESTIONS[currentQuestionIndex];

    // Populate the popup
    questionText.textContent = question.question;
    feedbackText.textContent = '';
    answerButtonsContainer.innerHTML = ''; // Clear old buttons

    question.answers.forEach(answer => {
        const button = document.createElement('button');
        button.textContent = answer.text;
        button.classList.add('answer-btn');
        button.addEventListener('click', () => selectAnswer(answer.correct));
        answerButtonsContainer.appendChild(button);
    });

    questionOverlay.style.display = 'flex';
    
    // Dim the point system and warnings
    const pointsDisplay = document.getElementById('points-display');
    const warningElement = document.getElementById('off-road-warning');
    if (pointsDisplay) {
        pointsDisplay.classList.add('dimmed');
    }
    if (warningElement) {
        warningElement.classList.add('dimmed');
    }
}

function selectAnswer(isCorrect: boolean) {
    // Disable all buttons
    const buttons = answerButtonsContainer.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);

    // Show feedback with Game Boy styling
    if (isCorrect) {
        feedbackText.textContent = 'CORRECT!';
        feedbackText.className = 'correct';
        // Show Game Boy notification for correct answer
        gameBoyDialog.showNotification("CORRECT! +10 POINTS", 2000);
    } else {
        feedbackText.textContent = 'INCORRECT.';
        feedbackText.className = 'incorrect';
        // Show Game Boy notification for incorrect answer
        gameBoyDialog.showNotification("WRONG ANSWER! TRY AGAIN", 2000);
    }

    // Hide popup after a delay and resume game
    setTimeout(hideQuestion, FEEDBACK_DELAY);
}

function hideQuestion() {
    questionOverlay.style.display = 'none';
    
    // Restore point system and warnings brightness
    const pointsDisplay = document.getElementById('points-display');
    const warningElement = document.getElementById('off-road-warning');
    if (pointsDisplay) {
        pointsDisplay.classList.remove('dimmed');
    }
    if (warningElement) {
        warningElement.classList.remove('dimmed');
    }
    
    isGamePaused = false; // Resume the game
    requestAnimationFrame(tick); // IMPORTANT: Restarts the game loop

    // Set timer for the next question
    setTimeout(askQuestion, QUESTION_INTERVAL);
}

// ----------------------------------------------------------------------
// GAME LOOP (TICK FUNCTION)
// ----------------------------------------------------------------------

function tick() {
  // If the game is paused for a question, stop the loop.
  if (isGamePaused) return;

  const timeSeconds = TIME_STEP / 1000;

  // 1. UPDATE VEHICLE STATE (Physics)
  let acceleration = 0;
  if (keysPressed["ArrowUp"] || keysPressed["w"]) {
    acceleration = ACCELERATION_RATE;
  } else if (keysPressed["ArrowDown"] || keysPressed["s"]) {
    acceleration = -DECELERATION_RATE;
  } else if (Math.abs(vehicleState.speed) > 0.01) {
    acceleration = -Math.sign(vehicleState.speed) * COASTING_RATE;
  }
  vehicleState.speed += acceleration * timeSeconds;
  
  if (vehicleState.speed > MAX_SPEED) vehicleState.speed = MAX_SPEED;
  else if (vehicleState.speed < 0) vehicleState.speed = 0;
  else if (Math.abs(vehicleState.speed) < 0.1 && acceleration === 0) vehicleState.speed = 0;

  if (Math.abs(vehicleState.speed) > 0.1) {
    const turningEffect = TURN_RATE * timeSeconds;
    if (keysPressed["ArrowLeft"] || keysPressed["a"]) vehicleState.heading -= turningEffect;
    if (keysPressed["ArrowRight"] || keysPressed["d"]) vehicleState.heading += turningEffect;
    vehicleState.heading %= 360;
  }

  const distance = vehicleState.speed * timeSeconds;
  const headingRad = degToRad(vehicleState.heading);
  const dLat = distance * Math.cos(headingRad) * METERS_TO_LAT;
  vehicleState.lat += dLat;
  const dLng = (distance * Math.sin(headingRad) * METERS_TO_LAT) / Math.cos(degToRad(vehicleState.lat));
  vehicleState.lng += dLng;

  // 2. UPDATE CAMERA & 3D MODEL
  map.moveCamera({
    tilt: vehicleState.tilt,
    heading: vehicleState.heading,
    zoom: vehicleState.zoom,
    center: { lat: vehicleState.lat, lng: vehicleState.lng },
  });

  if (threeJsOverlay) {
    threeJsOverlay.setAnchor({ lat: vehicleState.lat, lng: vehicleState.lng, altitude: 1 });
    carPlaceholder.updateHeading(vehicleState.heading);
    carPlaceholder.updateWheelRotation(vehicleState.speed);
    carPlaceholder.animateWheels(timeSeconds);
  }

  // 3. POINT SYSTEM UPDATE (async road detection)
  if (colorDetector && pointSystem) {
    // Use async road detection
    colorDetector.isOnRoad(vehicleState.lat, vehicleState.lng).then(isOnRoad => {
      pointSystem.update(
        { lat: vehicleState.lat, lng: vehicleState.lng }, 
        isOnRoad, 
        vehicleState.speed, 
        timeSeconds
      );
      // Update API status to show it's working
      if (colorDetector.isInFallbackMode()) {
        pointSystem.updateApiStatus('Fallback Mode', '#FF6B6B');
      } else {
        pointSystem.updateApiStatus('Real Roads API', '#4CAF50');
      }
    }).catch(error => {
      console.warn('Road detection failed:', error);
      pointSystem.updateApiStatus('API Error', '#FF6B6B');
      // Fallback to false (off road) if detection fails
      pointSystem.update(
        { lat: vehicleState.lat, lng: vehicleState.lng }, 
        false, 
        vehicleState.speed, 
        timeSeconds
      );
    });
  }

  // 4. BACKEND COORDINATE SYNC
  if (vehicleState.speed > 0) {
    sendCarCoordinatesToBackend(vehicleState.lat, vehicleState.lng, vehicleState.heading, vehicleState.speed);
  }
  
  // 5. Request the next frame
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
  
  carPlaceholder = new Car();
  scene.add(carPlaceholder);
  
  threeJsOverlay = new ThreeJSOverlayView({
     map,
     scene,
     anchor: { ...mapOptions.center, altitude: 1 }, 
  });
  
  // Initialize point system components
  if (validateApiKey()) {
    colorDetector = new ColorDetector(map, CONFIG.GOOGLE_MAPS_API_KEY);
    console.log('✅ Real road detection enabled with Google Maps Roads API');
    pointSystem = new PointSystem();
    pointSystem.updateApiStatus('✅ Real Roads API', '#4CAF50');
  } else {
    console.warn('⚠️ Using fallback road detection - configure API key for real roads');
    // Still create ColorDetector but it will use fallback mode
    colorDetector = new ColorDetector(map, 'fallback');
    pointSystem = new PointSystem();
    pointSystem.updateApiStatus('⚠️ Fallback Mode', '#FF6B6B');
  }
  
  // START THE GAME AND SYSTEMS
  setupInputHandling();
  setupQuestionSystem(); // Initialize the question system
  
  // Show Game Boy style welcome message
  setTimeout(() => {
    gameBoyDialog.showNotification("GAME STARTED! USE ARROW KEYS TO DRIVE", 3000);
  }, 1000);
  
  requestAnimationFrame(tick); // Start the main game loop
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
export { initMap };