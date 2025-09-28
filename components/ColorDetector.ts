import { RealRoadDetector } from './RealRoadDetector';

export class ColorDetector {
  private map: google.maps.Map;
  private roadDetector: RealRoadDetector;
  private fallbackMode: boolean = false;
  
  constructor(map: google.maps.Map, apiKey: string) {
    this.map = map;
    this.roadDetector = new RealRoadDetector(map, apiKey);
  }
  
  // Get the color at a specific lat/lng position
  getColorAtPosition(lat: number, lng: number): { r: number; g: number; b: number } | null {
    try {
      // For now, we'll use a simplified approach based on coordinates
      // In a real implementation, you'd sample the actual map pixels
      return this.estimateRoadColor(lat, lng);
    } catch (error) {
      console.error('Error getting color:', error);
      return null;
    }
  }
  
  private estimateRoadColor(lat: number, lng: number): { r: number; g: number; b: number } {
    // This is a simplified heuristic to simulate road detection
    // In reality, you'd use Google Maps Roads API or pixel sampling
    
    // Create a pattern based on coordinates to simulate roads
    const latPattern = Math.abs(Math.sin(lat * 1000)) > 0.7;
    const lngPattern = Math.abs(Math.cos(lng * 1000)) > 0.7;
    
    // Simulate road intersections and main roads
    const isMainRoad = latPattern || lngPattern;
    const isIntersection = latPattern && lngPattern;
    
    if (isIntersection) {
      return { r: 100, g: 100, b: 100 }; // Darker gray for intersections
    } else if (isMainRoad) {
      return { r: 150, g: 150, b: 150 }; // Light gray for main roads
    } else {
      // Simulate different terrain types
      const terrainType = Math.floor((lat + lng) * 1000) % 4;
      switch (terrainType) {
        case 0: return { r: 34, g: 139, b: 34 };   // Green (parks/grass)
        case 1: return { r: 0, g: 100, b: 200 };   // Blue (water)
        case 2: return { r: 139, g: 69, b: 19 };   // Brown (buildings)
        default: return { r: 200, g: 200, b: 200 }; // Light gray (sidewalks)
      }
    }
  }
  
  // Check if a color is "gray" (road-like)
  isGrayColor(color: { r: number; g: number; b: number }): boolean {
    const { r, g, b } = color;
    
    // Check if it's a gray color (all RGB values are similar)
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const difference = max - min;
    
    // If the difference is small, it's likely gray
    const isGray = difference < 30;
    
    // Also check if it's in the gray range (not too dark or too light)
    const isInGrayRange = r > 80 && r < 200 && g > 80 && g < 200 && b > 80 && b < 200;
    
    return isGray && isInGrayRange;
  }
  
  // Real road detection using Google Maps Roads API
  async isOnRoad(lat: number, lng: number): Promise<boolean> {
    try {
      // Use real road detection
      return await this.roadDetector.isOnRoad(lat, lng);
    } catch (error) {
      console.warn('Real road detection failed, falling back to simulation:', error);
      this.fallbackMode = true;
      // Fallback to simulated detection
      return this.fallbackRoadDetection(lat, lng);
    }
  }
  
  // Fallback road detection (simulated) when API fails
  private fallbackRoadDetection(lat: number, lng: number): boolean {
    const zoom = this.map.getZoom() || 18;
    const center = this.map.getCenter();
    
    if (!center) return false;
    
    // Create road patterns that look more like real streets
    const latGrid = Math.floor((lat - center.lat()) * 10000) % 10;
    const lngGrid = Math.floor((lng - center.lng()) * 10000) % 10;
    
    // Main roads every 5 grid units
    const isMainRoad = latGrid === 0 || lngGrid === 0 || latGrid === 5 || lngGrid === 5;
    
    // Smaller roads every 2 grid units
    const isSmallRoad = latGrid % 2 === 0 || lngGrid % 2 === 0;
    
    return isMainRoad || isSmallRoad;
  }
  
  // Check if we're in fallback mode
  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }
  
  // Get cache statistics
  getCacheStats() {
    return this.roadDetector.getCacheStats();
  }
}
