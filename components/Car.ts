import * as THREE from "three";

export class Car extends THREE.Group {
  private wheels: THREE.Group[] = [];
  private wheelRotationSpeed: number = 0;
  private dustParticles: THREE.Mesh[] = [];

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
    this.createDustParticles();
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
    // Create wheel materials
    const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Black tire
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc }); // Light gray rim

    const wheelPositions = [
      { x: -1.1, y: 1.2, z: 0 },  // Front left
      { x: 1.1, y: 1.2, z: 0 },   // Front right
      { x: -1.1, y: -1.2, z: 0 }, // Rear left
      { x: 1.1, y: -1.2, z: 0 }   // Rear right
    ];

    wheelPositions.forEach(pos => {
      // Create wheel group to hold tire and rim
      const wheelGroup = new THREE.Group();
      
      // Tire (outer part) - make it thicker and more rounded
      const tireGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
      const tire = new THREE.Mesh(tireGeometry, tireMaterial);
      tire.rotation.z = Math.PI / 2; // Rotate 90 degrees to be vertical (like real wheels)
      wheelGroup.add(tire);
      
      // Rim (inner part) - smaller and lighter colored
      const rimGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.31, 16);
      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.rotation.z = Math.PI / 2; // Rotate 90 degrees to be vertical
      
      // Make rim stick out in the correct direction based on wheel position
      // Left wheels (negative x) should have rim stick out to the left (negative x)
      // Right wheels (positive x) should have rim stick out to the right (positive x)
      const rimOffset = pos.x > 0 ? 0.05 : -0.05; // Right side positive, left side negative
      rim.position.x = rimOffset;
      
      wheelGroup.add(rim);
      
      // Add wheel caps on both sides for more 3D effect
      const capGeometry = new THREE.CircleGeometry(0.25, 16);
      const leftCap = new THREE.Mesh(capGeometry, rimMaterial);
      const rightCap = new THREE.Mesh(capGeometry, rimMaterial);
      
      leftCap.position.set(-0.155, 0, 0); // Left side (now X-axis)
      rightCap.position.set(0.155, 0, 0);  // Right side (now X-axis)
      leftCap.rotation.y = Math.PI / 2;   // Face outward
      rightCap.rotation.y = -Math.PI / 2; // Face outward
      
      wheelGroup.add(leftCap, rightCap);
      
      // Position wheels inside the car body, not protruding
      wheelGroup.position.set(pos.x, pos.y, pos.z - 0.4); // Move wheels inward
      this.add(wheelGroup);
      this.wheels.push(wheelGroup); // Store reference for animation
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
    const taillight2 = new THREE.Mesh(lightGeometry, taillightMaterial); // Create separate instance instead of cloning

    taillight1.position.set(-0.6, -2, 0.5);
    taillight2.position.set(0.6, -2, 0.5);
    this.add(taillight1, taillight2);
  }

  private createDustParticles(): void {
    // Create dust particles behind wheels
    const dustMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4A3C2A, // Darker dusty brown color
      transparent: true,
      opacity: 0.7
    });
    
    // Create 50 dust particles (increased from 20)
    for (let i = 0; i < 50; i++) {
      const dustGeometry = new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 4, 4);
      const dust = new THREE.Mesh(dustGeometry, dustMaterial);
      
      // Position particles behind wheels
      dust.position.set(
        (Math.random() - 0.5) * 2, // Random X position
        -2.5 + Math.random() * 0.5, // Behind the car
        -0.3 + Math.random() * 0.2 // Ground level with some variation
      );
      
      // Initially hide particles
      dust.visible = false;
      
      this.add(dust);
      this.dustParticles.push(dust);
    }
  }

  // The rotation logic is the same and works perfectly with this new model
  public updateHeading(headingDegrees: number): void {
    const headingRadians = -((headingDegrees * Math.PI) / 180);
    this.rotation.set(0, 0, headingRadians);
  }

  // Update wheel rotation speed based on car speed
  public updateWheelRotation(speed: number): void {
    // Calculate rotation speed based on car speed
    // Speed is in meters per second, convert to wheel rotations per second
    const wheelCircumference = 2 * Math.PI * 0.4; // Wheel radius is 0.4
    const rotationsPerSecond = speed / wheelCircumference;
    this.wheelRotationSpeed = rotationsPerSecond * 2 * Math.PI; // Convert to radians per second
  }

  // Animate wheel spinning (call this every frame)
  public animateWheels(deltaTime: number): void {
    if (this.wheelRotationSpeed > 0) {
      this.wheels.forEach(wheel => {
        // Rotate around X-axis (forward direction) - wheels roll forward like real wheels
        wheel.rotation.x += this.wheelRotationSpeed * deltaTime;
      });
      
      // Animate dust particles when moving
      this.animateDustParticles(deltaTime);
    } else {
      // Hide dust particles when stopped
      this.dustParticles.forEach(particle => {
        particle.visible = false;
      });
    }
  }

  private animateDustParticles(deltaTime: number): void {
    this.dustParticles.forEach((particle) => {
      if (this.wheelRotationSpeed > 0.5) {
        particle.visible = true;
        
        particle.position.y -= 2 * deltaTime;
        particle.position.x += (Math.random() - 0.5) * 0.5 * deltaTime;
        
        // This "if" statement is a type guard.
        // It ensures all code inside only runs if the material is the correct type.
        if (particle.material instanceof THREE.MeshBasicMaterial) {
          // Fade out particles over time
          particle.material.opacity = Math.max(0, particle.material.opacity - deltaTime * 0.5);
          
          // NEW: The reset check is now safely inside the type guard
          if (particle.material.opacity <= 0 || particle.position.y < -4) {
            particle.position.set(
              (Math.random() - 0.5) * 2,
              -2.5 + Math.random() * 0.5,
              Math.random() * 0.2
            );
            particle.material.opacity = 0.7; // Reset opacity
          }
        }
      } else {
        particle.visible = false;
      }
    });
  }
}