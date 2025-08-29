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
};

// =======================
// Formatters
// =======================
const formatters = {
  usd: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
};

// =======================
// Utility Functions
// =======================
function addCommasToNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

// =======================
// API Calls
// =======================
async function fetchTopCryptos() {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h";
  const response = await fetch(url, { cache: "no-store" }); // Avoid browser cache
  if (!response.ok) throw new Error("Failed to fetch crypto data");
  return response.json();
}

async function fetchEconomicCalendar() {
  const cached = getCachedCalendar();
  if (cached) return cached;

  const url = `https://api.tradingeconomics.com/calendar?c=${TE_API_KEY}&limit=10`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch economic calendar");

  const data = await response.json();
  setCachedCalendar(data);
  return data;
}

// =======================
// UI Update Functions
// =======================
function updateCryptoTable(cryptos) {
  // Update existing rows instead of rewriting table
  let html = "";
  cryptos.forEach((crypto, index) => {
    const changeClass = crypto.price_change_percentage_24h >= 0 ? "positive" : "negative";
    const changeIcon = crypto.price_change_percentage_24h >= 0 ? "▲" : "▼";
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="crypto-info">
            <img src="${crypto.image}" alt="${crypto.name}" class="crypto-icon" loading="lazy">
            <div>
              <div class="crypto-name">${crypto.name}</div>
              <div class="crypto-symbol">${crypto.symbol.toUpperCase()}</div>
            </div>
          </div>
        </td>
        <td>${formatters.usd.format(crypto.current_price)}</td>
        <td><span class="price-change ${changeClass}">${changeIcon} ${Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%</span></td>
        <td>$${addCommasToNumber((crypto.market_cap / 1000000000).toFixed(2))}B</td>
      </tr>
    `;
  });
  elements.cryptoTable.innerHTML = html;
  elements.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
}

function updateEconomicCalendar(events) {
  if (!events || events.length === 0) {
    elements.calendarList.innerHTML = `<li>No economic events available</li>`;
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
          .map(event => `
            <tr>
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
}

// =======================
// Live Clock
// =======================
const clockElement = document.createElement("span");
clockElement.id = "liveClock";
clockElement.style.marginLeft = "1rem";
clockElement.style.fontWeight = "bold";
if (elements.lastUpdated && elements.lastUpdated.parentNode) {
  elements.lastUpdated.parentNode.appendChild(clockElement);
}
function updateLiveClock() {
  const now = new Date();
  clockElement.textContent = now.toLocaleTimeString();
}
setInterval(updateLiveClock, 1000);
updateLiveClock();

// =======================
// Refresh Functions
// =======================
async function refreshCrypto() {
  try {
    const cryptos = await fetchTopCryptos();
    updateCryptoTable(cryptos);
  } catch (err) {
    console.error("Crypto fetch error:", err);
  }
}

async function refreshCalendar() {
  try {
    const events = await fetchEconomicCalendar();
    updateEconomicCalendar(events);
  } catch (err) {
    console.error("Calendar fetch error:", err);
    elements.calendarList.innerHTML = `<li>Error loading calendar</li>`;
  }
}

// =======================
// Initialize
// =======================
async function initializeApp() {
 
  elements.cryptoTable.innerHTML = `<tr><td colspan="5"><div class="skeleton-loader"></div></td></tr>`;
  elements.calendarList.innerHTML = `<tr><td colspan="4"><div class="skeleton-loader"></div></td></tr>`;
  await Promise.all([refreshCrypto(), refreshCalendar()]);
}

// =======================
// Event Listeners
// =======================
if (elements.refreshCalendar) {
  elements.refreshCalendar.addEventListener("click", refreshCalendar);
}

// =======================
// Auto-refresh
// =======================
initializeApp();
// Crypto: every 5 seconds
setInterval(refreshCrypto, 5000);
// Calendar: every 30 seconds
setInterval(refreshCalendar, 30000);
