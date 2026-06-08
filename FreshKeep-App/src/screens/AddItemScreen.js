import 'react-native-gesture-handler';
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Platform,
  KeyboardAvoidingView, ActivityIndicator, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { format, addDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../context/InventoryContext';
import { useTheme }     from '../context/ThemeContext';
import useNotifications from '../hooks/useNotifications';
import { API_KEYS } from '../constants/Keys';

const CATEGORIES = [
  { label: 'Milk',       emoji: '🥛' },
  { label: 'Bread',      emoji: '🍞' },
  { label: 'Fruits',     emoji: '🍎' },
  { label: 'Vegetables', emoji: '🥦' },
  { label: 'Meat',       emoji: '🥩' },
  { label: 'Dairy',      emoji: '🧀' },
  { label: 'Eggs',       emoji: '🥚' },
  { label: 'Snacks',     emoji: '🍪' },
  { label: 'Cooked',     emoji: '🍲' },
  { label: 'Other',      emoji: '📦' },
];

const PRESETS = [
  { label: '1 day',  days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks',days: 14 },
  { label: '1 month',days: 30 },
];

// ── OPTION C: Replaced Voice with Smart List ──
const ENTRY_MODES = ['✏️ Manual', '📷 Scan', '🛒 Smart List'];

export default function AddItemScreen({ navigation }) {
  // ── We need 'items' here so Gemini knows what's in the kitchen ──
  const { items, addItem } = useInventory();
  const { colors }         = useTheme();
  const { scheduleExpiryAlert } = useNotifications();

  const [mode, setMode]     = useState(0); 
  const [scanning, setScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);

  const [name,     setName]     = useState('');
  const [qty,      setQty]      = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expiry,   setExpiry]   = useState(addDays(new Date(), 7));
  const [showPicker, setShowPicker] = useState(false);

  // Custom Categories State
  const [customCategories, setCustomCategories] = useState([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('✨');

  // Smart List State
  const [smartList, setSmartList] = useState([]);
  const [isGeneratingList, setIsGeneratingList] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Please enter an item name.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newItem = {
      name:       name.trim(),
      emoji:      category.emoji,
      category:   category.label,
      quantity:   qty.trim() || null,
      expiryDate: expiry.toISOString(),
    };

    await addItem(newItem);
    await scheduleExpiryAlert({ ...newItem, id: Date.now().toString() });

    setName(''); setQty(''); setCategory(CATEGORIES[0]);
    setExpiry(addDays(new Date(), 7));
    navigation.navigate('Home');
  }

  // ── INSTANT QUICK ADD FOR SMART LIST ──
  async function handleQuickAdd(suggestedItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newItem = {
      name: suggestedItem.name,
      emoji: suggestedItem.emoji || '🛒',
      category: suggestedItem.category || 'Other',
      quantity: '1',
      expiryDate: addDays(new Date(), 7).toISOString(), // Default 7 days
    };
    await addItem(newItem);
    Alert.alert("Added!", `${suggestedItem.name} added to your kitchen.`);
  }

  async function openCamera() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setMode(1);
    setScanning(true);
  }

  async function captureAndAnalyze() {
    if (!cameraRef.current) return;
    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      const today = new Date().toISOString().split('T')[0];
      
      const prompt = `Analyze this food packaging. Today's date is ${today}. 
      1. Name: Extract the main brand name. 
      2. Expiry Date: Carefully read the dot-matrix text.
      Return ONLY a valid JSON object exactly matching this format: 
      { "name": "Product Name", "expiryDate": "YYYY-MM-DD", "category": "Snacks" }
      If no date is found, return null for expiryDate.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEYS.GEMINI}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: photo.base64 } }] }]
        }),
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const rawText = data.candidates[0].content.parts[0].text;
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleaned);

      setName(result.name || '');
      if (result.expiryDate) setExpiry(new Date(result.expiryDate));
      else setExpiry(addDays(new Date(), 7));
      
      const matchedCat = CATEGORIES.find(c => c.label === result.category);
      if (matchedCat) setCategory(matchedCat);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScanning(false);
      setMode(0); 
    } catch (e) {
      console.error(e);
      Alert.alert("Scan Failed", "Couldn't read the package clearly. Please try again or enter manually.");
    } finally {
      setIsProcessing(false);
    }
  }

  // ── AI GROCERY LIST GENERATOR ──
  async function generateSmartList() {
    setIsGeneratingList(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const inventoryText = items.map(i => i.name).join(', ') || 'Nothing';
      const prompt = `You are an AI Kitchen Manager. The user currently has these items in their fridge: ${inventoryText}. 
      Suggest 5 common grocery staples they might be missing or need to buy next. 
      Return ONLY a valid JSON array of objects exactly like this:
      [
        {"name": "Milk", "category": "Milk", "emoji": "🥛", "reason": "Essential staple, currently missing"}
      ]`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEYS.GEMINI}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const rawText = data.candidates[0].content.parts[0].text;
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      
      setSmartList(JSON.parse(cleaned));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("AI List Error:", e);
      Alert.alert("Oops", "Couldn't generate the list right now. Check your connection.");
    } finally {
      setIsGeneratingList(false);
    }
  }

  function handleAddCustomCategory() {
    if (!newCatName.trim() || !newCatEmoji.trim()) {
      Alert.alert('Missing Details', 'Please enter both an emoji and a name.');
      return;
    }
    const newCat = { label: newCatName.trim(), emoji: newCatEmoji.trim() };
    setCustomCategories([...customCategories, newCat]);
    setCategory(newCat);
    setShowCustomModal(false);
    setNewCatName('');
    setNewCatEmoji('✨'); 
  }

  const allCategories = [...CATEGORIES, ...customCategories];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        <View style={[s.header, { backgroundColor: colors.primary }]}>
          <Text style={s.headerTitle}>Add Item</Text>
          <Text style={s.headerSub}>Keep your kitchen organised</Text>
        </View>

        <View style={[s.modeTabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {ENTRY_MODES.map((label, i) => (
            <TouchableOpacity
              key={i}
              style={[s.modeTab, mode === i && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => { 
                setMode(i); 
                if (i === 1) openCamera(); 
                // Auto-generate the list the first time they tap the tab!
                if (i === 2 && smartList.length === 0) generateSmartList(); 
              }}
            >
              <Text style={[s.modeLabel, { color: mode === i ? colors.primary : colors.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MODE 1: SCANNER */}
        {mode === 1 && scanning && (
          <View style={s.cameraWrap}>
            {/* Camera is completely empty now */}
            <CameraView style={s.camera} facing="back" ref={cameraRef} />
            
            {/* Overlay floats on top using absolute positioning */}
            <View style={[s.scanOverlay, StyleSheet.absoluteFillObject]}>
              <View style={s.scanFrame} />
              <Text style={s.scanHint}>Frame the food label and dates</Text>
              
              <TouchableOpacity 
                style={[s.captureBtn, isProcessing && { opacity: 0.5 }]} 
                onPress={captureAndAnalyze} disabled={isProcessing}
              >
                {isProcessing ? <ActivityIndicator size="large" color="#4a7c59" /> : <View style={s.captureInner} />}
              </TouchableOpacity>
            </View>

            {/* Cancel Button floats on top */}
            <TouchableOpacity style={s.cancelScan} onPress={() => { setScanning(false); setMode(0); }}>
              <Text style={s.cancelText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MODE 0: MANUAL */}
        {mode === 0 && (
          <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
            <View style={s.field}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Item Name</Text>
              <TextInput style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]} placeholder="e.g. Fresh Milk" placeholderTextColor={colors.textLight} value={name} onChangeText={setName} />
            </View>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Quantity (optional)</Text>
              <TextInput style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]} placeholder="e.g. 1L, 500g, 2 pieces" placeholderTextColor={colors.textLight} value={qty} onChangeText={setQty} />
            </View>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Expiry Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.presets}>
                {PRESETS.map(p => (
                  <TouchableOpacity key={p.days} style={[s.preset, { backgroundColor: colors.primaryPale, borderColor: colors.primaryLight }]} onPress={() => setExpiry(addDays(new Date(), p.days))}>
                    <Text style={[s.presetText, { color: colors.primary }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={[s.datePicker, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowPicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[s.dateText, { color: colors.textPrimary }]}>{format(expiry, 'dd MMM yyyy')}</Text>
              </TouchableOpacity>

              {showPicker && (
                <DateTimePicker value={expiry} mode="date" minimumDate={new Date()} onChange={(_, date) => { setShowPicker(false); if (date) setExpiry(date); }} />
              )}
            </View>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Category</Text>
              <View style={s.catGrid}>
                {allCategories.map(cat => (
                  <TouchableOpacity key={cat.label} style={[s.catBtn, { backgroundColor: colors.card, borderColor: colors.border }, category.label === cat.label && { backgroundColor: colors.primaryPale, borderColor: colors.primary }]} onPress={() => setCategory(cat)}>
                    <Text style={s.catEmoji}>{cat.emoji}</Text>
                    <Text style={[s.catLabel, { color: category.label === cat.label ? colors.primary : colors.textSecondary }]} numberOfLines={1}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity style={[s.catBtn, { backgroundColor: colors.card, borderColor: colors.border, borderStyle: 'dashed' }]} onPress={() => setShowCustomModal(true)}>
                  <Text style={s.catEmoji}>➕</Text>
                  <Text style={[s.catLabel, { color: colors.textSecondary }]}>Custom</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[s.preview, { backgroundColor: colors.primaryPale, borderColor: colors.primaryLight }]}>
              <Text style={s.previewEmoji}>{category.emoji}</Text>
              <View>
                <Text style={[s.previewName, { color: colors.textPrimary }]}>{name || 'Item name'}</Text>
                <Text style={[s.previewExpiry, { color: colors.primary }]}>Expires {format(expiry, 'dd MMM yyyy')}</Text>
              </View>
            </View>

            <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
              <Text style={s.addBtnText}>+ Add to Kitchen</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* MODE 2: SMART AI LIST */}
        {mode === 2 && (
          <ScrollView contentContainerStyle={s.form}>
             <View style={s.smartListHeader}>
               <Text style={[s.label, { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }]}>✨ Kira's Shopping List</Text>
               <TouchableOpacity onPress={generateSmartList} disabled={isGeneratingList}>
                 <Ionicons name="refresh-circle" size={28} color={colors.primary} style={{ opacity: isGeneratingList ? 0.5 : 1 }} />
               </TouchableOpacity>
             </View>
             
             <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
               Based on what is currently in your fridge, Kira suggests restocking these items:
             </Text>

             {isGeneratingList ? (
               <View style={{ padding: 40, alignItems: 'center' }}>
                 <ActivityIndicator size="large" color={colors.primary} />
                 <Text style={{ marginTop: 12, color: colors.textSecondary }}>Analyzing your kitchen habits...</Text>
               </View>
             ) : smartList.length > 0 ? (
               smartList.map((item, index) => (
                 <View key={index} style={[s.smartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                   <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
                   <View style={{ flex: 1, paddingHorizontal: 12 }}>
                     <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>{item.name}</Text>
                     <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{item.reason}</Text>
                   </View>
                   <TouchableOpacity 
                     style={[s.quickAddBtn, { backgroundColor: colors.primaryPale }]} 
                     onPress={() => handleQuickAdd(item)}
                   >
                     <Ionicons name="add" size={20} color={colors.primary} />
                   </TouchableOpacity>
                 </View>
               ))
             ) : (
               <View style={{ padding: 40, alignItems: 'center' }}>
                 <Text style={{ fontSize: 40, marginBottom: 10 }}>🥗</Text>
                 <Text style={{ color: colors.textSecondary }}>Your list is empty. Tap refresh to generate!</Text>
               </View>
             )}
          </ScrollView>
        )}

        {/* CUSTOM CATEGORY MODAL */}
        <Modal visible={showCustomModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'position'} style={{ width: '100%', alignItems: 'center' }}>
              <View style={[s.modalContent, { backgroundColor: colors.bg }]}>
                <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Create Category</Text>
                
                <Text style={[s.label, { color: colors.textSecondary }]}>Emoji Icon</Text>
                <TextInput style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary, fontSize: 32, textAlign: 'center', paddingVertical: 10 }]} value={newCatEmoji} onChangeText={setNewCatEmoji} maxLength={2} />

                <Text style={[s.label, { color: colors.textSecondary, marginTop: 15 }]}>Category Name</Text>
                <TextInput style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]} placeholder="e.g. Spices, Sauces, Meds" placeholderTextColor={colors.textLight} value={newCatName} onChangeText={setNewCatName} maxLength={12} />

                <View style={s.modalActions}>
                  <TouchableOpacity onPress={() => setShowCustomModal(false)} style={s.modalCancel}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddCustomCategory} style={[s.modalAdd, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { padding: 24, paddingTop: 16, paddingBottom: 20 },
  headerTitle:  { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub:    { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  modeTabs:     { flexDirection: 'row', borderBottomWidth: 0.5 },
  modeTab:      { flex: 1, paddingVertical: 14, alignItems: 'center' },
  modeLabel:    { fontSize: 13, fontWeight: '500' },
  cameraWrap:   { flex: 1 },
  camera:       { flex: 1 },
  scanOverlay:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  scanFrame:    { width: 260, height: 160, borderWidth: 2, borderColor: '#fff', borderRadius: 12 },
  scanHint:     { color: '#fff', marginTop: 16, fontSize: 14, fontWeight: '500' },
  captureBtn:   { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 40 },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#4a7c59' },
  cancelScan:   { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 },
  cancelText:   { color: '#fff', fontWeight: '600' },
  form:         { padding: 18, paddingBottom: 40 },
  field:        { marginBottom: 20 },
  label:        { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  input:        { borderWidth: 0.5, borderRadius: 12, padding: 14, fontSize: 15 },
  presets:      { marginBottom: 10 },
  preset:       { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  presetText:   { fontSize: 12, fontWeight: '500' },
  datePicker:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0.5, borderRadius: 12, padding: 14 },
  dateText:     { fontSize: 15, fontWeight: '500' },
  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn:       { width: '22%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 2 },
  catEmoji:     { fontSize: 22 },
  catLabel:     { fontSize: 10, marginTop: 3, fontWeight: '500', textAlign: 'center' },
  preview:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  previewEmoji: { fontSize: 32 },
  previewName:  { fontSize: 16, fontWeight: '600' },
  previewExpiry:{ fontSize: 13, marginTop: 2 },
  addBtn:       { borderRadius: 16, padding: 18, alignItems: 'center' },
  addBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  // Smart List Styles
  smartListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  smartCard:    { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 0.5, marginBottom: 12 },
  quickAddBtn:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  modalTitle:   { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25, gap: 15, alignItems: 'center' },
  modalCancel:  { padding: 10 },
  modalAdd:     { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 }
});