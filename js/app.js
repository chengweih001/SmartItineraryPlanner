// Global variables
let map;
let markers = [];
let locations = [];
let polyline;
let isMapSelectionMode = false;
let tempMarker = null;

// DOM elements
const locationForm = document.getElementById('location-form');
const locationsContainer = document.getElementById('locations-container');
const generateItineraryBtn = document.getElementById('generate-itinerary');
const clearAllBtn = document.getElementById('clear-all');
const itineraryContainer = document.getElementById('itinerary-container');
const locationsJsonTextarea = document.getElementById('locations-json');
const generateJsonBtn = document.getElementById('generate-json');
const loadJsonBtn = document.getElementById('load-json');
const copyJsonBtn = document.getElementById('copy-json');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
});

// Initialize the map
function initMap() {
    // Create a map with a loading view first
    map = L.map('map').setView([0, 0], 2);
    
    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Create a selection indicator
    const selectionIndicator = document.createElement('div');
    selectionIndicator.className = 'map-selection-indicator';
    selectionIndicator.textContent = 'Click on the map to select a location';
    document.querySelector('.results-panel').appendChild(selectionIndicator);
    
    // Add map click event for location selection
    map.on('click', handleMapClick);
    
    // Try to get user's current location
    if (navigator.geolocation) {
        // Add a loading indicator to the map
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'map-loading-indicator';
        loadingIndicator.textContent = 'Getting your location...';
        document.querySelector('.results-panel').appendChild(loadingIndicator);
        
        navigator.geolocation.getCurrentPosition(
            // Success callback
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // Center map on user's location with higher zoom level
                map.setView([latitude, longitude], 13);
                
                // Remove loading indicator
                document.querySelector('.map-loading-indicator').remove();
                
                // Add a marker for the user's location
                const userLocationMarker = L.marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup('Your current location')
                    .openPopup();
                
                // Store user location for later use
                window.userLocation = { lat: latitude, lng: longitude };
            },
            // Error callback
            (error) => {
                console.warn(`Geolocation error (${error.code}): ${error.message}`);
                
                // Fall back to default location (San Francisco)
                map.setView([37.7749, -122.4194], 12);
                
                // Remove loading indicator
                if (document.querySelector('.map-loading-indicator')) {
                    document.querySelector('.map-loading-indicator').remove();
                }
            },
            // Options
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        // Geolocation not supported, use default location
        map.setView([37.7749, -122.4194], 12);
        console.warn('Geolocation is not supported by this browser.');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Form submission for adding a location
    locationForm.addEventListener('submit', handleAddLocation);
    
    // Generate itinerary button
    generateItineraryBtn.addEventListener('click', generateItinerary);
    
    // Clear all button
    clearAllBtn.addEventListener('click', clearAll);
    
    // Add validation for time inputs
    document.getElementById('open-time').addEventListener('change', validateTimeInput);
    document.getElementById('close-time').addEventListener('change', validateTimeInput);
    
    // Map selection button
    document.getElementById('map-select-btn').addEventListener('click', toggleMapSelectionMode);
    
    // Open anytime checkbox
    document.getElementById('open-anytime').addEventListener('change', toggleTimeInputs);
    
    // Use address as name checkbox
    document.getElementById('use-address-as-name').addEventListener('change', toggleNameField);
    
    // Address input to update name field
    document.getElementById('location-address').addEventListener('input', updateNameFromAddress);
    
    // JSON save and load buttons
    generateJsonBtn.addEventListener('click', generateLocationsJson);
    loadJsonBtn.addEventListener('click', loadLocationsFromJson);
    copyJsonBtn.addEventListener('click', copyJsonToClipboard);
    
    // Initialize time inputs state based on checkbox
    toggleTimeInputs();
    
    // Initialize name field state based on checkbox
    toggleNameField();
}

// Generate JSON string from locations array
function generateLocationsJson() {
    if (locations.length === 0) {
        alert('No locations to save. Add some locations first.');
        return;
    }
    
    try {
        // Create a simplified version of the locations array for serialization
        const locationsToSave = locations.map(location => ({
            name: location.name,
            address: location.address,
            coordinates: location.coordinates,
            openTime: location.openTime,
            closeTime: location.closeTime,
            visitDuration: location.visitDuration,
            busyTime: location.busyTime
        }));
        
        // Convert to JSON string with pretty formatting
        const jsonString = JSON.stringify(locationsToSave, null, 2);
        
        // Display in the textarea
        locationsJsonTextarea.value = jsonString;
        
        // Show a success message
        alert(`Successfully generated JSON for ${locations.length} locations.`);
    } catch (error) {
        console.error('Error generating JSON:', error);
        alert('An error occurred while generating JSON.');
    }
}

// Load locations from JSON string
function loadLocationsFromJson() {
    const jsonString = locationsJsonTextarea.value.trim();
    
    if (!jsonString) {
        alert('Please enter or generate JSON data first.');
        return;
    }
    
    try {
        // Parse the JSON string
        const loadedLocations = JSON.parse(jsonString);
        
        // Validate the loaded data
        if (!Array.isArray(loadedLocations)) {
            throw new Error('Invalid JSON format. Expected an array of locations.');
        }
        
        // Validate each location object
        loadedLocations.forEach(validateLocationObject);
        
        // Clear existing locations
        clearAll();
        
        // Add each loaded location
        loadedLocations.forEach(location => {
            // Add an ID to the location
            const newLocation = {
                ...location,
                id: Date.now() + Math.random() // Generate a unique ID
            };
            
            // Add the location to our array
            locations.push(newLocation);
            
            // Add a marker to the map
            addMarkerToMap(newLocation);
            
            // Add the location to the list
            addLocationToList(newLocation);
        });
        
        // Enable the generate itinerary button if we have at least 2 locations
        if (locations.length >= 2) {
            generateItineraryBtn.disabled = false;
        }
        
        // Show a success message
        alert(`Successfully loaded ${loadedLocations.length} locations.`);
    } catch (error) {
        console.error('Error loading JSON:', error);
        alert(`Error loading JSON: ${error.message}`);
    }
}

// Validate a location object
function validateLocationObject(location) {
    // Check required fields
    if (!location.name) throw new Error('Location name is required');
    if (!location.address) throw new Error('Location address is required');
    if (!location.coordinates) throw new Error('Location coordinates are required');
    if (!location.coordinates.lat || !location.coordinates.lng) {
        throw new Error('Location coordinates must have lat and lng properties');
    }
    if (isNaN(parseFloat(location.coordinates.lat)) || isNaN(parseFloat(location.coordinates.lng))) {
        throw new Error('Location coordinates must be valid numbers');
    }
    if (!location.visitDuration || isNaN(parseInt(location.visitDuration))) {
        throw new Error('Visit duration must be a valid number');
    }
    
    // Set default values for optional fields
    if (!location.openTime) location.openTime = '00:00';
    if (!location.closeTime) location.closeTime = '23:59';
    if (!location.busyTime) location.busyTime = 'none';
    
    return true;
}

// Copy JSON to clipboard
function copyJsonToClipboard() {
    const jsonString = locationsJsonTextarea.value.trim();
    
    if (!jsonString) {
        alert('No JSON data to copy. Generate JSON first.');
        return;
    }
    
    try {
        // Copy to clipboard
        navigator.clipboard.writeText(jsonString)
            .then(() => {
                // Change button color temporarily to indicate success
                const originalColor = copyJsonBtn.style.backgroundColor;
                copyJsonBtn.style.backgroundColor = '#2ecc71';
                
                setTimeout(() => {
                    copyJsonBtn.style.backgroundColor = originalColor;
                }, 1000);
                
                alert('JSON copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy JSON:', err);
                
                // Fallback method for older browsers
                locationsJsonTextarea.select();
                document.execCommand('copy');
                alert('JSON copied to clipboard!');
            });
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy to clipboard. Please select and copy the text manually.');
    }
}

// Toggle name field based on "Use address as name" checkbox
function toggleNameField() {
    const useAddressAsName = document.getElementById('use-address-as-name').checked;
    const nameInput = document.getElementById('location-name');
    const addressInput = document.getElementById('location-address');
    
    if (useAddressAsName) {
        // If address already has a value, update the name field
        if (addressInput.value) {
            nameInput.value = extractStreetAddress(addressInput.value);
        }
        
        nameInput.readOnly = true;
        nameInput.style.opacity = '0.7';
        nameInput.style.backgroundColor = '#f5f5f5';
    } else {
        nameInput.readOnly = false;
        nameInput.style.opacity = '1';
        nameInput.style.backgroundColor = 'white';
    }
}

// Update name field from address when "Use address as name" is checked
function updateNameFromAddress() {
    const useAddressAsName = document.getElementById('use-address-as-name').checked;
    
    if (useAddressAsName) {
        const addressInput = document.getElementById('location-address');
        const nameInput = document.getElementById('location-name');
        
        nameInput.value = extractStreetAddress(addressInput.value);
    }
}

// Extract street address (number and name) from full address
function extractStreetAddress(fullAddress) {
    if (!fullAddress) return '';
    
    // Try to extract the street address using common patterns
    
    // Pattern 1: Extract first part before comma
    const commaMatch = fullAddress.match(/^([^,]+),/);
    if (commaMatch && commaMatch[1]) {
        return commaMatch[1].trim();
    }
    
    // Pattern 2: If no comma, take the first 30 characters or the whole string if shorter
    return fullAddress.length > 30 ? fullAddress.substring(0, 30) + '...' : fullAddress;
}

// Toggle time inputs based on "Open anytime" checkbox
function toggleTimeInputs() {
    const openAnytime = document.getElementById('open-anytime').checked;
    const openTimeInput = document.getElementById('open-time');
    const closeTimeInput = document.getElementById('close-time');
    const timeInputsContainer = document.querySelector('.time-inputs');
    
    if (openAnytime) {
        openTimeInput.value = '';
        closeTimeInput.value = '';
        timeInputsContainer.style.opacity = '0.5';
        openTimeInput.disabled = true;
        closeTimeInput.disabled = true;
    } else {
        timeInputsContainer.style.opacity = '1';
        openTimeInput.disabled = false;
        closeTimeInput.disabled = false;
    }
}

// Toggle map selection mode
function toggleMapSelectionMode() {
    isMapSelectionMode = !isMapSelectionMode;
    
    const mapContainer = document.querySelector('.results-panel');
    
    if (isMapSelectionMode) {
        mapContainer.classList.add('map-selection-active');
        // Scroll to map if it's not visible
        map.getContainer().scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        mapContainer.classList.remove('map-selection-active');
        // Remove temporary marker if exists
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
    }
}

// Handle map click for location selection
function handleMapClick(e) {
    if (!isMapSelectionMode) return;
    
    const { lat, lng } = e.latlng;
    
    // Remove previous temporary marker if exists
    if (tempMarker) {
        map.removeLayer(tempMarker);
    }
    
    // Add a temporary marker at the clicked location
    const icon = L.divIcon({
        className: 'temp-marker',
        html: `<div style="background-color: #e74c3c; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [15, 15]
    });
    
    tempMarker = L.marker([lat, lng], { icon }).addTo(map);
    
    // Perform reverse geocoding to get the address
    reverseGeocode(lat, lng)
        .then(address => {
            if (address) {
                document.getElementById('location-address').value = address;
                // Exit map selection mode
                toggleMapSelectionMode();
            }
        });
}

// Reverse geocode coordinates to get address
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.display_name) {
            // If "Use address as name" is checked, update the name field
            if (document.getElementById('use-address-as-name').checked) {
                let streetAddress = '';
                
                // Try to extract a more user-friendly street address from the address details
                if (data.address) {
                    const parts = [];
                    
                    // Add house number if available
                    if (data.address.house_number) {
                        parts.push(data.address.house_number);
                    }
                    
                    // Add road/street name if available
                    if (data.address.road) {
                        parts.push(data.address.road);
                    } else if (data.address.pedestrian) {
                        parts.push(data.address.pedestrian);
                    } else if (data.address.footway) {
                        parts.push(data.address.footway);
                    }
                    
                    // If we have parts, join them to form the street address
                    if (parts.length > 0) {
                        streetAddress = parts.join(' ');
                    }
                }
                
                // If we couldn't extract a street address, fall back to the first part of the display name
                if (!streetAddress) {
                    streetAddress = extractStreetAddress(data.display_name);
                }
                
                document.getElementById('location-name').value = streetAddress;
            }
            
            return data.display_name;
        }
        return null;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        alert('Could not get address for this location. Please try again or enter manually.');
        return null;
    }
}

// Validate time input to ensure it's in the correct format
function validateTimeInput(e) {
    const timeInput = e.target;
    const timeValue = timeInput.value;
    
    // If empty, don't validate yet
    if (!timeValue) return;
    
    // Check if the time is in a valid format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(timeValue)) {
        alert('Please enter a valid time in the format HH:MM (24-hour format)');
        timeInput.value = '';
        timeInput.focus();
    }
}

// Handle adding a new location
async function handleAddLocation(e) {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('location-name').value;
    const address = document.getElementById('location-address').value;
    const openAnytime = document.getElementById('open-anytime').checked;
    const openTimeInput = document.getElementById('open-time');
    const closeTimeInput = document.getElementById('close-time');
    const openTime = openAnytime ? '00:00' : openTimeInput.value;
    const closeTime = openAnytime ? '23:59' : closeTimeInput.value;
    const visitDuration = parseInt(document.getElementById('visit-duration').value);
    const busyTime = document.getElementById('busy-time').value;
    
    // Validate time inputs if not open anytime
    if (!openAnytime && (!openTime || !closeTime)) {
        alert('Please enter both opening and closing times or check "Open anytime".');
        return;
    }
    
    try {
        // Get coordinates for the address using Nominatim API
        const coordinates = await geocodeAddress(address);
        
        if (!coordinates) {
            alert('Could not find coordinates for this address. Please try a different address.');
            return;
        }
        
        // Create a new location object
        const newLocation = {
            id: Date.now(), // Use timestamp as a simple unique ID
            name,
            address,
            coordinates,
            openTime,
            closeTime,
            visitDuration,
            busyTime
        };
        
        // Add the location to our array
        locations.push(newLocation);
        
        // Add a marker to the map
        addMarkerToMap(newLocation);
        
        // Add the location to the list
        addLocationToList(newLocation);
        
        // Reset the form
        locationForm.reset();
        
        // Reinitialize form state after reset
        toggleTimeInputs();
        toggleNameField();
        
        // Enable the generate itinerary button if we have at least 2 locations
        if (locations.length >= 2) {
            generateItineraryBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error adding location:', error);
        alert('An error occurred while adding the location. Please try again.');
    }
}

// Geocode an address to get coordinates
async function geocodeAddress(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Add a marker to the map
function addMarkerToMap(location) {
    const marker = L.marker([location.coordinates.lat, location.coordinates.lng])
        .addTo(map)
        .bindPopup(`<b>${location.name}</b><br>${location.address}`);
    
    markers.push({
        id: location.id,
        marker
    });
    
    // Adjust map view to include all markers
    if (markers.length === 1) {
        map.setView([location.coordinates.lat, location.coordinates.lng], 12);
    } else {
        const bounds = L.latLngBounds(markers.map(m => [
            m.marker.getLatLng().lat,
            m.marker.getLatLng().lng
        ]));
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Add a location to the list in the UI
function addLocationToList(location) {
    const li = document.createElement('li');
    li.className = 'location-item';
    li.dataset.id = location.id;
    
    // Check if location is open anytime (24/7)
    const isOpenAnytime = location.openTime === '00:00' && location.closeTime === '23:59';
    
    li.innerHTML = `
        <h4>${location.name}</h4>
        <p>${location.address}</p>
        <p>Open: ${isOpenAnytime ? 'Anytime (24/7)' : `${formatTime(location.openTime)} - ${formatTime(location.closeTime)}`}</p>
        <p>Visit Duration: ${location.visitDuration} minutes</p>
        <p>Busy Time: ${formatBusyTime(location.busyTime)}</p>
        <button class="remove-location" data-id="${location.id}">✕</button>
    `;
    
    // Add event listener to the remove button
    li.querySelector('.remove-location').addEventListener('click', () => removeLocation(location.id));
    
    locationsContainer.appendChild(li);
}

// Format time for display
function formatTime(timeString) {
    if (!timeString) return 'N/A';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
}

// Format busy time for display
function formatBusyTime(busyTime) {
    const busyTimes = {
        'morning': 'Morning (8AM-11AM)',
        'noon': 'Noon (11AM-2PM)',
        'afternoon': 'Afternoon (2PM-5PM)',
        'evening': 'Evening (5PM-8PM)',
        'none': 'Not typically busy'
    };
    
    return busyTimes[busyTime] || busyTime;
}

// Remove a location
function removeLocation(id) {
    // Remove from the locations array
    locations = locations.filter(location => location.id !== id);
    
    // Remove from the UI
    const locationElement = locationsContainer.querySelector(`li[data-id="${id}"]`);
    if (locationElement) {
        locationElement.remove();
    }
    
    // Remove the marker from the map
    const markerIndex = markers.findIndex(m => m.id === id);
    if (markerIndex !== -1) {
        map.removeLayer(markers[markerIndex].marker);
        markers.splice(markerIndex, 1);
    }
    
    // Disable the generate button if we have less than 2 locations
    if (locations.length < 2) {
        generateItineraryBtn.disabled = true;
    }
    
    // Clear the itinerary if it exists
    if (!itineraryContainer.querySelector('.empty-state')) {
        clearItinerary();
    }
    
    // Remove the route line if it exists
    if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
    }
}

// Clear all locations and reset the app
function clearAll() {
    // Clear the locations array
    locations = [];
    
    // Clear the UI list
    locationsContainer.innerHTML = '';
    
    // Clear all markers from the map
    markers.forEach(m => map.removeLayer(m.marker));
    markers = [];
    
    // Remove the route line if it exists
    if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
    }
    
    // Disable the generate button
    generateItineraryBtn.disabled = true;
    
    // Clear the itinerary
    clearItinerary();
    
    // Reset the map view
    map.setView([37.7749, -122.4194], 12);
}

// Clear the itinerary
function clearItinerary() {
    itineraryContainer.innerHTML = '<p class="empty-state">Add locations and generate an itinerary to see results</p>';
}

// Generate an optimized itinerary
function generateItinerary() {
    if (locations.length < 2) {
        alert('Please add at least 2 locations to generate an itinerary.');
        return;
    }
    
    try {
        // Sort locations based on constraints
        const sortedLocations = optimizeRoute(locations);
        
        // Display the itinerary
        displayItinerary(sortedLocations);
        
        // Draw the route on the map
        drawRouteOnMap(sortedLocations);
        
    } catch (error) {
        console.error('Error generating itinerary:', error);
        alert('An error occurred while generating the itinerary. Please try again.');
    }
}

// Optimize the route based on constraints
function optimizeRoute(locations) {
    // Clone the locations array to avoid modifying the original
    const locationsToSort = [...locations];
    
    // Convert time strings to minutes since midnight for easier comparison
    locationsToSort.forEach(location => {
        location.openTimeMinutes = timeStringToMinutes(location.openTime);
        location.closeTimeMinutes = timeStringToMinutes(location.closeTime);
        
        // Assign a penalty score for busy times
        // We'll use this to try to avoid visiting during busy times
        location.busyTimeScore = getBusyTimeScore(location.busyTime);
    });
    
    // Start with a simple greedy algorithm
    // In a real app, we might use a more sophisticated algorithm like simulated annealing
    
    // Start with the location that opens earliest
    locationsToSort.sort((a, b) => a.openTimeMinutes - b.openTimeMinutes);
    
    const optimizedRoute = [locationsToSort[0]];
    const remaining = locationsToSort.slice(1);
    
    // Start time is the opening time of the first location
    let currentTime = optimizedRoute[0].openTimeMinutes;
    let currentLocation = optimizedRoute[0];
    
    // Add visit duration to current time
    currentTime += optimizedRoute[0].visitDuration;
    
    // While we still have locations to visit
    while (remaining.length > 0) {
        // Find the best next location based on:
        // 1. Distance from current location
        // 2. Opening hours (must be open when we arrive)
        // 3. Busy times (prefer to avoid busy times)
        
        let bestNextIndex = -1;
        let bestScore = Infinity;
        
        for (let i = 0; i < remaining.length; i++) {
            const nextLocation = remaining[i];
            
            // Estimate travel time (in minutes) based on distance
            // In a real app, we would use a routing API to get actual travel times
            const travelTime = estimateTravelTime(
                currentLocation.coordinates,
                nextLocation.coordinates
            );
            
            // Calculate arrival time at this location
            const arrivalTime = currentTime + travelTime;
            
            // Skip if we would arrive after closing time
            if (arrivalTime >= nextLocation.closeTimeMinutes) {
                continue;
            }
            
            // Calculate waiting time if we arrive before opening
            const waitTime = Math.max(0, nextLocation.openTimeMinutes - arrivalTime);
            
            // Calculate how busy the location will be at arrival time
            const busyness = calculateBusyness(nextLocation, arrivalTime);
            
            // Calculate a score for this location (lower is better)
            // We consider travel time, wait time, and busyness
            const score = travelTime + waitTime + busyness * 30; // Weight busyness more heavily
            
            if (score < bestScore) {
                bestScore = score;
                bestNextIndex = i;
            }
        }
        
        // If we couldn't find a valid next location, break
        if (bestNextIndex === -1) {
            break;
        }
        
        // Add the best next location to our route
        const nextLocation = remaining[bestNextIndex];
        optimizedRoute.push(nextLocation);
        
        // Remove it from remaining locations
        remaining.splice(bestNextIndex, 1);
        
        // Update current time and location
        const travelTime = estimateTravelTime(
            currentLocation.coordinates,
            nextLocation.coordinates
        );
        
        currentTime += travelTime;
        
        // If we arrive before opening, wait until opening
        if (currentTime < nextLocation.openTimeMinutes) {
            currentTime = nextLocation.openTimeMinutes;
        }
        
        // Add visit duration
        currentTime += nextLocation.visitDuration;
        
        // Update current location
        currentLocation = nextLocation;
    }
    
    return optimizedRoute;
}

// Convert time string (HH:MM) to minutes since midnight
function timeStringToMinutes(timeString) {
    if (!timeString) return 0;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

// Get a score for how busy a location is at a given time
function getBusyTimeScore(busyTime) {
    const scores = {
        'morning': 3,
        'noon': 4,
        'afternoon': 3,
        'evening': 2,
        'none': 1
    };
    
    return scores[busyTime] || 1;
}

// Calculate how busy a location will be at a given time
function calculateBusyness(location, timeInMinutes) {
    const hour = Math.floor(timeInMinutes / 60);
    
    // Define time ranges for different parts of the day
    const isMorning = hour >= 8 && hour < 11;
    const isNoon = hour >= 11 && hour < 14;
    const isAfternoon = hour >= 14 && hour < 17;
    const isEvening = hour >= 17 && hour < 20;
    
    // Check if the current time matches the location's busy time
    switch (location.busyTime) {
        case 'morning':
            return isMorning ? location.busyTimeScore : 1;
        case 'noon':
            return isNoon ? location.busyTimeScore : 1;
        case 'afternoon':
            return isAfternoon ? location.busyTimeScore : 1;
        case 'evening':
            return isEvening ? location.busyTimeScore : 1;
        case 'none':
        default:
            return 1;
    }
}

// Estimate travel time between two points in minutes
function estimateTravelTime(coord1, coord2) {
    // Calculate distance in kilometers using the Haversine formula
    const distance = calculateDistance(coord1, coord2);
    
    // Assume an average speed of 30 km/h in a city
    // This is a very rough estimate and would be replaced with actual routing data in a real app
    const averageSpeedKmh = 30;
    
    // Convert to minutes
    return Math.ceil((distance / averageSpeedKmh) * 60);
}

// Calculate distance between two points using the Haversine formula
function calculateDistance(coord1, coord2) {
    // Haversine formula to calculate distance between two points on Earth
    const R = 6371; // Radius of the Earth in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
}

// Display the itinerary in the UI
function displayItinerary(route) {
    // Clear any existing itinerary
    itineraryContainer.innerHTML = '';
    
    // Start time is the opening time of the first location
    let currentTime = route[0].openTimeMinutes;
    let previousLocation = null;
    
    // For each location in the route
    route.forEach((location, index) => {
        const div = document.createElement('div');
        div.className = 'itinerary-step';
        
        // If this isn't the first location, calculate travel time from previous
        if (index > 0) {
            const travelTime = estimateTravelTime(
                previousLocation.coordinates,
                location.coordinates
            );
            
            // Add travel time to current time
            currentTime += travelTime;
            
            // If we arrive before opening, wait until opening
            if (currentTime < location.openTimeMinutes) {
                currentTime = location.openTimeMinutes;
            }
        }
        
        // Format the arrival time
        const arrivalTimeFormatted = minutesToTimeString(currentTime);
        
        // Format the departure time (arrival + visit duration)
        const departureTime = currentTime + location.visitDuration;
        const departureTimeFormatted = minutesToTimeString(departureTime);
        
        // Create the HTML for this step
        div.innerHTML = `
            <h4>
                ${index + 1}. ${location.name}
                <span class="step-time">${arrivalTimeFormatted} - ${departureTimeFormatted}</span>
            </h4>
            <p>${location.address}</p>
            <p>Visit Duration: ${location.visitDuration} minutes</p>
        `;
        
        // If this isn't the first location, add travel information
        if (index > 0) {
            const distance = calculateDistance(
                previousLocation.coordinates,
                location.coordinates
            ).toFixed(1);
            
            const travelTime = estimateTravelTime(
                previousLocation.coordinates,
                location.coordinates
            );
            
            const travelInfo = document.createElement('div');
            travelInfo.className = 'travel-info';
            travelInfo.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM4.5 7.5a.5.5 0 0 1 0-1h5.793L8.146 4.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5Z"/>
                </svg>
                ${distance} km (approx. ${travelTime} min) from previous location
            `;
            
            div.appendChild(travelInfo);
        }
        
        itineraryContainer.appendChild(div);
        
        // Update current time and previous location for next iteration
        currentTime = departureTime;
        previousLocation = location;
    });
    
    // Add summary information
    const totalDistance = calculateTotalDistance(route);
    const totalDuration = calculateTotalDuration(route);
    
    const summary = document.createElement('div');
    summary.className = 'itinerary-summary';
    summary.innerHTML = `
        <p><strong>Total Distance:</strong> ${totalDistance.toFixed(1)} km</p>
        <p><strong>Total Duration:</strong> ${formatDuration(totalDuration)}</p>
    `;
    
    itineraryContainer.appendChild(summary);
}

// Convert minutes since midnight to a formatted time string (HH:MM AM/PM)
function minutesToTimeString(minutes) {
    const hour = Math.floor(minutes / 60) % 24;
    const minute = minutes % 60;
    
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    // Pad minutes with leading zero if needed
    const minuteStr = minute < 10 ? `0${minute}` : minute;
    
    return `${hour12}:${minuteStr} ${ampm}`;
}

// Calculate the total distance of the route
function calculateTotalDistance(route) {
    let totalDistance = 0;
    
    for (let i = 1; i < route.length; i++) {
        totalDistance += calculateDistance(
            route[i-1].coordinates,
            route[i].coordinates
        );
    }
    
    return totalDistance;
}

// Calculate the total duration of the route including travel time, wait time, and visit time
function calculateTotalDuration(route) {
    // Start with the first location's opening time
    let startTime = route[0].openTimeMinutes;
    
    // End with the last location's departure time
    let currentTime = startTime;
    let previousLocation = route[0];
    
    // Add visit duration for the first location
    currentTime += previousLocation.visitDuration;
    
    // For each subsequent location
    for (let i = 1; i < route.length; i++) {
        const location = route[i];
        
        // Add travel time
        const travelTime = estimateTravelTime(
            previousLocation.coordinates,
            location.coordinates
        );
        currentTime += travelTime;
        
        // If we arrive before opening, wait until opening
        if (currentTime < location.openTimeMinutes) {
            currentTime = location.openTimeMinutes;
        }
        
        // Add visit duration
        currentTime += location.visitDuration;
        
        // Update previous location
        previousLocation = location;
    }
    
    // Return total minutes
    return currentTime - startTime;
}

// Format duration in minutes to a readable string
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
        return `${mins} minutes`;
    } else if (mins === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
        return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
    }
}

// Draw the route on the map
function drawRouteOnMap(route) {
    // Remove existing polyline if it exists
    if (polyline) {
        map.removeLayer(polyline);
    }
    
    // Create an array of points for the polyline
    const points = route.map(location => [
        location.coordinates.lat,
        location.coordinates.lng
    ]);
    
    // Create a polyline and add it to the map
    polyline = L.polyline(points, {
        color: '#3498db',
        weight: 5,
        opacity: 0.7
    }).addTo(map);
    
    // Add numbered markers to indicate the order
    route.forEach((location, index) => {
        // Find and remove the existing marker for this location
        const markerIndex = markers.findIndex(m => m.id === location.id);
        if (markerIndex !== -1) {
            map.removeLayer(markers[markerIndex].marker);
            
            // Create a new marker with the location number
            const icon = L.divIcon({
                className: 'numbered-marker',
                html: `<div>${index + 1}</div>`,
                iconSize: [30, 30]
            });
            
            const marker = L.marker([location.coordinates.lat, location.coordinates.lng], { icon })
                .addTo(map)
                .bindPopup(`<b>${location.name}</b><br>${location.address}`);
            
            // Update the marker in our array
            markers[markerIndex].marker = marker;
        }
    });
    
    // Fit the map to show all markers
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50] });
}
