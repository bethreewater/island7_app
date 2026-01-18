/**
 * Geocoding Service - 地址轉經緯度服務
 * 使用台灣政府內政部 TGOS API (完全免費、高準確度)
 * 備援：OpenStreetMap Nominatim API
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

/**
 * 使用 TGOS (台灣政府內政部) API 進行地址轉經緯度
 * 支援完整門牌號碼，準確度極高
 * 
 * @param address - 台灣地址（例：新北市中和區建八路120號）
 * @returns GeocodingResult 或 null
 */
const geocodeWithTGOS = async (address: string): Promise<GeocodingResult | null> => {
    try {
        // TGOS API 端點（免費、無需註冊）
        const url = `https://addr.tgos.tw/addrdb/api/addr_single_query.json`;

        const params = new URLSearchParams({
            addrstr: address,
            epsg: '4326', // WGS84 座標系統
            format: 'json'
        });

        console.log('🗺️ TGOS Geocoding:', address);

        const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`TGOS API 錯誤: ${response.status}`);
        }

        const data = await response.json();

        // 檢查回應狀態
        if (data.resmsg !== 'Success' || !data.QueryRes || !data.QueryRes.WGS84) {
            console.warn('TGOS 找不到該地址');
            return null;
        }

        const coords = data.QueryRes.WGS84.split(',');

        if (coords.length !== 2) {
            throw new Error('TGOS 回傳座標格式錯誤');
        }

        return {
            latitude: parseFloat(coords[1]), // TGOS 回傳格式：經度,緯度
            longitude: parseFloat(coords[0]),
            displayName: data.QueryRes.ADDR || address,
            address: {
                city: data.QueryRes.COUNTY,
                district: data.QueryRes.TOWN,
                road: data.QueryRes.ROAD
            }
        };

    } catch (error) {
        console.error('TGOS Geocoding 錯誤:', error);
        return null;
    }
};

/**
 * 備援：OpenStreetMap Nominatim API
 * 當 TGOS 失敗時使用
 * 加強版：使用漸進式降級策略提高成功率
 */
const geocodeWithNominatim = async (address: string): Promise<GeocodingResult | null> => {
    try {
        // 清理地址
        const cleanAddr = address.trim();

        // 策略 1: 嘗試完整地址
        console.log('📍 Nominatim 策略 1: 完整地址');
        let result = await tryNominatimQuery(cleanAddr);
        if (result) return result;

        // 策略 2: 移除門牌號碼，保留街道名稱
        const withoutNumber = cleanAddr.replace(/\d+號?/g, '').trim();
        if (withoutNumber !== cleanAddr && withoutNumber.length > 5) {
            console.log('📍 Nominatim 策略 2: 移除門牌號碼');
            result = await tryNominatimQuery(withoutNumber);
            if (result) return result;
        }

        // 策略 3: 只保留區域和主要道路
        const districtMatch = cleanAddr.match(/([\u4e00-\u9fa5]+[市區鎮鄉])/);
        const roadMatch = cleanAddr.match(/([\u4e00-\u9fa5]+[路街道巷弄])/);
        if (districtMatch && roadMatch) {
            const simplified = `${districtMatch[0]}${roadMatch[0]}`;
            console.log('📍 Nominatim 策略 3: 區域+道路:', simplified);
            result = await tryNominatimQuery(simplified);
            if (result) return result;
        }

        console.warn('❌ Nominatim 所有策略都失敗');
        return null;

    } catch (error) {
        console.error('Nominatim Geocoding 錯誤:', error);
        return null;
    }
};

/**
 * 執行單次 Nominatim 查詢
 */
const tryNominatimQuery = async (address: string): Promise<GeocodingResult | null> => {
    try {
        const searchQuery = address.includes('台灣') || address.includes('Taiwan')
            ? address
            : `${address}, Taiwan`;

        const url = `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(searchQuery)}` +
            `&format=json` +
            `&limit=1` +
            `&accept-language=zh-TW`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Island7-Construction-Management-System/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim API 錯誤: ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            return null;
        }

        const result = data[0];

        console.log('✓ Nominatim 找到結果:', result.display_name);

        return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            displayName: result.display_name,
            address: {
                city: result.address?.city || result.address?.county,
                district: result.address?.suburb || result.address?.town,
                road: result.address?.road
            }
        };

    } catch (error) {
        console.error('Nominatim 查詢錯誤:', error);
        return null;
    }
};

/**
 * 主要 Geocoding 函數
 * 優先使用 TGOS (台灣政府)，失敗時備援 Nominatim
 * 
 * @param address - 地址字串
 * @returns GeocodingResult 或 null
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
    try {
        // 清理地址
        const cleanAddress = address.trim();

        if (!cleanAddress || cleanAddress.length < 5) {
            console.warn('地址太短，無法進行 geocoding');
            return null;
        }

        // 【暫時停用 TGOS】因為瀏覽器 CORS 限制
        // TGOS 需要透過後端代理才能使用（未來可用 Supabase Edge Functions）
        // 目前直接使用 OpenStreetMap Nominatim（已修復 URL typo）

        console.log('🌍 使用 OpenStreetMap Nominatim API...');
        const nominatimResult = await geocodeWithNominatim(cleanAddress);

        if (nominatimResult) {
            console.log('✅ Nominatim 成功！座標:', nominatimResult.latitude, nominatimResult.longitude);
            return nominatimResult;
        }

        console.warn('❌ Geocoding 失敗');
        return null;

    } catch (error) {
        console.error('Geocoding 錯誤:', error);
        return null;
    }
};

/**
 * 批次處理多個地址的 geocoding
 * 自動加入延遲以符合 API 限制
 */
export const batchGeocodeAddresses = async (
    addresses: string[]
): Promise<Map<string, GeocodingResult | null>> => {
    const results = new Map<string, GeocodingResult | null>();

    for (const address of addresses) {
        const result = await geocodeAddress(address);
        results.set(address, result);

        // 等待 0.5 秒避免過度請求
        if (addresses.indexOf(address) < addresses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
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
