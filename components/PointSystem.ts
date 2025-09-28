import { CONFIG } from '../config';

export class PointSystem {
  private points: number = 0;
  private isOnRoad: boolean = false;
  private lastPosition: { lat: number; lng: number } | null = null;
  private pointMultiplier: number = 1;
  private consecutiveRoadTime: number = 0;
  private totalDistanceOnRoad: number = 0;
  private warningElement: HTMLElement | null = null;
  
  constructor() {
    this.createUI();
    this.createWarningSystem();
  }
  
  private createUI() {
    // Create Game Boy style points display
    const pointsDiv = document.createElement('div');
    pointsDiv.id = 'points-display';
    pointsDiv.className = 'gameboy-points-display';
    pointsDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ffffff;
      color: #000000;
      padding: 16px;
      border: 4px solid #000000;
      border-radius: 0;
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      z-index: 1000;
      min-width: 220px;
      box-shadow: 
        6px 6px 0px #000000;
      image-rendering: pixelated;
      line-height: 1.4;
    `;
    pointsDiv.innerHTML = `
      <div style="text-align: center; margin-bottom: 12px;">
        <h3 style="margin: 0; color: #000000; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">POINTS SYSTEM</h3>
      </div>
      <div style="margin-bottom: 8px;">
        <span style="text-transform: uppercase;">POINTS:</span> <span id="points-value" style="color: #000000; font-size: 10px;">0</span>
      </div>
      <div style="margin-bottom: 8px;">
        <span style="text-transform: uppercase;">STATUS:</span> <span id="road-status" style="font-weight: normal; text-transform: uppercase;">OFF ROAD</span>
      </div>
      <div style="margin-bottom: 8px;">
        <span style="text-transform: uppercase;">MULTIPLIER:</span> <span id="multiplier" style="color: #000000;">1.0X</span>
      </div>
      <div style="margin-bottom: 8px;">
        <span style="text-transform: uppercase;">DISTANCE:</span> <span id="distance" style="color: #000000;">0M</span>
      </div>
      <div style="margin-bottom: 8px;">
        <span style="text-transform: uppercase;">API:</span> <span id="api-status" style="color: #000000;">LOADING...</span>
      </div>
      <div style="text-align: center; margin-top: 12px;">
        <button id="reset-points" class="gameboy-button" style="font-size: 6px; padding: 6px 12px;">RESET POINTS</button>
      </div>
    `;
    document.body.appendChild(pointsDiv);
    
    // Add reset button functionality
    const resetButton = document.getElementById('reset-points');
    if (resetButton) {
      resetButton.addEventListener('click', () => this.reset());
    }
  }
  
  private createWarningSystem() {
    // Create Game Boy style warning element in top-left corner
    this.warningElement = document.createElement('div');
    this.warningElement.id = 'off-road-warning';
    this.warningElement.className = 'gameboy-warning';
    this.warningElement.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: #000000;
      color: #ffffff;
      padding: 12px 16px;
      border: 3px solid #000000;
      border-radius: 0;
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      font-weight: normal;
      z-index: 1000;
      box-shadow: 
        4px 4px 0px #000000,
        4px 4px 0px 2px #ffffff,
        6px 6px 0px #000000;
      display: none;
      transition: opacity 0.3s ease;
      image-rendering: pixelated;
      text-transform: uppercase;
      letter-spacing: 1px;
      line-height: 1.4;
      animation: gameboy-warning-pulse 1s infinite;
    `;
    this.warningElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 10px;">!</span>
        <span>OFF ROAD! POINTS LOST!</span>
      </div>
    `;
    document.body.appendChild(this.warningElement);
  }
  
  update(carPosition: { lat: number; lng: number }, isOnRoad: boolean, speed: number, deltaTime: number) {
    // Check if car moved
    if (this.lastPosition) {
      const distance = this.calculateDistance(this.lastPosition, carPosition);
      
      if (distance > 0.0001) { // Car moved (threshold to avoid noise)
        if (isOnRoad) {
          // Add points based on distance traveled on road
          const basePoints = distance * CONFIG.POINTS.BASE_POINTS_PER_METER;
          const speedBonus = Math.min(speed / 5, CONFIG.POINTS.MAX_SPEED_BONUS);
          const pointsEarned = Math.floor(basePoints * this.pointMultiplier * speedBonus);
          this.points += pointsEarned;
          
          // Track distance on road
          this.totalDistanceOnRoad += distance;
          
          // Increase multiplier for consecutive road driving
          this.consecutiveRoadTime += deltaTime;
          if (this.consecutiveRoadTime > CONFIG.POINTS.MULTIPLIER_INCREASE_TIME) {
            this.pointMultiplier = Math.min(this.pointMultiplier + 0.1, CONFIG.POINTS.MAX_MULTIPLIER);
            this.consecutiveRoadTime = 0; // Reset timer
          }
        } else {
          // OFF ROAD - LOSE POINTS
          const penaltyPoints = distance * CONFIG.POINTS.OFF_ROAD_PENALTY;
          this.points = Math.max(0, this.points - Math.floor(penaltyPoints)); // Don't go below 0
          
          // Reset multiplier when off road
          this.pointMultiplier = 1;
          this.consecutiveRoadTime = 0;
        }
      }
    }
    
    this.lastPosition = carPosition;
    this.isOnRoad = isOnRoad;
    this.updateUI();
  }
  
  private calculateDistance(pos1: { lat: number; lng: number }, pos2: { lat: number; lng: number }): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.lat * Math.PI / 180;
    const φ2 = pos2.lat * Math.PI / 180;
    const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
    const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }
  
  private updateUI() {
    const pointsElement = document.getElementById('points-value');
    const statusElement = document.getElementById('road-status');
    const multiplierElement = document.getElementById('multiplier');
    const distanceElement = document.getElementById('distance');
    const apiStatusElement = document.getElementById('api-status');
    
    if (pointsElement) pointsElement.textContent = this.points.toLocaleString();
    if (statusElement) {
      statusElement.textContent = this.isOnRoad ? 'ON ROAD' : 'OFF ROAD';
      statusElement.style.color = '#000000'; // Always black in Game Boy style
    }
    if (multiplierElement) {
      multiplierElement.textContent = `${this.pointMultiplier.toFixed(1)}X`;
      multiplierElement.style.color = '#000000'; // Always black in Game Boy style
    }
    if (distanceElement) {
      distanceElement.textContent = `${Math.round(this.totalDistanceOnRoad)}M`;
    }
    if (apiStatusElement) {
      // This will be updated by the main system
      apiStatusElement.textContent = 'CHECKING...';
    }
    
    // Show/hide off-road warning
    if (this.warningElement) {
      if (this.isOnRoad) {
        this.warningElement.style.display = 'none';
      } else {
        this.warningElement.style.display = 'block';
      }
    }
  }
  
  // Update API status from external system
  updateApiStatus(status: string, color: string = '#FFD700') {
    const apiStatusElement = document.getElementById('api-status');
    if (apiStatusElement) {
      // Convert status to Game Boy style (uppercase, no emojis)
      const gameBoyStatus = status.replace(/[^\w\s]/g, '').toUpperCase();
      apiStatusElement.textContent = gameBoyStatus;
      apiStatusElement.style.color = '#000000'; // Always black in Game Boy style
    }
  }
  
  getPoints(): number {
    return this.points;
  }
  
  getDistanceOnRoad(): number {
    return this.totalDistanceOnRoad;
  }
  
  reset() {
    this.points = 0;
    this.pointMultiplier = 1;
    this.lastPosition = null;
    this.consecutiveRoadTime = 0;
    this.totalDistanceOnRoad = 0;
    this.updateUI();
  }
  
  // Add achievement system
  checkAchievements(): string[] {
    const achievements: string[] = [];
    
    if (this.points >= 1000 && this.points < 2000) {
      achievements.push('🎯 Road Warrior - 1000 points!');
    } else if (this.points >= 5000) {
      achievements.push('🏆 Master Driver - 5000 points!');
    }
    
    if (this.totalDistanceOnRoad >= 1000) {
      achievements.push('🛣️ Distance Master - 1km on roads!');
    }
    
    return achievements;
  }
}
