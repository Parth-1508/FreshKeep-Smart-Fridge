import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';
import { API_KEYS } from '../constants/Keys';

// ── GEMINI INTEGRATION ────────────────────────────────────────────────────────
const GEMINI_KEY = API_KEYS.GEMINI;

async function fetchAIRecipes(inventory) {
  const inventoryText = inventory.length === 0
    ? 'The kitchen is empty.'
    : inventory.map(i =>
      `- ${i.name} (${i.quantity || '1 unit'}), Status: ${i.status}, Days Left: ${i.daysLeft}`
    ).join('\n');

  const prompt = `You are the AI chef for FreshKeep. Analyze this Firestore inventory:
${inventoryText}

Suggest 4 practical recipes. 
Rules:
1. Priority: Use items where status is 'urgent' or 'expired'.
2. Format: Return ONLY a JSON object with a "recipes" array.
3. Fields: "name", "emoji", "time", "urgencyNote", "canMake" (true only if all main items are present), "ingredients" (list with "name" and "have" boolean), "steps" (array).`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEYS.GEMINI}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("🔴 REAL GEMINI ERROR:", errorText);
    throw new Error('Gemini API Error');
  }
  const data = await res.json();
  const rawText = data.candidates[0].content.parts[0].text;

  // Clean up markdown formatting Gemini sometimes adds
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return parsed.recipes;
}

export default function RecipesScreen() {
  const { items } = useInventory();
  const { colors: C } = useTheme();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelected] = useState(null);

  const loadRecipes = useCallback(async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const data = await fetchAIRecipes(items);
      setRecipes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [items]);

  useEffect(() => { loadRecipes(); }, [items]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        <LinearGradient colors={[C.primary, C.primaryMid]} style={st.hero}>
          <Text style={st.heroTitle}>Smart Recipes</Text>
          <Text style={st.heroSub}>Based on your {items.length} tracked items</Text>
        </LinearGradient>

        <View style={st.container}>
          {loading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
          ) : (
            recipes.map((r, i) => (
              <TouchableOpacity key={i} style={[st.card, { backgroundColor: C.card }]} onPress={() => setSelected(r)}>
                <Text style={st.emoji}>{r.emoji}</Text>
                <View style={{ flex: 1 }}>
                  {/* Patched Recipe List Text Colors */}
                  <Text style={[st.recipeName, { color: C.textPrimary }]}>{r.name}</Text>
                  <Text style={[st.recipeTime, { color: C.textSecondary }]}>{r.time} • {r.urgencyNote || 'Standard Recipe'}</Text>
                </View>
                {r.canMake && <Ionicons name="checkmark-circle" size={24} color={C.primary} />}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Recipe Detail Modal */}
      <Modal visible={!!selectedRecipe} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <TouchableOpacity style={st.close} onPress={() => setSelected(null)}>
            <Ionicons name="close-circle" size={32} color={C.textPrimary} />
          </TouchableOpacity>
          {selectedRecipe && (
            <ScrollView style={{ padding: 20 }}>
              {/* Patched Modal Text Colors */}
              <Text style={[st.modalTitle, { color: C.textPrimary }]}>{selectedRecipe.emoji} {selectedRecipe.name}</Text>
              
              <Text style={[st.sectionTitle, { color: C.textPrimary }]}>Ingredients Needed:</Text>
              {selectedRecipe.ingredients.map((ing, i) => (
                <Text key={i} style={{ color: ing.have ? C.primary : C.textSecondary }}>
                  {ing.have ? '✓' : '○'} {ing.name}
                </Text>
              ))}
              
              <Text style={[st.sectionTitle, { color: C.textPrimary }]}>Steps:</Text>
              {selectedRecipe.steps.map((s, i) => (
                <Text key={i} style={[st.stepText, { color: C.textPrimary }]}>{i + 1}. {s}</Text>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  hero: { padding: 30, paddingBottom: 50, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5 },
  container: { padding: 20 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 3 },
  emoji: { fontSize: 35, marginRight: 15 },
  recipeName: { fontSize: 18, fontWeight: '600' },
  recipeTime: { fontSize: 12, color: '#666' },
  close: { alignSelf: 'flex-end', padding: 20 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  stepText: { marginBottom: 10, lineHeight: 20 }
});