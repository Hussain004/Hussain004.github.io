// Sample data - replace with actual data
const driverData = {
    hamilton: {
        name: "Lewis Hamilton",
        wins: [0, 1, 4, 5, 7, 11, 10, 11, 11, 9, 11, 11, 8, 0],
        points: [0, 30, 98, 98, 161, 384, 380, 413, 408, 363, 413, 347, 240, 0]
    },
    verstappen: {
        name: "Max Verstappen",
        wins: [0, 0, 1, 2, 3, 2, 3, 10, 15, 0],
        points: [0, 49, 168, 249, 258, 214, 278, 395, 454, 0]
    }
};

function updateCharts(driverId) {
    const driver = driverData[driverId];
    
    new Chart(document.getElementById('winsChart'), {
        type: 'bar',
        data: {
            labels: Array.from({length: driver.wins.length}, (_, i) => 2010 + i),
            datasets: [{
                label: 'Wins per Season',
                data: driver.wins,
                backgroundColor: 'rgba(225, 6, 0, 0.7)',
                borderColor: 'rgba(225, 6, 0, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${driver.name} - Wins per Season`,
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });

    new Chart(document.getElementById('pointsChart'), {
        type: 'line',
        data: {
            labels: Array.from({length: driver.points.length}, (_, i) => 2010 + i),
            datasets: [{
                label: 'Championship Points',
                data: driver.points,
                borderColor: 'rgba(0, 87, 156, 1)',
                backgroundColor: 'rgba(0, 87, 156, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${driver.name} - Championship Points per Season`,
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

document.getElementById('driver-select').addEventListener('change', (e) => {
    updateCharts(e.target.value);
});

// Initialize with first driver
document.addEventListener('DOMContentLoaded', () => {
    updateCharts('hamilton');
});