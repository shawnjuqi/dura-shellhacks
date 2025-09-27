import * as THREE from "three";

export class Car extends THREE.Group {
  constructor() {
    super();

    // The car is now built correctly, so we only need to scale it.
    this.scale.set(8, 8, 8);

    this.createCarBody();
    this.createWheels();
  }

  private createCarBody(): void {
    // Main body of the car
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff4444 });
    const bodyGeometry = new THREE.BoxGeometry(1, 2, 0.5); // Width(X), Length(Y), Height(Z)
    const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    carBody.position.z = 0.25; // Lift the body off the ground
    this.add(carBody);

    // Cabin/roof of the car
    const cabinGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.4);
    const carCabin = new THREE.Mesh(cabinGeometry, bodyMaterial);
    carCabin.position.set(0, -0.2, 0.5); // Position on top of the rear of the body
    this.add(carCabin);
  }

  private createWheels(): void {
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
    // Create one geometry and rotate it to lie flat
    const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16);
    wheelGeometry.rotateX(Math.PI / 2); // Rotate the cylinder to be a wheel

    const wheelPositions = [
      { x: -0.55, y: 0.6, z: 0 },  // Front left
      { x: 0.55, y: 0.6, z: 0 },   // Front right
      { x: -0.55, y: -0.7, z: 0 }, // Rear left
      { x: 0.55, y: -0.7, z: 0 }   // Rear right
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, pos.y, pos.z);
      this.add(wheel);
    });
  }

  // The rotation logic is now extremely simple
  public updateHeading(headingDegrees: number): void {
    // With the model built correctly, we only need to rotate around
    // the Z (up) axis. No more quaternions or complex math needed.
    const headingRadians = -((headingDegrees * Math.PI) / 180);
    this.rotation.set(0, 0, headingRadians);
  }
}