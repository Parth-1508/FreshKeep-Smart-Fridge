// src/screens/PairMagnetScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const STEPS = [
  { id:'scan',    title:'Scanning for device...', sub:'Make sure your Expiry Magnet is powered on.' },
  { id:'found',   title:'Device found!',          sub:'FreshKeep Expiry Magnet v1.0' },
  { id:'pairing', title:'Pairing...',             sub:'Confirm the PIN on your magnet display.' },
  { id:'done',    title:'Successfully Paired! 🎉',  sub:'Your fridge magnet is now connected.' },
];

export default function PairMagnetScreen() {
  const { colors: C } = useTheme();
  const navigation    = useNavigation();
  const [step, setStep]     = useState(0); 
  const [paired, setPaired] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue:1.35, duration:900, useNativeDriver:true }),
        Animated.timing(pulseAnim, { toValue:1,    duration:900, useNativeDriver:true }),
      ])
    );
    pulse.start();

    const t1 = setTimeout(() => setStep(1), 2500);
    return () => { pulse.stop(); clearTimeout(t1); };
  }, []);

  useEffect(() => {
    if (step === 1) {
      Animated.timing(progressAnim, { toValue:1, duration:1500, useNativeDriver:false }).start();
    }
  }, [step]);

  function confirmPair() {
    setStep(2);
    setTimeout(() => {
      setStep(3);
      setPaired(true);
    }, 2000);
  }

  function handleDone() {
    navigation.goBack();
  }

  const current = STEPS[step];
  const iconByStep = ['bluetooth-outline','bluetooth','sync-outline','checkmark-circle'];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: C.bg }}>
      <StatusBar barStyle={C.bg === '#f5f2ec' ? 'dark-content' : 'light-content'} />
      <View style={[pm.header, { borderBottomColor: C.border, backgroundColor: C.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={pm.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[pm.headerTitle, { color: C.textPrimary }]}>Pair Expiry Magnet</Text>
        <View style={{ width:36 }} />
      </View>

      <View style={pm.body}>
        <View style={pm.circleArea}>
          {step < 3 && (
            <>
              <Animated.View style={[pm.pulse1, { borderColor: C.primary + '30', transform:[{scale: pulseAnim}] }]} />
              <Animated.View style={[pm.pulse2, { borderColor: C.primary + '20', transform:[{scale: Animated.multiply(pulseAnim, 1.2)}] }]} />
            </>
          )}
          <View style={[pm.iconCircle, { backgroundColor: step===3 ? C.primary : C.primaryPale }]}>
            <Ionicons name={iconByStep[step]} size={48} color={step===3 ? '#fff' : C.primary} />
          </View>
        </View>

        {step >= 1 && (
          <View style={[pm.deviceCard, { backgroundColor: C.card, borderColor: C.border }]}>
            {/* ── UPDATED DEVICE ICON ── */}
            <Image 
              source={require('../../assets/magnet-icon.png')} 
              style={{ width: 32, height: 32, resizeMode: 'contain' }} 
            />
            <View style={{ flex:1 }}>
              <Text style={[pm.deviceName, { color: C.textPrimary }]}>FreshKeep Expiry Magnet</Text>
              <Text style={[pm.deviceMac, { color: C.textSecondary }]}>{step===3 ? '● Connected' : 'FE:ED:00:01:AB:CD'}</Text>
            </View>
            <View style={[pm.signalDot, { backgroundColor: step===3 ? C.primary : C.warning }]} />
          </View>
        )}

        <Text style={[pm.stepTitle, { color: C.textPrimary }]}>{current.title}</Text>
        <Text style={[pm.stepSub,   { color: C.textSecondary }]}>{current.sub}</Text>

        {step === 2 && (
          <View style={[pm.progressTrack, { backgroundColor: C.primaryPale }]}>
            <Animated.View style={[pm.progressFill, { backgroundColor: C.primary, width: progressAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }) }]} />
          </View>
        )}

        <View style={[pm.checklist, { backgroundColor: C.card, borderColor: C.border }]}>
          {[
            { label:'Power on magnet device', done: step >= 0 },
            { label:'Device discovered via Bluetooth', done: step >= 1 },
            { label:'Confirm PIN on magnet display',   done: step >= 3 },
            { label:'Inventory sync complete',         done: step >= 3 },
          ].map((item, i) => (
            <View key={i} style={[pm.checkRow, i > 0 && { borderTopWidth:0.5, borderTopColor: C.border }]}>
              <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={item.done ? C.primary : C.textLight} />
              <Text style={[pm.checkLabel, { color: item.done ? C.textPrimary : C.textLight }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {step === 1 && (
          <TouchableOpacity style={[pm.actionBtn, { backgroundColor: C.primary }]} onPress={confirmPair}>
            <Text style={pm.actionBtnTxt}>Pair Device</Text>
          </TouchableOpacity>
        )}
        {step === 3 && (
          <TouchableOpacity style={[pm.actionBtn, { backgroundColor: C.primary }]} onPress={handleDone}>
            <Text style={pm.actionBtnTxt}>Done ✓</Text>
          </TouchableOpacity>
        )}
        {step === 0 && (
          <TouchableOpacity style={[pm.cancelBtn, { borderColor: C.border }]} onPress={() => navigation.goBack()}>
            <Text style={[pm.cancelTxt, { color: C.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const pm = StyleSheet.create({
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:0.5 },
  backBtn:      { width:36, height:36, alignItems:'center', justifyContent:'center' },
  headerTitle:  { fontSize:17, fontWeight:'600' },
  body:         { flex:1, padding:24, alignItems:'center' },
  circleArea:   { alignItems:'center', justifyContent:'center', height:200, marginBottom:24 },
  pulse1:       { position:'absolute', width:160, height:160, borderRadius:80, borderWidth:1.5 },
  pulse2:       { position:'absolute', width:200, height:200, borderRadius:100, borderWidth:1 },
  iconCircle:   { width:120, height:120, borderRadius:60, alignItems:'center', justifyContent:'center' },
  deviceCard:   { flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:14, borderWidth:0.5, width:'100%', marginBottom:20 },
  deviceName:   { fontSize:14, fontWeight:'600' },
  deviceMac:    { fontSize:11, marginTop:2 },
  signalDot:    { width:10, height:10, borderRadius:5 },
  stepTitle:    { fontSize:22, fontWeight:'700', textAlign:'center', marginBottom:8 },
  stepSub:      { fontSize:14, textAlign:'center', lineHeight:20, marginBottom:24 },
  progressTrack:{ width:'100%', height:6, borderRadius:3, overflow:'hidden', marginBottom:24 },
  progressFill: { height:6, borderRadius:3 },
  checklist:    { width:'100%', borderRadius:14, borderWidth:0.5, overflow:'hidden', marginBottom:24 },
  checkRow:     { flexDirection:'row', alignItems:'center', gap:10, padding:14 },
  checkLabel:   { fontSize:13 },
  actionBtn:    { width:'100%', borderRadius:16, padding:18, alignItems:'center', marginBottom:12 },
  actionBtnTxt: { color:'#fff', fontSize:16, fontWeight:'700' },
  cancelBtn:    { width:'100%', borderRadius:16, padding:16, alignItems:'center', borderWidth:1 },
  cancelTxt:    { fontSize:14 },
});