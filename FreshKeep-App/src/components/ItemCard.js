import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  PanResponder, Animated, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

const SCREEN_W   = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 60;   
const SWIPE_MAX  = 80;        

export default function ItemCard({ item, onDone, onDelete, isLast, colors }) {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(0)).current;

  // ── FIX: Explicitly handle 0 days left and expired items ──
  const isExpired = item.daysLeft <= 0;
  
  const dotColor = {
    expired: '#e74c3c', // Strong red for expired
    urgent:  colors?.urgent  || '#c0534a',
    warning: colors?.warning || '#c98a3a',
    fresh:   colors?.fresh   || '#5a8f6b',
  }[isExpired ? 'expired' : item.status] || '#5a8f6b';

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
      translateX.setOffset(translateX._value);
      translateX.setValue(0);
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
            <Text style={[s.name, { color: isExpired ? '#e74c3c' : textMain }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[s.days, { color: isExpired ? '#c0392b' : (item.status === 'urgent' ? dotColor : textSub) }]}>
              {daysLabel}
            </Text>
          </View>
          {item.quantity ? (
            <Text style={[s.qty, { color: textSub }]}>{item.quantity}</Text>
          ) : null}
          <View style={[s.dot, { backgroundColor: dotColor }]} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  outer:      { position: 'relative', overflow: 'hidden' },
  actionsBg:  { ...StyleSheet.absoluteFillObject, flexDirection: 'row', borderRadius: 16 },
  actionLeft: { flex: 1, backgroundColor: '#27ae60', justifyContent: 'center', paddingLeft: 20 },
  actionRight:{ flex: 1, backgroundColor: '#e74c3c', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 20 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card:       { borderRadius: 16, borderWidth: 0.5, borderColor: '#e2ddd6' },
  touchArea:  { flexDirection: 'row', alignItems: 'center', padding: 16 },
  emoji:      { fontSize: 28, marginRight: 14 },
  info:       { flex: 1, justifyContent: 'center' },
  name:       { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  days:       { fontSize: 12, fontWeight: '500' },
  qty:        { fontSize: 13, marginRight: 12, fontWeight: '500' },
  dot:        { width: 10, height: 10, borderRadius: 5 },
});