import { API_CONFIG } from '@/config/api';

export interface WeatherData {
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    visibility: number;
    uvIndex: number;
    windSpeed: number;
    windDirection: number;
    description: string;
    icon: string;
  };
  forecast?: {
    date: string;
    high: number;
    low: number;
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
  }[];
}

export interface LocationCoordinates {
  lat: number;
  lon: number;
}

export interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export class WeatherService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly geocodingUrl: string;

  constructor() {
    this.apiKey = API_CONFIG.WEATHER.API_KEY;
    this.baseUrl = API_CONFIG.WEATHER.BASE_URL;
    this.geocodingUrl = API_CONFIG.WEATHER.GEOCODING_URL;
  }

  /**
   * Check if the weather service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_openweather_api_key_here';
  }

  /**
   * Get weather data by city name
   */
  async getWeatherByCity(cityName: string): Promise<WeatherData> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Weather service is not properly configured. Please check your OpenWeatherMap API key.');
      }

      console.log('Fetching weather for city:', cityName);

      // First, get coordinates for the city
      const coordinates = await this.geocodeCity(cityName);
      
      // Then get weather data using coordinates
      return await this.getWeatherByCoordinates(coordinates.lat, coordinates.lon, coordinates.name, coordinates.country);
    } catch (error) {
      console.error('Weather service error:', error);
      throw new Error(`Failed to get weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get weather data by coordinates
   */
  async getWeatherByCoordinates(lat: number, lon: number, locationName?: string, country?: string): Promise<WeatherData> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Weather service is not properly configured. Please check your OpenWeatherMap API key.');
      }

      console.log('Fetching weather for coordinates:', lat, lon);

      // Get current weather
      const currentWeatherUrl = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
      const currentResponse = await fetch(currentWeatherUrl);

      if (!currentResponse.ok) {
        const errorData = await currentResponse.json().catch(() => ({}));
        throw new Error(`Weather API error: ${currentResponse.status} - ${errorData.message || currentResponse.statusText}`);
      }

      const currentData = await currentResponse.json();

      // Get 5-day forecast
      const forecastUrl = `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
      const forecastResponse = await fetch(forecastUrl);

      let forecastData = null;
      if (forecastResponse.ok) {
        forecastData = await forecastResponse.json();
      }

      return this.formatWeatherData(currentData, forecastData, locationName, country);
    } catch (error) {
      console.error('Weather coordinates error:', error);
      throw new Error(`Failed to get weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Geocode a city name to get coordinates
   */
  private async geocodeCity(cityName: string): Promise<GeocodingResult> {
    const geocodingUrl = `${this.geocodingUrl}/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${this.apiKey}`;
    
    const response = await fetch(geocodingUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Geocoding API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error(`Location "${cityName}" not found. Please check the spelling and try again.`);
    }

    const location = data[0];
    return {
      name: location.name,
      lat: location.lat,
      lon: location.lon,
      country: location.country,
      state: location.state,
    };
  }

  /**
   * Format raw weather data into our standard format
   */
  private formatWeatherData(currentData: any, forecastData: any, locationName?: string, country?: string): WeatherData {
    const weatherData: WeatherData = {
      location: {
        name: locationName || currentData.name,
        country: country || currentData.sys?.country || '',
        lat: currentData.coord.lat,
        lon: currentData.coord.lon,
      },
      current: {
        temperature: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        pressure: currentData.main.pressure,
        visibility: currentData.visibility ? Math.round(currentData.visibility / 1000) : 0, // Convert to km
        uvIndex: 0, // UV index not available in current weather API
        windSpeed: Math.round(currentData.wind?.speed * 3.6) || 0, // Convert m/s to km/h
        windDirection: currentData.wind?.deg || 0,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
      },
    };

    // Add forecast data if available
    if (forecastData && forecastData.list) {
      const tzOffsetSec: number | undefined = forecastData.city?.timezone;
      weatherData.forecast = this.formatForecastData(forecastData.list, tzOffsetSec);
    }

    return weatherData;
  }

  /**
   * Format forecast data
   */
  private formatForecastData(forecastList: any[], timezoneOffsetSec?: number): WeatherData['forecast'] {
    const dailyForecasts = new Map<string, any>();

    // Group forecasts by date and find min/max temperatures
    forecastList.forEach(item => {
      // Use the location's timezone if available to derive the correct local calendar date
      const tsSec = typeof item.dt === 'number' ? item.dt : 0;
      const effectiveSec = timezoneOffsetSec ? (tsSec + timezoneOffsetSec) : tsSec;
      const date = new Date(effectiveSec * 1000).toISOString().split('T')[0];
      
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, {
          date,
          high: item.main.temp_max,
          low: item.main.temp_min,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: Math.round(item.wind?.speed * 3.6) || 0,
        });
      } else {
        const existing = dailyForecasts.get(date);
        existing.high = Math.max(existing.high, item.main.temp_max);
        existing.low = Math.min(existing.low, item.main.temp_min);
      }
    });

    // Convert to array and take first 5 days
    return Array.from(dailyForecasts.values())
      .slice(0, 5)
      .map(forecast => ({
        ...forecast,
        high: Math.round(forecast.high),
        low: Math.round(forecast.low),
      }));
  }

  /**
   * Find a forecast entry for a specific YYYY-MM-DD (local) date string
   */
  private findForecastForDate(forecast: WeatherData['forecast'] | undefined, targetDateStr: string) {
    if (!forecast || forecast.length === 0) return null;
    return forecast.find(f => f.date === targetDateStr) || null;
  }

  /**
   * Generate a human-readable weather summary
   * Behavior:
   * - By default (no options), only current conditions are returned.
   * - If a specific day/date is requested, only that day's forecast is returned.
   */
  generateWeatherSummary(
    weatherData: WeatherData,
    options?: {
      when?: 'current' | 'today' | 'tomorrow' | 'yesterday' | 'date';
      date?: string; // YYYY-MM-DD (local)
      label?: string; // Optional human-friendly label for the date (e.g., "Friday" or "Sep 12")
    }
  ): string {
    const { location, current, forecast } = weatherData;

    const locStr = location.country && location.country.length > 0
      ? `${location.name}, ${location.country}`
      : location.name;

    const when = options?.when ?? 'current';

    // Historical (yesterday) not supported with current API
    if (when === 'yesterday') {
      return `Sorry, I can't access historical weather data. I can share the current conditions and the forecast for upcoming days in ${locStr}.`;
    }

    // Specific date handling
    if (when === 'date' || when === 'today' || when === 'tomorrow') {
      // Prefer index-based selection for today/tomorrow to avoid timezone mismatches
      if (when === 'today') {
        if (forecast && forecast.length > 0) {
          const f = forecast[0];
          const label = options?.label || 'today';
          return `Weather for ${locStr} ${label !== 'today' ? 'on ' + label : 'today'}: high of ${f.high}°C, low of ${f.low}°C with ${f.description}. Humidity around ${f.humidity}% and wind ${f.windSpeed} km/h.`;
        }
        return `I don't have today's forecast for ${locStr}. Currently it's ${current.temperature}°C with ${current.description}.`;
      }
      if (when === 'tomorrow') {
        if (forecast && forecast.length > 1) {
          const f = forecast[1];
          const label = options?.label || 'tomorrow';
          return `Weather for ${locStr} ${label !== 'tomorrow' ? 'on ' + label : 'tomorrow'}: high of ${f.high}°C, low of ${f.low}°C with ${f.description}. Humidity around ${f.humidity}% and wind ${f.windSpeed} km/h.`;
        }
        return `I don't have tomorrow's forecast for ${locStr}. Currently it's ${current.temperature}°C with ${current.description}.`;
      }

      // Explicit date selection
      const targetDateStr = options?.date;
      if (targetDateStr) {
        const dayForecast = this.findForecastForDate(forecast, targetDateStr);
        if (dayForecast) {
          const dateLabel = options?.label || targetDateStr;
          return `Weather for ${locStr} on ${dateLabel}: high of ${dayForecast.high}°C, low of ${dayForecast.low}°C with ${dayForecast.description}. Humidity around ${dayForecast.humidity}% and wind ${dayForecast.windSpeed} km/h.`;
        }
        // If forecast not available for that date, fall back with guidance
        return `I don't have a forecast for ${options?.label || targetDateStr}. I can provide forecasts for the next few days in ${locStr}. Currently it's ${current.temperature}°C with ${current.description}.`;
      }
    }

    // Default/current conditions only
    let summary = `The current weather in ${locStr} is ${current.temperature}°C with ${current.description}. `;
    summary += `It feels like ${current.feelsLike}°C. `;
    summary += `Humidity is ${current.humidity}% and wind speed is ${current.windSpeed} km/h.`;
    return summary;
  }

  /**
   * Test the weather service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getWeatherByCity('London');
      return true;
    } catch (error) {
      console.error('Weather service connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const weatherService = new WeatherService();
