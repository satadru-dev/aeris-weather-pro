import { useState, useEffect } from 'react'
import './App.css'

interface WeatherData {
  current: {
    temp: number
    humidity: number
    windSpeed: number
    code: number
    uvIndex: number
    visibility: number
    pressure: number
    feelsLike: number
  }
  daily: {
    dates: string[]
    maxTemps: number[]
    minTemps: number[]
    codes: number[]
  }
  location: string
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle',
  55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Rain',
  71: 'Snow', 73: 'Snow', 75: 'Snow', 77: 'Snow',
  80: 'Showers', 81: 'Showers', 82: 'Showers',
  85: 'Snow Showers', 86: 'Snow Showers', 95: 'Thunderstorm',
  96: 'Thunderstorm', 99: 'Thunderstorm',
}

function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [unit, setUnit] = useState<'C' | 'F'>('C')

  const fetchWeatherByCoords = async (lat: number, lon: number, label: string) => {
    setLoading(true)
    setError(null)
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
      )
      const weatherData = await weatherRes.json()

      const extraRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=relative_humidity_2m,wind_speed_10m,uv_index,visibility,surface_pressure,apparent_temperature&timezone=auto`
      )
      const extraData = await extraRes.json()

      setWeather({
        location: label,
        current: {
          temp: weatherData.current_weather.temperature,
          code: weatherData.current_weather.weathercode,
          humidity: extraData.current.relative_humidity_2m,
          windSpeed: extraData.current.wind_speed_10m,
          uvIndex: Math.round(extraData.current.uv_index),
          visibility: extraData.current.visibility / 1000,
          pressure: Math.round(extraData.current.surface_pressure),
          feelsLike: extraData.current.apparent_temperature,
        },
        daily: {
          dates: weatherData.daily.time,
          maxTemps: weatherData.daily.temperature_2m_max,
          minTemps: weatherData.daily.temperature_2m_min,
          codes: weatherData.daily.weathercode,
        }
      })
    } catch (err) {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  const fetchWeather = async (cityName: string) => {
    const trimmed = cityName.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`)
      const geoData = await geoRes.json()
      if (!geoData.results) throw new Error(`Region unrecognized`)
      const { latitude, longitude, name, country } = geoData.results[0]
      await fetchWeatherByCoords(latitude, longitude, `${name}, ${country}`)
      setShowSearch(false)
    } catch (err) {
      setError('Search Failure')
    } finally {
      setLoading(false)
    }
  }

  const handleLocate = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, 'Local'),
      () => setError('GPS Denied')
    )
  }

  const convertTemp = (temp: number) => unit === 'C' ? Math.round(temp) : Math.round((temp * 9/5) + 32)

  useEffect(() => { fetchWeather('New York') }, [])

  return (
    <div className="app-root">
      <div className="background"></div>
      <h1 className="side-text left">WEATHER UI</h1>
      <h1 className="side-text right">FUTURE DESIGN</h1>

      <div className="container">
        <div className="phone">
          <div className="earth-bg"></div>
          <div className="overlay"></div>

          {/* Top Info Overlay */}
          <div className="content-top">
            <div className="stats-box">
              <div style={{fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 4}}>STATS</div>
              <div><span>Hum:</span> <span>{weather?.current.humidity}%</span></div>
              <div><span>Wind:</span> <span>{weather?.current.windSpeed}</span></div>
              <div><span>Pres:</span> <span>{weather?.current.pressure}</span></div>
              <div><span>UV:</span> <span>{weather?.current.uvIndex}</span></div>
            </div>

            <div className="side-menu">
              <div className="icon-btn" onClick={handleLocate}>◎</div>
              <div className="icon-btn" onClick={() => setShowSearch(!showSearch)}>🔍</div>
              <div className="icon-btn yellow" onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}>
                {unit === 'C' ? '°C' : '°F'}
              </div>
            </div>
          </div>

          {/* Search Bar Overlay */}
          {showSearch && (
            <div className="search-overlay">
              <input 
                type="text" 
                className="search-input"
                placeholder="Search city..." 
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && fetchWeather((e.target as HTMLInputElement).value)}
              />
            </div>
          )}

          {/* Main Temperature Display */}
          {weather && (
            <div className="main-temp-card">
              <div style={{fontSize: 12, opacity: 0.6, marginBottom: 2}}>{weather.location.split(',')[0].toUpperCase()}</div>
              <div className="temp-val">{convertTemp(weather.current.temp)}°</div>
              <div className="condition-text">{WEATHER_CODES[weather.current.code]}</div>
            </div>
          )}

          {/* Weekly Forecast */}
          <div className="days-container">
            {weather?.daily.dates.slice(0, 5).map((date, i) => (
              <div key={date} className={`day-card ${i === 1 ? 'selected' : ''}`}>
                <div style={{fontSize: 10, opacity: 0.7}}>{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div style={{fontWeight: 600}}>{new Date(date).getDate()}</div>
                <div style={{fontSize: 14, marginTop: 4}}>{convertTemp(weather.daily.maxTemps[i])}°</div>
              </div>
            ))}
          </div>

          {/* Bottom Nav */}
          <div className="bottom-nav">
            <div className="nav-item">
              <div className="nav-circle">⌂</div>
              <span>Home</span>
            </div>
            <div className="nav-item active">
              <div className="nav-circle">☁</div>
              <span>Weather</span>
            </div>
            <div className="nav-item">
              <div className="nav-circle">🗺</div>
              <span>Map</span>
            </div>
            <div className="nav-item">
              <div className="nav-circle">✈</div>
              <span>Travel</span>
            </div>
          </div>

          {/* Status Messages */}
          {loading && <div className="status-msg loading">SYNCING...</div>}
          {error && <div className="status-msg" style={{color: '#ff6b6b'}}>{error}</div>}
        </div>
      </div>
    </div>
  )
}

export default App
