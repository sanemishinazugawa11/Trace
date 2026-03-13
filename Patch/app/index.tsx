import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from './components/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TraceMainScreen() {
  const { isDark } = useTheme();
  const router = useRouter();

  // Apple-system color palette
  const textColor      = isDark ? '#FFFFFF'                      : '#000000';
  const subText        = isDark ? '#8E8E93'                      : '#6D6D72';
  const surfaceColor   = isDark ? '#000000'                      : '#F2F2F7';
  const cardColor      = isDark ? '#1C1C1E'                      : '#FFFFFF';
  const separatorColor = isDark ? 'rgba(84,84,88,0.65)'          : 'rgba(60,60,67,0.18)';
  const accentColor    = isDark ? '#0A84FF'                      : '#007AFF';

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

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

        {/* ── Features — iOS grouped list card ── */}
        <View style={[styles.featureCard, { backgroundColor: cardColor }]}>
          <FeatureRow
            icon="bug"
            iconBg="#FF3B30"
            title="Instant Analysis"
            description="Pinpoint the exact line causing the crash."
            isDark={isDark}
            separator={separatorColor}
          />
          <FeatureRow
            icon="code-working"
            iconBg="#34C759"
            title="Actionable Fixes"
            description="Get copy-paste ready code snippets for your IDE."
            isDark={isDark}
            separator={separatorColor}
          />
          <FeatureRow
            icon="server"
            iconBg="#FF9500"
            title="Cloud Database"
            description="Logs and session history saved securely on the cloud."
            isDark={isDark}
            separator={null}
          />
        </View>

        {/* ── CTA ── */}
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: accentColor }]}
          onPress={() => router.replace('/chat')}
          activeOpacity={0.82}
        >
          <Text style={styles.ctaText}>Start Debugging</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

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
    <View
      style={[
        styles.featureRow,
        separator ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separator } : null,
      ]}
    >
      {/* Coloured SF-Symbols-style icon badge */}
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

  // ── Hero ──
  hero: { marginTop: 12, marginBottom: 36 },
  appIcon: {
    width: 62, height: 62, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 22,
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  title: {
    fontSize: 54, fontWeight: '800', letterSpacing: -2,
    marginBottom: 14, lineHeight: 58,
  },
  subtitle: { fontSize: 16, lineHeight: 25, fontWeight: '400', letterSpacing: -0.1 },

  // ── Feature card ──
  featureCard: {
    borderRadius: 16, marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  iconBadge: {
    width: 34, height: 34, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  rowText: { flex: 1, paddingRight: 6 },
  rowTitle: { fontSize: 15, fontWeight: '600', marginBottom: 1, letterSpacing: -0.2 },
  rowDesc: { fontSize: 13, lineHeight: 18, letterSpacing: -0.1 },

  // ── CTA ──
  ctaButton: {
    height: 54, borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32, shadowRadius: 14,
    elevation: 5,
  },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
});