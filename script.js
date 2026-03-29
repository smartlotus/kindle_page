// Legacy-friendly ES5 script for older Kindle browsers.
(function () {
  var REFRESH_INTERVAL_MINUTES = 10;
  var QUOTE_LIBRARY_PATH = "./data/quote-library.json";
  var STORAGE_KEYS = {
    weatherGroup: "kindle_weather_group",
    weatherCity: "kindle_weather_city"
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
    selectedCityId: null
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

  function initWeatherSelectors() {
    var groupSelect = document.getElementById("cityGroupSelect");
    var citySelect = document.getElementById("citySelect");
    var initial;
    var nextGroup;
    var nextCity;

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
      nextGroup = findGroupById(groupSelect.value) || getFirstAvailableGroup();
      if (!nextGroup) {
        return;
      }

      nextCity = getFirstAvailableCity(nextGroup);
      weatherState.selectedGroupId = nextGroup.id;
      weatherState.selectedCityId = nextCity ? nextCity.id : null;

      renderCityOptions(citySelect, nextGroup, weatherState.selectedCityId);
      persistWeatherSelection();
      renderWeather();
    };

    citySelect.onchange = function () {
      weatherState.selectedCityId = citySelect.value;
      persistWeatherSelection();
      renderWeather();
    };
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

  function renderClock(now) {
    var current = now || new Date();
    var hour = current.getHours();
    var activeSlot = Math.floor(current.getMinutes() / 10);
    var slotMinute = activeSlot * 10;
    var slotStart = pad2(hour) + ":" + pad2(slotMinute);
    var slotEnd = pad2(hour) + ":" + pad2(Math.min(slotMinute + 9, 59));
    var next = getNextRefreshTime(current);

    document.getElementById("hourText").innerHTML = pad2(hour);
    document.getElementById("minuteSlotText").innerHTML = pad2(slotMinute);
    document.getElementById("slotRangeText").innerHTML = "当前十分钟：" + slotStart + " - " + slotEnd;
    document.getElementById("refreshHint").innerHTML =
      "下一次自动刷新：" + pad2(next.getHours()) + ":" + pad2(next.getMinutes());

    renderTenMinuteGrid(activeSlot);
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
      var data;
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          data = JSON.parse(xhr.responseText);
          onSuccess(data);
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
        var current = payload && payload.current ? payload.current : {};
        var daily = payload && payload.daily ? payload.daily : {};
        var weatherLabel =
          WEATHER_CODE_MAP[current.weather_code] || (typeof current.weather_code === "number" ? "天气变化中" : "天气未知");
        var temp = Math.round(current.temperature_2m);
        var feel = Math.round(current.apparent_temperature);
        var max = isArray(daily.temperature_2m_max) ? Math.round(daily.temperature_2m_max[0]) : null;
        var min = isArray(daily.temperature_2m_min) ? Math.round(daily.temperature_2m_min[0]) : null;
        var dayNight = Number(current.is_day) === 1 ? "白天" : "夜间";
        var now = new Date();

        weatherMain.innerHTML =
          selectedCity.label + "（" + selectedCity.country + "） " + weatherLabel + " " + String(temp) + "°C";
        if (max !== null && min !== null) {
          weatherSub.innerHTML =
            "体感 " + String(feel) + "°C · 今日 " + String(min) + "°C ~ " + String(max) + "°C · " + dayNight;
        } else {
          weatherSub.innerHTML = "体感 " + String(feel) + "°C · " + dayNight;
        }
        weatherUpdated.innerHTML = "更新时间：" + pad2(now.getHours()) + ":" + pad2(now.getMinutes());
      },
      function () {
        weatherMain.innerHTML = selectedCity.label + "（" + selectedCity.country + "） 天气暂不可用";
        weatherSub.innerHTML = "请检查网络或 HTTPS 证书兼容性，页面会在下次刷新时重试";
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
    var now = new Date();
    renderClock(now);
    scheduleAutoRefresh();
    initWeatherSelectors();
    renderWeather();
    renderDailyQuote(now);
  }

  if (document.addEventListener) {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    window.attachEvent("onload", init);
  }
})();
