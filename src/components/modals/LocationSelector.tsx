import React, { useState, useEffect, useRef } from 'react';
import { X, Search, MapPin } from 'lucide-react';
import { useModal } from '../../context/ModalContext';
import logger from '../../utils/logger';

interface LocationSelectorProps {
  onSelect: (location: { address: string; lat: number; lng: number }) => void;
  onClose: () => void;
}

// Get Google Maps API key from environment variables
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const LocationSelector: React.FC<LocationSelectorProps> = ({ onSelect, onClose }) => {
  const { getZIndex } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      if (mapRef.current && window.google) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 39.8283, lng: -98.5795 }, // Center of US
          zoom: 4,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstance.current = map;

        // Add click listener to map
        map.addListener('click', (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          
          // Reverse geocode to get address
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              const location = {
                address: results[0].formatted_address,
                lat,
                lng
              };
              setSelectedLocation(location);
              updateMarker(lat, lng);
            }
          });
        });
      }
    };

    // Check if Google Maps script already exists in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    
    // Load Google Maps script if not already loaded and not already in DOM
    if (!window.google && !existingScript && GOOGLE_MAPS_API_KEY) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.onload = initMap;
      script.onerror = () => {
        logger.error('Failed to load Google Maps API');
      };
      document.head.appendChild(script);
    } else if (!GOOGLE_MAPS_API_KEY) {
      logger.warn('Google Maps API key not found in environment variables');
    } else {
      initMap();
    }
  }, []);

  // Update marker on map
  const updateMarker = (lat: number, lng: number) => {
    if (mapInstance.current) {
      // Remove existing marker
      if (markerInstance.current) {
        markerInstance.current.setMap(null);
      }

      // Add new marker
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstance.current,
        title: 'Selected Location'
      });

      markerInstance.current = marker;

      // Center map on marker
      mapInstance.current.setCenter({ lat, lng });
      mapInstance.current.setZoom(15);
    }
  };

  // Search for locations
  const handleSearch = async () => {
    if (!searchTerm.trim() || !window.google) return;

    setIsLoading(true);
    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    
    const request = {
      query: searchTerm,
      fields: ['name', 'geometry', 'formatted_address']
    };

    service.textSearch(request, (results: any, status: any) => {
      setIsLoading(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setSearchResults(results.slice(0, 5)); // Show top 5 results
      } else {
        setSearchResults([]);
      }
    });
  };

  // Handle search result selection
  const handleResultSelect = (result: any) => {
    const location = {
      address: result.formatted_address,
      lat: result.geometry.location.lat(),
      lng: result.geometry.location.lng()
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
                          <div className="font-medium text-sm">{result.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{result.formatted_address}</div>
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
            <div ref={mapRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 bg-white p-2 rounded-md shadow-md text-sm text-gray-600">
              Click on the map to select a location
            </div>
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