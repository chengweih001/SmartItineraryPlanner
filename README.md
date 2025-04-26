# Smart Itinerary Planner

A web application that helps users plan their perfect day by optimizing visits based on location, open hours, and busy times. This version includes Google authentication to securely manage API keys.

## Features

- Google Authentication for secure access
- Add locations with details like name, address, opening hours, visit duration, etc.
- Generate optimized itineraries based on these locations
- View the itinerary on a map
- Save and load location data via JSON
- Secure handling of Google Maps API key

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Cloud Platform account with:
  - OAuth 2.0 credentials (for authentication)
  - Google Maps API key (for maps and places functionality)

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/smart-itinerary-planner.git
   cd smart-itinerary-planner
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory (copy from `.env.example`):
   ```
   cp .env.example .env
   ```

4. Set up Google Cloud Platform:
   - Create a new project in the [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Google Maps JavaScript API, Places API, and Directions API
   - Create OAuth 2.0 credentials (Web application type)
   - Add `http://localhost:3000/auth/google/callback` as an authorized redirect URI
   - Create an API key for Google Maps
   - Update your `.env` file with your credentials:
     ```
     GOOGLE_CLIENT_ID=your_client_id
     GOOGLE_CLIENT_SECRET=your_client_secret
     GOOGLE_MAPS_API_KEY=your_api_key
     SESSION_SECRET=a_random_string_for_session_encryption
     ```

5. Start the application:
   ```
   npm start
   ```
   
   For development with auto-reload:
   ```
   npm run dev
   ```

6. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Sign in with your Google account
2. Add locations you want to visit
3. Set details like visit duration, opening hours, and busy times
4. Click "Generate Itinerary" to create an optimized schedule
5. View your itinerary on the map and as a list
6. Use the navigation feature to get directions between locations

## Security

This application securely handles the Google Maps API key by:
1. Storing it server-side in environment variables
2. Only providing it to authenticated users
3. Using Google OAuth for authentication

## License

MIT
