import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';

export default function EditItemScreen({ route, navigation }) {
  const { item } = route.params; // The item passed from tapping the card
  const { updateItem } = useInventory();
  const { colors: C } = useTheme();

  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.quantity || '');
  const [emoji, setEmoji] = useState(item.emoji);
  const [category, setCategory] = useState(item.category);
  const [expiry, setExpiry] = useState(new Date(item.expiryDate));
  const [showPicker, setShowPicker] = useState(false);

  async function handleSave() {
    if (!name.trim() || !emoji.trim()) {
      return Alert.alert('Missing Info', 'Item name and emoji are required.');
    }

    // Uses the updateItem function already built into your InventoryContext!
    await updateItem(item.id, {
      name: name.trim(),
      quantity: qty.trim() || null,
      emoji: emoji.trim(),
      category: category.trim(),
      expiryDate: expiry.toISOString(),
    });

    navigation.goBack();
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={[s.header, { backgroundColor: C.primary }]}>
          <TouchableOpacity onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Edit Item</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={s.form}>

          <View style={s.row}>
            <View style={[s.field, { flex: 0.3, marginRight: 15 }]}>
              <Text style={[s.label, { color: C.textSecondary }]}>Icon</Text>
              <TextInput style={[s.input, { backgroundColor: C.card, borderColor: C.border, color: C.textPrimary, fontSize: 24, textAlign: 'center' }]} value={emoji} onChangeText={setEmoji} maxLength={2} />
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={[s.label, { color: C.textSecondary }]}>Item Name</Text>
              <TextInput style={[s.input, { backgroundColor: C.card, borderColor: C.border, color: C.textPrimary }]} value={name} onChangeText={setName} />
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Quantity (optional)</Text>
            <TextInput style={[s.input, { backgroundColor: C.card, borderColor: C.border, color: C.textPrimary }]} value={qty} onChangeText={setQty} placeholder="e.g. 1L, 500g" placeholderTextColor={C.textLight} />
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Category</Text>
            <TextInput style={[s.input, { backgroundColor: C.card, borderColor: C.border, color: C.textPrimary }]} value={category} onChangeText={setCategory} placeholder="e.g. Vegetables, Dairy" placeholderTextColor={C.textLight} />
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Expiry Date</Text>
            <TouchableOpacity style={[s.datePicker, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => setShowPicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={C.primary} />
              <Text style={[s.dateText, { color: C.textPrimary }]}>{format(expiry, 'dd MMM yyyy')}</Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker value={expiry} mode="date" onChange={(_, date) => { setShowPicker(false); if (date) setExpiry(date); }} />
            )}
          </View>

        </ScrollView>

        <View style={[s.footer, { backgroundColor: C.bg, borderTopColor: C.border }]}>
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: C.primary }]} onPress={handleSave}>
            <Text style={s.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 4 },
  form: { padding: 20 },
  row: { flexDirection: 'row' },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 0.5, borderRadius: 12, padding: 14, fontSize: 15 },
  datePicker: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0.5, borderRadius: 12, padding: 14 },
  dateText: { fontSize: 15, fontWeight: '500' },
  footer: { padding: 20, borderTopWidth: 0.5 },
  saveBtn: { borderRadius: 16, padding: 18, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});