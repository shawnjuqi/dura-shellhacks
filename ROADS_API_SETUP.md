# Google Maps Roads API Setup

## 🚀 Quick Setup

1. **Get a Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the "Roads API" 
   - Create credentials (API Key)
   - Restrict the API key to "Roads API" for security

2. **Configure Your API Key:**
   - Open `config.ts`
   - Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key:
   ```typescript
   export const CONFIG = {
     GOOGLE_MAPS_API_KEY: 'AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg', // Your key here
     // ... rest of config
   };
   ```

3. **Test the System:**
   - Run your application
   - Check the console for "✅ Real road detection enabled"
   - The UI should show "✅ Real Roads API" status

## 🔧 Features

### **Real Road Detection:**
- ✅ Uses Google Maps Roads API for accurate road detection
- ✅ Only awards points when driving on actual roads
- ✅ Caches results for 30 seconds to reduce API calls
- ✅ Fallback to simulated roads if API fails

### **API Status Display:**
- **✅ Real Roads API** - Using Google Maps Roads API
- **⚠️ Fallback Mode** - Using simulated roads (API key not configured)

### **Performance Optimizations:**
- **Caching**: Results cached for 30 seconds
- **Batch Processing**: Can check multiple points at once
- **Error Handling**: Graceful fallback if API fails
- **Rate Limiting**: Built-in retry logic

## 🛠️ Troubleshooting

### **API Key Issues:**
```
❌ Google Maps API Key not configured!
```
**Solution:** Set your API key in `config.ts`

### **API Quota Exceeded:**
```
Roads API error: 429 Too Many Requests
```
**Solution:** 
- Check your Google Cloud Console quota
- Increase quota limits if needed
- The system will fallback to simulated roads

### **CORS Errors:**
```
Access to fetch at 'https://roads.googleapis.com' blocked by CORS
```
**Solution:** 
- Make sure you're running from a proper web server (not file://)
- Use `npm start` or similar development server

## 📊 API Usage

The Roads API has these limits:
- **Free Tier**: 2,500 requests per day
- **Paid Tier**: $5 per 1,000 requests after free tier

**Cost Optimization:**
- Results are cached for 30 seconds
- Only checks when car is moving
- Batch processing for multiple points

## 🔒 Security

**API Key Security:**
- Restrict your API key to "Roads API" only
- Add domain restrictions if deploying to production
- Never commit API keys to public repositories

**Example Restrictions:**
- Application restrictions: HTTP referrers
- API restrictions: Roads API only
