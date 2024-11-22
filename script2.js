document.getElementById('addLocation').addEventListener('click', function () {
    const form = document.getElementById('routeForm');
    const locationCount = form.querySelectorAll('input[name="locations"]').length + 1;

    const locationDiv = document.createElement('div');
    locationDiv.classList.add('location-group');

    const locationLabel = document.createElement('label');
    locationLabel.textContent = `Location ${locationCount}:`;
    locationLabel.setAttribute('for', `location-${locationCount}`);

    const locationInput = document.createElement('input');
    locationInput.type = 'text';
    locationInput.id = `location-${locationCount}`;
    locationInput.name = 'locations';
    locationInput.placeholder = `Enter location ${locationCount}`;

    locationDiv.appendChild(locationLabel);
    locationDiv.appendChild(locationInput);
    form.insertBefore(locationDiv, document.getElementById('addLocation'));
});

document.getElementById('routeForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const locationInputs = document.querySelectorAll('input[name="locations"]');
    const locations = Array.from(locationInputs).map(input => input.value);

    if (locations.length < 2) {
        alert('Please enter at least two locations.');
        return;
    }

    // Initialize the map
    const map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Custom icon for nearby locations
    const fortIcon = L.icon({
        iconUrl: 'https://i.ibb.co/LSrN2zF/1000089309-ai-brush-removebg-btjiziq2.png', // Replace with your icon URL
        iconSize: [30, 30], // Icon size
        iconAnchor: [15, 30] // Point of the icon that corresponds to the marker's location
    });

    // Geocode locations and create waypoints
    const geocoder = L.Control.Geocoder.nominatim();
    const waypoints = [];
    const markerPromises = locations.map((location, index) => {
        return new Promise(resolve => {
            geocoder.geocode(location, function (results) {
                if (results && results.length > 0) {
                    const latLng = results[0].center;
                    waypoints.push(latLng);
                    L.marker(latLng).addTo(map).bindPopup(`Location ${index + 1}: ${location}`).openPopup();
                    resolve(latLng);
                } else {
                    alert(`Location "${location}" could not be found.`);
                    resolve(null);
                }
            });
        });
    });

    // Draw the route and mark nearby forts
    Promise.all(markerPromises).then(latLngs => {
        const startPoint = latLngs[0];
        const endPoint = latLngs[latLngs.length - 1];

        if (startPoint && endPoint) {
            // Draw route between points
            L.Routing.control({
                waypoints: latLngs.map(latLng => L.Routing.waypoint(latLng)),
                routeWhileDragging: true,
                createMarker: function (i, wp) {
                    return L.marker(wp.latLng).bindPopup(`Location ${i + 1}`);
                }
            }).addTo(map);

            // Load forts data and mark nearby forts
            fetch('forts.csv')
                .then(response => response.text())
                .then(data => {
                    const forts = Papa.parse(data, {
                        header: true,
                        skipEmptyLines: true
                    }).data;

                    // Check forts near start and end points
                    const radius = 60; // in km
                    forts.forEach(fort => {
                        const fortLatLng = L.latLng(fort.latitude, fort.longitude);

                        // Check if fort is near the start or end points
                        if (
                            calculateDistance(startPoint, fortLatLng) <= radius ||
                            calculateDistance(endPoint, fortLatLng) <= radius
                        ) {
                            L.marker(fortLatLng, { icon: fortIcon }).addTo(map).bindPopup(
                                `<strong>${fort.name}</strong><br>Lat: ${fort.latitude}, Lng: ${fort.longitude}`
                            );
                        }
                    });

                    // Adjust the map to fit all points
                    map.fitBounds(latLngs.map(latLng => [latLng.lat, latLng.lng]));
                });
        } else {
            alert('Not enough valid locations to show a route.');
        }
    });
});

// Function to calculate distance between two points using the Haversine formula
function calculateDistance(latLng1, latLng2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = toRad(latLng2.lat - latLng1.lat);
    const dLon = toRad(latLng2.lng - latLng1.lng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(latLng1.lat)) * Math.cos(toRad(latLng2.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Function to convert degrees to radians
function toRad(value) {
    return value * Math.PI / 180;
}



