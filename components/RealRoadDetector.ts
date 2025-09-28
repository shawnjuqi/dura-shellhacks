import { CONFIG } from '../config';

export class RealRoadDetector {
  private map: google.maps.Map;
  private apiKey: string;
  private cache: Map<string, boolean> = new Map();
  private cacheTimeout: number = CONFIG.ROADS_API.CACHE_TIMEOUT;
  private requestTimeout: number = 5000; // 5 second timeout
  private roadTolerance: number = CONFIG.ROADS_API.ROAD_TOLERANCE;
  private lastCacheTime: Map<string, number> = new Map();
  
  constructor(map: google.maps.Map, apiKey: string) {
    this.map = map;
    this.apiKey = apiKey;
  }
  
  async isOnRoad(lat: number, lng: number): Promise<boolean> {
    // Create cache key for this coordinate (rounded to 5 decimal places for caching)
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || false;
    }
    
    try {
      // Use Google Maps Roads API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      const response = await fetch(
        `https://roads.googleapis.com/v1/nearestRoads?points=${lat},${lng}&key=${this.apiKey}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`Roads API error: ${response.status} ${response.statusText}`);
        return false;
      }
      
      const data = await response.json();
      
      // Check if we have snapped points
      if (data.snappedPoints && data.snappedPoints.length > 0) {
        const snappedPoint = data.snappedPoints[0];
        
        // Calculate distance from original point to snapped point
        const originalLat = lat;
        const originalLng = lng;
        const snappedLat = snappedPoint.location.latitude;
        const snappedLng = snappedPoint.location.longitude;
        
        const distance = this.calculateDistance(
          { lat: originalLat, lng: originalLng },
          { lat: snappedLat, lng: snappedLng }
        );
        
        // Only consider it "on road" if the snap distance is small (within tolerance)
        const isOnRoad = distance <= this.roadTolerance;
        
        if (CONFIG.ROADS_API.DEBUG_MODE) {
          console.log(`Road detection: Original(${originalLat.toFixed(6)}, ${originalLng.toFixed(6)}) -> Snapped(${snappedLat.toFixed(6)}, ${snappedLng.toFixed(6)}) Distance: ${distance.toFixed(2)}m (tolerance: ${this.roadTolerance}m) -> ${isOnRoad ? 'ON ROAD' : 'OFF ROAD'}`);
        }
        
        // Cache the result
        this.cache.set(cacheKey, isOnRoad);
        this.lastCacheTime.set(cacheKey, Date.now());
        
        return isOnRoad;
      } else {
        // No snapped points = definitely off road
        if (CONFIG.ROADS_API.DEBUG_MODE) {
          console.log(`Road detection: No roads found near (${lat.toFixed(6)}, ${lng.toFixed(6)}) -> OFF ROAD`);
        }
        this.cache.set(cacheKey, false);
        this.lastCacheTime.set(cacheKey, Date.now());
        return false;
      }
    } catch (error) {
      console.error('Road detection failed:', error);
      return false;
    }
  }
  
  private isCacheValid(cacheKey: string): boolean {
    const lastTime = this.lastCacheTime.get(cacheKey);
    if (!lastTime) return false;
    
    return (Date.now() - lastTime) < this.cacheTimeout;
  }
  
  // Batch check multiple points (more efficient for multiple checks)
  async checkMultiplePoints(points: { lat: number; lng: number }[]): Promise<boolean[]> {
    if (points.length === 0) return [];
    
    try {
      // Format points for batch API call
      const pointsString = points.map(p => `${p.lat},${p.lng}`).join('|');
      
      const response = await fetch(
        `https://roads.googleapis.com/v1/nearestRoads?points=${pointsString}&key=${this.apiKey}`
      );
      
      if (!response.ok) {
        console.warn(`Roads API error: ${response.status} ${response.statusText}`);
        return new Array(points.length).fill(false);
      }
      
      const data = await response.json();
      const results = new Array(points.length).fill(false);
      
      // Mark snapped points as on road
      if (data.snappedPoints) {
        data.snappedPoints.forEach((snappedPoint: any) => {
          if (snappedPoint.originalIndex !== undefined) {
            results[snappedPoint.originalIndex] = true;
          }
        });
      }
      
      return results;
    } catch (error) {
      console.error('Batch road detection failed:', error);
      return new Array(points.length).fill(false);
    }
  }
  
  // Clear cache (useful for testing or when you want fresh data)
  clearCache(): void {
    this.cache.clear();
    this.lastCacheTime.clear();
  }
  
  // Adjust road tolerance (how close you need to be to a road)
  setRoadTolerance(tolerance: number): void {
    this.roadTolerance = tolerance;
    console.log(`Road tolerance set to ${tolerance} meters`);
  }
  
  // Get current road tolerance
  getRoadTolerance(): number {
    return this.roadTolerance;
  }
  
  // Get cache statistics
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: this.cache.size / (this.cache.size + this.lastCacheTime.size) || 0
    };
  }
  
  // Calculate distance between two points in meters
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
}
