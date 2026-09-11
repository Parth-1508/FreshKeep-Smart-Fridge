import { API_KEYS, GEMINI_KEYS } from '../constants/Keys';

// Upgraded model target
export const DEFAULT_MODEL = 'gemini-3.6-flash';

let currentKeyIndex = 0;

/**
 * Core centralized helper to call the Gemini API using structured JSON output.
 * Automatically loops through all available burner API keys on quota/rate limit/key errors.
 *
 * @param {Object} params
 * @param {Array} params.contents - The standard Gemini contents array.
 * @param {Object} [params.generationConfig] - Generation options including responseMimeType & responseSchema.
 * @param {string} [params.model] - Optional model override.
 * @returns {Promise<Object|string>} Parsed JSON response object or raw text.
 */
export async function callGeminiApi({ contents, generationConfig, model = DEFAULT_MODEL }) {
  const keys = GEMINI_KEYS && GEMINI_KEYS.length > 0 ? GEMINI_KEYS : [API_KEYS.GEMINI];
  let lastError = null;

  // Try each burner key starting from currentKeyIndex in a full loop
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIndex = (currentKeyIndex + attempt) % keys.length;
    const apiKey = keys[keyIndex];

    if (!apiKey) continue;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents,
      ...(generationConfig ? { generationConfig } : {}),
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ Gemini API Key #${keyIndex + 1} returned status ${response.status}:`, errorText);

        // If rate limited, quota exceeded, or bad request, record error and loop to next burner key
        lastError = new Error(`Gemini API key #${keyIndex + 1} failed (${response.status}): ${errorText}`);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        lastError = new Error('No content returned from Gemini API');
        continue;
      }

      // Successful call: move index to next key for round-robin load distribution
      currentKeyIndex = (keyIndex + 1) % keys.length;

      if (generationConfig?.responseMimeType === 'application/json') {
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.warn('⚠️ JSON direct parse warning, cleaning Markdown fallback:', parseError);
          const cleaned = text.replace(/```json|```/g, '').trim();
          return JSON.parse(cleaned);
        }
      }

      return text;
    } catch (err) {
      console.warn(`⚠️ Gemini API call attempt #${keyIndex + 1} threw error:`, err.message);
      lastError = err;
    }
  }

  console.error('🔴 All Gemini burner API keys in loop failed or exhausted.');
  throw lastError || new Error('All Gemini API keys failed');
}

/**
 * 1. Food Packaging Vision Analysis
 * Specialized prompt for Indian dot-matrix printed dates on foil/plastic packaging.
 */
export async function analyzeFoodPackaging(base64Image, mimeType = 'image/jpeg') {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are an expert food packaging analyzer specializing in reading printed and dot-matrix text on food packages (including Indian foil packaging, chips, paneer, milk packets, and snacks). Today's date is ${today}.

EXTRACT THE FOLLOWING:
1. Product Name: Extract the main product / brand name clearly.
2. Expiry Date (CRITICAL INSTRUCTIONS FOR INDIAN DOT-MATRIX DATES & SHELF LIFE):
   - Dot-matrix printed text on foil, milk sachets, paneer packets, or snack bags often shows manufacturing / packaging dates (e.g. PKD 12/03/26, MFG 12/03/2026, PACKED ON 15/01/26) along with shelf-life statements rather than an explicit expiry date.
   - Look for terms like: "PKD", "MFG", "PACKED ON", "MFG DATE", "USE BY", "BEST BEFORE", "EXP", "EXPIRY", "USE WITHIN X DAYS", "BEST BEFORE X MONTHS".
   - Examples & Calculation Rules:
     * "PKD 12/03/26" with "USE BY 15 DAYS FROM PKG" -> Calculate expiryDate = 2026-03-27.
     * "MFG 01/01/2026" with "BEST BEFORE 6 MONTHS" -> Calculate expiryDate = 2026-07-01.
     * "USE WITHIN 5 DAYS OF PACKAGING" -> Add 5 days to manufacturing date.
     * "EXP 15/04/26" or "BEST BEFORE 15/04/2026" -> Direct expiryDate = 2026-04-15.
   - Always calculate and return the FINAL expiry date in exact YYYY-MM-DD format.
   - If no manufacturing or expiry date can be extracted or calculated, return an empty string for expiryDate.
3. Category: Classify into one of these exact categories: "Milk", "Bread", "Fruits", "Vegetables", "Meat", "Dairy", "Eggs", "Snacks", "Cooked", "Other".`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING', description: 'Product or brand name' },
      expiryDate: { type: 'STRING', description: 'Calculated expiry date in YYYY-MM-DD format or empty string' },
      category: { type: 'STRING', description: 'Category label' },
    },
    required: ['name', 'category'],
  };

  return callGeminiApi({
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Image } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });
}

/**
 * 2. Smart Grocery Shopping List Generator
 */
export async function generateSmartShoppingList(inventoryItems = []) {
  const safeItems = Array.isArray(inventoryItems) ? inventoryItems : [];
  const inventoryText = safeItems.length > 0
    ? safeItems.map(i => i.name).join(', ')
    : 'Nothing';

  const prompt = `You are an AI Kitchen Manager. The user currently has these items in their fridge/kitchen: ${inventoryText}.
Suggest 5 common grocery staples they might be missing or need to buy next.`;

  const responseSchema = {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING' },
        category: { type: 'STRING' },
        emoji: { type: 'STRING' },
        reason: { type: 'STRING' },
      },
      required: ['name', 'category', 'emoji', 'reason'],
    },
  };

  return callGeminiApi({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });
}

/**
 * 3. AI Smart Recipe Suggestions
 */
export async function fetchAIRecipes(inventoryItems = []) {
  const safeItems = Array.isArray(inventoryItems) ? inventoryItems : [];
  const inventoryText = safeItems.length === 0
    ? 'The kitchen is empty.'
    : safeItems.map(i =>
        `- ${i.name} (${i.quantity || '1 unit'}), Status: ${i.status}, Days Left: ${i.daysLeft}`
      ).join('\n');

  const prompt = `You are the AI chef for FreshKeep. Analyze this kitchen inventory:
${inventoryText}

ASSUMPTIONS & PANTRY STAPLES:
- Universal household staples are ALWAYS AVAILABLE in the user's kitchen: salt, cooking oil/ghee, mustard seeds, turmeric, green chilies, water, sugar, and basic Indian spices.
- Do NOT treat missing salt, oil, or basic spices as missing ingredients when determining "canMake".

Suggest 4 practical recipes prioritizing zero-waste Indian household meals (e.g., expiring milk -> Kheer/Paneer/Kadhi, leftover bread -> Bread Upma/Toast, ripening tomatoes/curd -> Sabzi/Rasam/Raita).

Rules:
1. Priority: Use items where status is 'urgent' or 'expired'.
2. Field "canMake": Set to true if all main food ingredients are present in the inventory (ignoring basic kitchen staples).
3. Ingredients: List main food ingredients with "name" and "have" boolean indicating if the user has it. Set "have" to true for basic staples or items present in inventory.`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      recipes: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            emoji: { type: 'STRING' },
            time: { type: 'STRING' },
            urgencyNote: { type: 'STRING' },
            canMake: { type: 'BOOLEAN' },
            ingredients: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  have: { type: 'BOOLEAN' },
                },
                required: ['name', 'have'],
              },
            },
            steps: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['name', 'emoji', 'time', 'urgencyNote', 'canMake', 'ingredients', 'steps'],
        },
      },
    },
    required: ['recipes'],
  };

  const data = await callGeminiApi({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  return data.recipes || [];
}

/**
 * 4. Kira Voice Assistant Command Processor
 */
export async function processVoiceCommand(base64Audio, inventoryItems = [], recentMessages = [], mimeType = 'audio/m4a') {
  const safeInventory = Array.isArray(inventoryItems) ? inventoryItems : [];
  const inventoryText = safeInventory.map(i => `${i.name} (${i.daysLeft} days left)`).join(', ');

  const historyText = Array.isArray(recentMessages)
    ? recentMessages.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')
    : '';

  const prompt = `You are Kira, a smart kitchen assistant. Listen to the attached audio command.
The user currently has these items in their kitchen: ${inventoryText || 'Nothing'}.

RECENT CONVERSATION HISTORY (Context for your reply):
${historyText}

CRITICAL RULES:
1. If the user wants to add an item BUT DOES NOT specify an expiry date or timeframe, set the "intent" to "clarification", do NOT return an action object, and ask them when it expires in your "reply".
2. Only set the intent to "add_item" when you know BOTH the item name and when it expires.
3. Make sure the emoji logically matches the food item!`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      transcript: { type: 'STRING', description: 'What you heard the user say' },
      reply: { type: 'STRING', description: 'Short, friendly conversational reply' },
      intent: {
        type: 'STRING',
        enum: ['add_item', 'remove_item', 'clarification', 'list_expiring', 'recipe_suggest', 'greeting', 'unknown'],
      },
      action: {
        type: 'OBJECT',
        nullable: true,
        properties: {
          name: { type: 'STRING' },
          category: { type: 'STRING' },
          emoji: { type: 'STRING' },
          daysLeft: { type: 'INTEGER' },
          quantity: { type: 'STRING' },
        },
      },
    },
    required: ['transcript', 'reply', 'intent'],
  };

  return callGeminiApi({
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Audio } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });
}

/**
 * 5. Kira Text Assistant Chat Processor
 */
export async function processTextAssistantMessage(userText, inventoryItems = [], recentMessages = []) {
  const safeInventory = Array.isArray(inventoryItems) ? inventoryItems : [];
  const inventoryText = safeInventory.map(i => `${i.name} (${i.daysLeft} days left)`).join(', ');

  const historyText = Array.isArray(recentMessages)
    ? recentMessages.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')
    : '';

  const prompt = `You are Kira, a smart kitchen assistant.
Kitchen Inventory: ${inventoryText || 'Empty'}

RECENT CONVERSATION HISTORY:
${historyText}

User's new message: "${userText}"

RULES:
1. If adding an item without an expiry date, ask when it expires (intent: 'clarification').
2. Only set intent to 'add_item' when you know BOTH the item name and when it expires.`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      reply: { type: 'STRING', description: 'Short, friendly conversational reply' },
      intent: {
        type: 'STRING',
        enum: ['add_item', 'remove_item', 'clarification', 'list_expiring', 'recipe_suggest', 'greeting', 'unknown'],
      },
      action: {
        type: 'OBJECT',
        nullable: true,
        properties: {
          name: { type: 'STRING' },
          category: { type: 'STRING' },
          emoji: { type: 'STRING' },
          daysLeft: { type: 'INTEGER' },
          quantity: { type: 'STRING' },
        },
      },
    },
    required: ['reply', 'intent'],
  };

  return callGeminiApi({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });
}

/**
 * 6. Batch Grocery Receipt / Invoice Parser
 * Reads a photographed or uploaded receipt (quick-commerce apps like Blinkit,
 * Zepto, Instamart, or a supermarket slip) and extracts every food line item
 * so it can be reviewed and added to the inventory in one shot.
 */
export async function parseGroceryReceipt(base64Image, mimeType = 'image/jpeg') {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are an expert grocery receipt / invoice parser for Indian quick-commerce and supermarket purchases (Blinkit, Zepto, Instamart, Swiggy Instamart, BigBasket, DMart, and standard printed supermarket slips). Today's date is ${today}.

Read the attached receipt image (it may be a photo of a printed slip OR a screenshot of a digital order summary) and extract every purchased FOOD/GROCERY line item. Ignore delivery fees, platform/handling fees, discounts, coupons, taxes, totals, and any non-food line items.

For EACH item, return:
1. "name": A clean, human-readable product name (strip SKU codes and redundant pack-size boilerplate, but keep the brand if shown, e.g. "Amul Toned Milk" not "AMUL TND MLK 500ML SKU8213").
2. "category": Classify into EXACTLY one of these categories: "Milk", "Bread", "Fruits", "Vegetables", "Meat", "Dairy", "Eggs", "Snacks", "Cooked", "Other".
3. "estimatedShelfDays": A realistic whole number of days this item stays fresh counting from the purchase/delivery date, based on standard perishable-category norms. Use your best judgement per specific product. Typical reference points:
   - Leafy greens / fresh vegetables: 3-5 days
   - Milk / paneer / curd: 2-5 days
   - Bread / bakery: 4-6 days
   - Eggs: 20-25 days
   - Fresh meat / fish / chicken: 1-2 days
   - Fruits: 4-10 days depending on type
   - Packaged snacks, frozen food, staples: 60-180 days
4. "quantity": The purchased quantity or pack size exactly as printed (e.g. "1L", "500g", "6 pcs", "2 pack"). If illegible, use "1 unit".

Only include real grocery/food line items you can actually read. If the image is not a receipt, or no items can be confidently read, return an empty items array rather than guessing.`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      items: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            category: { type: 'STRING' },
            estimatedShelfDays: { type: 'NUMBER' },
            quantity: { type: 'STRING' },
          },
          required: ['name', 'category', 'estimatedShelfDays', 'quantity'],
        },
      },
    },
    required: ['items'],
  };

  const data = await callGeminiApi({
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Image } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  return data.items || [];
}
