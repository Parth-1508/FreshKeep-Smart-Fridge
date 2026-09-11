import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInCalendarDays, isToday, isYesterday, format } from 'date-fns';

// 🔥 FIREBASE IMPORTS (Both Firestore for App & RTDB for Magnet)
import { db, rtdb } from '../../firebase'; 
import { doc, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { ref, set } from 'firebase/database'; // <-- Proper Web SDK for Expo Go

const InvCtx = createContext();
export const useInventory = () => useContext(InvCtx);

// ── 🌱 ENVIRONMENTAL / MONETARY SAVINGS LEDGER ──────────────────────────────
// Persisted key for the lifetime impact stats (separate from the current
// inventory snapshot, since this is a running historical total).
const IMPACT_STATS_KEY = '@freshkeep_impact_stats';
const PROFILE_ID_KEY   = 'profileId';

const DEFAULT_IMPACT_STATS = {
  totalRupeesSaved:  0,
  totalCO2Prevented: 0,
  totalItemsRescued: 0,
};

// Average retail price (₹) assumed "saved" per rescued item, by category.
const MONETARY_VALUE_BY_CATEGORY = {
  Milk:       60,
  Bread:      45,
  Eggs:       80,
  Vegetables: 50,
  Meat:       250,
  Other:      50,
};

// Typical weight (kg) of a single rescued item, by category — used to
// estimate the food waste (and therefore CO2) that was avoided.
const WASTE_WEIGHT_KG_BY_CATEGORY = {
  Milk:       1.0,
  Bread:      0.4,
  Vegetables: 0.5,
  Meat:       0.5,
  Other:      0.3,
};

// ~1.9 kg of CO2-equivalent is prevented per kg of food waste avoided
// (standard food-waste carbon-footprint approximation).
const CO2_KG_PER_KG_FOOD = 1.9;

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Computes the ₹ and CO2 impact of rescuing a single item. Falls back to the
// "Other" rates for any category not explicitly listed above (including
// user-created custom categories).
function computeImpact(item) {
  const category = item?.category || 'Other';
  const rupees   = MONETARY_VALUE_BY_CATEGORY[category] ?? MONETARY_VALUE_BY_CATEGORY.Other;
  const weightKg = WASTE_WEIGHT_KG_BY_CATEGORY[category] ?? WASTE_WEIGHT_KG_BY_CATEGORY.Other;
  const co2      = weightKg * CO2_KG_PER_KG_FOOD;
  return { rupees, co2 };
}

// There's no Firebase Auth sign-in flow wired up in this app yet (login just
// stores a local display name) — so we mint and persist a stable anonymous
// profile id the first time it's needed, and use that as the Firestore
// `users` document id to sync lifetime impact stats to.
async function getOrCreateProfileId() {
  let id = await AsyncStorage.getItem(PROFILE_ID_KEY);
  if (!id) {
    id = 'user_' + Date.now().toString() + Math.random().toString(36).slice(2);
    await AsyncStorage.setItem(PROFILE_ID_KEY, id);
  }
  return id;
}
// ─────────────────────────────────────────────────────────────────────────

function enrich(rawItems) {
  const now = new Date();
  return rawItems.map(item => {
    const expiry   = new Date(item.expiryDate);
    const daysLeft = differenceInCalendarDays(expiry, now);
    const status   = daysLeft <= 0 ? 'expired'
                   : daysLeft <= 1 ? 'urgent'
                   : daysLeft <= 3 ? 'warning'
                   : 'fresh';
    return { ...item, daysLeft, status };
  });
}

function computeNewStreak(currentStreak, lastSaveDate) {
  if (!lastSaveDate) return 1; 
  const last = new Date(lastSaveDate);
  if (isToday(last)) return currentStreak;
  if (isYesterday(last)) return currentStreak + 1;
  return 1;
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function InventoryProvider({ children }) {
  const [items,        setItems]        = useState([]);
  const [points,       setPoints]       = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [lastSaveDate, setLastSaveDate] = useState(null);
  const [loaded,       setLoaded]       = useState(false);
  const [userName,     setUserName]     = useState('');
  const [impactStats,  setImpactStats]  = useState(DEFAULT_IMPACT_STATS);

  useEffect(() => {
    async function load() {
      try {
        const [
          rawItems, rawPoints, rawStreak,
          rawLastSave, rawUser, rawImpact,
        ] = await Promise.all([
          AsyncStorage.getItem('inventory'),
          AsyncStorage.getItem('points'),
          AsyncStorage.getItem('streak'),
          AsyncStorage.getItem('lastSaveDate'),
          AsyncStorage.getItem('userName'),
          AsyncStorage.getItem(IMPACT_STATS_KEY),
        ]);

        const parsedItems = rawItems ? enrich(JSON.parse(rawItems)) : [];
        let activeStreak = rawStreak ? parseInt(rawStreak) : 0;
        const parsedPoints = rawPoints ? parseInt(rawPoints) : 0;
        const parsedImpact = rawImpact
          ? { ...DEFAULT_IMPACT_STATS, ...JSON.parse(rawImpact) }
          : DEFAULT_IMPACT_STATS;

        if (rawLastSave) {
          if (differenceInCalendarDays(new Date(), new Date(rawLastSave)) >= 2) {
            activeStreak = 0;
            await AsyncStorage.setItem('streak', '0');
          }
        }

        const expiredItems = parsedItems.filter(i => i.daysLeft <= 0);
        if (expiredItems.length > 0 && activeStreak > 0) {
          activeStreak = 0;
          await AsyncStorage.setItem('streak', '0');
        }

        setItems(parsedItems);
        setPoints(parsedPoints);
        setStreak(activeStreak);
        setLastSaveDate(rawLastSave || null);
        setUserName(rawUser || '');
        setImpactStats(parsedImpact);
      } catch (e) {
        console.warn('InventoryContext load error:', e);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem('inventory', JSON.stringify(items));
  }, [items, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem('points', String(points));
    AsyncStorage.setItem('streak', String(streak));
  }, [points, streak, loaded]);

  // ── 🌱 Persist + sync the impact ledger whenever it changes ──────────────
  const syncImpactToFirestore = useCallback(async (stats) => {
    try {
      const profileId = await getOrCreateProfileId();
      await setDoc(doc(db, 'users', profileId), cleanFirestoreData({
        ...stats,
        userName,
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    } catch (e) {
      console.error('Firebase Impact Sync Error:', e);
    }
  }, [userName]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(IMPACT_STATS_KEY, JSON.stringify(impactStats));
    syncImpactToFirestore(impactStats);
  }, [impactStats, loaded, syncImpactToFirestore]);

  // ── 🐛 BUG FIX: STRICT 1-PER-DAY STREAK COUNTER ────────────────────────
  const recordSaveAction = useCallback(async () => {
    const today = todayStr();

    setLastSaveDate(prevDate => {
      // If the last save wasn't today, it's a new day! We can add to the streak.
      if (prevDate !== today) {
        setStreak(prevStreak => {
          const newStreak = computeNewStreak(prevStreak, prevDate);
          AsyncStorage.setItem('streak', String(newStreak));
          return newStreak;
        });
        
        // Lock in today's date so any further rapid swipes today are ignored
        AsyncStorage.setItem('lastSaveDate', today);
        return today;
      }
      
      // If it IS today, they already got their point. Do nothing!
      return prevDate;
    });
  }, []); // Empty dependency array means this function never stales out

  // ── 🧲 HARDWARE MAGNET SYNC ─────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;

    const syncMagnet = async () => {
      try {
        const validItems = items.filter(i => i.daysLeft >= 0);
        
        if (validItems.length > 0) {
          const urgentItem = validItems.sort((a, b) => a.daysLeft - b.daysLeft)[0];

          await set(ref(rtdb, '/fridge/urgentItem'), {
            name: urgentItem.name,
            emoji: urgentItem.emoji || '⚠️',
            daysLeft: urgentItem.daysLeft,
          });
          console.log('🧲 Synced with Hardware Magnet:', urgentItem.name);
        } else {
          await set(ref(rtdb, '/fridge/urgentItem'), {
            name: "All Fresh!",
            emoji: "✨",
            daysLeft: 99
          });
        }
      } catch (error) {
        console.error("Magnet Sync Error:", error);
      }
    };

    syncMagnet();
  }, [items, loaded]);

  // ── 🔥 CLOUD SYNCED CRUD OPERATIONS ───────────────────────────────────────

function cleanFirestoreData(data) {
  const cleaned = {};
  Object.keys(data).forEach(key => {
    cleaned[key] = data[key] === undefined ? null : data[key];
  });
  return cleaned;
}

  const addItem = useCallback(async (item) => {
    const newItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
    };
    setItems(prev => enrich([...prev, newItem]));
    setPoints(p => p + 5); 

    try {
      await setDoc(doc(db, 'inventory', newItem.id), cleanFirestoreData(newItem));
    } catch(e) { console.error("Firebase Add Error:", e); }
  }, []);

  // ── 🧾 BATCH RECEIPT SCANNING: commit many parsed items in one shot ──────
  const addBatchItems = useCallback(async (itemsArray) => {
    const safeItems = Array.isArray(itemsArray) ? itemsArray : [];
    if (safeItems.length === 0) return;

    const baseTime = Date.now();
    const newItems = safeItems.map((item, idx) => ({
      category: 'Other',
      quantity: null,
      ...item,
      id: (baseTime + idx).toString() + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
    }));

    setItems(prev => enrich([...prev, ...newItems]));
    setPoints(p => p + newItems.length * 5);

    try {
      const batch = writeBatch(db);
      newItems.forEach(item => {
        batch.set(doc(db, 'inventory', item.id), cleanFirestoreData(item));
      });
      await batch.commit();
    } catch (e) {
      console.error("Firebase Batch Add Error:", e);
    }

    return newItems;
  }, []);

  const markUsed = useCallback(async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    setItems(prev => prev.filter(i => i.id !== id));
    const bonus = item.status === 'urgent' ? 20 : item.status === 'warning' ? 15 : 10;
    setPoints(p => p + bonus);

    // ── 🌱 Log the ₹ / CO2 impact of rescuing this item before it went to waste ──
    const { rupees, co2 } = computeImpact(item);
    setImpactStats(prev => ({
      totalRupeesSaved:  round2(prev.totalRupeesSaved + rupees),
      totalCO2Prevented: round2(prev.totalCO2Prevented + co2),
      totalItemsRescued: prev.totalItemsRescued + 1,
    }));

    // Calls our newly fixed daily streak function
    await recordSaveAction();

    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch(e) { console.error("Firebase Delete Error:", e); }
  }, [items, recordSaveAction]);

  const removeItem = useCallback(async (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch(e) { console.error("Firebase Delete Error:", e); }
  }, []);

  const updateItem = useCallback(async (id, changes) => {
    setItems(prev => enrich(prev.map(i => i.id === id ? { ...i, ...changes } : i)));
    
    try {
      await updateDoc(doc(db, 'inventory', id), cleanFirestoreData(changes));
    } catch(e) { console.error("Firebase Update Error:", e); }
  }, []);

  // ── 🎁 REWARDS & COUPON MARKETPLACE REDEMPTION ───────────────────────────
  const redeemReward = useCallback(async (costInPoints) => {
    const cost = Number(costInPoints) || 0;
    if (points < cost) {
      return false;
    }

    const newPoints = points - cost;
    setPoints(newPoints);
    await AsyncStorage.setItem('points', String(newPoints));

    try {
      const profileId = await getOrCreateProfileId();
      await setDoc(doc(db, 'users', profileId), cleanFirestoreData({
        points: newPoints,
        userName,
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    } catch (e) {
      console.error('Firebase Points Sync Error:', e);
    }

    return true;
  }, [points, userName]);

  // ─────────────────────────────────────────────────────────────────────────

  const clearAll = useCallback(async () => {
    // Note: this clears the *current* fridge contents only. Lifetime impact
    // stats (₹ saved / CO2 prevented / items rescued) are a historical
    // ledger and intentionally survive an inventory clear.
    setItems([]);
    setPoints(0);
    setStreak(0);
    setLastSaveDate(null);
    await AsyncStorage.multiRemove(['inventory', 'points', 'streak', 'lastSaveDate']);
  }, []);

  const logout = useCallback(async () => {
    setItems([]);
    setPoints(0);
    setStreak(0);
    setLastSaveDate(null);
    setUserName('');
    setImpactStats(DEFAULT_IMPACT_STATS);
    await AsyncStorage.multiRemove([
      'inventory', 'points', 'streak', 'lastSaveDate',
      'userName', 'onboardingDone', 'theme', IMPACT_STATS_KEY,
    ]);
  }, []);

  if (!loaded) return null;

  return (
    <InvCtx.Provider value={{
      items, points, streak, userName, lastSaveDate,
      addItem, addBatchItems, removeItem, markUsed, updateItem, redeemReward,
      clearAll, logout,
      // 🌱 Environmental / Monetary Savings Ledger
      totalRupeesSaved:  impactStats.totalRupeesSaved,
      totalCO2Prevented: impactStats.totalCO2Prevented,
      totalItemsRescued: impactStats.totalItemsRescued,
    }}>
      {children}
    </InvCtx.Provider>
  );
}
