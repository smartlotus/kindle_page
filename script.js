// Legacy-friendly ES5 script for older Kindle browsers.
(function () {
  if (!Date.now) {
    Date.now = function () {
      return new Date().getTime();
    };
  }

  var REFRESH_INTERVAL_MINUTES = 10;
  var QUOTE_LIBRARY_PATH = "./data/quote-library.json";
  var DEFAULT_CLOCK_UTC_OFFSET_SECONDS = 8 * 3600;
  var DEFAULT_CLOCK_TIMEZONE_LABEL = "北京时间 (UTC+8)";
  var CLOCK_SCALE_MIN = 0.7;
  var CLOCK_SCALE_MAX = 1.8;
  var CLOCK_SCALE_STEP = 0.1;
  var STORAGE_KEYS = {
    weatherGroup: "kindle_weather_group",
    weatherCity: "kindle_weather_city",
    clockScale: "kindle_clock_scale"
  };

  var FALLBACK_CITY_GROUPS = [
    {
      id: "fallback",
      label: "默认城市",
      cities: [{ id: "shanghai_cn", label: "上海", country: "中国", latitude: 31.2304, longitude: 121.4737 }]
    }
  ];

  var CITY_GROUPS =
    isArray(window.__WEATHER_CITY_GROUPS__) && window.__WEATHER_CITY_GROUPS__.length > 0
      ? window.__WEATHER_CITY_GROUPS__
      : FALLBACK_CITY_GROUPS;

  var FALLBACK_QUOTES = [
    { text: "真正重要的东西，眼睛是看不见的。", source: "《小王子》", author: "圣埃克苏佩里", type: "book" },
    { text: "你得先相信自己，别人才会相信你。", source: "《海上钢琴师》", author: "电影台词", type: "movie" },
    { text: "人是为了活着本身而活着。", source: "《活着》", author: "余华", type: "book" }
  ];

  var WEEKDAY_LABELS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  var WEATHER_CODE_MAP = {
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
    99: "雷雨夹大冰雹"
  };

  var weatherState = {
    selectedGroupId: null,
    selectedCityId: null,
    requestToken: 0
  };

  var clockState = {
    useRemoteTime: true,
    utcOffsetSeconds: DEFAULT_CLOCK_UTC_OFFSET_SECONDS,
    timezoneLabel: DEFAULT_CLOCK_TIMEZONE_LABEL,
    scale: 1,
    supportsZoom: false
  };

  function isArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  }

  function pad2(value) {
    var s = String(value);
    return s.length < 2 ? "0" + s : s;
  }

  function getDateKey(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function hashText(text) {
    var hash = 5381;
    var i;
    for (i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) + hash + text.charCodeAt(i)) & 0xffffffff;
    }
    return hash >>> 0;
  }

  function getNextRefreshTime(now) {
    var next = new Date(now.getTime());
    var remainder = now.getMinutes() % REFRESH_INTERVAL_MINUTES;
    var delta = remainder === 0 ? REFRESH_INTERVAL_MINUTES : REFRESH_INTERVAL_MINUTES - remainder;
    next.setSeconds(0);
    next.setMilliseconds(0);
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
      // Ignore storage failures on restricted browsers.
    }
  }

  function normalizeClockScale(value) {
    var parsed = parseFloat(value);
    if (isNaN(parsed)) {
      parsed = 1;
    }
    if (parsed < CLOCK_SCALE_MIN) {
      parsed = CLOCK_SCALE_MIN;
    }
    if (parsed > CLOCK_SCALE_MAX) {
      parsed = CLOCK_SCALE_MAX;
    }
    return Math.round(parsed * 10) / 10;
  }

  function updateClockScaleLabel() {
    var label = document.getElementById("clockScaleLabel");
    if (!label) {
      return;
    }
    label.innerHTML = String(Math.round(clockState.scale * 100)) + "%";
  }

  function applyClockScale() {
    var host = document.getElementById("clockScaleHost");
    var root = document.getElementById("clockScaleRoot");
    var scale = clockState.scale;
    var baseHeight;
    var transformValue;

    if (!host || !root) {
      return;
    }

    if (typeof root.style.zoom !== "undefined") {
      clockState.supportsZoom = true;
    }

    if (clockState.supportsZoom) {
      root.style.width = "100%";
      root.style.zoom = String(scale);
      root.style.webkitTransform = "none";
      root.style.transform = "none";
      host.style.height = "auto";
      updateClockScaleLabel();
      return;
    }

    root.style.zoom = "";
    root.style.width = "100%";
    root.style.webkitTransform = "none";
    root.style.transform = "none";
    host.style.height = "auto";

    baseHeight = root.offsetHeight || root.scrollHeight || 0;
    transformValue = "scale(" + String(scale) + ")";
    root.style.width = String(100 / scale) + "%";
    root.style.webkitTransform = transformValue;
    root.style.transform = transformValue;
    host.style.height = String(Math.ceil(baseHeight * scale)) + "px";
    updateClockScaleLabel();
  }

  function setClockScale(value, shouldPersist) {
    clockState.scale = normalizeClockScale(value);
    if (shouldPersist) {
      safeSetStorage(STORAGE_KEYS.clockScale, String(clockState.scale));
    }
    applyClockScale();
  }

  function initClockScaleControls() {
    var downBtn = document.getElementById("clockScaleDownBtn");
    var upBtn = document.getElementById("clockScaleUpBtn");
    var resetBtn = document.getElementById("clockScaleResetBtn");
    var storedScale = safeGetStorage(STORAGE_KEYS.clockScale);

    clockState.scale = normalizeClockScale(storedScale);

    if (downBtn) {
      downBtn.onclick = function () {
        setClockScale(clockState.scale - CLOCK_SCALE_STEP, true);
      };
    }

    if (upBtn) {
      upBtn.onclick = function () {
        setClockScale(clockState.scale + CLOCK_SCALE_STEP, true);
      };
    }

    if (resetBtn) {
      resetBtn.onclick = function () {
        setClockScale(1, true);
      };
    }

    setClockScale(clockState.scale, false);
  }

  function findGroupById(groupId) {
    var i;
    for (i = 0; i < CITY_GROUPS.length; i += 1) {
      if (CITY_GROUPS[i].id === groupId) {
        return CITY_GROUPS[i];
      }
    }
    return null;
  }

  function findCityByIdInGroup(group, cityId) {
    var i;
    var cities = group && isArray(group.cities) ? group.cities : [];
    for (i = 0; i < cities.length; i += 1) {
      if (cities[i].id === cityId) {
        return cities[i];
      }
    }
    return null;
  }

  function findGroupAndCityByCityId(cityId) {
    var i;
    for (i = 0; i < CITY_GROUPS.length; i += 1) {
      var group = CITY_GROUPS[i];
      var city = findCityByIdInGroup(group, cityId);
      if (city) {
        return { group: group, city: city };
      }
    }
    return null;
  }

  function getFirstAvailableGroup() {
    return CITY_GROUPS.length > 0 ? CITY_GROUPS[0] : null;
  }

  function getFirstAvailableCity(group) {
    var cities = group && isArray(group.cities) ? group.cities : [];
    return cities.length > 0 ? cities[0] : null;
  }

  function resolveInitialWeatherSelection() {
    var savedGroupId = safeGetStorage(STORAGE_KEYS.weatherGroup);
    var savedCityId = safeGetStorage(STORAGE_KEYS.weatherCity);
    var savedGroup = savedGroupId ? findGroupById(savedGroupId) : null;
    var savedCityFromGroup = savedGroup && savedCityId ? findCityByIdInGroup(savedGroup, savedCityId) : null;

    if (savedGroup && savedCityFromGroup) {
      return { group: savedGroup, city: savedCityFromGroup };
    }

    if (savedCityId) {
      var matched = findGroupAndCityByCityId(savedCityId);
      if (matched) {
        return matched;
      }
    }

    var preferred = findGroupAndCityByCityId("shanghai_cn");
    if (preferred) {
      return preferred;
    }

    var fallbackGroup = savedGroup || getFirstAvailableGroup();
    var fallbackCity = getFirstAvailableCity(fallbackGroup);
    return { group: fallbackGroup, city: fallbackCity };
  }

  function clearElementChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function renderGroupOptions(groupSelect, selectedGroupId) {
    var i;
    clearElementChildren(groupSelect);
    for (i = 0; i < CITY_GROUPS.length; i += 1) {
      var group = CITY_GROUPS[i];
      var option = document.createElement("option");
      option.value = group.id;
      option.text = group.label;
      if (group.id === selectedGroupId) {
        option.selected = true;
      }
      groupSelect.appendChild(option);
    }
  }

  function renderCityOptions(citySelect, group, selectedCityId) {
    var i;
    var cities = group && isArray(group.cities) ? group.cities : [];
    clearElementChildren(citySelect);
    for (i = 0; i < cities.length; i += 1) {
      var city = cities[i];
      var option = document.createElement("option");
      option.value = city.id;
      option.text = city.label + "（" + city.country + "）";
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
    return findCityByIdInGroup(getSelectedGroup(), weatherState.selectedCityId);
  }

  function persistWeatherSelection() {
    if (weatherState.selectedGroupId) {
      safeSetStorage(STORAGE_KEYS.weatherGroup, weatherState.selectedGroupId);
    }
    if (weatherState.selectedCityId) {
      safeSetStorage(STORAGE_KEYS.weatherCity, weatherState.selectedCityId);
    }
  }

  function resetClockTimezoneSync() {
    clockState.useRemoteTime = true;
    clockState.utcOffsetSeconds = DEFAULT_CLOCK_UTC_OFFSET_SECONDS;
    clockState.timezoneLabel = DEFAULT_CLOCK_TIMEZONE_LABEL;
  }

  function initWeatherSelectors() {
    var groupSelect = document.getElementById("cityGroupSelect");
    var citySelect = document.getElementById("citySelect");
    var initial;

    if (!groupSelect || !citySelect) {
      return;
    }

    initial = resolveInitialWeatherSelection();
    if (!initial.group || !initial.city) {
      return;
    }

    weatherState.selectedGroupId = initial.group.id;
    weatherState.selectedCityId = initial.city.id;

    renderGroupOptions(groupSelect, weatherState.selectedGroupId);
    renderCityOptions(citySelect, initial.group, weatherState.selectedCityId);
    persistWeatherSelection();

    groupSelect.onchange = function () {
      var nextGroup = findGroupById(groupSelect.value) || getFirstAvailableGroup();
      var nextCity;
      if (!nextGroup) {
        return;
      }

      nextCity = getFirstAvailableCity(nextGroup);
      weatherState.selectedGroupId = nextGroup.id;
      weatherState.selectedCityId = nextCity ? nextCity.id : null;

      renderCityOptions(citySelect, nextGroup, weatherState.selectedCityId);
      persistWeatherSelection();
      resetClockTimezoneSync();
      renderClock();
      renderWeather();
    };

    citySelect.onchange = function () {
      weatherState.selectedCityId = citySelect.value;
      persistWeatherSelection();
      resetClockTimezoneSync();
      renderClock();
      renderWeather();
    };
  }

  function getClockContext() {
    var nowMs = Date.now();
    if (clockState.useRemoteTime && typeof clockState.utcOffsetSeconds === "number") {
      return { date: new Date(nowMs + clockState.utcOffsetSeconds * 1000), useUTCFields: true };
    }
    return { date: new Date(nowMs), useUTCFields: false };
  }

  function getDatePart(date, useUTCFields, type) {
    if (type === "year") {
      return useUTCFields ? date.getUTCFullYear() : date.getFullYear();
    }
    if (type === "month") {
      return useUTCFields ? date.getUTCMonth() + 1 : date.getMonth() + 1;
    }
    if (type === "day") {
      return useUTCFields ? date.getUTCDate() : date.getDate();
    }
    if (type === "weekday") {
      return useUTCFields ? date.getUTCDay() : date.getDay();
    }
    if (type === "hour") {
      return useUTCFields ? date.getUTCHours() : date.getHours();
    }
    if (type === "minute") {
      return useUTCFields ? date.getUTCMinutes() : date.getMinutes();
    }
    if (type === "second") {
      return useUTCFields ? date.getUTCSeconds() : date.getSeconds();
    }
    return 0;
  }

  function renderTenMinuteGrid(activeSlot) {
    var grid = document.getElementById("tenMinuteGrid");
    var slot;
    clearElementChildren(grid);

    for (slot = 0; slot < 6; slot += 1) {
      var cell = document.createElement("div");
      cell.className = "grid-cell" + (slot === activeSlot ? " active" : "");
      cell.appendChild(document.createTextNode(String(slot) + "0"));
      grid.appendChild(cell);
    }
  }

  function renderClock() {
    var context = getClockContext();
    var date = context.date;
    var useUTCFields = context.useUTCFields;
    var year = getDatePart(date, useUTCFields, "year");
    var month = getDatePart(date, useUTCFields, "month");
    var day = getDatePart(date, useUTCFields, "day");
    var weekday = getDatePart(date, useUTCFields, "weekday");
    var hour = getDatePart(date, useUTCFields, "hour");
    var minute = getDatePart(date, useUTCFields, "minute");
    var activeSlot = Math.floor(minute / 10);
    var slotMinute = activeSlot * 10;
    var slotStart = pad2(hour) + ":" + pad2(slotMinute);
    var slotEnd = pad2(hour) + ":" + pad2(Math.min(slotMinute + 9, 59));
    var nextRefresh = getNextRefreshTime(new Date(Date.now()));
    var zoneText = "时区：" + (clockState.timezoneLabel || DEFAULT_CLOCK_TIMEZONE_LABEL);

    document.getElementById("dateText").innerHTML =
      String(year) + "-" + pad2(month) + "-" + pad2(day) + " " + WEEKDAY_LABELS[weekday];
    document.getElementById("hourText").innerHTML = pad2(hour);
    document.getElementById("minuteText").innerHTML = pad2(minute);
    document.getElementById("clockTimezoneText").innerHTML = zoneText;
    document.getElementById("slotRangeText").innerHTML = "当前十分钟：" + slotStart + " - " + slotEnd;
    document.getElementById("refreshHint").innerHTML =
      "下一次自动刷新：" + pad2(nextRefresh.getHours()) + ":" + pad2(nextRefresh.getMinutes());

    renderTenMinuteGrid(activeSlot);
    applyClockScale();
  }

  function initClock() {
    renderClock();
    initClockScaleControls();
  }

  function bindClockScaleResize() {
    if (window.addEventListener) {
      window.addEventListener("resize", applyClockScale, false);
    } else if (window.attachEvent) {
      window.attachEvent("onresize", applyClockScale);
    }
  }

  function scheduleAutoRefresh() {
    var now = new Date();
    var next = getNextRefreshTime(now);
    var delay = next.getTime() - now.getTime();
    window.setTimeout(function () {
      window.location.reload();
    }, delay + 250);
  }

  function encodeQuery(params) {
    var key;
    var parts = [];
    for (key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
      }
    }
    return parts.join("&");
  }

  function requestJson(url, onSuccess, onError) {
    var xhr;
    if (!window.XMLHttpRequest) {
      onError(new Error("XMLHttpRequest unsupported"));
      return;
    }

    xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          onSuccess(JSON.parse(xhr.responseText));
        } catch (error) {
          onError(error);
        }
      } else {
        onError(new Error("Request failed: " + xhr.status));
      }
    };
    xhr.onerror = function () {
      onError(new Error("Network error"));
    };
    xhr.send(null);
  }

  function renderWeather() {
    var weatherMain = document.getElementById("weatherMain");
    var weatherSub = document.getElementById("weatherSub");
    var weatherUpdated = document.getElementById("weatherUpdated");
    var selectedCity = getSelectedCity();
    var requestToken = weatherState.requestToken + 1;

    weatherState.requestToken = requestToken;

    if (!selectedCity) {
      weatherMain.innerHTML = "未找到可用城市";
      weatherSub.innerHTML = "请检查城市配置数据";
      weatherUpdated.innerHTML = "";
      return;
    }

    weatherMain.innerHTML = "正在获取 " + selectedCity.label + " 天气...";
    weatherSub.innerHTML = "请稍候";
    weatherUpdated.innerHTML = "";

    requestJson(
      "https://api.open-meteo.com/v1/forecast?" +
        encodeQuery({
          latitude: selectedCity.latitude,
          longitude: selectedCity.longitude,
          current: "temperature_2m,apparent_temperature,weather_code,is_day",
          daily: "temperature_2m_max,temperature_2m_min",
          timezone: "auto"
        }),
      function (payload) {
        var current;
        var daily;
        var weatherLabel;
        var temp;
        var feel;
        var max;
        var min;
        var dayNight;
        var nowCtx;
        var zoneSuffix;

        if (requestToken !== weatherState.requestToken) {
          return;
        }

        current = payload && payload.current ? payload.current : {};
        daily = payload && payload.daily ? payload.daily : {};
        weatherLabel = WEATHER_CODE_MAP[current.weather_code] || "天气变化中";
        temp = Math.round(current.temperature_2m);
        feel = Math.round(current.apparent_temperature);
        max = isArray(daily.temperature_2m_max) ? Math.round(daily.temperature_2m_max[0]) : null;
        min = isArray(daily.temperature_2m_min) ? Math.round(daily.temperature_2m_min[0]) : null;
        dayNight = Number(current.is_day) === 1 ? "白天" : "夜间";

        zoneSuffix = payload && payload.timezone ? " · " + payload.timezone : "";
        weatherMain.innerHTML = selectedCity.label + "（" + selectedCity.country + "） " + weatherLabel + " " + String(temp) + "°C";
        if (max !== null && min !== null) {
          weatherSub.innerHTML =
            "体感 " + String(feel) + "°C · 今日 " + String(min) + "°C ~ " + String(max) + "°C · " + dayNight + zoneSuffix;
        } else {
          weatherSub.innerHTML = "体感 " + String(feel) + "°C · " + dayNight + zoneSuffix;
        }

        nowCtx = getClockContext();
        weatherUpdated.innerHTML =
          "更新时间：" +
          pad2(getDatePart(nowCtx.date, nowCtx.useUTCFields, "hour")) +
          ":" +
          pad2(getDatePart(nowCtx.date, nowCtx.useUTCFields, "minute"));
      },
      function () {
        if (requestToken !== weatherState.requestToken) {
          return;
        }
        weatherMain.innerHTML = selectedCity.label + "（" + selectedCity.country + "） 天气暂不可用";
        weatherSub.innerHTML = "请检查网络或 HTTPS 兼容性，页面会在下次刷新时重试";
        weatherUpdated.innerHTML = "";
      }
    );
  }

  function loadQuoteLibrary(callback) {
    if (window.__QUOTE_LIBRARY__ && isArray(window.__QUOTE_LIBRARY__.quotes) && window.__QUOTE_LIBRARY__.quotes.length > 0) {
      callback(window.__QUOTE_LIBRARY__.quotes);
      return;
    }

    requestJson(
      QUOTE_LIBRARY_PATH,
      function (payload) {
        if (payload && isArray(payload.quotes) && payload.quotes.length > 0) {
          callback(payload.quotes);
        } else {
          callback(FALLBACK_QUOTES);
        }
      },
      function () {
        callback(FALLBACK_QUOTES);
      }
    );
  }

  function pickDailyQuote(quotes, date) {
    var idx = hashText(getDateKey(date || new Date())) % quotes.length;
    return quotes[idx];
  }

  function renderDailyQuote(now) {
    var current = now || new Date();
    loadQuoteLibrary(function (quotes) {
      var selected = pickDailyQuote(quotes, current);
      var quoteText = document.getElementById("quoteText");
      var quoteMeta = document.getElementById("quoteMeta");
      var source = selected.source || selected.work || "佚名";
      var author = selected.author ? " · " + selected.author : "";
      var mediaType = selected.type === "movie" ? "影视" : selected.type === "book" ? "书籍" : "作品";

      quoteText.innerHTML = "“" + selected.text + "”";
      quoteMeta.innerHTML = source + author + " · " + mediaType + " · " + getDateKey(current);
    });
  }

  function init() {
    initClock();
    bindClockScaleResize();
    scheduleAutoRefresh();
    initWeatherSelectors();
    renderWeather();
    renderDailyQuote(new Date());
  }

  if (document.addEventListener) {
    document.addEventListener("DOMContentLoaded", init);
  } else if (window.attachEvent) {
    window.attachEvent("onload", init);
  } else {
    window.onload = init;
  }
})();
