// Authentication and Google Maps API loading
let googleMapsScript = null;
let user = null;
let googleMapsApiKey = null;

// DOM elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authHeader = document.getElementById('auth-header');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', checkAuthStatus);

// Add event listener for logout button
if (logoutButton) {
    logoutButton.addEventListener('click', logout);
}

// Check if the user is authenticated
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.isAuthenticated) {
            // User is authenticated
            user = data.user;
            showAuthenticatedUI();
            
            // Get Google Maps API key
            await getGoogleMapsApiKey();
        } else {
            // User is not authenticated
            showLoginUI();
        }
    } catch (error) {
        console.error('Error checking authentication status:', error);
        showLoginUI();
    }
}

// Show the authenticated UI
function showAuthenticatedUI() {
    // Update user profile
    if (user) {
        userAvatar.src = user.picture || '';
        userName.textContent = user.name || '';
        userEmail.textContent = user.email || '';
    }
    
    // Show app UI
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    authHeader.style.display = 'flex';
}

// Show the login UI
function showLoginUI() {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    authHeader.style.display = 'none';
}

// Get Google Maps API key from the server
async function getGoogleMapsApiKey() {
    try {
        const response = await fetch('/api/maps/key');
        
        if (!response.ok) {
            throw new Error('Failed to get Google Maps API key');
        }
        
        const data = await response.json();
        googleMapsApiKey = data.apiKey;
        
        // Load Google Maps API
        loadGoogleMapsApi();
    } catch (error) {
        console.error('Error getting Google Maps API key:', error);
        alert('Failed to load Google Maps. Please try refreshing the page.');
    }
}

// Load Google Maps API with the API key
function loadGoogleMapsApi() {
    if (!googleMapsApiKey) {
        console.error('Google Maps API key is not available');
        return;
    }
    
    // Remove existing script if it exists
    if (googleMapsScript) {
        document.head.removeChild(googleMapsScript);
    }
    
    // Create a new script element
    googleMapsScript = document.createElement('script');
    googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&callback=initMap`;
    googleMapsScript.async = true;
    googleMapsScript.defer = true;
    
    // Add the script to the document
    document.head.appendChild(googleMapsScript);
}

// Logout function
function logout() {
    // Redirect to logout endpoint
    window.location.href = '/auth/logout';
}
