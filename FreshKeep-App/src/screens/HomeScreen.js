// src/screens/HomeScreen.js
import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, StatusBar, 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../context/InventoryContext';
import { useTheme }     from '../context/ThemeContext';
import ItemCard from '../components/ItemCard';

export default function HomeScreen({ navigation }) {
  const { items, points, streak, markUsed, removeItem } = useInventory();
  const { colors, isDark } = useTheme();

  const expiringSoon = useMemo(() =>
    [...items]
      .filter(i => i.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5),
    [items]
  );

  // ── THE FIX: Synchronized Stats Logic ──
  const stats = useMemo(() => ({
    total:    items.length,
    expiring: items.filter(i => i.daysLeft > 0 && i.daysLeft <= 3).length, // 1 to 3 days
    expired:  items.filter(i => i.daysLeft <= 0).length,                   // 0 or negative days
  }), [items]);

  const smartTip = useMemo(() => {
    // Check for expired items first!
    const expired = items.find(i => i.daysLeft <= 0);
    if (expired) return `Throw away ${expired.emoji} ${expired.name} immediately! It has expired.`;
    
    const urgent = items.find(i => i.status === 'urgent');
    if (urgent) return `Swipe left on ${urgent.emoji} ${urgent.name} to remove it quickly.`;
    
    const warning = items.find(i => i.status === 'warning');
    if (warning) return `${warning.emoji} ${warning.name} expires in ${warning.daysLeft} days — plan a meal!`;
    
    return 'Great job! All items are fresh. Add groceries to keep tracking.';
  }, [items]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <ScrollView style={{ backgroundColor: colors.bg }} showsVerticalScrollIndicator={false}>

        {/* ── HERO HEADER ─────────────────────────────────────────── */}
        <LinearGradient colors={[colors.primary, colors.primaryMid]} style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroGreet}>Welcome back 👋</Text>
              <Text style={s.heroTitle}>Your Kitchen</Text>
              <Text style={s.heroSub}>Keep track of your fresh food</Text>
            </View>
            <TouchableOpacity style={s.btBadge}>
              <Ionicons name="bluetooth" size={14} color="#fff" />
              <Text style={s.btText}>Connected</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            {[
              { val: stats.total,    label: 'Total Items' },
              { val: stats.expiring, label: 'Expiring Soon', warn: true },
              { val: stats.expired,  label: 'Expired',       err: true }, // Updated to match stats.expired
            ].map((st, i) => (
              <View key={i} style={s.statBox}>
                <Text style={[s.statNum, st.warn && s.statWarn, st.err && s.statErr]}>
                  {st.val}
                </Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Curved bottom */}
          <View style={[s.heroBottom, { backgroundColor: colors.bg }]} />
        </LinearGradient>

        <View style={s.content}>

          {/* ── SMART TIP ──────────────────────────────────────────── */}
          <View style={[s.tip, { backgroundColor: colors.primaryPale, borderColor: colors.primaryLight }]}>
            <Ionicons name="bulb-outline" size={16} color={colors.primary} />
            <Text style={[s.tipText, { color: colors.primary }]}>{smartTip}</Text>
          </View>

          {/* ── EXPIRING SOON LIST ─────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
                Expires Soon
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Inventory')}>
                <Text style={[s.seeAll, { color: colors.primary }]}>See all →</Text>
              </TouchableOpacity>
            </View>

            {expiringSoon.length === 0 ? (
              <View style={[s.emptyBox, { backgroundColor: colors.card }]}>
                <Text style={s.emptyEmoji}>🎉</Text>
                <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                  Nothing expiring this week!
                </Text>
              </View>
            ) : (
              <View style={[s.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {expiringSoon.map((item, idx) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onDone={markUsed}
                    onDelete={removeItem}
                    isLast={idx === expiringSoon.length - 1}
                    colors={colors}
                  />
                ))}
              </View>
            )}
          </View>

          {/* ── POINTS MINI-CARD ───────────────────────────────────── */}
          <TouchableOpacity
            style={[s.pointsBanner, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <View>
              <Text style={s.pointsLabel}>Your impact this week</Text>
              <Text style={s.pointsNum}>+{points} pts</Text>
            </View>
            <View style={s.streakBox}>
              <Text style={s.streakEmoji}>🔥</Text>
              <Text style={s.streakNum}>{streak} day streak</Text>
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  hero:        { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 60 },
  heroTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroGreet:   { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  heroTitle:   { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 2 },
  heroSub:     { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  btBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5,
                 backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  btText:      { color: '#fff', fontSize: 11, fontWeight: '500' },
  statsRow:    { flexDirection: 'row', gap: 10 },
  statBox:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum:     { color: '#fff', fontSize: 24, fontWeight: '700' },
  statWarn:    { color: '#fcd34d' },
  statErr:     { color: '#fca5a5' },
  statLabel:   { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2, textAlign: 'center' },
  heroBottom:  { position: 'absolute', bottom: 0, left: -20, right: -20, height: 36, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  content:     { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20 },
  tip:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12,
                 borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  tipText:     { flex: 1, fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
  section:     { marginBottom: 20 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:{ fontSize: 17, fontWeight: '600' },
  seeAll:      { fontSize: 13, fontWeight: '500' },
  listCard:    { borderRadius: 16, borderWidth: 0.5, overflow: 'hidden' },
  emptyBox:    { borderRadius: 16, padding: 28, alignItems: 'center' },
  emptyEmoji:  { fontSize: 32, marginBottom: 8 },
  emptyText:   { fontSize: 14 },
  pointsBanner:{ borderRadius: 16, padding: 18, flexDirection: 'row',
                 justifyContent: 'space-between', alignItems: 'center' },
  pointsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  pointsNum:   { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  streakBox:   { alignItems: 'center' },
  streakEmoji: { fontSize: 22 },
  streakNum:   { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
});