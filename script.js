const REFRESH_INTERVAL_MINUTES = 10;
const QUOTE_LIBRARY_PATH = "./data/quote-library.json";
const STORAGE_KEYS = {
  weatherGroup: "kindle_weather_group",
  weatherCity: "kindle_weather_city",
};

const FALLBACK_CITY_GROUPS = [
  {
    id: "fallback",
    label: "默认城市",
    cities: [{ id: "shanghai_cn", label: "上海", country: "中国", latitude: 31.2304, longitude: 121.4737 }],
  },
];

const CITY_GROUPS =
  Array.isArray(window.__WEATHER_CITY_GROUPS__) && window.__WEATHER_CITY_GROUPS__.length > 0
    ? window.__WEATHER_CITY_GROUPS__
    : FALLBACK_CITY_GROUPS;

const FALLBACK_QUOTES = [
  { text: "真正重要的东西，眼睛是看不见的。", source: "《小王子》", author: "圣埃克苏佩里", type: "book" },
  { text: "你得先相信自己，别人才会相信你。", source: "《海上钢琴师》", author: "电影台词", type: "movie" },
  { text: "人是为了活着本身而活着。", source: "《活着》", author: "余华", type: "book" },
];

const WEATHER_CODE_MAP = {
  0: "晴",
  1: "晴间多云",
  2: "多云",
  3: "阴",
  45: "有雾",
  48: "冻雾",
  51: "小毛毛雨",
  53: "毛毛雨",
  55: "毛毛雨偏强",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  80: "阵雨",
  81: "阵雨偏强",
  82: "暴雨阵雨",
  95: "雷雨",
  96: "雷雨夹小冰雹",
  99: "雷雨夹大冰雹",
};

const weatherState = {
  selectedGroupId: null,
  selectedCityId: null,
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getNextRefreshTime(now) {
  const next = new Date(now);
  next.setSeconds(0, 0);
  const remainder = now.getMinutes() % REFRESH_INTERVAL_MINUTES;
  const delta = remainder === 0 ? REFRESH_INTERVAL_MINUTES : REFRESH_INTERVAL_MINUTES - remainder;
  next.setMinutes(now.getMinutes() + delta);
  return next;
}

function safeGetStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeSetStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage write failures on restricted browsers.
  }
}

function findGroupById(groupId) {
  return CITY_GROUPS.find((group) => group.id === groupId) || null;
}

function findCityByIdInGroup(group, cityId) {
  if (!group || !Array.isArray(group.cities)) {
    return null;
  }
  return group.cities.find((city) => city.id === cityId) || null;
}

function findGroupAndCityByCityId(cityId) {
  for (const group of CITY_GROUPS) {
    const city = findCityByIdInGroup(group, cityId);
    if (city) {
      return { group, city };
    }
  }
  return null;
}

function getFirstAvailableGroup() {
  return CITY_GROUPS[0] || null;
}

function getFirstAvailableCity(group) {
  if (!group || !Array.isArray(group.cities) || group.cities.length === 0) {
    return null;
  }
  return group.cities[0];
}

function resolveInitialWeatherSelection() {
  const savedGroupId = safeGetStorage(STORAGE_KEYS.weatherGroup);
  const savedCityId = safeGetStorage(STORAGE_KEYS.weatherCity);
  const savedGroup = savedGroupId ? findGroupById(savedGroupId) : null;
  const savedCityFromGroup = savedGroup && savedCityId ? findCityByIdInGroup(savedGroup, savedCityId) : null;

  if (savedGroup && savedCityFromGroup) {
    return { group: savedGroup, city: savedCityFromGroup };
  }

  if (savedCityId) {
    const matched = findGroupAndCityByCityId(savedCityId);
    if (matched) {
      return matched;
    }
  }

  const preferred = findGroupAndCityByCityId("shanghai_cn");
  if (preferred) {
    return preferred;
  }

  const fallbackGroup = savedGroup || getFirstAvailableGroup();
  const fallbackCity = getFirstAvailableCity(fallbackGroup);
  return { group: fallbackGroup, city: fallbackCity };
}

function renderGroupOptions(groupSelect, selectedGroupId) {
  groupSelect.innerHTML = "";
  for (const group of CITY_GROUPS) {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.label;
    if (group.id === selectedGroupId) {
      option.selected = true;
    }
    groupSelect.appendChild(option);
  }
}

function renderCityOptions(citySelect, group, selectedCityId) {
  citySelect.innerHTML = "";
  const cities = Array.isArray(group?.cities) ? group.cities : [];
  for (const city of cities) {
    const option = document.createElement("option");
    option.value = city.id;
    option.textContent = `${city.label}（${city.country}）`;
    if (city.id === selectedCityId) {
      option.selected = true;
    }
    citySelect.appendChild(option);
  }
}

function getSelectedGroup() {
  return findGroupById(weatherState.selectedGroupId);
}

function getSelectedCity() {
  const group = getSelectedGroup();
  return findCityByIdInGroup(group, weatherState.selectedCityId);
}

function persistWeatherSelection() {
  if (weatherState.selectedGroupId) {
    safeSetStorage(STORAGE_KEYS.weatherGroup, weatherState.selectedGroupId);
  }
  if (weatherState.selectedCityId) {
    safeSetStorage(STORAGE_KEYS.weatherCity, weatherState.selectedCityId);
  }
}

function initWeatherSelectors() {
  const groupSelect = document.getElementById("cityGroupSelect");
  const citySelect = document.getElementById("citySelect");
  if (!groupSelect || !citySelect) {
    return;
  }

  const initial = resolveInitialWeatherSelection();
  if (!initial.group || !initial.city) {
    return;
  }

  weatherState.selectedGroupId = initial.group.id;
  weatherState.selectedCityId = initial.city.id;

  renderGroupOptions(groupSelect, weatherState.selectedGroupId);
  renderCityOptions(citySelect, initial.group, weatherState.selectedCityId);
  persistWeatherSelection();

  groupSelect.addEventListener("change", () => {
    const nextGroup = findGroupById(groupSelect.value) || getFirstAvailableGroup();
    if (!nextGroup) {
      return;
    }

    const nextCity = getFirstAvailableCity(nextGroup);
    weatherState.selectedGroupId = nextGroup.id;
    weatherState.selectedCityId = nextCity ? nextCity.id : null;

    renderCityOptions(citySelect, nextGroup, weatherState.selectedCityId);
    persistWeatherSelection();
    renderWeather();
  });

  citySelect.addEventListener("change", () => {
    weatherState.selectedCityId = citySelect.value;
    persistWeatherSelection();
    renderWeather();
  });
}

function renderTenMinuteGrid(activeSlot) {
  const grid = document.getElementById("tenMinuteGrid");
  grid.innerHTML = "";

  for (let slot = 0; slot < 6; slot += 1) {
    const cell = document.createElement("div");
    cell.className = "grid-cell";
    if (slot === activeSlot) {
      cell.classList.add("active");
    }
    cell.textContent = `${slot}0`;
    grid.appendChild(cell);
  }
}

function renderClock(now = new Date()) {
  const hour = now.getHours();
  const activeSlot = Math.floor(now.getMinutes() / 10);
  const slotMinute = activeSlot * 10;
  const slotStart = `${pad2(hour)}:${pad2(slotMinute)}`;
  const slotEnd = `${pad2(hour)}:${pad2(Math.min(slotMinute + 9, 59))}`;

  document.getElementById("hourText").textContent = pad2(hour);
  document.getElementById("minuteSlotText").textContent = pad2(slotMinute);
  document.getElementById("slotRangeText").textContent = `当前十分钟：${slotStart} - ${slotEnd}`;

  const next = getNextRefreshTime(now);
  document.getElementById("refreshHint").textContent = `下一次自动刷新：${pad2(next.getHours())}:${pad2(
    next.getMinutes(),
  )}`;

  renderTenMinuteGrid(activeSlot);
}

function scheduleAutoRefresh() {
  const now = new Date();
  const next = getNextRefreshTime(now);
  const delay = next.getTime() - now.getTime();
  window.setTimeout(() => {
    window.location.reload();
  }, delay + 250);
}

async function renderWeather() {
  const weatherMain = document.getElementById("weatherMain");
  const weatherSub = document.getElementById("weatherSub");
  const weatherUpdated = document.getElementById("weatherUpdated");
  const selectedCity = getSelectedCity();

  if (!selectedCity) {
    weatherMain.textContent = "未找到可用城市";
    weatherSub.textContent = "请检查城市配置数据";
    weatherUpdated.textContent = "";
    return;
  }

  weatherMain.textContent = `正在获取 ${selectedCity.label} 天气...`;
  weatherSub.textContent = "请稍候";
  weatherUpdated.textContent = "";

  const params = new URLSearchParams({
    latitude: String(selectedCity.latitude),
    longitude: String(selectedCity.longitude),
    current: "temperature_2m,apparent_temperature,weather_code,is_day",
    daily: "temperature_2m_max,temperature_2m_min",
    timezone: "auto",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Weather request failed: ${response.status}`);
    }
    const payload = await response.json();
    const current = payload.current || {};
    const daily = payload.daily || {};
    const weatherLabel = WEATHER_CODE_MAP[current.weather_code] || "天气变化中";
    const temp = Math.round(current.temperature_2m);
    const feel = Math.round(current.apparent_temperature);
    const max = Array.isArray(daily.temperature_2m_max) ? Math.round(daily.temperature_2m_max[0]) : null;
    const min = Array.isArray(daily.temperature_2m_min) ? Math.round(daily.temperature_2m_min[0]) : null;
    const dayNight = Number(current.is_day) === 1 ? "白天" : "夜间";

    weatherMain.textContent = `${selectedCity.label}（${selectedCity.country}） ${weatherLabel} ${temp}°C`;
    if (max !== null && min !== null) {
      weatherSub.textContent = `体感 ${feel}°C · 今日 ${min}°C ~ ${max}°C · ${dayNight}`;
    } else {
      weatherSub.textContent = `体感 ${feel}°C · ${dayNight}`;
    }

    const now = new Date();
    weatherUpdated.textContent = `更新时间：${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  } catch (error) {
    weatherMain.textContent = `${selectedCity.label}（${selectedCity.country}） 天气暂不可用`;
    weatherSub.textContent = "请检查网络，页面会在下次刷新时重试";
    weatherUpdated.textContent = "";
  }
}

async function loadQuoteLibrary() {
  if (
    window.__QUOTE_LIBRARY__ &&
    Array.isArray(window.__QUOTE_LIBRARY__.quotes) &&
    window.__QUOTE_LIBRARY__.quotes.length > 0
  ) {
    return window.__QUOTE_LIBRARY__.quotes;
  }

  try {
    const response = await fetch(QUOTE_LIBRARY_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Quote library failed: ${response.status}`);
    }
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.quotes) || payload.quotes.length === 0) {
      throw new Error("Quote payload invalid");
    }
    return payload.quotes;
  } catch (error) {
    return FALLBACK_QUOTES;
  }
}

function pickDailyQuote(quotes, date = new Date()) {
  const index = hashText(getDateKey(date)) % quotes.length;
  return quotes[index];
}

async function renderDailyQuote(now = new Date()) {
  const quotes = await loadQuoteLibrary();
  const selected = pickDailyQuote(quotes, now);
  const quoteText = document.getElementById("quoteText");
  const quoteMeta = document.getElementById("quoteMeta");

  quoteText.textContent = `“${selected.text}”`;
  const source = selected.source || selected.work || "佚名";
  const author = selected.author ? ` · ${selected.author}` : "";
  const mediaType = selected.type === "movie" ? "影视" : selected.type === "book" ? "书籍" : "作品";
  quoteMeta.textContent = `${source}${author} · ${mediaType} · ${getDateKey(now)}`;
}

function init() {
  const now = new Date();
  renderClock(now);
  scheduleAutoRefresh();
  initWeatherSelectors();
  renderWeather();
  renderDailyQuote(now);
}

window.addEventListener("DOMContentLoaded", init);
