// ===== WEATHER APP - MAIN SCRIPT =====

// ===== Application State =====
const state = {
  currentLocation: null,
  weatherData: null,
  lastFailedLocation: null, // For retry functionality
  units: {
    temperature: "celsius", // celsius or fahrenheit
    wind: "kmh", // kmh or mph
    precipitation: "mm", // mm or in
  },
  selectedDay: 0, // Index for hourly forecast
  searchResults: [],
};

// ===== Weather Code Mappings (WMO Weather interpretation codes) =====
const weatherCodes = {
  0: { description: "Clear sky", icon: "☀️" },
  1: { description: "Mainly clear", icon: "🌤️" },
  2: { description: "Partly cloudy", icon: "⛅" },
  3: { description: "Overcast", icon: "☁️" },
  45: { description: "Foggy", icon: "🌫️" },
  48: { description: "Foggy", icon: "🌫️" },
  51: { description: "Light drizzle", icon: "🌦️" },
  53: { description: "Drizzle", icon: "🌦️" },
  55: { description: "Heavy drizzle", icon: "🌧️" },
  56: { description: "Freezing drizzle", icon: "🌨️" },
  57: { description: "Freezing drizzle", icon: "🌨️" },
  61: { description: "Light rain", icon: "🌧️" },
  63: { description: "Rain", icon: "🌧️" },
  65: { description: "Heavy rain", icon: "⛈️" },
  66: { description: "Freezing rain", icon: "🌨️" },
  67: { description: "Freezing rain", icon: "🌨️" },
  71: { description: "Light snow", icon: "🌨️" },
  73: { description: "Snow", icon: "❄️" },
  75: { description: "Heavy snow", icon: "❄️" },
  77: { description: "Snow grains", icon: "🌨️" },
  80: { description: "Light showers", icon: "🌦️" },
  81: { description: "Showers", icon: "🌧️" },
  82: { description: "Heavy showers", icon: "⛈️" },
  85: { description: "Light snow showers", icon: "🌨️" },
  86: { description: "Snow showers", icon: "❄️" },
  95: { description: "Thunderstorm", icon: "⛈️" },
  96: { description: "Thunderstorm with hail", icon: "⛈️" },
  99: { description: "Thunderstorm with hail", icon: "⛈️" },
};

// ===== DOM Elements =====
const elements = {
  // Search
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  searchDropdown: document.getElementById("searchDropdown"),
  searchStatus: document.getElementById("searchStatus"),

  // Units
  unitsBtn: document.getElementById("unitsBtn"),
  unitsMenu: document.getElementById("unitsMenu"),
  unitSystemLabel: document.getElementById("unitSystemLabel"),

  // States
  loadingState: document.getElementById("loadingState"),
  noResults: document.getElementById("noResults"),
  errorState: document.getElementById("errorState"),
  weatherDisplay: document.getElementById("weatherDisplay"),
  retryBtn: document.getElementById("retryBtn"),

  // Weather Display
  locationName: document.getElementById("locationName"),
  locationDate: document.getElementById("locationDate"),
  weatherIconLarge: document.getElementById("weatherIconLarge"),
  weatherTempLarge: document.getElementById("weatherTempLarge"),
  feelsLike: document.getElementById("feelsLike"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  precipitation: document.getElementById("precipitation"),
  dailyForecast: document.getElementById("dailyForecast"),
  hourlyForecast: document.getElementById("hourlyForecast"),

  // Day selector
  daySelectorBtn: document.getElementById("daySelectorBtn"),
  daySelectorMenu: document.getElementById("daySelectorMenu"),
  selectedDay: document.getElementById("selectedDay"),
};

// ===== Utility Functions =====

// Convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

// Convert km/h to mph
function kmhToMph(kmh) {
  return kmh * 0.621371;
}

// Convert mm to inches
function mmToInches(mm) {
  return mm * 0.0393701;
}

// Format temperature based on current units
function formatTemperature(celsius) {
  const temp =
    state.units.temperature === "fahrenheit"
      ? celsiusToFahrenheit(celsius)
      : celsius;
  const unit = state.units.temperature === "fahrenheit" ? "°F" : "°C";
  return `${Math.round(temp)}${unit}`;
}

// Format wind speed based on current units
function formatWindSpeed(kmh) {
  const speed = state.units.wind === "mph" ? kmhToMph(kmh) : kmh;
  const unit = state.units.wind === "mph" ? "mph" : "km/h";
  return `${Math.round(speed)} ${unit}`;
}

// Format precipitation based on current units
function formatPrecipitation(mm) {
  const precip = state.units.precipitation === "in" ? mmToInches(mm) : mm;
  const unit = state.units.precipitation === "in" ? "in" : "mm";
  return `${precip.toFixed(1)} ${unit}`;
}

// Get weather icon from code
function getWeatherIcon(code) {
  return weatherCodes[code]?.icon || "🌡️";
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

// Get day name from date
function getDayName(dateString, short = false) {
  const date = new Date(dateString);
  const options = { weekday: short ? "short" : "long" };
  return date.toLocaleDateString("en-US", options);
}

// Get time from datetime string
function getTime(datetimeString) {
  const date = new Date(datetimeString);
  const hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours} ${ampm}`;
}

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ===== API Functions =====

// Geocoding - Convert city name to coordinates
async function geocodeLocation(query) {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );

    if (!response.ok) {
      throw new Error("Geocoding request failed");
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
}

// Fetch weather data from Open-Meteo API
async function fetchWeatherData(latitude, longitude) {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm&timezone=auto&forecast_days=7`
    );

    if (!response.ok) {
      throw new Error("Weather request failed");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Weather fetch error:", error);
    throw error;
  }
}

// ===== UI Update Functions =====

// Show loading state
function showLoading() {
  elements.loadingState.classList.add("active");
  elements.weatherDisplay.classList.remove("active");
  elements.noResults.classList.remove("active");
  elements.errorState.classList.remove("active");
}

// Show no results state
function showNoResults() {
  elements.loadingState.classList.remove("active");
  elements.weatherDisplay.classList.remove("active");
  elements.noResults.classList.add("active");
  elements.errorState.classList.remove("active");
}

// Show weather display
function showWeatherDisplay() {
  elements.loadingState.classList.remove("active");
  elements.weatherDisplay.classList.add("active");
  elements.noResults.classList.remove("active");
  elements.errorState.classList.remove("active");
}

// Show API error state
function showApiError() {
  elements.loadingState.classList.remove("active");
  elements.weatherDisplay.classList.remove("active");
  elements.noResults.classList.remove("active");
  elements.errorState.classList.add("active");
}

// Show search loading state
function showSearchLoading() {
  elements.searchBtn.classList.add("searching");
  elements.searchBtn.textContent = "Searching...";
  elements.searchBtn.disabled = true;
  elements.searchInput.disabled = true;
}

// Hide search loading state
function hideSearchLoading() {
  elements.searchBtn.classList.remove("searching");
  elements.searchBtn.textContent = "Search";
  elements.searchBtn.disabled = false;
  elements.searchInput.disabled = false;
}

// Retry fetching weather for the last failed location
async function retryLastLocation() {
  if (state.lastFailedLocation) {
    await selectLocation(state.lastFailedLocation);
  }
}

// Update main weather display
function updateMainWeather() {
  const { current, daily } = state.weatherData;

  // Location and date
  elements.locationName.textContent = `${state.currentLocation.name}, ${state.currentLocation.country}`;
  elements.locationDate.textContent = formatDate(daily.time[0]);

  // Main weather
  elements.weatherIconLarge.textContent = getWeatherIcon(current.weather_code);
  elements.weatherTempLarge.textContent = formatTemperature(
    current.temperature_2m,
  );

  // Metrics
  elements.feelsLike.textContent = formatTemperature(
    current.apparent_temperature,
  );
  elements.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  elements.wind.textContent = formatWindSpeed(current.wind_speed_10m);
  elements.precipitation.textContent = formatPrecipitation(
    current.precipitation,
  );
}

// Update daily forecast
function updateDailyForecast() {
  const { daily } = state.weatherData;

  elements.dailyForecast.innerHTML = "";

  daily.time.forEach((date, index) => {
    const dayName = index === 0 ? "Today" : getDayName(date, true);
    const icon = getWeatherIcon(daily.weather_code[index]);
    const high = formatTemperature(daily.temperature_2m_max[index]);
    const low = formatTemperature(daily.temperature_2m_min[index]);

    const dayElement = document.createElement("div");
    dayElement.className = "daily-forecast-item";
    dayElement.innerHTML = `
            <div class="daily-forecast-day">${dayName}</div>
            <div class="daily-forecast-icon">${icon}</div>
            <div class="daily-forecast-temps">
                <span class="daily-forecast-high">${high}</span>
                <span class="daily-forecast-low">${low}</span>
            </div>
        `;

    // Click to switch to hourly forecast for this day
    dayElement.addEventListener("click", () => {
      state.selectedDay = index;
      updateHourlyForecast();
      updateDaySelectorButton();
    });

    elements.dailyForecast.appendChild(dayElement);
  });

  // Populate day selector menu
  updateDaySelectorMenu();
}

// Update hourly forecast
function updateHourlyForecast() {
  const { hourly, daily } = state.weatherData;
  const selectedDate = daily.time[state.selectedDay];

  elements.hourlyForecast.innerHTML = "";

  // Filter hourly data for selected day
  hourly.time.forEach((datetime, index) => {
    const hourDate = datetime.split("T")[0];

    if (hourDate === selectedDate) {
      const time = getTime(datetime);
      const icon = getWeatherIcon(hourly.weather_code[index]);
      const temp = formatTemperature(hourly.temperature_2m[index]);

      const hourElement = document.createElement("div");
      hourElement.className = "hourly-forecast-item";
      hourElement.innerHTML = `
                <div class="hourly-time">
                    <div class="hourly-icon">${icon}</div>
                    <div class="hourly-time-text">${time}</div>
                </div>
                <div class="hourly-temp">${temp}</div>
            `;

      elements.hourlyForecast.appendChild(hourElement);
    }
  });
}

// Update day selector menu
function updateDaySelectorMenu() {
  const { daily } = state.weatherData;

  elements.daySelectorMenu.innerHTML = "";

  daily.time.forEach((date, index) => {
    const dayName = index === 0 ? "Today" : getDayName(date, false);

    const dayItem = document.createElement("div");
    dayItem.className = "day-selector-item";
    dayItem.textContent = dayName;

    dayItem.addEventListener("click", () => {
      state.selectedDay = index;
      updateHourlyForecast();
      updateDaySelectorButton();
      elements.daySelectorMenu.classList.remove("active");
      elements.daySelectorBtn.classList.remove("active");
    });

    elements.daySelectorMenu.appendChild(dayItem);
  });
}

// Update day selector button
function updateDaySelectorButton() {
  const { daily } = state.weatherData;
  const dayName =
    state.selectedDay === 0
      ? "Today"
      : getDayName(daily.time[state.selectedDay], false);

  elements.selectedDay.textContent = dayName;
}

// Update all weather displays
function updateWeatherDisplay() {
  updateMainWeather();
  updateDailyForecast();
  updateHourlyForecast();
  updateDaySelectorButton();
  showWeatherDisplay();
}

// ===== Search Functions =====

// Handle search input
const handleSearchInput = debounce(async (query) => {
  if (query.length < 2) {
    elements.searchDropdown.classList.remove("active");
    return;
  }

  elements.searchStatus.classList.add("active");
  elements.searchDropdown.classList.remove("active");

  const results = await geocodeLocation(query);
  state.searchResults = results;

  elements.searchStatus.classList.remove("active");

  if (results.length > 0) {
    displaySearchResults(results);
  } else {
    elements.searchDropdown.classList.remove("active");
  }
}, 500);

// Display search results in dropdown
function displaySearchResults(results) {
  elements.searchDropdown.innerHTML = "";

  results.forEach((result) => {
    const item = document.createElement("div");
    item.className = "search-dropdown-item";

    const details = [result.admin1, result.country].filter(Boolean).join(", ");

    item.innerHTML = `
            <div class="search-dropdown-item-name">${result.name}</div>
            <div class="search-dropdown-item-details">${details}</div>
        `;

    item.addEventListener("click", () => {
      selectLocation(result);
    });

    elements.searchDropdown.appendChild(item);
  });

  elements.searchDropdown.classList.add("active");
}

// Select a location and fetch weather
async function selectLocation(location) {
  elements.searchDropdown.classList.remove("active");
  // Remove the line that populates search input to keep it empty
  // elements.searchInput.value = `${location.name}, ${location.country}`;

  // Hide search loading state if it was active
  hideSearchLoading();

  state.currentLocation = location;
  state.lastFailedLocation = location; // Save for retry

  showLoading();

  try {
    const weatherData = await fetchWeatherData(
      location.latitude,
      location.longitude,
    );
    state.weatherData = weatherData;
    state.lastFailedLocation = null; // Clear on success
    updateWeatherDisplay();
  } catch (error) {
    console.error("Error fetching weather:", error);
    showApiError();
  }
}

// Handle search button click
async function handleSearch() {
  const query = elements.searchInput.value.trim();

  if (!query) return;

  showSearchLoading();
  showLoading();

  try {
    const results = await geocodeLocation(query);

    if (results.length > 0) {
      selectLocation(results[0]);
    } else {
      showNoResults();
    }
  } catch (error) {
    console.error("Search error:", error);
    showNoResults();
  } finally {
    hideSearchLoading();
  }
}

// ===== Units Functions =====

// Update unit system label
function updateUnitSystemLabel() {
  const isMetric =
    state.units.temperature === "celsius" &&
    state.units.wind === "kmh" &&
    state.units.precipitation === "mm";

  elements.unitSystemLabel.textContent = isMetric ? "Imperial" : "Metric";
}

// Update unit option active states
function updateUnitOptions() {
  document.querySelectorAll(".unit-option").forEach((option) => {
    const unit = option.dataset.unit;
    const value = option.dataset.value;

    if (unit === "temp" && state.units.temperature === value) {
      option.classList.add("active");
    } else if (unit === "wind" && state.units.wind === value) {
      option.classList.add("active");
    } else if (unit === "precip" && state.units.precipitation === value) {
      option.classList.add("active");
    } else if (unit) {
      option.classList.remove("active");
    }
  });

  updateUnitSystemLabel();
}

// Handle unit change
function handleUnitChange(unit, value) {
  if (unit === "temp") {
    state.units.temperature = value;
  } else if (unit === "wind") {
    state.units.wind = value;
  } else if (unit === "precip") {
    state.units.precipitation = value;
  }

  updateUnitOptions();

  // Re-render if we have weather data
  if (state.weatherData) {
    updateWeatherDisplay();
  }
}

// ===== Geolocation =====

// Get user's current location
function getUserLocation() {
  if ("geolocation" in navigator) {
    showLoading();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocode to get location name
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`
          );

          const data = await response.json();
          if (data.results && data.results.length > 0) {
            selectLocation(data.results[0]);
          } else {
            // Fallback: create location object with coordinates
            const location = {
              name: "Your Location",
              country: "",
              latitude,
              longitude,
            };
            selectLocation(location);
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          showNoResults();
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        // Load default location (Berlin) on geolocation error
        loadDefaultLocation();
      },
    );
  } else {
    // Geolocation not supported, load default
    loadDefaultLocation();
  }
}

// Load default location (Berlin)
async function loadDefaultLocation() {
  const defaultLocation = {
    name: "Berlin",
    country: "Germany",
    latitude: 52.52,
    longitude: 13.41,
  };

  await selectLocation(defaultLocation);
}

// ===== Event Listeners =====

// Search input
elements.searchInput.addEventListener("input", (e) => {
  handleSearchInput(e.target.value);
});

// Search input - Enter key
elements.searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleSearch();
  }
});

// Search button
elements.searchBtn.addEventListener("click", handleSearch);

// Retry button
elements.retryBtn.addEventListener("click", retryLastLocation);

// Units dropdown toggle
elements.unitsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  elements.unitsBtn.classList.toggle("active");
  elements.unitsMenu.classList.toggle("active");
});

// Day selector toggle
elements.daySelectorBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  elements.daySelectorBtn.classList.toggle("active");
  elements.daySelectorMenu.classList.toggle("active");
});

// Unit options
document.querySelectorAll(".unit-option").forEach((option) => {
  option.addEventListener("click", () => {
    const unit = option.dataset.unit;
    const value = option.dataset.value;
    handleUnitChange(unit, value);
  });
});

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
  if (
    !elements.unitsMenu.contains(e.target) &&
    !elements.unitsBtn.contains(e.target)
  ) {
    elements.unitsMenu.classList.remove("active");
    elements.unitsBtn.classList.remove("active");
  }

  if (
    !elements.daySelectorMenu.contains(e.target) &&
    !elements.daySelectorBtn.contains(e.target)
  ) {
    elements.daySelectorMenu.classList.remove("active");
    elements.daySelectorBtn.classList.remove("active");
  }

  if (
    !elements.searchDropdown.contains(e.target) &&
    !elements.searchInput.contains(e.target)
  ) {
    elements.searchDropdown.classList.remove("active");
  }
});

// ===== Initialization =====

// Initialize the app
function init() {
  // Clear search input to keep it empty on refresh
  elements.searchInput.value = "";

  // Set default units to metric
  state.units.temperature = "celsius";
  state.units.wind = "kmh";
  state.units.precipitation = "mm";

  updateUnitOptions();

  // Load Berlin, Germany as the default location
  loadDefaultLocation();
}

// Start the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}