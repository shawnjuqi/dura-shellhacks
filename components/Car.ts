import * as THREE from "three";

export class Car extends THREE.Group {
  constructor() {
    super();

    this.createCarBody();
    this.createCarRoof();
    this.createWheels();
    this.createWindshield();
    
    // Position the car properly
    (this as THREE.Group).position.set(0, 0, 0);
    (this as THREE.Group).rotation.x = Math.PI / 2; // Lay flat on the ground like the circle
    
    // Make the car bigger
    (this as THREE.Group).scale.set(6, 6, 6);
  }

  private createCarBody(): void {
    // Car body - main structure
    const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 1);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff4444 });
    const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    carBody.position.y = 0.4;
    (this as THREE.Group).add(carBody);
  }

  private createCarRoof(): void {
    // Car roof - smaller than body
    const roofGeometry = new THREE.BoxGeometry(1.3, 0.6, 0.9);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
    const carRoof = new THREE.Mesh(roofGeometry, roofMaterial);
    carRoof.position.set(0, 1.1, -0.05);
    (this as THREE.Group).add(carRoof);
  }

  private createWheels(): void {
    // Wheels - four cylinders
    const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 8);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
    
    const wheelPositions = [
      { x: 0.6, y: 0.2, z: 0.55 },   // Front left
      { x: 0.6, y: 0.2, z: -0.55 },  // Front right
      { x: -0.6, y: 0.2, z: 0.55 },  // Rear left
      { x: -0.6, y: 0.2, z: -0.55 }  // Rear right
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, pos.y, pos.z);
      (this as THREE.Group).add(wheel);
    });
  }

  private createWindshield(): void {
    // Windshield - transparent blue
    const windshieldGeometry = new THREE.PlaneGeometry(1.1, 0.5);
    const windshieldMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.7
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0.25, 1.35, 0);
    windshield.rotation.x = -Math.PI / 8;
    (this as THREE.Group).add(windshield);
  }

  // Method to update car rotation (for heading changes)
  public updateHeading(headingDegrees: number): void {
    // Simple rotation around Y-axis (upward) to prevent flipping
    const headingRad = (headingDegrees * Math.PI) / 180;
    
    // Set rotation around Y-axis (vertical axis) to keep car upright
    (this as THREE.Group).rotation.y = headingRad;
    
    // Keep car flat on ground
    (this as THREE.Group).rotation.x = Math.PI / 2;
    (this as THREE.Group).rotation.z = 0;
  }
}
