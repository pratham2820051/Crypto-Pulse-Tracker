// =======================
// API Configuration
// =======================
const TE_API_KEY = "2fe68e3b2b2a49e:orrenz6t059eh5t";

// =======================
// DOM Elements
// =======================
const elements = {
  cryptoTable: document.getElementById("cryptoTable"),
  lastUpdated: document.getElementById("lastUpdated"),
  calendarList: document.getElementById("calendar-list"),
  refreshCalendar: document.getElementById("refreshCalendar"),
  liveTime: document.getElementById("live-time"),
};

// =======================
// Formatters
// =======================
const formatters = {
  usd: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  number: new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }),
  percent: new Intl.NumberFormat("en-US", { 
    style: "percent", 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }),
};

// =======================
// Utility Functions
// =======================
function addCommasToNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatMarketCap(marketCap) {
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(2)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(2)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  } else {
    return `$${addCommasToNumber(marketCap.toFixed(0))}`;
  }
}

function getCachedCalendar() {
  const cached = localStorage.getItem("calendarData");
  if (!cached) return null;
  const parsed = JSON.parse(cached);
  if (Date.now() - parsed.timestamp > 5 * 60 * 1000) return null; // 5 min cache
  return parsed.data;
}

function setCachedCalendar(data) {
  localStorage.setItem("calendarData", JSON.stringify({ timestamp: Date.now(), data }));
}

function showLoadingState(element, isLoading = true) {
  if (isLoading) {
    element.classList.add('loading');
  } else {
    element.classList.remove('loading');
  }
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Show animation
  setTimeout(() => notification.classList.add('show'), 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// =======================
// API Calls
// =======================
async function fetchTopCryptos() {
  try {
    showLoadingState(elements.cryptoTable, true);
    const url =
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h";
    const response = await fetch(url, { cache: "no-store" }); // Avoid browser cache
    if (!response.ok) throw new Error("Failed to fetch crypto data");
    const data = await response.json();
    showLoadingState(elements.cryptoTable, false);
    return data;
  } catch (error) {
    showLoadingState(elements.cryptoTable, false);
    showNotification('Failed to fetch cryptocurrency data', 'error');
    throw error;
  }
}

async function fetchEconomicCalendar() {
  try {
    const cached = getCachedCalendar();
    if (cached) return cached;

    showLoadingState(elements.calendarList, true);
    const url = `https://api.tradingeconomics.com/calendar?c=${TE_API_KEY}&limit=10`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch economic calendar");

    const data = await response.json();
    setCachedCalendar(data);
    showLoadingState(elements.calendarList, false);
    return data;
  } catch (error) {
    showLoadingState(elements.calendarList, false);
    showNotification('Failed to fetch economic calendar', 'error');
    throw error;
  }
}

// =======================
// UI Update Functions
// =======================
function updateCryptoTable(cryptos) {
  if (!cryptos || cryptos.length === 0) {
    elements.cryptoTable.innerHTML = `
      <tr>
        <td colspan="5" class="no-data">
          <div class="no-data-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>No cryptocurrency data available</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  cryptos.forEach((crypto, index) => {
    const changeClass = crypto.price_change_percentage_24h >= 0 ? "positive" : "negative";
    const changeIcon = crypto.price_change_percentage_24h >= 0 ? "▲" : "▼";
    const changeValue = Math.abs(crypto.price_change_percentage_24h);
    
    html += `
      <tr class="crypto-row" data-symbol="${crypto.symbol.toLowerCase()}">
        <td class="rank">${index + 1}</td>
        <td>
          <div class="crypto-info">
            <img src="${crypto.image}" alt="${crypto.name}" class="crypto-icon" loading="lazy">
            <div>
              <div class="crypto-name">${crypto.name}</div>
              <div class="crypto-symbol">${crypto.symbol.toUpperCase()}</div>
            </div>
          </div>
        </td>
        <td class="price">${formatters.usd.format(crypto.current_price)}</td>
        <td>
          <span class="price-change ${changeClass}">
            ${changeIcon} ${formatters.percent.format(changeValue / 100)}
          </span>
        </td>
        <td class="market-cap">${formatMarketCap(crypto.market_cap)}</td>
      </tr>
    `;
  });
  
  elements.cryptoTable.innerHTML = html;
  elements.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  
  // Add row animations
  const rows = elements.cryptoTable.querySelectorAll('.crypto-row');
  rows.forEach((row, index) => {
    row.style.animationDelay = `${index * 0.1}s`;
    row.classList.add('fade-in-row');
  });
}

function updateEconomicCalendar(events) {
  if (!events || events.length === 0) {
    elements.calendarList.innerHTML = `
      <div class="no-data">
        <div class="no-data-content">
          <i class="fas fa-calendar-times"></i>
          <span>No economic events available</span>
        </div>
      </div>
    `;
    return;
  }

  const html = `
    <table class="calendar-table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Country</th>
          <th>Date</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        ${events.slice(0, 8)
          .map((event, index) => `
            <tr class="event-row" style="animation-delay: ${index * 0.1}s">
              <td>${event.Event || "Economic Event"}</td>
              <td>${event.Country || "Global"}</td>
              <td>${event.Date || ""}</td>
              <td>${event.LastUpdate ? new Date(event.LastUpdate).toLocaleTimeString() : "-"}</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  `;
  
  elements.calendarList.innerHTML = html;
  
  // Add row animations
  const rows = elements.calendarList.querySelectorAll('.event-row');
  rows.forEach(row => row.classList.add('fade-in-row'));
}

// =======================
// Live Clock
// =======================
function updateLiveClock() {
  if (elements.liveTime) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    elements.liveTime.textContent = timeString;
  }
}

// =======================
// Refresh Functions
// =======================
async function refreshCrypto() {
  try {
    const cryptos = await fetchTopCryptos();
    updateCryptoTable(cryptos);
    showNotification('Cryptocurrency data updated successfully', 'success');
  } catch (err) {
    console.error("Crypto fetch error:", err);
    showNotification('Failed to update cryptocurrency data', 'error');
  }
}

async function refreshCalendar() {
  try {
    showLoadingState(elements.refreshCalendar, true);
    const events = await fetchEconomicCalendar();
    updateEconomicCalendar(events);
    showNotification('Economic calendar updated successfully', 'success');
  } catch (err) {
    console.error("Calendar fetch error:", err);
    showNotification('Failed to update economic calendar', 'error');
  } finally {
    showLoadingState(elements.refreshCalendar, false);
  }
}

// =======================
// Initialize
// =======================
async function initializeApp() {
  try {
    // Show skeleton loaders
    elements.cryptoTable.innerHTML = `
      <tr><td colspan="5"><div class="skeleton-loader"></div></td></tr>
      <tr><td colspan="5"><div class="skeleton-loader"></div></td></tr>
      <tr><td colspan="5"><div class="skeleton-loader"></div></td></tr>
      <tr><td colspan="5"><div class="skeleton-loader"></div></td></tr>
      <tr><td colspan="5"><div class="skeleton-loader"></div></td></tr>
    `;
    
    elements.calendarList.innerHTML = `
      <li><div class="skeleton-loader short"></div></li>
      <li><div class="skeleton-loader short"></div></li>
      <li><div class="skeleton-loader short"></div></li>
      <li><div class="skeleton-loader short"></div></li>
    `;
    
    // Fetch initial data
    await Promise.all([refreshCrypto(), refreshCalendar()]);
    
    // Start live clock
    updateLiveClock();
    setInterval(updateLiveClock, 1000);
    
    showNotification('Dashboard loaded successfully', 'success');
  } catch (error) {
    console.error('Initialization error:', error);
    showNotification('Failed to initialize dashboard', 'error');
  }
}

// =======================
// Event Listeners
// =======================
if (elements.refreshCalendar) {
  elements.refreshCalendar.addEventListener("click", refreshCalendar);
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    refreshCrypto();
  }
  if (e.ctrlKey && e.key === 'e') {
    e.preventDefault();
    refreshCalendar();
  }
});

// =======================
// Auto-refresh
// =======================
initializeApp();
// Crypto: every 5 seconds
setInterval(refreshCrypto, 5000);
// Calendar: every 30 seconds
setInterval(refreshCalendar, 30000);
