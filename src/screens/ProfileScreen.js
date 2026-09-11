// src/screens/ProfileScreen.js
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Switch, Alert, StatusBar, Image, Modal, Linking, Clipboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { isToday, isYesterday } from 'date-fns';
import { useInventory } from '../context/InventoryContext';
import { useTheme }     from '../context/ThemeContext';
import { REWARDS_CATALOG } from '../constants/rewardsCatalog';

const ACHIEVEMENTS = [
  { id:'a1', emoji:'🥇', title:'First Saver',        desc:'Used your first item before expiry'   },
  { id:'a2', emoji:'⚔️',  title:'Waste Warrior',      desc:'Saved 5 items in a single week'       },
  { id:'a3', emoji:'🔥', title:'Consistency Master',  desc:'Maintained a 7-day streak'            },
  { id:'a4', emoji:'♻️', title:'Eco Hero',            desc:'Saved 20 items total'                 },
  { id:'a5', emoji:'🌱', title:'Green Starter',       desc:'Added 10 items to inventory'          },
];

// ── 🌱 Impact ledger milestones — unlocked as the lifetime savings ledger grows ──
const IMPACT_MILESTONES = [
  { id:'eco1',   emoji:'🌱', title:'Eco Warrior',       desc:'5kg CO₂ Saved',      check: s => s.totalCO2Prevented >= 5   },
  { id:'eco2',   emoji:'🌍', title:'Planet Protector',  desc:'20kg CO₂ Saved',     check: s => s.totalCO2Prevented >= 20  },
  { id:'money1', emoji:'💰', title:'Budget Saver',      desc:'₹500 Saved',        check: s => s.totalRupeesSaved >= 500  },
  { id:'money2', emoji:'🏆', title:'Thrifty Champion',  desc:'₹2000 Saved',       check: s => s.totalRupeesSaved >= 2000 },
  { id:'rescue1',emoji:'🛟', title:'Waste Buster',      desc:'25 Items Rescued',  check: s => s.totalItemsRescued >= 25  },
];

const REMINDER_OPTIONS = [
  '1 day before','2 days before','3 days before','5 days before','7 days before',
];

export default function ProfileScreen() {
  const {
    points, streak, items, lastSaveDate, logout, userName, clearAll, removeItem, redeemReward,
    totalRupeesSaved, totalCO2Prevented, totalItemsRescued,
  } = useInventory();
  const { colors: C, isDark, toggleDark } = useTheme();
  const navigation = useNavigation();

  const [notifOn,          setNotifOn]          = useState(true);
  const [reminderIdx,      setReminderIdx]      = useState(1);
  const [showReminder,     setShowReminder]     = useState(false);
  const [btConnected,      setBtConnected]      = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [redeemedVoucher,  setRedeemedVoucher]  = useState(null);

  const level         = points >= 300 ? 'Gold' : points >= 100 ? 'Silver' : 'Bronze';
  const nextThreshold = points >= 300 ? 600    : points >= 100 ? 300      : 100;
  const nextLevel     = level === 'Gold' ? 'Platinum' : level === 'Silver' ? 'Gold' : 'Silver';
  const progress      = Math.min(1, points / nextThreshold);

  const savedToday = lastSaveDate ? isToday(new Date(lastSaveDate)) : false;
  const savedYesterday = lastSaveDate ? isYesterday(new Date(lastSaveDate)) : false;
  const streakAtRisk = !savedToday && !savedYesterday && streak > 0;

  function isAchieved(id) {
    if (id === 'a1') return totalItemsRescued >= 1;
    if (id === 'a2') return totalItemsRescued >= 5;
    if (id === 'a3') return streak >= 7;
    if (id === 'a4') return totalItemsRescued >= 20;
    if (id === 'a5') return items.length >= 10;
    return false;
  }

  async function handleRedeemReward(item) {
    if (points < item.pointsCost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const needed = item.pointsCost - points;
      Alert.alert(
        "Insufficient Points",
        `You need ${needed} more points to unlock this voucher! Rescue more food items from your fridge to earn points.`
      );
      return;
    }

    const success = await redeemReward(item.pointsCost);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRedeemedVoucher(item);
    } else {
      Alert.alert("Error", "Could not redeem voucher right now.");
    }
  }

  function handleCopyCode(code) {
    try {
      Clipboard.setString(code);
    } catch (e) {
      console.warn("Clipboard fallback:", e);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Copied!", `Coupon code '${code}' copied to clipboard.`);
  }

  async function handleOpenAffiliate(url) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch (e) {
      console.error("Link Open Error:", e);
    }
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

          {/* ── 🎁 REWARDS & COUPONS MARKETPLACE BANNER BUTTON ── */}
          <TouchableOpacity
            style={[s.rewardsBannerBtn, { backgroundColor: C.primary }]}
            onPress={() => setShowRewardsModal(true)}
            activeOpacity={0.88}
          >
            <Ionicons name="gift-outline" size={20} color="#fff" />
            <Text style={s.rewardsBannerText}>🎁 Rewards & Coupons Marketplace</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>

          {/* ── 🌱 LIVE IMPACT LEDGER: ₹ Money Saved / kg CO2 Prevented ── */}
          <View style={[s.impactCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={s.impactCol}>
              <Text style={{ fontSize:22 }}>₹</Text>
              <Text style={[s.impactValue, { color: C.primary }]}>{totalRupeesSaved.toFixed(0)}</Text>
              <Text style={[s.impactLabel, { color: C.textSecondary }]}>Money Saved</Text>
            </View>
            <View style={[s.impactDivider, { backgroundColor: C.border }]} />
            <View style={s.impactCol}>
              <Text style={{ fontSize:22 }}>🌱</Text>
              <Text style={[s.impactValue, { color: C.primary }]}>{totalCO2Prevented.toFixed(1)}kg</Text>
              <Text style={[s.impactLabel, { color: C.textSecondary }]}>CO₂ Prevented</Text>
            </View>
          </View>

          {/* ── 🏅 Milestone unlock chips ── */}
          <View style={s.milestoneRow}>
            {IMPACT_MILESTONES.map(m => {
              const unlocked = m.check({ totalRupeesSaved, totalCO2Prevented, totalItemsRescued });
              return (
                <View key={m.id} style={[
                  s.milestoneChip,
                  { backgroundColor: unlocked ? C.primaryPale : C.card, borderColor: unlocked ? C.primary : C.border },
                ]}>
                  <Text style={{ fontSize:14, opacity: unlocked ? 1 : 0.35 }}>{m.emoji}</Text>
                  <Text style={{ fontSize:11.5, fontWeight:'600', marginLeft:5, color: unlocked ? C.primary : C.textLight }}>
                    {m.title}: {m.desc}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection:'row', gap:8, marginBottom:22 }}>
            {[
              { val: items.length,         label:'Items\nTracked',  icon:'cube-outline'          },
              { val: streak,               label:'Day\nStreak',     icon:'flame-outline',
                color: streak === 0 ? C.urgent : streakAtRisk ? C.warning : undefined },
              { val: totalItemsRescued,    label:'Items\nRescued',  icon:'leaf-outline'           },
              { val: `${totalCO2Prevented.toFixed(1)}kg`, label:'CO₂\nSaved', icon:'earth-outline' },
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

      {/* ── 🎁 REWARDS & COUPONS MARKETPLACE MODAL ── */}
      <Modal visible={showRewardsModal} animationType="slide" onRequestClose={() => setShowRewardsModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={[s.rewardsModalHeader, { backgroundColor: C.primary }]}>
            <View>
              <Text style={s.rewardsModalTitle}>🎁 Rewards Marketplace</Text>
              <Text style={s.rewardsModalSub}>Redeem points for real brand vouchers</Text>
            </View>
            <TouchableOpacity onPress={() => setShowRewardsModal(false)} style={s.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>

            {/* Points balance display banner */}
            <View style={[s.pointsCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <Ionicons name="trophy" size={24} color={C.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>Available Balance</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: C.textPrimary }}>{points} Points</Text>
              </View>
              <View style={[s.pointsBadge, { backgroundColor: C.primaryPale }]}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.primary }}>Level: {level}</Text>
              </View>
            </View>

            {/* Unlocked Voucher Success Card */}
            {redeemedVoucher && (
              <View style={[s.successCard, { backgroundColor: C.card, borderColor: C.primary }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="checkmark-circle" size={24} color={C.primary} />
                  <Text style={[s.successTitle, { color: C.textPrimary }]}>Voucher Unlocked!</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.textPrimary }}>{redeemedVoucher.brand} — {redeemedVoucher.title}</Text>
                <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{redeemedVoucher.desc}</Text>

                <View style={[s.codeBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <Text style={[s.codeText, { color: C.primary }]}>{redeemedVoucher.code}</Text>
                  <TouchableOpacity style={[s.copyBtn, { backgroundColor: C.primaryPale }]} onPress={() => handleCopyCode(redeemedVoucher.code)}>
                    <Ionicons name="copy-outline" size={16} color={C.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: C.primary, marginLeft: 4 }}>Copy</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[s.affiliateBtn, { backgroundColor: C.primary }]} onPress={() => handleOpenAffiliate(redeemedVoucher.affiliateUrl)}>
                  <Text style={s.affiliateBtnText}>Shop & Apply Deal ↗</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ alignSelf: 'center', marginTop: 10 }} onPress={() => setRedeemedVoucher(null)}>
                  <Text style={{ fontSize: 12, color: C.textSecondary, textDecorationLine: 'underline' }}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[s.sectionTitle, { color: C.textPrimary, marginTop: 10 }]}>Featured Partner Offers</Text>

            {REWARDS_CATALOG.map((reward) => {
              const canAfford = points >= reward.pointsCost;
              return (
                <View key={reward.id} style={[s.rewardCard, { backgroundColor: C.card, borderColor: C.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={[s.brandIconCircle, { backgroundColor: reward.color + '20' }]}>
                      <Ionicons name={reward.icon || 'gift'} size={22} color={reward.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.rewardBrand, { color: reward.color }]}>{reward.brand}</Text>
                      <Text style={[s.rewardTitle, { color: C.textPrimary }]}>{reward.title}</Text>
                    </View>
                    <View style={[s.costChip, { backgroundColor: canAfford ? C.primaryPale : C.border }]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: canAfford ? C.primary : C.textSecondary }}>
                        ⚡ {reward.pointsCost} pts
                      </Text>
                    </View>
                  </View>

                  <Text style={[s.rewardDesc, { color: C.textSecondary }]}>{reward.desc}</Text>

                  <TouchableOpacity
                    style={[
                      s.redeemBtn,
                      { backgroundColor: canAfford ? C.primary : C.border, opacity: canAfford ? 1 : 0.6 }
                    ]}
                    onPress={() => handleRedeemReward(reward)}
                  >
                    <Text style={s.redeemBtnText}>
                      {canAfford ? `Redeem for ${reward.pointsCost} pts` : `Need ${reward.pointsCost - points} More Pts`}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}

          </ScrollView>
        </SafeAreaView>
      </Modal>

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

  // 🎁 Rewards Banner Button
  rewardsBannerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  rewardsBannerText:{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 10 },

  // 🌱 Impact ledger card + milestone chips
  impactCard:    { flexDirection:'row', alignItems:'center', borderRadius:16, borderWidth:0.5,
                   padding:18, marginBottom:16 },
  impactCol:     { flex:1, alignItems:'center' },
  impactValue:   { fontSize:22, fontWeight:'700', marginTop:2 },
  impactLabel:   { fontSize:11, marginTop:3 },
  impactDivider: { width:0.5, alignSelf:'stretch', marginHorizontal:8 },
  milestoneRow:  { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:22 },
  milestoneChip: { flexDirection:'row', alignItems:'center', borderRadius:20, borderWidth:1,
                   paddingHorizontal:11, paddingVertical:7 },

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

  // Modal Styles
  rewardsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        padding: 20, paddingTop: 16, paddingBottom: 16 },
  rewardsModalTitle:  { color: '#fff', fontSize: 20, fontWeight: '700' },
  rewardsModalSub:    { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  modalCloseBtn:      { padding: 4 },
  pointsCard:         { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16,
                        borderWidth: 0.5, marginBottom: 18 },
  pointsBadge:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  rewardCard:         { borderRadius: 16, borderWidth: 0.5, padding: 16, marginBottom: 14 },
  brandIconCircle:    { width: 42, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rewardBrand:        { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  rewardTitle:        { fontSize: 15, fontWeight: '700', marginTop: 2 },
  rewardDesc:         { fontSize: 12, marginBottom: 14, lineHeight: 17 },
  costChip:           { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  redeemBtn:          { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  redeemBtnText:      { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Success Redemption Card
  successCard:        { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 18 },
  successTitle:       { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  codeBox:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
                        marginTop: 12, marginBottom: 12 },
  codeText:           { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  copyBtn:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
                        paddingVertical: 6, borderRadius: 8 },
  affiliateBtn:       { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  affiliateBtnText:   { color: '#fff', fontSize: 14, fontWeight: '700' }
});
