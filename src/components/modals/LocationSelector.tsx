import React, { useState, useEffect, useRef } from 'react';
import { X, Search, MapPin, RefreshCw } from 'lucide-react';
import { useModal } from '../../context/ModalContext';
import logger from '../../utils/logger';

interface LocationSelectorProps {
  onSelect: (location: { address: string; lat: number; lng: number }) => void;
  onClose: () => void;
}

// Declare Leaflet global types
declare global {
  interface Window {
    L: any;
  }
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onSelect, onClose }) => {
  const { getZIndex } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);

  // Initialize OpenStreetMap with Leaflet
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current) {
        logger.warn('Map container not ready');
        return;
      }

      // Check if map is already initialized to prevent duplicates
      if (mapInstance.current) {
        logger.debug('Map already initialized, skipping');
        return;
      }

      if (window.L) {
        setIsMapLoading(true);
        setMapError(null);
        
        try {
          // Small delay to ensure DOM is fully ready
          setTimeout(() => {
            if (!mapRef.current) return;

            // Check if container already has a map
            const container = mapRef.current;
            if (container._leaflet_id) {
              logger.debug('Removing existing Leaflet instance');
              container._leaflet_id = null;
              container.innerHTML = '';
            }

            // Create Leaflet map
            const map = window.L.map(mapRef.current, {
              center: [39.8283, -98.5795],
              zoom: 4,
              zoomControl: true,
              scrollWheelZoom: true
            });
            
            // Add OpenStreetMap tiles
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19,
              subdomains: ['a', 'b', 'c']
            }).addTo(map);

            mapInstance.current = map;
            setIsMapLoading(false);

            // Add click listener to map
            map.on('click', async (e: any) => {
              const lat = e.latlng.lat;
              const lng = e.latlng.lng;
              
              // Reverse geocode to get address using OpenStreetMap Nominatim
              try {
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
                );
                const data = await response.json();
                
                if (data && data.display_name) {
                  const location = {
                    address: data.display_name,
                    lat,
                    lng
                  };
                  setSelectedLocation(location);
                  updateMarker(lat, lng);
                }
              } catch (error) {
                logger.error('Reverse geocoding failed:', error);
              }
            });
          }, 100); // Small delay for DOM readiness
        } catch (error) {
          logger.error('Failed to initialize map:', error);
          setMapError('Failed to initialize map');
          setIsMapLoading(false);
        }
      } else {
        setMapError('Map library not available');
        setIsMapLoading(false);
      }
    };

    // Load Leaflet CSS and JS
    const loadLeaflet = () => {
      // Check if Leaflet is already loaded
      if (window.L) {
        initMap();
        return;
      }

      // Check if we're already loading to prevent duplicate script tags
      const existingScript = document.querySelector('script[src*="leaflet"]');
      if (existingScript) {
        // If script exists but L is not available, wait and retry
        let retries = 0;
        const checkInterval = setInterval(() => {
          retries++;
          if (window.L) {
            clearInterval(checkInterval);
            initMap();
          } else if (retries > 10) { // 5 seconds timeout
            clearInterval(checkInterval);
            setMapError('Failed to load map library');
            setIsMapLoading(false);
          }
        }, 500);
        return;
      }

      setIsMapLoading(true);
      
      // Load Leaflet CSS (remove integrity to prevent CORS issues)
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);

      // Load Leaflet JS (remove integrity to prevent CORS issues)
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        logger.info('Leaflet library loaded successfully');
        initMap();
      };
      script.onerror = () => {
        logger.error('Failed to load Leaflet library');
        setMapError('Failed to load map library');
        setIsMapLoading(false);
      };
      document.head.appendChild(script);
    };

    loadLeaflet();

    // Cleanup function
    return () => {
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
          mapInstance.current = null;
        } catch (error) {
          logger.error('Error cleaning up map:', error);
        }
      }
      if (markerInstance.current) {
        markerInstance.current = null;
      }
    };
  }, []);

  // Update marker on map
  const updateMarker = (lat: number, lng: number) => {
    if (mapInstance.current && window.L) {
      // Remove existing marker
      if (markerInstance.current) {
        mapInstance.current.removeLayer(markerInstance.current);
      }

      // Add new marker
      const marker = window.L.marker([lat, lng]).addTo(mapInstance.current);
      marker.bindPopup('Selected Location').openPopup();
      markerInstance.current = marker;

      // Center map on marker
      mapInstance.current.setView([lat, lng], 15);
    }
  };

  // Search for locations using OpenStreetMap Nominatim
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=5&addressdetails=1`
      );
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      logger.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search result selection
  const handleResultSelect = (result: any) => {
    const location = {
      address: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };
    
    setSelectedLocation(location);
    updateMarker(location.lat, location.lng);
    setSearchResults([]);
    setSearchTerm('');
  };

  // Handle form submission
  const handleSubmit = () => {
    if (selectedLocation) {
      onSelect(selectedLocation);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Select Job Location</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Search Panel */}
          <div className="w-1/3 border-r flex flex-col">
            <div className="p-4 border-b">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for an address or place..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              </div>
              <button
                onClick={handleSearch}
                disabled={isLoading || !searchTerm.trim()}
                className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Search Results</h3>
              {searchResults.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'No results found. Try a different search term.' : 'Enter a location to search'}
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleResultSelect(result)}
                      className="w-full p-3 text-left border rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start">
                        <MapPin size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{result.name || result.display_name?.split(',')[0]}</div>
                          <div className="text-xs text-gray-600 mt-1">{result.display_name}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Selected Location */}
            {selectedLocation && (
              <div className="p-4 border-t bg-green-50">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Location</h3>
                <div className="flex items-start">
                  <MapPin size={16} className="text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{selectedLocation.address}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Map Panel */}
          <div className="flex-1 relative">
            {isMapLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-600">Loading map...</p>
                </div>
              </div>
            ) : mapError ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center p-8">
                  <div className="text-red-500 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Map Not Available</h3>
                  <p className="text-gray-600 mb-4">{mapError}</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-left">
                    <p className="text-sm text-blue-800">
                      <strong>Map powered by:</strong>
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      OpenStreetMap - Free and open-source map data
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      If the map fails to load, please check your internet connection and try refreshing.
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Refresh Page
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div ref={mapRef} className="w-full h-full" />
                <div className="absolute top-4 left-4 bg-white p-2 rounded-md shadow-md text-sm text-gray-600">
                  Click on the map to select a location
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedLocation}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;