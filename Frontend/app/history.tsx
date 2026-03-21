import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { useTheme } from './components/ThemeContext';
import { useAuth } from './components/AuthContext'; 
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useRootNavigationState } from 'expo-router'; 
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <-- ADDED FOR NOTCH AVOIDANCE

type Message = { role: 'user' | 'ai'; text: string };
type Session = { id: string; title: string; timestamp: string; status: 'error' | 'success'; messages: Message[] };

export default function HistoryScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState(); 
  const { user } = useAuth(); 
  const insets = useSafeAreaInsets(); // <-- Measures the notch dynamically

  // ROUTE GUARD
  useEffect(() => {
    if (!rootNavigationState?.key) return; 
    if (!user) router.replace('/');
  }, [user, rootNavigationState?.key]);

  // Apple system colour palette
  const textColor    = isDark ? '#FFFFFF'               : '#000000';
  const subText      = isDark ? '#8E8E93'               : '#6D6D72';
  const surfaceColor = isDark ? '#000000'               : '#F2F2F7';
  const cardColor    = isDark ? '#1C1C1E'               : '#FFFFFF';
  const borderColor  = isDark ? 'rgba(84,84,88,0.65)'   : 'rgba(60,60,67,0.18)';
  const accentColor  = isDark ? '#0A84FF'               : '#007AFF';
  const userBubbleBg = isDark ? '#0A84FF'               : '#007AFF';
  const codeBg       = isDark ? '#000000'               : '#F2F2F7'; 

  const [logs, setLogs] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // Custom Modal State
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);

  const SERVER_BASE_URL = 'https://trace-aagz.onrender.com';

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${SERVER_BASE_URL}/api/history?username=${user}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setLogs(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  const resumeChat = () => {
    if (!selectedSession) return;
    router.push({
      pathname: '/chat',
      params: { sessionId: selectedSession.id, pastMessages: JSON.stringify(selectedSession.messages) },
    });
  };

  // ── CUSTOM IN-APP DELETE LOGIC ──
  const confirmDelete = async () => {
    if (!sessionToDelete || !user) return;
    
    try {
      await fetch(`${SERVER_BASE_URL}/api/delete`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionToDelete.id, username: user }),
      });
      setSessionToDelete(null);
      setSelectedSession(null); 
      fetchHistory(); 
    } catch (e) {
      console.error("Could not delete session", e);
      setSessionToDelete(null);
    }
  };

  const markdownStyles = {
    body: { color: textColor, fontSize: 15, lineHeight: 22 },
    paragraph: { marginTop: 0, marginBottom: 8 },
    code_inline: { backgroundColor: codeBg, color: accentColor, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' as const, fontSize: 13 },
    fence: { backgroundColor: codeBg, borderColor: borderColor, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginVertical: 6 },
    code_block: { color: isDark ? '#E2E8F0' : '#1E293B', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 },
  };

  // ── DETAIL VIEW ──
  if (selectedSession) {
    return (
      // Dynamic padding pushes the header entirely below the Theme Toggle
      <View style={[styles.container, { backgroundColor: surfaceColor, paddingTop: insets.top + 60 }]}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedSession(null)} style={[styles.backBtn, { backgroundColor: cardColor }]} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={accentColor} />
          </TouchableOpacity>
          
          <Text style={[styles.detailTitle, { color: textColor }]} numberOfLines={1}>
            {selectedSession.title}
          </Text>

          {/* Triggers the Custom Modal instead of Native Alert */}
          <TouchableOpacity onPress={() => setSessionToDelete(selectedSession)} style={[styles.backBtn, { backgroundColor: cardColor }]} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
          {selectedSession.messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <View key={index} style={[ styles.bubble, isUser ? styles.userBubble : styles.aiBubble, {
                    backgroundColor: isUser ? userBubbleBg : cardColor,
                    borderColor: isUser ? 'transparent' : borderColor,
                    borderWidth: isUser ? 0 : StyleSheet.hairlineWidth,
                  } ]}>
                {isUser ? (
                  <Text style={styles.userBubbleText}>{msg.text}</Text>
                ) : (
                  <Markdown style={markdownStyles}>
                    {msg.text}
                  </Markdown>
                )}
              </View>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.resumeWrapper, { backgroundColor: surfaceColor }]}>
          <TouchableOpacity style={[styles.resumeButton, { backgroundColor: accentColor }]} onPress={resumeChat} activeOpacity={0.84}>
            <Ionicons name="chatbubbles" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.resumeText}>Resume This Chat</Text>
          </TouchableOpacity>
        </View>

        {/* ── CUSTOM IOS-STYLE MODAL POPUP ── */}
        <Modal visible={!!sessionToDelete} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
              <View style={styles.modalTextContainer}>
                <Text style={[styles.modalTitle, { color: textColor }]}>Delete Session</Text>
                <Text style={[styles.modalMessage, { color: subText }]}>Are you sure you want to permanently delete this chat?</Text>
              </View>
              <View style={[styles.modalActions, { borderTopColor: borderColor }]}>
                <TouchableOpacity 
                  style={[styles.modalButton, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: borderColor }]} 
                  onPress={() => setSessionToDelete(null)}
                >
                  <Text style={[styles.modalButtonText, { color: accentColor }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={confirmDelete}>
                  <Text style={[styles.modalButtonText, { color: '#FF3B30', fontWeight: 'bold' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    );
  }

  // ── LIST VIEW ──
  return (
    // Dynamic padding added here too
    <View style={[styles.container, { backgroundColor: surfaceColor, paddingTop: insets.top + 60 }]}>
      <Text style={[styles.title, { color: textColor }]}>Logs</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={accentColor} style={{ marginTop: 60 }} />
      ) : logs.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: cardColor }]}>
            <Ionicons name="folder-open-outline" size={36} color={subText} />
          </View>
          <Text style={[styles.emptyTitle, { color: textColor }]}>No History Yet</Text>
          <Text style={[styles.emptySubText, { color: subText }]}>Your debugging sessions will appear here automatically.</Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.listCard, { backgroundColor: cardColor }]}>
            {logs.map((log, idx) => {
              const isLast = idx === logs.length - 1;
              const isError = log.status === 'error';
              return (
                <TouchableOpacity
                  key={log.id}
                  style={[ styles.listRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor } ]}
                  onPress={() => setSelectedSession(log)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.statusDot, { backgroundColor: isError ? '#FF3B30' : '#34C759' }]} />
                  <View style={styles.rowContent}>
                    <Text style={[styles.rowTitle, { color: textColor }]} numberOfLines={1}>{log.title}</Text>
                    <Text style={[styles.rowSub, { color: subText }]}>{log.timestamp}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={isDark ? 'rgba(235,235,245,0.25)' : 'rgba(60,60,67,0.25)'} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // Removed hardcoded paddingTop: 80
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5, marginBottom: 20, paddingHorizontal: 20 },
  listScroll: { flex: 1, paddingHorizontal: 20, marginBottom: 116 },
  listCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  statusDot: { width: 9, height: 9, borderRadius: 5, marginRight: 14 },
  rowContent: { flex: 1, paddingRight: 8 },
  rowTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2, letterSpacing: -0.2 },
  rowSub: { fontSize: 13 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: -60 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8, letterSpacing: -0.4 },
  emptySubText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  detailTitle: { fontSize: 17, fontWeight: '600', flex: 1, letterSpacing: -0.3, textAlign: 'center', marginHorizontal: 10 },
  detailScroll: { flex: 1, paddingHorizontal: 16 },
  bubble: { padding: 14, borderRadius: 20, maxWidth: '78%', marginBottom: 14 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  userBubbleText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  resumeWrapper: { paddingHorizontal: 20, paddingBottom: 116, paddingTop: 12 },
  resumeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 14, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4 },
  resumeText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },

  // ── CUSTOM MODAL STYLES ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: 270, borderRadius: 14, overflow: 'hidden' },
  modalTextContainer: { padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  modalMessage: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  modalActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  modalButton: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { fontSize: 17 },
});