import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';
import ItemCard from '../components/ItemCard';

export default function InventoryScreen({ navigation }) {
  const { items, markUsed, removeItem } = useInventory();
  const { colors } = useTheme();

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

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item, index }) => (
          <ItemCard
            item={item}
            onDone={markUsed}
            onDelete={removeItem}
            isLast={index === items.length - 1}
          />
        )}
        ListEmptyComponent={
          <Text style={[s.empty, { color: colors.textSecondary }]}>
            Your kitchen is empty! Add some items.
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
  list: { padding: 16 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 }
});