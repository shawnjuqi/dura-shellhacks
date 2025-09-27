import * as THREE from "three";

export class Car extends THREE.Group {
  constructor() {
    super();

    // Set a new scale for this model
    this.scale.set(3, 3, 3);

    // Create reusable materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      flatShading: true,
    });

    const detailMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333, // A dark grey for details
      flatShading: true,
    });

    // Build the car from its components
    this.createChassis(bodyMaterial, detailMaterial);
    this.createWheels(detailMaterial);
    this.createLights();
  }

  private createChassis(bodyMat: THREE.Material, detailMat: THREE.Material): void {
    // Main chassis
    const chassisGeometry = new THREE.BoxGeometry(2, 4, 1);
    const chassis = new THREE.Mesh(chassisGeometry, bodyMat);
    chassis.position.z = 0.5;
    this.add(chassis);

    // Cabin and windows
    const cabinGeometry = new THREE.BoxGeometry(1.6, 2.5, 0.8);
    const cabin = new THREE.Mesh(cabinGeometry, bodyMat);
    cabin.position.set(0, -0.2, 1.1); // Sit it on top of the chassis
    this.add(cabin);

    // A small exhaust pipe
    const exhaustGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4);
    const exhaust = new THREE.Mesh(exhaustGeometry, detailMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.6, -2.2, 0.2);
    this.add(exhaust);
  }

  private createWheels(detailMat: THREE.Material): void {
    // Create one wheel geometry and reuse it
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
    wheelGeometry.rotateY(Math.PI / 2); // Rotate to be a wheel

    const wheelPositions = [
      { x: -1.1, y: 1.2, z: 0 },  // Front left
      { x: 1.1, y: 1.2, z: 0 },   // Front right
      { x: -1.1, y: -1.2, z: 0 }, // Rear left
      { x: 1.1, y: -1.2, z: 0 }   // Rear right
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, detailMat);
      wheel.position.set(pos.x, pos.y, pos.z);
      this.add(wheel);
    });
  }

  private createLights(): void {
    // A single geometry for all lights
    const lightGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12);
    lightGeometry.rotateZ(Math.PI / 2);

    // Headlights (yellow)
    const headlightMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 5 });
    const headlight1 = new THREE.Mesh(lightGeometry, headlightMaterial);
    const headlight2 = headlight1.clone();
    
    headlight1.position.set(-0.6, 2, 0.5);
    headlight2.position.set(0.6, 2, 0.5);
    this.add(headlight1, headlight2);

    // Taillights (red)
    const taillightMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 5 });
    const taillight1 = new THREE.Mesh(lightGeometry, taillightMaterial);
    const taillight2 = taillight1.clone();

    taillight1.position.set(-0.6, -2, 0.5);
    taillight2.position.set(0.6, -2, 0.5);
    this.add(taillight1, taillight2);
  }

  // The rotation logic is the same and works perfectly with this new model
  public updateHeading(headingDegrees: number): void {
    const headingRadians = -((headingDegrees * Math.PI) / 180);
    this.rotation.set(0, 0, headingRadians);
  }
}