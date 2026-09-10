import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  PanResponder, Animated, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { differenceInCalendarDays } from 'date-fns';

const SCREEN_W   = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 60;   
const SWIPE_MAX  = 80;        

// ── Default baseline shelf life (days) used when we can't derive a real one ──
const DEFAULT_BASELINE_DAYS = 7;

// ── Status → pill badge styling ──
const STATUS_BADGES = {
  fresh:   { bg: '#e8f4ec', text: '#3a6649', label: 'Fresh' },
  warning: { bg: '#fef3c7', text: '#b45309', label: 'Warning' },
  urgent:  { bg: '#fee2e2', text: '#b91c1c', label: 'Urgent' },
  expired: { bg: '#fecdd3', text: '#991b1b', label: 'Expired' },
};

// ── Shelf-life % remaining, derived from daysLeft vs. total shelf life ──
// If item.createdAt is present, total shelf life = days between createdAt and
// expiryDate. Otherwise falls back to a 7-day baseline.
function computeShelfLifePercent(item) {
  let totalDays = DEFAULT_BASELINE_DAYS;

  if (item.createdAt && item.expiryDate) {
    const created = new Date(item.createdAt);
    const expiry  = new Date(item.expiryDate);
    const diff    = differenceInCalendarDays(expiry, created);
    if (Number.isFinite(diff) && diff > 0) totalDays = diff;
  }

  if (!Number.isFinite(item.daysLeft)) return 0;
  const pct = (item.daysLeft / totalDays) * 100;
  return Math.max(0, Math.min(100, pct));
}

function progressColor(pct) {
  if (pct > 50) return '#3a6649';   // Green
  if (pct >= 20) return '#b45309';  // Amber
  return '#b91c1c';                 // Red
}

export default function ItemCard({ item, onDone, onDelete, isLast, colors }) {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(0)).current;

  // ── FIX: Explicitly handle 0 days left and expired items ──
  const isExpired = item.daysLeft <= 0;
  const statusKey = isExpired ? 'expired' : (item.status || 'fresh');
  const badge = STATUS_BADGES[statusKey] || STATUS_BADGES.fresh;

  const shelfPct   = computeShelfLifePercent(item);
  const barColor   = progressColor(shelfPct);

  const dotColor = {
    expired: '#e74c3c', // Strong red for expired
    urgent:  colors?.urgent  || '#c0534a',
    warning: colors?.warning || '#c98a3a',
    fresh:   colors?.fresh   || '#5a8f6b',
  }[statusKey] || '#5a8f6b';

  // ── FIX: Change the whole background tab if expired ──
  // Checks if you are in dark mode to pick the right shade of red
  const cardBg = isExpired 
    ? (colors?.bg === '#141c17' ? '#3d1c1c' : '#fee2e2') 
    : (colors?.card || '#ffffff');

  const textMain = colors?.textPrimary || '#1a2318';
  const textSub = colors?.textSecondary || '#6b7b6e';

  let daysLabel = `${item.daysLeft} days left`;
  if (item.daysLeft === 0) daysLabel = 'Expires Today';
  if (item.daysLeft < 0) daysLabel = `Expired ${Math.abs(item.daysLeft)} days ago`;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
    onPanResponderGrant: () => {
      translateX.extractOffset();
    },
    onPanResponderMove: Animated.event([null, { dx: translateX }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      translateX.flattenOffset();
      if (g.dx > SWIPE_THRESHOLD) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.timing(translateX, { toValue: SCREEN_W, duration: 200, useNativeDriver: true }).start(() => onDone?.(item.id));
      } else if (g.dx < -SWIPE_THRESHOLD) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Animated.timing(translateX, { toValue: -SCREEN_W, duration: 200, useNativeDriver: true }).start(() => onDelete?.(item.id));
      } else {
        Animated.spring(translateX, { toValue: 0, bounciness: 10, useNativeDriver: true }).start();
      }
    }
  })).current;

  return (
    <View style={[s.outer, !isLast && { marginBottom: 12 }]}>
      {/* Shadow lives on the un-clipped wrapper so it isn't cut off by the
          rounded-corner clip mask used to hide the swipe actions below. */}
      <View style={s.shadowWrap}>
        <View style={s.clip}>
          <View style={s.actionsBg}>
            <View style={s.actionLeft}><Text style={s.actionText}>Used ✓</Text></View>
            <View style={s.actionRight}><Text style={s.actionText}>Trash 🗑</Text></View>
          </View>

          <Animated.View
            style={[s.card, { backgroundColor: cardBg, transform: [{ translateX }] }]}
            {...panResponder.panHandlers}
          >
            {/* ── FIX: Wrap content in TouchableOpacity to open Edit Screen ── */}
            <TouchableOpacity
              activeOpacity={0.6}
              style={s.touchArea}
              onPress={() => navigation.navigate('EditItem', { item })}
            >
              <Text style={s.emoji}>{item.emoji}</Text>

              <View style={s.info}>
                <Text
                  style={[
                    s.name,
                    { color: isExpired ? '#e74c3c' : textMain },
                    statusKey === 'expired' && s.strike,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                <View style={[s.progressTrack, { backgroundColor: colors?.border || 'rgba(0,0,0,0.08)' }]}>
                  <View style={[s.progressFill, { width: `${shelfPct}%`, backgroundColor: barColor }]} />
                </View>

                <Text style={[s.days, { color: isExpired ? '#c0392b' : (item.status === 'urgent' ? dotColor : textSub) }]}>
                  {daysLabel}
                </Text>
              </View>

              <View style={s.rightCol}>
                {item.quantity ? (
                  <Text style={[s.qty, { color: textSub }]}>{item.quantity}</Text>
                ) : null}
                <View style={[s.pill, { backgroundColor: badge.bg }]}>
                  <Text style={[s.pillText, { color: badge.text }]}>{badge.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outer:      { position: 'relative' },
  shadowWrap: {
    borderRadius: 16,
    shadowColor: '#4a7c59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  clip:       { borderRadius: 16, overflow: 'hidden' },
  actionsBg:  { ...StyleSheet.absoluteFillObject, flexDirection: 'row', borderRadius: 16 },
  actionLeft: { flex: 1, backgroundColor: '#27ae60', justifyContent: 'center', paddingLeft: 20 },
  actionRight:{ flex: 1, backgroundColor: '#e74c3c', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 20 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card:       { borderRadius: 16, borderWidth: 0.5, borderColor: '#e2ddd6' },
  touchArea:  { flexDirection: 'row', alignItems: 'center', padding: 16 },
  emoji:      { fontSize: 28, marginRight: 14 },
  info:       { flex: 1, justifyContent: 'center' },
  name:       { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  strike:     { textDecorationLine: 'line-through' },
  progressTrack: { height: 3, borderRadius: 1.5, overflow: 'hidden', marginBottom: 6 },
  progressFill:  { height: 3, borderRadius: 1.5 },
  days:       { fontSize: 12, fontWeight: '500' },
  rightCol:   { alignItems: 'flex-end', marginLeft: 8, gap: 6 },
  qty:        { fontSize: 13, fontWeight: '500' },
  pill:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText:   { fontSize: 10, fontWeight: '700' },
});
