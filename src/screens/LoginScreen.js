// src/screens/LoginScreen.js
import { useNavigation } from '@react-navigation/native';
import React, { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Dimensions, Animated, KeyboardAvoidingView, Platform,
  StatusBar, ScrollView, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W, height: H } = Dimensions.get('window');

const SLIDES = [
  {
    emoji:    '🥬',
    title:    'Track What\'s in\nYour Kitchen',
    subtitle: 'Add groceries with a tap, scan or voice. See exactly what\'s expiring and when.',
    bg:       ['#4a7c59','#3a6649'],
  },
  {
    emoji:    '⏰',
    title:    'Never Waste\nFood Again',
    subtitle: 'Get smart notifications before items expire. Save money and reduce waste effortlessly.',
    bg:       ['#3a6649','#2e5038'],
  },
  {
    emoji:    '🧲', // We keep the tag here to trigger the image logic below
    title:    'Sync to Your\nFridge Magnet',
    subtitle: 'Pair the Smart Expiry Magnet — see the top expiring items directly on your fridge door.',
    bg:       ['#2e5038','#1e3828'],
  },
  {
    emoji:    '🍳',
    title:    'Cook Before\nIt Expires',
    subtitle: 'Get recipe suggestions based on what you have. Turn expiring ingredients into meals.',
    bg:       ['#1e3828','#4a7c59'],
  },
];

export default function LoginScreen({ navigation }) {
  const [step, setStep]       = useState('onboard');
  const [slideIdx, setSlide]  = useState(0);
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  function nextSlide() {
    if (slideIdx < SLIDES.length - 1) {
      Animated.timing(slideAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        setSlide(s => s + 1);
        slideAnim.setValue(0);
      });
    } else {
      setStep('login');
    }
  }

  function skip() { setStep('login'); }

  async function handleStart() {
    if (!name.trim()) {
      Alert.alert('Enter your name', 'Just your first name so we can personalise your experience.');
      return;
    }
    setLoading(true);
    try {
      await AsyncStorage.multiSet([
        ['userName', name.trim()],
        ['onboardingDone', 'true'],
      ]);
      navigation.replace('MainApp');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function skipLogin() {
    await AsyncStorage.setItem('onboardingDone', 'true');
    navigation.replace('MainApp');
  }

  if (step === 'onboard') {
    const slide = SLIDES[slideIdx];
    return (
      <LinearGradient colors={slide.bg} style={sl.onboardWrap}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex:1 }}>
          <View style={sl.onboardContent}>
            <TouchableOpacity style={sl.skipBtn} onPress={skip}>
              <Text style={sl.skipTxt}>Skip</Text>
            </TouchableOpacity>
            
            <View style={sl.emojiWrap}>
              <View style={sl.emojiOuter}>
                <View style={sl.emojiInner}>
                  {/* ── UPDATED LOGIC FOR GIANT MAGNET ── */}
                  {slide.emoji === '🧲' ? (
                    <Image 
                      source={require('../../assets/magnet-icon.png')} 
                      style={{ width: 80, height: 80, resizeMode: 'contain' }} 
                    />
                  ) : (
                    <Text style={sl.emoji}>{slide.emoji}</Text>
                  )}
                </View>
              </View>
            </View>

            <Text style={sl.slideTitle}>{slide.title}</Text>
            <Text style={sl.slideSub}>{slide.subtitle}</Text>
            <View style={sl.dots}>
              {SLIDES.map((_,i) => (
                <View key={i} style={[sl.dot, i === slideIdx && sl.dotActive]} />
              ))}
            </View>
            <TouchableOpacity style={sl.nextBtn} onPress={nextSlide}>
              <Text style={sl.nextTxt}>
                {slideIdx === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: '#f5f2ec' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f2ec" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex:1 }}>
        <ScrollView contentContainerStyle={sl.loginScroll} keyboardShouldPersistTaps="handled">
          
          <View style={sl.logoArea}>
            <Image 
              source={require('../../assets/wordmark.png')} 
              style={sl.wordmarkImg} 
            />
          </View>

          <View style={sl.loginCard}>
            <Text style={sl.loginCardTitle}>Welcome! What's your name?</Text>
            <Text style={sl.loginCardSub}>So we can personalise your kitchen.</Text>
            <TextInput
              style={sl.nameInput}
              placeholder="Your first name"
              placeholderTextColor="#9aaa9c"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
            <TouchableOpacity
              style={[sl.startBtn, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleStart}
              disabled={loading}
            >
              <LinearGradient colors={['#4a7c59','#3a6649']} style={sl.startBtnGrad}>
                <Text style={sl.startBtnTxt}>
                  {loading ? 'Setting up...' : 'Start Tracking →'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={sl.dividerRow}>
              <View style={sl.dividerLine} />
              <Text style={sl.dividerTxt}>also</Text>
              <View style={sl.dividerLine} />
            </View>

            {/* ── UPDATED MAGNET BUTTON ── */}
            <TouchableOpacity style={sl.magnetBtn} onPress={() => navigation.navigate('PairMagnet')}>
              <Image 
                source={require('../../assets/magnet-icon.png')} 
                style={{ width: 28, height: 28, resizeMode: 'contain', marginRight: 8 }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={sl.magnetBtnTitle}>Pair Expiry Magnet</Text>
                <Text style={sl.magnetBtnSub}>Connect your Smart Fridge Magnet device</Text>
              </View>
              <Ionicons name="bluetooth" size={18} color="#4a7c59" />
            </TouchableOpacity>

            <TouchableOpacity onPress={skipLogin} style={sl.skipLogin}>
              <Text style={sl.skipLoginTxt}>Skip for now →</Text>
            </TouchableOpacity>
          </View>
          <Text style={sl.footer}>MIT ADT University · SOC 11 Group 3 · DT Project</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const sl = StyleSheet.create({
  onboardWrap:    { flex:1 },
  onboardContent: { flex:1, paddingHorizontal:32, paddingTop:20, paddingBottom:40 },
  skipBtn:        { alignSelf:'flex-end', paddingVertical:8, paddingHorizontal:4 },
  skipTxt:        { color:'rgba(255,255,255,0.6)', fontSize:14 },
  emojiWrap:      { flex:1, alignItems:'center', justifyContent:'center' },
  emojiOuter:     { width:180, height:180, borderRadius:90, backgroundColor:'rgba(255,255,255,0.1)', alignItems:'center', justifyContent:'center' },
  emojiInner:     { width:130, height:130, borderRadius:65, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center' },
  emoji:          { fontSize:70 },
  slideTitle:     { color:'#fff', fontSize:30, fontWeight:'700', textAlign:'center', lineHeight:38, marginBottom:14 },
  slideSub:       { color:'rgba(255,255,255,0.75)', fontSize:15, textAlign:'center', lineHeight:22, marginBottom:32 },
  dots:           { flexDirection:'row', justifyContent:'center', gap:8, marginBottom:32 },
  dot:            { width:8, height:8, borderRadius:4, backgroundColor:'rgba(255,255,255,0.3)' },
  dotActive:      { backgroundColor:'#fff', width:24 },
  nextBtn:        { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:16, padding:18, borderWidth:1, borderColor:'rgba(255,255,255,0.3)' },
  nextTxt:        { color:'#fff', fontSize:16, fontWeight:'700' },
  loginScroll:    { flexGrow:1, padding:24, paddingTop:32 },
  logoArea:       { alignItems:'center', marginBottom:32, marginTop: 10 },
  wordmarkImg:    { width: 260, height: 80, resizeMode: 'contain' },
  loginCard:      { backgroundColor:'#fff', borderRadius:24, padding:24, shadowColor:'#4a7c59', shadowOffset:{width:0,height:4}, shadowOpacity:0.1, shadowRadius:16, elevation:4 },
  loginCardTitle: { fontSize:20, fontWeight:'700', color:'#1a2318', marginBottom:6 },
  loginCardSub:   { fontSize:13, color:'#6b7b6e', marginBottom:20 },
  nameInput:      { borderWidth:1, borderColor:'#e2ddd6', borderRadius:14, padding:16, fontSize:16, color:'#1a2318', marginBottom:16 },
  startBtn:       { borderRadius:16, overflow:'hidden', marginBottom:20 },
  startBtnGrad:   { padding:18, alignItems:'center' },
  startBtnTxt:    { color:'#fff', fontSize:16, fontWeight:'700' },
  dividerRow:     { flexDirection:'row', alignItems:'center', gap:12, marginBottom:16 },
  dividerLine:    { flex:1, height:0.5, backgroundColor:'#e2ddd6' },
  dividerTxt:     { fontSize:12, color:'#9aaa9c' },
  magnetBtn:      { flexDirection:'row', alignItems:'center', gap:8, padding:14, borderRadius:14, borderWidth:1, borderColor:'#e8f0eb', backgroundColor:'#f5f9f6', marginBottom:14 },
  magnetBtnTitle: { fontSize:14, fontWeight:'600', color:'#1a2318' },
  magnetBtnSub:   { fontSize:11, color:'#6b7b6e', marginTop:1 },
  skipLogin:      { alignItems:'center', paddingVertical:6 },
  skipLoginTxt:   { fontSize:13, color:'#9aaa9c' },
  footer:         { textAlign:'center', fontSize:11, color:'#9aaa9c', marginTop:24 },
});