/**
 * Geocoding Service - 地址轉經緯度
 * 1) 優先走後端代理（建議用 Supabase Edge Function）
 * 2) 代理不可用時 fallback 到 OpenStreetMap Nominatim
 * 3) 內建記憶體 + localStorage 快取，降低重複查詢與 API 壓力
 */

export interface GeocodingResult {
    latitude: number;
    longitude: number;
    displayName: string;
    address: {
        city?: string;
        district?: string;
        road?: string;
    };
}

interface CacheEntry {
    value: GeocodingResult | null;
    expiresAt: number;
}

const GEOCODE_PROXY_URL = import.meta.env.VITE_GEOCODE_PROXY_URL as string | undefined;
const NOMINATIM_CONTACT_EMAIL = import.meta.env.VITE_NOMINATIM_CONTACT_EMAIL as string | undefined;
const CACHE_PREFIX = 'island7:geocode:';
const HIT_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MISS_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const geocodeCache = new Map<string, CacheEntry>();

const normalizeAddressKey = (address: string): string =>
    address.trim().toLowerCase();

const getCachedResult = (key: string): { hit: boolean; value: GeocodingResult | null } => {
    const now = Date.now();
    const memoryEntry = geocodeCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > now) {
        return { hit: true, value: memoryEntry.value };
    }
    if (memoryEntry) {
        geocodeCache.delete(key);
    }

    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return { hit: false, value: null };

        const entry = JSON.parse(raw) as CacheEntry;
        if (entry.expiresAt <= now) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return { hit: false, value: null };
        }

        geocodeCache.set(key, entry);
        return { hit: true, value: entry.value };
    } catch {
        return { hit: false, value: null };
    }
};

const setCachedResult = (key: string, value: GeocodingResult | null) => {
    const entry: CacheEntry = {
        value,
        expiresAt: Date.now() + (value ? HIT_CACHE_TTL_MS : MISS_CACHE_TTL_MS),
    };
    geocodeCache.set(key, entry);
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
        // Ignore storage failures (private mode / quota exceeded)
    }
};

const toGeocodingResult = (input: any): GeocodingResult | null => {
    if (!input) return null;

    const latitude = Number(input.latitude ?? input.lat);
    const longitude = Number(input.longitude ?? input.lon ?? input.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return {
        latitude,
        longitude,
        displayName: input.displayName || input.display_name || input.address || '',
        address: {
            city: input.address?.city || input.address?.county,
            district: input.address?.district || input.address?.town || input.address?.suburb,
            road: input.address?.road,
        },
    };
};

const geocodeWithProxy = async (address: string): Promise<GeocodingResult | null> => {
    if (!GEOCODE_PROXY_URL) return null;

    const parseResponse = async (response: Response): Promise<GeocodingResult | null> => {
        if (!response.ok) return null;
        const data = await response.json();
        return toGeocodingResult(data?.result ?? data);
    };

    try {
        const postResponse = await fetch(GEOCODE_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
        });
        const postResult = await parseResponse(postResponse);
        if (postResult) return postResult;
    } catch {
        // Fallback to GET below
    }

    try {
        const url = `${GEOCODE_PROXY_URL}${GEOCODE_PROXY_URL.includes('?') ? '&' : '?'}address=${encodeURIComponent(address)}`;
        const getResponse = await fetch(url);
        return await parseResponse(getResponse);
    } catch {
        return null;
    }
};

const tryNominatimQuery = async (address: string): Promise<GeocodingResult | null> => {
    try {
        const searchQuery = address.includes('台灣') || address.includes('Taiwan')
            ? address
            : `${address}, Taiwan`;

        const url = `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(searchQuery)}` +
            `&format=json` +
            `&limit=1` +
            `&accept-language=zh-TW` +
            `&addressdetails=1` +
            (NOMINATIM_CONTACT_EMAIL ? `&email=${encodeURIComponent(NOMINATIM_CONTACT_EMAIL)}` : '');

        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) return null;

        return toGeocodingResult(data[0]);
    } catch {
        return null;
    }
};

const geocodeWithNominatim = async (address: string): Promise<GeocodingResult | null> => {
    const cleanAddress = address.trim();

    // Strategy 1: full address
    let result = await tryNominatimQuery(cleanAddress);
    if (result) return result;

    // Strategy 2: remove house number
    const withoutNumber = cleanAddress.replace(/\d+號?/g, '').trim();
    if (withoutNumber !== cleanAddress && withoutNumber.length > 5) {
        result = await tryNominatimQuery(withoutNumber);
        if (result) return result;
    }

    // Strategy 3: district + major road
    const districtMatch = cleanAddress.match(/([\u4e00-\u9fa5]+[市區鎮鄉])/);
    const roadMatch = cleanAddress.match(/([\u4e00-\u9fa5]+[路街道巷弄])/);
    if (districtMatch && roadMatch) {
        result = await tryNominatimQuery(`${districtMatch[0]}${roadMatch[0]}`);
    }

    return result;
};

/**
 * 主要 Geocoding 函數
 * 優先走後端代理，失敗時 fallback Nominatim，結果自動快取。
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
    const cleanAddress = address.trim();
    if (!cleanAddress || cleanAddress.length < 5) return null;

    const key = normalizeAddressKey(cleanAddress);
    const cached = getCachedResult(key);
    if (cached.hit) return cached.value;

    const proxyResult = await geocodeWithProxy(cleanAddress);
    if (proxyResult) {
        setCachedResult(key, proxyResult);
        return proxyResult;
    }

    const nominatimResult = await geocodeWithNominatim(cleanAddress);
    setCachedResult(key, nominatimResult);
    return nominatimResult;
};

/**
 * 批次地址 geocoding，串行執行避免超過外部 API 速率限制。
 */
export const batchGeocodeAddresses = async (
    addresses: string[]
): Promise<Map<string, GeocodingResult | null>> => {
    const results = new Map<string, GeocodingResult | null>();

    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const result = await geocodeAddress(address);
        results.set(address, result);

        if (i < addresses.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    return results;
};

/**
 * 驗證經緯度是否在台灣範圍內
 */
export const isInTaiwan = (latitude: number, longitude: number): boolean => {
    return (
        latitude >= 21.5 && latitude <= 25.5 &&
        longitude >= 119.5 && longitude <= 122.5
    );
};
