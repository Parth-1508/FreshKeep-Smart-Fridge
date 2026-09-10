import React, { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';
import { processVoiceCommand } from '../services/geminiService';

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

      const parsed = await processVoiceCommand(base64Audio, inventory, messages);
      
      setTranscript(parsed.transcript || '');
      setLastReply(parsed.reply || '');
      
      if (onAction) onAction(parsed);

      setStatus('speaking');
      
      if (parsed.reply) {
        Speech.speak(parsed.reply, {
          onDone: () => setStatus('idle'),
          onStopped: () => setStatus('idle'),
          onError: () => setStatus('idle'),
        });
      } else {
        setStatus('idle');
      }
      
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