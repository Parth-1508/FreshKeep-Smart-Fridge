import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';
import { fetchAIRecipes } from '../services/geminiService';

// ── Inline ingredient chips shared by the Hero Card and regular cards ──
// Green "✓ Name" for ingredients already in inventory, muted "○ Name" for
// pantry staples the user is assumed to have on hand.
function IngredientChips({ ingredients = [], colors: C }) {
  if (!ingredients.length) return null;
  return (
    <View style={st.chipsRow}>
      {ingredients.map((ing, i) => (
        <View
          key={i}
          style={[
            st.chip,
            ing.have
              ? { backgroundColor: '#e8f4ec' }
              : { backgroundColor: C.border },
          ]}
        >
          <Text style={[st.chipText, { color: ing.have ? '#3a6649' : C.textSecondary }]}>
            {ing.have ? '✓' : '○'} {ing.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function RecipesScreen() {
  const { items } = useInventory();
  const { colors: C } = useTheme();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelected] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'canMake'

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

  // ── Segmented filter: "Can Make Now" vs "All Suggestions" ──
  const filteredRecipes = useMemo(
    () => (filterMode === 'canMake' ? recipes.filter(r => r.canMake === true) : recipes),
    [recipes, filterMode]
  );
  const heroRecipe = filteredRecipes[0];
  const restRecipes = filteredRecipes.slice(1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        <LinearGradient colors={[C.primary, C.primaryMid]} style={st.hero}>
          <Text style={st.heroTitle}>Smart Recipes</Text>
          <Text style={st.heroSub}>Based on your {items.length} tracked items</Text>
        </LinearGradient>

        <View style={st.container}>

          {/* ── Segmented filter toggle ── */}
          <View style={[st.segment, { backgroundColor: C.card, borderColor: C.border }]}>
            <TouchableOpacity
              style={[st.segmentBtn, filterMode === 'canMake' && { backgroundColor: C.primary }]}
              onPress={() => setFilterMode('canMake')}
            >
              <Text style={[st.segmentText, { color: filterMode === 'canMake' ? '#fff' : C.textSecondary }]}>
                Can Make Now
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.segmentBtn, filterMode === 'all' && { backgroundColor: C.primary }]}
              onPress={() => setFilterMode('all')}
            >
              <Text style={[st.segmentText, { color: filterMode === 'all' ? '#fff' : C.textSecondary }]}>
                All Suggestions
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
          ) : filteredRecipes.length === 0 ? (
            <View style={st.emptyBox}>
              <Text style={st.emptyEmoji}>🍽️</Text>
              <Text style={{ color: C.textSecondary, textAlign: 'center' }}>
                {filterMode === 'canMake'
                  ? "No recipes you can fully make right now — try 'All Suggestions'."
                  : 'No recipes yet. Add items to your kitchen to get suggestions.'}
              </Text>
            </View>
          ) : (
            <>
              {/* ── HERO CARD: the top recipe, elevated with a gradient border ── */}
              {heroRecipe && (
                <LinearGradient
                  colors={[C.primary, C.primaryLight, C.primaryMid]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.heroCardBorder}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[st.heroCard, { backgroundColor: C.card }]}
                    onPress={() => setSelected(heroRecipe)}
                  >
                    <View style={st.heroCardTop}>
                      <Text style={st.heroEmoji}>{heroRecipe.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={st.wasteSaverBadge}>
                          <Ionicons name="leaf" size={11} color="#3a6649" />
                          <Text style={st.wasteSaverText}>Waste Saver</Text>
                        </View>
                        <Text style={[st.heroName, { color: C.textPrimary }]}>{heroRecipe.name}</Text>
                        <View style={st.heroMetaRow}>
                          <Ionicons name="time-outline" size={13} color={C.textSecondary} />
                          <Text style={[st.heroMeta, { color: C.textSecondary }]}>{heroRecipe.time}</Text>
                          {heroRecipe.canMake && (
                            <Ionicons name="checkmark-circle" size={16} color={C.primary} style={{ marginLeft: 4 }} />
                          )}
                        </View>
                      </View>
                    </View>

                    {heroRecipe.urgencyNote ? (
                      <Text style={[st.heroNote, { color: C.primary }]}>{heroRecipe.urgencyNote}</Text>
                    ) : null}

                    <IngredientChips ingredients={heroRecipe.ingredients} colors={C} />
                  </TouchableOpacity>
                </LinearGradient>
              )}

              {/* ── Remaining recipe cards ── */}
              {restRecipes.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={[st.card, { backgroundColor: C.card }]}
                  onPress={() => setSelected(r)}
                >
                  <View style={st.cardTopRow}>
                    <Text style={st.emoji}>{r.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.recipeName, { color: C.textPrimary }]}>{r.name}</Text>
                      <Text style={[st.recipeTime, { color: C.textSecondary }]}>
                        {r.time} • {r.urgencyNote || 'Standard Recipe'}
                      </Text>
                    </View>
                    {r.canMake && <Ionicons name="checkmark-circle" size={24} color={C.primary} />}
                  </View>
                  <IngredientChips ingredients={r.ingredients} colors={C} />
                </TouchableOpacity>
              ))}
            </>
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
              <IngredientChips ingredients={selectedRecipe.ingredients} colors={C} />
              
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

  // Segmented filter toggle
  segment: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 3, marginBottom: 18 },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '600' },

  emptyBox: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },

  // Hero card with gradient border
  heroCardBorder: { borderRadius: 22, padding: 2, marginBottom: 18 },
  heroCard: { borderRadius: 20, padding: 18 },
  heroCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroEmoji: { fontSize: 40 },
  wasteSaverBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#e8f4ec', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 6,
  },
  wasteSaverText: { fontSize: 10.5, fontWeight: '700', color: '#3a6649' },
  heroName: { fontSize: 19, fontWeight: '700' },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  heroMeta: { fontSize: 12.5, fontWeight: '500' },
  heroNote: { fontSize: 12.5, fontWeight: '600', marginTop: 10 },

  // Regular recipe cards
  card: { padding: 15, borderRadius: 15, marginBottom: 15, elevation: 3 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 35, marginRight: 15 },
  recipeName: { fontSize: 18, fontWeight: '600' },
  recipeTime: { fontSize: 12, color: '#666' },

  // Ingredient chips (Hero Card + regular cards)
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 11.5, fontWeight: '600' },

  close: { alignSelf: 'flex-end', padding: 20 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  stepText: { marginBottom: 10, lineHeight: 20 }
});
