import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from './components/ThemeContext';
import { useAuth } from './components/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TraceMainScreen() {
  const { isDark } = useTheme();
  const { user, login, logout } = useAuth();
  const router = useRouter();

  // Apple-system color palette
  const textColor      = isDark ? '#FFFFFF' : '#000000';
  const subText        = isDark ? '#8E8E93' : '#6D6D72';
  const surfaceColor   = isDark ? '#000000' : '#F2F2F7';
  const cardColor      = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBgColor   = isDark ? '#2C2C2E' : '#F2F2F7';
  const separatorColor = isDark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.18)';
  const accentColor    = isDark ? '#0A84FF' : '#007AFF';

  // Auth State
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // <-- Added visibility state
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    if (!usernameInput.trim() || !passwordInput.trim()) {
      Alert.alert('Required', 'Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    
    try {
      // ⚠️ IMPORTANT: Change 10.0.2.2 to your computer's IP if testing on a physical phone
      const SERVER_URL = `https://trace-aagz.onrender.com${endpoint}`;
      
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput.trim() }),
      });

      if (!response.ok) {
        throw new Error(isLoginMode ? 'Invalid credentials' : 'User already exists');
      }

      login(usernameInput.trim());
      setUsernameInput('');
      setPasswordInput('');
    } catch (error: any) {
      Alert.alert('Authentication Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={[styles.appIcon, { backgroundColor: accentColor }]}>
            <Ionicons name="terminal" size={30} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: textColor }]}>Trace.</Text>
          <Text style={[styles.subtitle, { color: subText }]}>
            Your personal AI debugging assistant. Drop in your broken code or error stacks, and get back to building.
          </Text>
        </View>

        {/* ── Conditional Rendering: Auth vs Authenticated Dashboard ── */}
        {!user ? (
          // --- UNAUTHENTICATED STATE ---
          <View style={[styles.authCard, { backgroundColor: cardColor, borderColor: separatorColor }]}>
            <Text style={[styles.authTitle, { color: textColor }]}>
              {isLoginMode ? 'Welcome Back' : 'Create Account'}
            </Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: inputBgColor, color: textColor }]}
              placeholder="Username"
              placeholderTextColor={subText}
              value={usernameInput}
              onChangeText={setUsernameInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {/* --- UPDATED PASSWORD INPUT WITH TOGGLE --- */}
            <View style={[styles.passwordContainer, { backgroundColor: inputBgColor }]}>
              <TextInput
                style={[styles.passwordInput, { color: textColor }]}
                placeholder="Password"
                placeholderTextColor={subText}
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity 
                onPress={() => setIsPasswordVisible(!isPasswordVisible)} 
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isPasswordVisible ? "eye-off" : "eye"} 
                  size={20} 
                  color={subText} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.authButton, { backgroundColor: accentColor }]} 
              onPress={handleAuth}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.authButtonText}>{isLoginMode ? 'Sign In' : 'Register'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)} style={styles.toggleTextWrap}>
              <Text style={[styles.toggleText, { color: subText }]}>
                {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                <Text style={{ color: accentColor, fontWeight: '600' }}>
                  {isLoginMode ? 'Sign Up' : 'Log In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // --- AUTHENTICATED STATE ---
          <View>
            <View style={styles.welcomeBanner}>
              <Text style={[styles.welcomeText, { color: textColor }]}>Welcome back, {user}!</Text>
              <TouchableOpacity onPress={logout}>
                <Text style={{ color: '#FF3B30', fontSize: 15, fontWeight: '500' }}>Logout</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.featureCard, { backgroundColor: cardColor }]}>
              <FeatureRow icon="bug" iconBg="#FF3B30" title="Instant Analysis" description="Pinpoint the exact line causing the crash." isDark={isDark} separator={separatorColor} />
              <FeatureRow icon="code-working" iconBg="#34C759" title="Actionable Fixes" description="Get copy-paste ready code snippets for your IDE." isDark={isDark} separator={separatorColor} />
              <FeatureRow icon="server" iconBg="#FF9500" title="Cloud Database" description="Logs and session history saved securely on the cloud." isDark={isDark} separator={null} />
            </View>

            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: accentColor }]}
              onPress={() => router.replace('/chat')}
              activeOpacity={0.82}
            >
              <Text style={styles.ctaText}>Start Debugging</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Reusable row component ──
function FeatureRow({ icon, iconBg, title, description, isDark, separator }: any) {
  const textColor  = isDark ? '#FFFFFF' : '#000000';
  const subText    = isDark ? '#8E8E93' : '#6D6D72';
  const chevronCol = isDark ? 'rgba(235,235,245,0.25)' : 'rgba(60,60,67,0.25)';

  return (
    <View style={[styles.featureRow, separator ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separator } : null]}>
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color="#FFFFFF" />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.rowDesc, { color: subText }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={chevronCol} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 136 },

  hero: { marginTop: 12, marginBottom: 36 },
  appIcon: { width: 62, height: 62, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 22, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6 },
  title: { fontSize: 54, fontWeight: '800', letterSpacing: -2, marginBottom: 14, lineHeight: 58 },
  subtitle: { fontSize: 16, lineHeight: 25, fontWeight: '400', letterSpacing: -0.1 },

  // Auth Styles
  authCard: { borderRadius: 16, padding: 20, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  authTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20, letterSpacing: -0.5 },
  
  // Standard Input (Username)
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, marginBottom: 16 },
  
  // Password Input Wrapper (New)
  passwordContainer: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
  passwordInput: { flex: 1, fontSize: 16 },
  eyeIcon: { paddingLeft: 10, paddingVertical: 10 },

  authButton: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  authButtonText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  toggleTextWrap: { marginTop: 20, alignItems: 'center' },
  toggleText: { fontSize: 14 },

  // Authenticated Styles
  welcomeBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
  welcomeText: { fontSize: 20, fontWeight: '600', letterSpacing: -0.5 },
  
  featureCard: { borderRadius: 16, marginBottom: 28, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  iconBadge: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  rowText: { flex: 1, paddingRight: 6 },
  rowTitle: { fontSize: 15, fontWeight: '600', marginBottom: 1, letterSpacing: -0.2 },
  rowDesc: { fontSize: 13, lineHeight: 18, letterSpacing: -0.1 },

  ctaButton: { height: 54, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 14, elevation: 5 },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
});