import React, { useState, useEffect } from 'react';
import {
  INDONESIA_REGIONS,
  getDistrictsByCity,
  type RegionDistrict,
} from '../../data/indonesiaRegions';
import { ChevronDown } from 'lucide-react';

interface RegionSelectProps {
  city: string;
  district?: string;
  postalCode?: string;
  onCityChange: (city: string) => void;
  onDistrictChange?: (district: string) => void;
  onPostalCodeChange?: (postalCode: string) => void;
  showDistrict?: boolean;
  showPostalCode?: boolean;
  cityLabel?: string;
  districtLabel?: string;
  postalCodeLabel?: string;
  required?: boolean;
}

export const RegionSelect: React.FC<RegionSelectProps> = ({
  city,
  district = '',
  postalCode = '',
  onCityChange,
  onDistrictChange,
  onPostalCodeChange,
  showDistrict = true,
  showPostalCode = true,
  cityLabel = 'Kota / Kabupaten',
  districtLabel = 'Kecamatan',
  postalCodeLabel = 'Kode Pos',
  required = false,
}) => {
  const [districts, setDistricts] = useState<RegionDistrict[]>([]);
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [isCustomDistrict, setIsCustomDistrict] = useState(false);

  useEffect(() => {
    if (city) {
      const foundDistricts = getDistrictsByCity(city);
      setDistricts(foundDistricts);

      const cityExists = INDONESIA_REGIONS.some(
        (c) => c.name.toLowerCase() === city.toLowerCase()
      );
      setIsCustomCity(!cityExists && city !== '');
    } else {
      setDistricts([]);
    }
  }, [city]);

  const handleCitySelect = (selectedCity: string) => {
    if (selectedCity === '__custom__') {
      setIsCustomCity(true);
      onCityChange('');
      if (onDistrictChange) onDistrictChange('');
      if (onPostalCodeChange) onPostalCodeChange('');
    } else {
      setIsCustomCity(false);
      onCityChange(selectedCity);
      const found = getDistrictsByCity(selectedCity);
      setDistricts(found);

      // Reset district if current not in new city
      if (district && !found.some((d) => d.name.toLowerCase() === district.toLowerCase())) {
        if (onDistrictChange) onDistrictChange('');
        if (onPostalCodeChange) onPostalCodeChange('');
      }
    }
  };

  const handleDistrictSelect = (selectedDistrict: string) => {
    if (selectedDistrict === '__custom__') {
      setIsCustomDistrict(true);
      if (onDistrictChange) onDistrictChange('');
    } else {
      setIsCustomDistrict(false);
      if (onDistrictChange) onDistrictChange(selectedDistrict);

      const found = districts.find(
        (d) => d.name.toLowerCase() === selectedDistrict.toLowerCase()
      );
      if (found && onPostalCodeChange && (!postalCode || postalCode.length < 5)) {
        onPostalCodeChange(found.postal_code);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-1 ${showDistrict ? 'sm:grid-cols-2' : ''} gap-3`}>
        {/* Kota / Kabupaten Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              {cityLabel} {required && '*'}
            </label>
            <button
              type="button"
              onClick={() => setIsCustomCity(!isCustomCity)}
              className="text-[10px] text-amber-600 hover:text-amber-700 font-medium underline"
            >
              {isCustomCity ? 'Pilih dari List' : 'Ketik Manual'}
            </button>
          </div>

          {isCustomCity ? (
            <input
              type="text"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="Ketik nama kota / kabupaten..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
              required={required}
            />
          ) : (
            <div className="relative">
              <select
                value={city}
                onChange={(e) => handleCitySelect(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 font-medium cursor-pointer appearance-none"
                required={required}
              >
                <option value="">-- Pilih Kota / Kabupaten --</option>
                {INDONESIA_REGIONS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.province})
                  </option>
                ))}
                <option value="__custom__">✍️ Ketik Kota Lainnya...</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Kecamatan Selector */}
        {showDistrict && onDistrictChange && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {districtLabel}
              </label>
              {districts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCustomDistrict(!isCustomDistrict)}
                  className="text-[10px] text-amber-600 hover:text-amber-700 font-medium underline"
                >
                  {isCustomDistrict ? 'Pilih dari List' : 'Ketik Manual'}
                </button>
              )}
            </div>

            {isCustomDistrict || districts.length === 0 ? (
              <input
                type="text"
                value={district}
                onChange={(e) => onDistrictChange(e.target.value)}
                placeholder={
                  city ? 'Ketik nama kecamatan...' : 'Pilih kota terlebih dahulu'
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
              />
            ) : (
              <div className="relative">
                <select
                  value={district}
                  onChange={(e) => handleDistrictSelect(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 font-medium cursor-pointer appearance-none"
                >
                  <option value="">-- Pilih Kecamatan --</option>
                  {districts.map((d) => (
                    <option key={d.name} value={d.name}>
                      Kec. {d.name} (Kode Pos: {d.postal_code})
                    </option>
                  ))}
                  <option value="__custom__">✍️ Ketik Kecamatan Lainnya...</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kode Pos */}
      {showPostalCode && onPostalCodeChange && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {postalCodeLabel}
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => onPostalCodeChange(e.target.value)}
            placeholder="12110"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 font-mono"
            maxLength={6}
          />
        </div>
      )}
    </div>
  );
};
