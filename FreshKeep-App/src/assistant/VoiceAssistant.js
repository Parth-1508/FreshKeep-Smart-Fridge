import React, { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';

import { API_KEYS } from '../constants/Keys';
const GEMINI_KEY = API_KEYS.GEMINI;

// ── PATCHED: Added "messages" parameter to receive chat history ──
export function useVoiceAssistant(inventory, messages, onAction) {
  const [status, setStatus] = useState('idle'); 
  const [transcript, setTranscript] = useState('');
  const [lastReply, setLastReply] = useState('');
  
  const recordingRef = useRef(null);
  const isPreparingRef = useRef(false);
  const recordStartTime = useRef(0);

  const startListening = useCallback(async () => {
    if (recordingRef.current || isPreparingRef.current) return;
    
    try {
      isPreparingRef.current = true;
      
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        isPreparingRef.current = false;
        return Alert.alert("Mic Permission Required", "Please allow microphone access to use Kira.");
      }
      
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      
      recordingRef.current = rec;
      recordStartTime.current = Date.now();
      setStatus('recording');
    } catch (e) { 
      console.error("Mic Start Error:", e);
      setStatus('error'); 
    } finally {
      isPreparingRef.current = false;
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (isPreparingRef.current) {
      setTimeout(stopListening, 500);
      return;
    }

    if (!recordingRef.current) return;
    
    try {
      const rec = recordingRef.current;
      recordingRef.current = null; 

      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      
      const holdDuration = Date.now() - recordStartTime.current;

      if (holdDuration < 500) {
        setStatus('idle');
        await FileSystem.deleteAsync(uri, { idempotent: true });
        return; 
      }

      setStatus('processing');
      
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64', 
      });

      const safeInventory = Array.isArray(inventory) ? inventory : [];
      const inventoryText = safeInventory.map(i => `${i.name} (${i.daysLeft} days left)`).join(', ');
      
      // ── PATCHED: Extract the last 4 messages for context ──
      const historyText = Array.isArray(messages) ? messages.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n') : '';
      
      const prompt = `You are Kira, a smart kitchen assistant. Listen to the attached audio command.
      The user currently has these items in their kitchen: ${inventoryText || 'Nothing'}.
      
      RECENT CONVERSATION HISTORY (Context for your reply):
      ${historyText}
      
      CRITICAL RULES:
      1. If the user wants to add an item BUT DOES NOT specify an expiry date or timeframe, set the "intent" to "clarification", do NOT return an action object, and ask them when it expires in your "reply".
      2. Only set the intent to "add_item" when you know BOTH the item name and when it expires.
      
      Return ONLY a valid JSON object with these four keys:
      1. "transcript": What you heard the user say.
      2. "reply": A short, friendly conversational reply (what you will say out loud).
      3. "intent": 'add_item', 'remove_item', 'clarification', 'list_expiring', 'recipe_suggest', 'greeting', or 'unknown'.
      4. "action": If intent is 'add_item', include {"name": "ItemName", "category": "Category", "emoji": "🍎", "daysLeft": 5, "quantity": "1L"}. Make sure the emoji logically matches the food! If 'remove_item', include {"name": "ItemName"}. Otherwise return null.`;

     const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEYS.GEMINI}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "audio/m4a", data: base64Audio } }
            ]
          }]
        }),
      });

      if (!res.ok) throw new Error('Failed to reach Gemini API');
      
      const data = await res.json();
      const rawText = data.candidates[0].content.parts[0].text;
      
      const cleanedJSON = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanedJSON);
      
      setTranscript(parsed.transcript);
      setLastReply(parsed.reply);
      
      if (onAction) onAction(parsed);

      setStatus('speaking');
      
      Speech.speak(parsed.reply, { 
        onDone: () => setStatus('idle'),
        onStopped: () => setStatus('idle'),
        onError: () => setStatus('idle'),
      });
      
      await FileSystem.deleteAsync(uri, { idempotent: true });

    } catch (e) {
      console.error("Gemini API Error:", e);
      setStatus('idle');
      Alert.alert("Assistant Error", "Kira couldn't understand that. Please try again.");
    }
  }, [status, inventory, messages, onAction]); // <-- Added messages to dependencies

  return { status, transcript, lastReply, startListening, stopListening };
}

export function buildActionHandler(addItem, removeItem, items = []) {
  return async (parsed) => {
    if (!parsed || !parsed.action) return;

    if (parsed.intent === 'add_item') {
      const days = parsed.action.daysLeft || 7;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      
      await addItem({
        name: parsed.action.name || 'New Item',
        category: parsed.action.category || 'Other',
        emoji: parsed.action.emoji || '✨', 
        quantity: parsed.action.quantity || null,
        expiryDate: expiryDate.toISOString(),
      });
    } 
    else if (parsed.intent === 'remove_item') {
      const safeItems = Array.isArray(items) ? items : [];
      const target = safeItems.find(i => 
        i.name.toLowerCase().includes(parsed.action.name.toLowerCase())
      );
      if (target && removeItem) {
        await removeItem(target.id);
      }
    }
  };
}