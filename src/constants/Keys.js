// Read API keys dynamically from environment variables (.env file)
const rawGeminiKeys = process.env.EXPO_PUBLIC_GEMINI_KEYS || '';

export const GEMINI_KEYS = rawGeminiKeys
  ? rawGeminiKeys.split(',').map(k => k.trim()).filter(Boolean)
  : [];

export const API_KEYS = {
  GEMINI_KEYS,
  GEMINI: GEMINI_KEYS[0] || '',
};
