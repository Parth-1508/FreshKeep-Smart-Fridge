// src/screens/ProfileScreen.js
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Switch, Alert, StatusBar, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import { useTheme }     from '../context/ThemeContext';

const ACHIEVEMENTS = [
  { id:'a1', emoji:'🥇', title:'First Saver',        desc:'Used your first item before expiry'   },
  { id:'a2', emoji:'⚔️',  title:'Waste Warrior',      desc:'Saved 5 items in a single week'       },
  { id:'a3', emoji:'🔥', title:'Consistency Master',  desc:'Maintained a 7-day streak'            },
  { id:'a4', emoji:'♻️', title:'Eco Hero',            desc:'Saved 20 items total'                 },
  { id:'a5', emoji:'🌱', title:'Green Starter',       desc:'Added 10 items to inventory'          },
];

const REMINDER_OPTIONS = [
  '1 day before','2 days before','3 days before','5 days before','7 days before',
];

export default function ProfileScreen() {
  // ── PATCHED: Added removeItem to the destructured context ──
  const { points, streak, items, lastSaveDate, logout, userName, clearAll, removeItem } = useInventory();
  const { colors: C, isDark, toggleDark } = useTheme();
  const navigation = useNavigation();

  const [notifOn,      setNotifOn]      = useState(true);
  const [reminderIdx,  setReminderIdx]  = useState(1);
  const [showReminder, setShowReminder] = useState(false);
  const [btConnected,  setBtConnected]  = useState(false);

  const itemsSaved    = Math.max(0, Math.floor((points - items.length * 5) / 12));
  const co2Saved      = (itemsSaved * 0.4).toFixed(1);
  const level         = points >= 300 ? 'Gold' : points >= 100 ? 'Silver' : 'Bronze';
  const nextThreshold = points >= 300 ? 600    : points >= 100 ? 300      : 100;
  const nextLevel     = level === 'Gold' ? 'Platinum' : level === 'Silver' ? 'Gold' : 'Silver';
  const progress      = Math.min(1, points / nextThreshold);

  const { isToday, isYesterday } = require('date-fns');
  const savedToday = lastSaveDate ? isToday(new Date(lastSaveDate)) : false;
  const savedYesterday = lastSaveDate ? isYesterday(new Date(lastSaveDate)) : false;
  const streakAtRisk = !savedToday && !savedYesterday && streak > 0;

  function isAchieved(id) {
    if (id === 'a1') return itemsSaved >= 1;
    if (id === 'a2') return itemsSaved >= 5;
    if (id === 'a3') return streak >= 7;
    if (id === 'a4') return itemsSaved >= 20;
    if (id === 'a5') return items.length >= 10;
    return false;
  }

  function handleLogout() {
    Alert.alert(
      'Log Out',
      'This will clear all your data and return you to the login screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  }

  // ── PATCHED: Safe clear function that protects stats ──
  function handleClearData() {
    Alert.alert(
      'Clear Inventory',
      'This deletes all your food items, but your points and streak will be safe!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: () => {
            items.forEach(item => removeItem(item.id));
          } 
        },
      ]
    );
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: C.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      <ScrollView style={{ backgroundColor: C.bg }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}>

        <LinearGradient colors={[C.primary, C.primaryMid]} style={s.hero}>
          {userName ? <Text style={s.heroGreet}>Hey, {userName} 👋</Text> : null}
          <Text style={s.heroTitle}>Profile</Text>
          <Text style={s.heroSub}>Track your impact</Text>
          <View style={[s.heroBottom, { backgroundColor: C.bg }]} />
        </LinearGradient>

        <View style={s.content}>

          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border, padding:18, marginBottom:16 }]}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:14, marginBottom:14 }}>
              <Text style={{ fontSize:40 }}>🏅</Text>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:12, color: C.textSecondary }}>{points} points earned</Text>
                <Text style={{ fontSize:30, fontWeight:'700', color: C.primary, lineHeight:36 }}>+{points}</Text>
                <Text style={{ fontSize:11, color: C.textSecondary, marginTop:3 }}>
                  {nextThreshold - points} more to {nextLevel}
                </Text>
              </View>
              <View style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor: C.primaryPale }}>
                <Text style={{ fontSize:13, fontWeight:'600', color: C.primary }}>{level}</Text>
              </View>
            </View>
            <View style={{ height:7, borderRadius:4, overflow:'hidden', backgroundColor: C.primaryPale }}>
              <View style={{ height:7, borderRadius:4, width:`${progress*100}%`, backgroundColor: C.primary }} />
            </View>
            <Text style={{ fontSize:11, marginTop:5, textAlign:'right', color: C.textLight }}>
              {Math.round(progress*100)}% to {nextLevel}
            </Text>
          </View>

          <View style={{ flexDirection:'row', gap:8, marginBottom:22 }}>
            {[
              { val: items.length,         label:'Items\nTracked',  icon:'cube-outline'          },
              { val: streak,               label:'Day\nStreak',     icon:'flame-outline',
                color: streak === 0 ? C.urgent : streakAtRisk ? C.warning : undefined },
              { val: itemsSaved,           label:'Items\nSaved',    icon:'leaf-outline'           },
              { val: `${co2Saved}kg`,      label:'CO₂\nSaved',     icon:'earth-outline'          },
            ].map((st, i) => (
              <View key={i} style={[s.statBox, { backgroundColor: C.card, borderColor: C.border }]}>
                <Ionicons name={st.icon} size={18} color={st.color || C.primary} />
                <Text style={{ fontSize:17, fontWeight:'700', color: st.color || C.textPrimary }}>
                  {st.val}
                </Text>
                <Text style={{ fontSize:9, textAlign:'center', lineHeight:13, color: C.textSecondary }}>
                  {st.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={[s.streakBanner, {
            backgroundColor: savedToday ? C.primaryPale
              : streakAtRisk ? C.urgent + '18'
              : C.card,
            borderColor: savedToday ? C.primaryLight
              : streakAtRisk ? C.urgent
              : C.border,
          }]}>
            <Text style={{ fontSize:24 }}>
              {savedToday ? '🔥' : streakAtRisk ? '⚠️' : streak === 0 ? '💤' : '⏳'}
            </Text>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:13, fontWeight:'600',
                color: savedToday ? C.primary : streakAtRisk ? C.urgent : C.textPrimary }}>
                {savedToday
                  ? `Streak active! +${streak} days consecutive`
                  : streakAtRisk
                  ? 'Your streak is at risk!'
                  : streak === 0
                  ? 'Start your streak today'
                  : 'Save an item to extend your streak'}
              </Text>
              <Text style={{ fontSize:11, color: C.textSecondary, marginTop:2 }}>
                {savedToday
                  ? 'You already saved an item today — come back tomorrow!'
                  : streakAtRisk
                  ? 'Use an item before it expires to keep your streak going'
                  : 'Use or mark an item as done to count toward your streak'}
              </Text>
            </View>
          </View>

          <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Achievements</Text>
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border, marginBottom:22 }]}>
            {ACHIEVEMENTS.map((ach, i) => {
              const done = isAchieved(ach.id);
              return (
                <View key={ach.id} style={[
                  { flexDirection:'row', alignItems:'center', gap:12, padding:14 },
                  i > 0 && { borderTopWidth:0.5, borderTopColor: C.border },
                ]}>
                  <Text style={{ fontSize:26, opacity: done ? 1 : 0.3 }}>{ach.emoji}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:14, fontWeight:'500',
                      color: done ? C.textPrimary : C.textLight }}>{ach.title}</Text>
                    <Text style={{ fontSize:11, marginTop:2, color: C.textSecondary }}>{ach.desc}</Text>
                  </View>
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22} color={done ? C.primary : C.textLight}
                  />
                </View>
              );
            })}
          </View>

          <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Settings</Text>
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border, marginBottom:22 }]}>

            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: isDark ? '#2a3f2d' : C.primaryPale }]}>
                <Ionicons name="moon-outline" size={18} color={C.primary} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'500', color: C.textPrimary }}>Dark Mode</Text>
                <Text style={{ fontSize:11, marginTop:2, color: C.textSecondary }}>Switch to dark theme</Text>
              </View>
              <Switch value={isDark} onValueChange={toggleDark}
                trackColor={{ false: C.border, true: C.primaryLight }}
                thumbColor={isDark ? C.primary : '#f4f3f4'} />
            </View>

            <View style={[s.divider, { backgroundColor: C.border }]} />

            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: isDark ? '#2a3f2d' : C.primaryPale }]}>
                <Ionicons name="notifications-outline" size={18} color={C.primary} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'500', color: C.textPrimary }}>Push Notifications</Text>
                <Text style={{ fontSize:11, marginTop:2, color: C.textSecondary }}>Get expiry reminders</Text>
              </View>
              <Switch value={notifOn} onValueChange={setNotifOn}
                trackColor={{ false: C.border, true: C.primaryLight }}
                thumbColor={notifOn ? C.primary : '#f4f3f4'} />
            </View>

            <View style={[s.divider, { backgroundColor: C.border }]} />

            <TouchableOpacity style={s.row} onPress={() => setShowReminder(!showReminder)}>
              <View style={[s.rowIcon, { backgroundColor: isDark ? '#2a3f2d' : C.primaryPale }]}>
                <Ionicons name="alarm-outline" size={18} color={C.primary} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'500', color: C.textPrimary }}>Reminder Timing</Text>
                <Text style={{ fontSize:11, marginTop:2, color: C.textSecondary }}>
                  Notify {REMINDER_OPTIONS[reminderIdx]}
                </Text>
              </View>
              <Ionicons name={showReminder ? 'chevron-up':'chevron-forward'} size={16} color={C.textLight} />
            </TouchableOpacity>

            {showReminder && (
              <View style={{ marginHorizontal:14, borderRadius:10, borderWidth:0.5,
                borderColor: C.border, overflow:'hidden', marginBottom:6, backgroundColor: C.bg }}>
                {REMINDER_OPTIONS.map((opt, i) => (
                  <TouchableOpacity key={i}
                    style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                      padding:12, paddingHorizontal:16,
                      backgroundColor: i === reminderIdx ? C.primaryPale : 'transparent' }}
                    onPress={() => { setReminderIdx(i); setShowReminder(false); }}>
                    <Text style={{ fontSize:13, color: i === reminderIdx ? C.primary : C.textPrimary }}>
                      {opt}
                    </Text>
                    {i === reminderIdx && <Ionicons name="checkmark" size={16} color={C.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[s.divider, { backgroundColor: C.border }]} />

            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('PairMagnet')}>
              <View style={[s.rowIcon, { backgroundColor: isDark ? '#1e2d20' : '#e8f4ec' }]}>
                <Image 
                  source={require('../../assets/magnet-icon.png')} 
                  style={{ width: 20, height: 20, resizeMode: 'contain' }} 
                />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'500', color: C.textPrimary }}>Pair Expiry Magnet</Text>
                <Text style={{ fontSize:11, marginTop:2, color: C.textSecondary }}>
                  {btConnected ? '● Connected via Bluetooth' : 'Tap to pair your fridge device'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textLight} />
            </TouchableOpacity>

            <View style={[s.divider, { backgroundColor: C.border }]} />

            <TouchableOpacity style={s.row} onPress={handleClearData}>
              <View style={[s.rowIcon, { backgroundColor: isDark ? '#2d1e1e' : '#fef2f2' }]}>
                <Ionicons name="trash-outline" size={18} color="#e74c3c" />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'500', color:'#e74c3c' }}>Clear Inventory</Text>
                <Text style={{ fontSize:11, marginTop:2, color: C.textSecondary }}>Remove all food items</Text>
              </View>
            </TouchableOpacity>

            <View style={[s.divider, { backgroundColor: C.border }]} />

            <TouchableOpacity style={s.row} onPress={handleLogout}>
              <View style={[s.rowIcon, { backgroundColor: isDark ? '#2d1e1e' : '#fef2f2' }]}>
                <Ionicons name="log-out-outline" size={18} color="#e74c3c" />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'500', color:'#e74c3c' }}>Log Out</Text>
                <Text style={{ fontSize:11, marginTop:2, color: C.textSecondary }}>
                  Clears all data and returns to login
                </Text>
              </View>
            </TouchableOpacity>

          </View>

          <View style={[s.magnetCard, {
            backgroundColor: btConnected ? C.primaryPale : C.card,
            borderColor:     btConnected ? C.primaryLight : C.border,
          }]}>
            <Image 
              source={require('../../assets/magnet-icon.png')} 
              style={{ width: 34, height: 34, resizeMode: 'contain' }} 
            />
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:15, fontWeight:'600', color: C.primary }}>
                Smart Fridge Magnet
              </Text>
              <Text style={{ fontSize:12, marginTop:3, color: C.textSecondary }}>
                {btConnected ? `● Connected · ${Math.min(items.length,5)} items synced` : '○ Not connected'}
              </Text>
            </View>
            <TouchableOpacity style={[s.btBtn, { backgroundColor: C.primary }]}
              onPress={() => setBtConnected(v => !v)}>
              <Ionicons name="bluetooth" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.logoutBtn, { borderColor: '#e74c3c' }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color="#e74c3c" />
            <Text style={{ fontSize:15, fontWeight:'600', color:'#e74c3c' }}>Log Out</Text>
          </TouchableOpacity>

          <Text style={{ fontSize:11, textAlign:'center', color: C.textLight, marginTop:8 }}>
            FreshKeep v1.0.0 · MIT ADT University · Group 3
          </Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero:         { padding:24, paddingTop:20, paddingBottom:56 },
  heroGreet:    { color:'rgba(255,255,255,0.7)', fontSize:13, marginBottom:2 },
  heroTitle:    { color:'#fff', fontSize:26, fontWeight:'700' },
  heroSub:      { color:'rgba(255,255,255,0.65)', fontSize:13, marginTop:3 },
  heroBottom:   { position:'absolute', bottom:0, left:-20, right:-20, height:36,
                  borderTopLeftRadius:28, borderTopRightRadius:28 },
  content:      { padding:18 },
  card:         { borderRadius:16, borderWidth:0.5, overflow:'hidden' },
  statBox:      { flex:1, borderRadius:14, borderWidth:0.5, padding:12, alignItems:'center', gap:5 },
  sectionTitle: { fontSize:17, fontWeight:'600', marginBottom:10 },
  streakBanner: { flexDirection:'row', alignItems:'flex-start', gap:12, padding:14,
                  borderRadius:14, borderWidth:1, marginBottom:22 },
  row:          { flexDirection:'row', alignItems:'center', gap:12, padding:14 },
  rowIcon:      { width:36, height:36, borderRadius:10, alignItems:'center', justifyContent:'center' },
  divider:      { height:0.5, marginHorizontal:14 },
  magnetCard:   { borderRadius:16, borderWidth:1, padding:16, flexDirection:'row',
                  alignItems:'center', gap:12, marginBottom:20 },
  btBtn:        { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  logoutBtn:    { flexDirection:'row', alignItems:'center', justifyContent:'center',
                  gap:8, borderWidth:1.5, borderRadius:14, padding:15, marginBottom:16 },
});