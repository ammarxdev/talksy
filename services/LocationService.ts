import * as Location from 'expo-location';
import { permissionManager } from './PermissionManager';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: {
    city?: string;
    region?: string;
    country?: string;
    formattedAddress?: string;
  };
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
}

export class LocationService {
  private lastKnownLocation: LocationData | null = null;
  private locationCache: Map<string, LocationData> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Request location permissions
   * This method should not be called directly - use the PermissionContext instead
   * @deprecated Use PermissionContext.requestPermission('location') instead
   */
  async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      // Use the new permission manager for consistent permission handling
      const result = await permissionManager.requestPermission('location');

      return {
        granted: result.granted,
        canAskAgain: result.canAskAgain,
        status: result.status === 'granted' ? Location.PermissionStatus.GRANTED : Location.PermissionStatus.DENIED,
      };
    } catch (error) {
      console.error('Failed to request location permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Location.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Check current location permission status
   */
  async checkPermissions(): Promise<LocationPermissionStatus> {
    try {
      // Use the new permission manager for consistent permission handling
      const result = await permissionManager.checkPermission('location');

      return {
        granted: result.granted,
        canAskAgain: result.canAskAgain,
        status: result.status === 'granted' ? Location.PermissionStatus.GRANTED : Location.PermissionStatus.DENIED,
      };
    } catch (error) {
      console.error('Failed to check location permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Location.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(useCache: boolean = true): Promise<LocationData> {
    try {
      // Check cache first if enabled
      if (useCache && this.lastKnownLocation) {
        const cacheKey = `${this.lastKnownLocation.latitude},${this.lastKnownLocation.longitude}`;
        const cachedLocation = this.locationCache.get(cacheKey);
        if (cachedLocation) {
          console.log('Using cached location');
          return cachedLocation;
        }
      }

      // Check permissions
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        // Try to request permissions
        const requestResult = await this.requestPermissions();
        if (!requestResult.granted) {
          throw new Error('Location permission is required to get weather for your current location');
        }
      }

      console.log('Getting current location...');

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, // 10 seconds timeout
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      };

      // Try to get address information
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });

        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          locationData.address = {
            city: address.city || address.subregion || undefined,
            region: address.region || undefined,
            country: address.country || undefined,
            formattedAddress: this.formatAddress(address),
          };
        }
      } catch (addressError) {
        console.warn('Failed to get address information:', addressError);
        // Continue without address info
      }

      // Cache the location
      this.lastKnownLocation = locationData;
      const cacheKey = `${locationData.latitude},${locationData.longitude}`;
      this.locationCache.set(cacheKey, locationData);

      // Clean up old cache entries
      setTimeout(() => {
        this.locationCache.delete(cacheKey);
      }, this.CACHE_DURATION);

      console.log('Location obtained:', locationData);
      return locationData;
    } catch (error) {
      console.error('Failed to get current location:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          throw new Error('Location permission denied. Please enable location access in your device settings to get weather for your current location.');
        } else if (error.message.includes('timeout') || error.message.includes('unavailable')) {
          throw new Error('Unable to get your current location. Please check your GPS settings and try again.');
        } else {
          throw new Error(`Location error: ${error.message}`);
        }
      } else {
        throw new Error('Failed to get current location. Please try again.');
      }
    }
  }

  /**
   * Get location by address/city name
   */
  async getLocationByAddress(address: string): Promise<LocationData> {
    try {
      console.log('Geocoding address:', address);

      const locations = await Location.geocodeAsync(address);
      
      if (!locations || locations.length === 0) {
        throw new Error(`Location "${address}" not found. Please check the spelling and try again.`);
      }

      const location = locations[0];
      const locationData: LocationData = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      // Try to get more detailed address information
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });

        if (addresses && addresses.length > 0) {
          const detailedAddress = addresses[0];
          locationData.address = {
            city: detailedAddress.city || detailedAddress.subregion || undefined,
            region: detailedAddress.region || undefined,
            country: detailedAddress.country || undefined,
            formattedAddress: this.formatAddress(detailedAddress),
          };
        }
      } catch (addressError) {
        console.warn('Failed to get detailed address information:', addressError);
        // Continue without detailed address info
      }

      console.log('Address geocoded:', locationData);
      return locationData;
    } catch (error) {
      console.error('Failed to geocode address:', error);
      throw new Error(`Failed to find location "${address}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format address object into a readable string
   */
  private formatAddress(address: Location.LocationGeocodedAddress): string {
    const parts: string[] = [];
    
    if (address.name) parts.push(address.name);
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.region) parts.push(address.region);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
  }

  /**
   * Get last known location (cached)
   */
  getLastKnownLocation(): LocationData | null {
    return this.lastKnownLocation;
  }

  /**
   * Clear location cache
   */
  clearCache(): void {
    this.locationCache.clear();
    this.lastKnownLocation = null;
  }

  /**
   * Check if location services are available
   */
  async isLocationServicesEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Failed to check location services:', error);
      return false;
    }
  }

  /**
   * Test the location service
   */
  async testService(): Promise<boolean> {
    try {
      const isEnabled = await this.isLocationServicesEnabled();
      if (!isEnabled) {
        return false;
      }

      const permissions = await this.checkPermissions();
      return permissions.granted;
    } catch (error) {
      console.error('Location service test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const locationService = new LocationService();
