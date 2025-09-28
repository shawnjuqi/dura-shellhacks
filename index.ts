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
// Import the modular Auth0 functions
import { 
    login, 
    logout, 
    isAuthenticated as checkIsAuthenticated, 
    getUser, 
    handleRedirectCallback 
} from './auth'; 


// ----------------------------------------------------------------------
// GLOBAL UI AND AUTH0 VARIABLES
// ----------------------------------------------------------------------
let isAuthenticated = false;
let userProfile: any = null;
const userStatusElement = document.getElementById('user-status');
const loginButton = document.getElementById('login-btn');
const logoutButton = document.getElementById('logout-btn');
// Reference for the welcome message element
const welcomeMessageElement = document.getElementById('welcome-message');
const controlMessageElement = document.getElementById('control-message'); // NEW
let controlsShown = false; // NEW


let map: google.maps.Map;
let carPlaceholder: Car; 
let threeJsOverlay: ThreeJSOverlayView | undefined;
let colorDetector: ColorDetector;
let pointSystem: PointSystem; 

const mapOptions = {
  tilt: 70, 
  heading: 0,
  zoom: 20,
  center: { lat: 29.651634, lng: -82.324829},
  mapId: "15431d2b469f209e",
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
  heading: 0, 
  speed: 0,   
  tilt: mapOptions.tilt,
  zoom: mapOptions.zoom,
};

const ACCELERATION_RATE = 2.0; 
const DECELERATION_RATE = 4.0; 
const COASTING_RATE = 1.0;     
const MAX_SPEED = 25;          
const TURN_RATE = 60;          
const TIME_STEP = 1000 / 60;   
const keysPressed: { [key: string]: boolean } = {};


// ----------------------------------------------------------------------
// HELPER & INPUT FUNCTIONS
// ----------------------------------------------------------------------
const degToRad = (degrees: number) => degrees * (Math.PI / 180);
const METERS_TO_LAT = 1 / 111111;
function setupInputHandling() {
  document.addEventListener("keydown", (event) => {
    // Use toLowerCase for consistent key checks (w, a, s, d)
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
    }
    keysPressed[key] = true;
  });

  document.addEventListener("keyup", (event) => {
    keysPressed[event.key.toLowerCase()] = false;
  });
}

// ----------------------------------------------------------------------
// BACKEND COORDINATE SYNC SYSTEM 
// ----------------------------------------------------------------------

let lastBackendSync = 0;
const BACKEND_SYNC_INTERVAL = 1000;

async function sendCarCoordinatesToBackend(lat: number, lng: number, heading: number, speed: number): Promise<void> {
  if (!isAuthenticated) return;

  const now = Date.now();
  if (now - lastBackendSync < BACKEND_SYNC_INTERVAL) return;
  lastBackendSync = now;
  
  const carData = {
    timestamp: now,
    coordinates: { latitude: lat, longitude: lng },
    heading: heading,
    speed: speed,
    playerId: userProfile?.sub || "anonymous" 
  };

  try {
    await dummyBackendSync(carData);
  } catch (error) {
    console.error("Backend sync failed:", error);
  }
}

async function dummyBackendSync(carData: any): Promise<void> {
  console.log("DUMMY BACKEND SYNC:", {
    playerId: carData.playerId,
    lat: carData.coordinates.latitude.toFixed(6),
    lng: carData.coordinates.longitude.toFixed(6),
    speed: carData.speed.toFixed(2),
  });
  await new Promise(resolve => setTimeout(resolve, 50));
}

// ----------------------------------------------------------------------
// QUESTION SYSTEM
// ----------------------------------------------------------------------
const QUESTION_INTERVAL = 15000; 
const FEEDBACK_DELAY = 2000;     
let questionOverlay: HTMLElement;
let questionText: HTMLElement;
let answerButtonsContainer: HTMLElement;
let feedbackText: HTMLElement;
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
    // Note: We assume the DOM elements for questions are set up in index.html
    questionOverlay = document.getElementById('question-overlay')!;
    questionText = document.getElementById('question-text')!;
    answerButtonsContainer = document.getElementById('answer-buttons')!;
    feedbackText = document.getElementById('feedback-text')!;

    gameBoyDialog.addScanLineEffect();
    setTimeout(askQuestion, QUESTION_INTERVAL);
    // Removed the old 'CONTROLS' alert since we added a permanent UI element
}

function askQuestion() {
    isGamePaused = true;
    currentQuestionIndex = (currentQuestionIndex + 1) % QUESTIONS.length;
    const question = QUESTIONS[currentQuestionIndex];

    questionText.textContent = question.question;
    feedbackText.textContent = '';
    answerButtonsContainer.innerHTML = '';

    question.answers.forEach(answer => {
        const button = document.createElement('button');
        button.textContent = answer.text;
        button.classList.add('answer-btn');
        button.addEventListener('click', () => selectAnswer(answer.correct));
        answerButtonsContainer.appendChild(button);
    });

    questionOverlay.style.display = 'flex';
    
    // Dim the point system and warning when question is active
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
    const buttons = answerButtonsContainer.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);

    if (isCorrect) {
        feedbackText.textContent = 'CORRECT!';
        feedbackText.className = 'correct';
        gameBoyDialog.showNotification("CORRECT! +10 POINTS", 2000);
        // Assuming pointSystem.addPoints exists in PointSystem.ts
        if (pointSystem && 'addPoints' in pointSystem) {
             (pointSystem as any).addPoints(100); 
        }
    } else {
        feedbackText.textContent = 'INCORRECT.';
        feedbackText.className = 'incorrect';
        gameBoyDialog.showNotification("WRONG ANSWER! TRY AGAIN", 2000);
    }

    setTimeout(hideQuestion, FEEDBACK_DELAY);
}

function hideQuestion() {
    questionOverlay.style.display = 'none';
    
    // Un-dim the point system and warning
    const pointsDisplay = document.getElementById('points-display');
    const warningElement = document.getElementById('off-road-warning');
    if (pointsDisplay) {
        pointsDisplay.classList.remove('dimmed');
    }
    if (warningElement) {
        warningElement.classList.remove('dimmed');
    }
    
    isGamePaused = false;
    // Call tick to ensure the game loop restarts
    requestAnimationFrame(tick);

    setTimeout(askQuestion, QUESTION_INTERVAL);
}
// ----------------------------------------------------------------------


// ----------------------------------------------------------------------
// GAME LOOP (TICK FUNCTION)
// ----------------------------------------------------------------------
function tick() {
  // If game is paused by a question, exit the frame loop
  if (isGamePaused) return;

  const timeSeconds = TIME_STEP / 1000;

  // 1. UPDATE VEHICLE STATE (Physics) 
  let userAcceleration = 0;
  
  // Check for movement input
  const isMovingKey = (keysPressed["arrowup"] || keysPressed["w"] || keysPressed["arrowdown"] || keysPressed["s"]);

  if (isMovingKey) {
      userAcceleration = ACCELERATION_RATE;
  }
  
  // NEW: Check for input and hide controls
  if (controlsShown && isMovingKey) {
    if (controlMessageElement) {
      controlMessageElement.style.display = 'none';
    }
    controlsShown = false; // Never show it again
  }
  
  // Physics logic (continues regardless of control message)
  if (keysPressed["arrowdown"] || keysPressed["s"]) userAcceleration = -DECELERATION_RATE; 

  let friction = 0;
  if (userAcceleration === 0 && Math.abs(vehicleState.speed) > 0.01) {
    friction = -Math.sign(vehicleState.speed) * COASTING_RATE;
  }
  
  vehicleState.speed += (userAcceleration + friction) * timeSeconds;
  
  if (Math.abs(vehicleState.speed) < 0.1 && userAcceleration === 0) vehicleState.speed = 0;
  vehicleState.speed = Math.min(Math.max(vehicleState.speed, 0), MAX_SPEED);

  if (Math.abs(vehicleState.speed) > 0.1) {
    const turningEffect = TURN_RATE * timeSeconds;
    if (keysPressed["arrowleft"] || keysPressed["a"]) vehicleState.heading -= turningEffect;
    if (keysPressed["arrowright"] || keysPressed["d"]) vehicleState.heading += turningEffect;
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

  // 3. POINT SYSTEM UPDATE 
  if (colorDetector && pointSystem) {
    colorDetector.isOnRoad(vehicleState.lat, vehicleState.lng).then(isOnRoad => {
      pointSystem.update(
        { lat: vehicleState.lat, lng: vehicleState.lng }, 
        isOnRoad, 
        vehicleState.speed, 
        timeSeconds
      );
      if (colorDetector.isInFallbackMode()) {
        pointSystem.updateApiStatus('Fallback Mode', '#FF6B6B');
      } else {
        pointSystem.updateApiStatus('Real Roads API', '#4CAF50');
      }
    }).catch(error => {
      console.warn('Road detection failed:', error);
      pointSystem.updateApiStatus('API Error', '#FF6B6B');
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
  
  // Request next frame
  requestAnimationFrame(tick);
}

// ----------------------------------------------------------------------
// AUTH0 INTERFACE & STATUS UPDATES
// ----------------------------------------------------------------------

async function updateAuthStatus(): Promise<void> {
  // Use the imported functions from auth.ts
  isAuthenticated = await checkIsAuthenticated();
  
  if (isAuthenticated) {
    userProfile = await getUser();
    userStatusElement!.textContent = `Status: Logged in as ${userProfile?.nickname || 'User'}`;
    loginButton!.style.display = 'none';
    logoutButton!.style.display = 'block';
    
    // HIDE: Hide the welcome message when logged in
    if (welcomeMessageElement) {
        welcomeMessageElement.style.display = 'none';
    }
    
    // Start game systems only after successful login
    initGameSystems();
    
    gameBoyDialog.showNotification(`WELCOME BACK, ${userProfile?.nickname?.toUpperCase() || 'DRIVER'}!`, 3000);
  } else {
    userStatusElement!.textContent = "Status: Logged out";
    loginButton!.style.display = 'block';
    logoutButton!.style.display = 'none';
    
    // SHOW: Ensure the welcome message is visible when logged out
    if (welcomeMessageElement) {
        welcomeMessageElement.style.display = 'block';
    }
    
    // If logged out, only show the map shell
    initMapShell();
    
    // Only show login prompt when we confirm the user is logged out
    gameBoyDialog.showNotification("LOG IN TO START DRIVING!", 5000);
  }
}

function setupAuthEventListeners(): void {
    // Attach imported functions to DOM buttons
    if (loginButton) loginButton.addEventListener('click', login);
    if (logoutButton) logoutButton.addEventListener('click', logout);
}

// ----------------------------------------------------------------------
// MODIFIED: initMapShell (Map Initialization for non-logged-in users)
// ----------------------------------------------------------------------
function initMapShell(): void {
  // Check if map is already initialized to prevent errors on multiple calls
  if (map) return; 
  
  const mapDiv = document.getElementById("map") as HTMLElement;
  map = new google.maps.Map(mapDiv, mapOptions);
  const scene = new THREE.Scene();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
  directionalLight.position.set(0, 10, 50);
  scene.add(directionalLight);
  
  // Create car object but leave it static
  carPlaceholder = new Car();
  scene.add(carPlaceholder);
  
  // FIX: Passing only the options object to ThreeJSOverlayView
  threeJsOverlay = new ThreeJSOverlayView({
     map,
     scene,
     anchor: { ...mapOptions.center, altitude: 1 }, 
  }); 
}


// ----------------------------------------------------------------------
// initGameSystems - Starts all game features only after login
// ----------------------------------------------------------------------
function initGameSystems(): void {
  // Initialize point system components
  if (!pointSystem) {
    // If map wasn't initialized (first run), call the shell to set up map/car
    if (!map) {
        initMapShell(); 
    }
    
    // Initialize required components
    if (validateApiKey()) {
      colorDetector = new ColorDetector(map, CONFIG.GOOGLE_MAPS_API_KEY);
      pointSystem = new PointSystem();
      pointSystem.updateApiStatus('✅ Real Roads API', '#4CAF50');
    } else {
      colorDetector = new ColorDetector(map, 'fallback');
      pointSystem = new PointSystem();
      pointSystem.updateApiStatus('⚠️ Fallback Mode', '#FF6B6B');
    }
  } else {
    // If it exists, just reset the game state
    pointSystem.reset();
  }

  // Show controls on game start
  if (controlMessageElement) {
    controlMessageElement.style.display = 'block';
    controlsShown = true;
  }

  // Start input and question systems
  setupInputHandling();
  setupQuestionSystem(); 
  
  // Start the main game loop if it's not already running
  if (!isGamePaused) {
      requestAnimationFrame(tick);
  }
}


// ----------------------------------------------------------------------
// GLOBAL ENTRY POINT (Called by Google Maps API script)
// ----------------------------------------------------------------------
async function mainEntry(): Promise<void> {
    // 1. Setup Auth0 event listeners
    setupAuthEventListeners();
    
    // 2. Check for redirect from Auth0 and handle it
    const query = window.location.search;
    if (query.includes('code=') && query.includes('state=')) {
      gameBoyDialog.showNotification("AUTHENTICATING...", 5000);
      await handleRedirectCallback();
      // Clean the URL history
      window.history.replaceState({}, document.title, window.location.origin);
    }
    
    // 3. Update status and start the correct mode (game or shell)
    await updateAuthStatus();
}


declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = mainEntry; 
export { mainEntry };