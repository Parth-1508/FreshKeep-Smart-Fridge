import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';
import ItemCard from '../components/ItemCard';

// Freshness status filter — mirrors the statuses ItemCard already renders as
// pill badges (fresh / warning / urgent / expired).
const STATUS_TABS = [
  { key: 'all',     label: 'All' },
  { key: 'fresh',   label: 'Fresh' },
  { key: 'warning', label: 'Warning' },
  { key: 'urgent',  label: 'Urgent' },
  { key: 'expired', label: 'Expired' },
];

// Category chip bar — filters inventory alongside the freshness tabs above.
const CATEGORY_CHIPS = ['All', 'Dairy', 'Bread', 'Vegetables', 'Fruits', 'Meat', 'Cooked'];

export default function InventoryScreen({ navigation }) {
  const { items, markUsed, removeItem } = useInventory();
  const { colors } = useTheme();

  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('all');
  const [category, setCategory] = useState('All');

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      const matchesSearch   = !q || item.name?.toLowerCase().includes(q);
      const itemStatus      = item.daysLeft <= 0 ? 'expired' : item.status;
      const matchesStatus   = status === 'all' || itemStatus === status;
      const matchesCategory = category === 'All' || item.category === category;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, search, status, category]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <View style={[s.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Home');
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>All Items</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── Sticky filter zone: search + freshness tabs + category chips ── */}
      <View style={[s.stickyZone, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder="Search items..."
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
        >
          {STATUS_TABS.map(tab => {
            const active = status === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  s.statusChip,
                  { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
                ]}
                onPress={() => setStatus(tab.key)}
              >
                <Text style={[s.statusChipText, { color: active ? '#fff' : colors.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
        >
          {CATEGORY_CHIPS.map(cat => {
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  s.catChip,
                  { backgroundColor: active ? colors.primaryPale : colors.card, borderColor: active ? colors.primary : colors.border },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[s.catChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item, index }) => (
          <ItemCard
            item={item}
            onDone={markUsed}
            onDelete={removeItem}
            isLast={index === filteredItems.length - 1}
            colors={colors}
          />
        )}
        ListEmptyComponent={
          <Text style={[s.empty, { color: colors.textSecondary }]}>
            {items.length === 0
              ? 'Your kitchen is empty! Add some items.'
              : 'No items match your search or filters.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 20
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 4 },

  // Sticky filter zone sits outside the FlatList's scrollable content, so it
  // stays pinned to the top of the screen while the item list scrolls below.
  stickyZone:   { paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1 },
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16,
                  borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  searchInput:  { flex: 1, fontSize: 14, padding: 0 },
  chipRow:      { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  statusChip:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  statusChipText: { fontSize: 12.5, fontWeight: '600' },
  catChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catChipText:  { fontSize: 12.5, fontWeight: '500' },

  list: { padding: 16 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 }
});
