import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Animated, Pressable, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import { useVoiceAssistant, buildActionHandler } from '../assistant/VoiceAssistant';
import { API_KEYS } from '../constants/Keys';

export default function AssistantScreen({ navigation }) {
  const { colors: C, isDark } = useTheme();
  const { items, addItem, removeItem } = useInventory();

  const [messages, setMessages] = useState([
    {
      role: 'kira',
      text: `Hi! I'm Kira. 🌿 You have ${items.length} items. ${items.filter(i => i.status === 'urgent').length > 0
          ? "Some items are expiring soon!"
          : "Everything looks fresh."
        } How can I help you today?`
    }
  ]);
  
  // ── PATCHED: Text Input State ──
  const [inputText, setInputText] = useState('');

  const handleKiraResponse = async (parsed) => {
    if (parsed.transcript) {
      setMessages(prev => [...prev, { role: 'user', text: parsed.transcript }]);
    }
    if (parsed.reply) {
      setMessages(prev => [...prev, { role: 'kira', text: parsed.reply }]);
    }

    const executeDatabaseAction = buildActionHandler(addItem, removeItem, items);
    await executeDatabaseAction(parsed);
  };

  // ── PATCHED: Passed 'messages' into the hook ──
  const { status, startListening, stopListening } = useVoiceAssistant(items, messages, handleKiraResponse);

  const scrollViewRef = useRef();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  // ── PATCHED: Function to handle typing to Kira ──
  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    setInputText('');
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: 'user', text: userText }]);

    // Build context
    const history = messages.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
    const inventoryText = items.map(i => `${i.name} (${i.daysLeft} days left)`).join(', ');

    const prompt = `You are Kira, a smart kitchen assistant.
    Kitchen Inventory: ${inventoryText || 'Empty'}
    
    RECENT CONVERSATION HISTORY:
    ${history}
    
    User's new message: "${userText}"
    
    RULES:
    1. If adding an item without an expiry date, ask when it expires (intent: 'clarification').
    2. Return ONLY JSON exactly like this: {"reply": "your response", "intent": "add_item|remove_item|recipe_suggest|clarification|unknown", "action": {"name": "ItemName", "daysLeft": 5, "emoji": "🍎", "category": "Other"}}`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEYS.GEMINI}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      
      const data = await res.json();
      const rawText = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
      
      // Add Kira's reply to UI
      setMessages(prev => [...prev, { role: 'kira', text: parsed.reply }]);
      
      // Execute any actions (like adding items to the database)
      const executeDatabaseAction = buildActionHandler(addItem, removeItem, items);
      await executeDatabaseAction(parsed);
    } catch (e) {
      console.error("Text chat error:", e);
      setMessages(prev => [...prev, { role: 'kira', text: "Sorry, I had trouble processing that. Can you try again?" }]);
    }
  };


  return (
    // ── PATCHED: Keyboard Avoider moved to the absolute outside ──
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: C.bg }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        <View style={[st.header, { backgroundColor: C.card, borderBottomColor: C.border, borderBottomWidth: 0.5 }]}>
          <TouchableOpacity onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Home');
          }}>
            <Ionicons name="close" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={[st.headerTitle, { color: C.textPrimary }]}>Kira</Text>
          </View>
          <View style={[st.statusDot, { backgroundColor: status === 'recording' ? '#e74c3c' : status === 'processing' ? C.warning : status === 'speaking' ? C.primary : C.border }]} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={st.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled" 
        >
          {messages.map((m, i) => (
            <View key={i} style={[
              st.bubble,
              m.role === 'user' ? [st.bubbleUser, { backgroundColor: C.primary }] : [st.bubbleKira, { backgroundColor: C.card, borderColor: C.border }]
            ]}>
              {m.role === 'kira' && (
                <View style={st.kiraLabel}>
                  <Text style={st.kiraName}>✨ Kira</Text>
                </View>
              )}
              <Text style={{ fontSize: 15, lineHeight: 22, color: m.role === 'user' ? '#fff' : C.textPrimary }}>
                {m.text}
              </Text>
            </View>
          ))}

          {status === 'processing' && (
            <View style={[st.bubble, st.bubbleKira, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={{ color: C.textSecondary, fontStyle: 'italic' }}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={[st.inputArea, { borderTopColor: C.border, backgroundColor: C.card }]}>
          <TextInput
            style={[st.textInput, { color: C.textPrimary, borderColor: C.border }]}
            placeholder="Type a message to Kira..."
            placeholderTextColor={C.textLight}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendText}
            returnKeyType="send"
          />
          <TouchableOpacity style={[st.sendBtn, { backgroundColor: C.primary }]} onPress={handleSendText}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[st.micArea, { backgroundColor: C.card, borderTopColor: C.border }]}>
          <Pressable style={[st.micBtn, { backgroundColor: status === 'recording' ? '#e74c3c' : C.primary }]} onPressIn={startListening} onPressOut={stopListening}>
            <Ionicons name={status === 'recording' ? 'stop' : 'mic'} size={32} color="#fff" />
          </Pressable>
          <Text style={{ fontSize: 12, color: C.textSecondary }}>{status === 'recording' ? 'Release to send' : 'Hold to speak'}</Text>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  chatContent: { padding: 16, gap: 10, paddingBottom: 40 },
  bubble: { maxWidth: '85%', borderRadius: 18, padding: 14 },
  bubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleKira: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 0.5 },
  kiraLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  kiraName: { fontSize: 11, fontWeight: '700', color: '#5a8f6b' },
  
  // ── PATCHED: Text Input Styles ──
  inputArea: { flexDirection: 'row', padding: 12, borderTopWidth: 0.5, alignItems: 'center' },
  textInput: { flex: 1, borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 16, height: 40, marginRight: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  
  micArea: { alignItems: 'center', paddingVertical: 20, borderTopWidth: 0.5 },
  micBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
});