import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function UndoToast({ visible, message, onUndo, onDismiss, colors }) {
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  function handleUndo() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUndo?.();
  }

  function handleDismiss() {
    Animated.timing(translateY, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss?.();
    });
  }

  if (!visible) return null;

  return (
    <Animated.View style={[st.container, { transform: [{ translateY }], backgroundColor: colors.card, borderColor: colors.primary }]}>
      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
      <Text style={[st.message, { color: colors.textPrimary }]} numberOfLines={1}>
        {message}
      </Text>
      <TouchableOpacity style={[st.undoBtn, { backgroundColor: colors.primaryPale }]} onPress={handleUndo}>
        <Text style={[st.undoText, { color: colors.primary }]}>UNDO</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  message: { flex: 1, fontSize: 13, fontWeight: '600', marginHorizontal: 10 },
  undoBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  undoText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});
