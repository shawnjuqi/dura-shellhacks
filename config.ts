// Configuration file for API keys and settings
export const CONFIG = {
  // Google Maps API Key from environment variable (Vite built-in support)
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  
  // Roads API settings
  ROADS_API: {
    CACHE_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    ROAD_TOLERANCE: 10, // 10 meters - how close you need to be to a road
    DEBUG_MODE: true, // Show detailed road detection logs
  },
  
  // Point system settings
  POINTS: {
    BASE_POINTS_PER_METER: 5, // Even slower point accumulation
    MAX_SPEED_BONUS: 1.5, // Reduced from 2 to 1.5
    MAX_MULTIPLIER: 3, // Reduced from 5 to 3
    MULTIPLIER_INCREASE_TIME: 8, // Increased from 5 to 8 seconds
    OFF_ROAD_PENALTY: 5, // Points lost per meter driven off-road
    PENALTY_MULTIPLIER: 2, // Penalty multiplier for consecutive off-road driving
  }
};

// Validate API key
export function validateApiKey(): boolean {
  if (!CONFIG.GOOGLE_MAPS_API_KEY || CONFIG.GOOGLE_MAPS_API_KEY === '') {
    console.error('❌ Google Maps API Key not configured!');
    console.log('Please set your API key in the .env file');
    return false;
  }
  return true;
}
