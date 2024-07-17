const API_BASE_URL = 'https://api.openf1.org/v1';

async function fetchData(endpoint, params = {}) {
    const url = new URL(`${API_BASE_URL}/${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    const response = await fetch(url);
    return response.json();
}

async function updateDrivers() {
    const drivers = await fetchData('drivers', { session_key: 'latest' });
    updateList('driverList', drivers, driver => `${driver.driver_number}. ${driver.full_name} (${driver.team_name})`, driver => `#${driver.team_colour}`);
}

async function updateCarData() {
    const carData = await fetchData('car_data', { session_key: 'latest', limit: 5 });
    updateList('carData', carData, data => `Car ${data.driver_number}: Speed ${data.speed} km/h, RPM ${data.rpm}`);
}

async function updateLapTimes() {
    const laps = await fetchData('laps', { session_key: 'latest', limit: 5 });
    updateList('lapTimes', laps, lap => `Driver ${lap.driver_number}: Lap ${lap.lap_number} - ${lap.lap_duration.toFixed(3)}s`);
}

async function updatePastDrivers() {
    const pastDrivers = await fetchData('drivers', { session_key: 'latest-5' });
    updateList('pastDriverList', pastDrivers, driver => `${driver.driver_number}. ${driver.full_name} (${driver.team_name})`, driver => `#${driver.team_colour}`);
}

async function updatePastCarData() {
    const pastCarData = await fetchData('car_data', { session_key: 'latest-5', limit: 5 });
    updateList('pastCarData', pastCarData, data => `Car ${data.driver_number}: Speed ${data.speed} km/h, RPM ${data.rpm}`);
}

async function updatePastLapTimes() {
    const pastLaps = await fetchData('laps', { session_key: 'latest-5', limit: 5 });
    updateList('pastLapTimes', pastLaps, lap => `Driver ${lap.driver_number}: Lap ${lap.lap_number} - ${lap.lap_duration.toFixed(3)}s`);
}

function updateList(elementId, data, textFunction, colorFunction = null) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';
    data.forEach(item => {
        const li = document.createElement('li');
        li.textContent = textFunction(item);
        if (colorFunction) {
            li.style.color = colorFunction(item);
        }
        list.appendChild(li);
    });
}

function updateDashboard() {
    updateDrivers();
    updateCarData();
    updateLapTimes();
    updatePastDrivers();
    updatePastCarData();
    updatePastLapTimes();
}

// Update dashboard every 5 seconds
updateDashboard();
setInterval(updateDashboard, 5000);