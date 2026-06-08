import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInCalendarDays, isToday, isYesterday, format } from 'date-fns';

// 🔥 FIREBASE IMPORTS (Both Firestore for App & RTDB for Magnet)
import { db, rtdb } from '../../firebase'; 
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database'; // <-- Proper Web SDK for Expo Go

const InvCtx = createContext();
export const useInventory = () => useContext(InvCtx);

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

  useEffect(() => {
    async function load() {
      try {
        const [
          rawItems, rawPoints, rawStreak,
          rawLastSave, rawUser,
        ] = await Promise.all([
          AsyncStorage.getItem('inventory'),
          AsyncStorage.getItem('points'),
          AsyncStorage.getItem('streak'),
          AsyncStorage.getItem('lastSaveDate'),
          AsyncStorage.getItem('userName'),
        ]);

        const parsedItems = rawItems ? enrich(JSON.parse(rawItems)) : [];
        let activeStreak = rawStreak ? parseInt(rawStreak) : 0;
        const parsedPoints = rawPoints ? parseInt(rawPoints) : 0;

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

  const addItem = useCallback(async (item) => {
    const newItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
    };
    setItems(prev => enrich([...prev, newItem]));
    setPoints(p => p + 5); 

    try {
      await setDoc(doc(db, 'inventory', newItem.id), newItem);
    } catch(e) { console.error("Firebase Add Error:", e); }
  }, []);

  const markUsed = useCallback(async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    setItems(prev => prev.filter(i => i.id !== id));
    const bonus = item.status === 'urgent' ? 20 : item.status === 'warning' ? 15 : 10;
    setPoints(p => p + bonus);
    
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
      await updateDoc(doc(db, 'inventory', id), changes);
    } catch(e) { console.error("Firebase Update Error:", e); }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  const clearAll = useCallback(async () => {
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
    await AsyncStorage.multiRemove([
      'inventory', 'points', 'streak', 'lastSaveDate',
      'userName', 'onboardingDone', 'theme',
    ]);
  }, []);

  if (!loaded) return null;

  return (
    <InvCtx.Provider value={{
      items, points, streak, userName, lastSaveDate,
      addItem, removeItem, markUsed, updateItem,
      clearAll, logout,
    }}>
      {children}
    </InvCtx.Provider>
  );
}