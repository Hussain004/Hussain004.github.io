const API_BASE_URL = 'https://api.openf1.org/v1';
    
async function fetchData(endpoint, params = {}) {
    const url = new URL(`${API_BASE_URL}/${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    const response = await fetch(url);
    return response.json();
}

async function updateDrivers() {
    const drivers = await fetchData('drivers', { session_key: 'latest' });
    const driverList = document.getElementById('driverList');
    driverList.innerHTML = '';
    drivers.forEach(driver => {
        const li = document.createElement('li');
        li.textContent = `${driver.driver_number}. ${driver.full_name} (${driver.team_name})`;
        li.style.color = `#${driver.team_colour}`;
        driverList.appendChild(li);
    });
}

async function updateCarData() {
    const carData = await fetchData('car_data', { session_key: 'latest', limit: 5 });
    const carDataList = document.getElementById('carData');
    carDataList.innerHTML = '';
    carData.forEach(data => {
        const li = document.createElement('li');
        li.textContent = `Car ${data.driver_number}: Speed ${data.speed} km/h, RPM ${data.rpm}`;
        carDataList.appendChild(li);
    });
}

async function updateLapTimes() {
    const laps = await fetchData('laps', { session_key: 'latest', limit: 5 });
    const lapTimesList = document.getElementById('lapTimes');
    lapTimesList.innerHTML = '';
    laps.forEach(lap => {
        const li = document.createElement('li');
        li.textContent = `Driver ${lap.driver_number}: Lap ${lap.lap_number} - ${lap.lap_duration.toFixed(3)}s`;
        lapTimesList.appendChild(li);
    });
}

function updateDashboard() {
    updateDrivers();
    updateCarData();
    updateLapTimes();
}

// Update dashboard every 5 seconds
updateDashboard();
setInterval(updateDashboard, 5000);