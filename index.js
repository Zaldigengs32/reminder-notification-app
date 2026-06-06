import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { registerRootComponent } from 'expo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldPresentAlert: true,
    shouldPresentSound: true,
    shouldPresentBadge: false,
  }),
});

const MOODS = [
  { emoji: '😄', label: 'Senang', color: '#f59e0b', bg: '#fef3c7' },
  { emoji: '😊', label: 'Baik',   color: '#10b981', bg: '#d1fae5' },
  { emoji: '😐', label: 'Biasa',  color: '#3b82f6', bg: '#dbeafe' },
  { emoji: '😔', label: 'Sedih',  color: '#8b5cf6', bg: '#ede9fe' },
  { emoji: '😠', label: 'Marah',  color: '#ef4444', bg: '#fee2e2' },
];

const MOTIVASI = {
  Senang: 'Pertahankan energi positifmu hari ini! 🌟',
  Baik:   'Hari yang baik dimulai dari pikiran yang baik 😊',
  Biasa:  'Tidak apa-apa, setiap hari tidak harus sempurna 💙',
  Sedih:  'Perasaanmu valid. Kamu tidak sendiri 💜',
  Marah:  'Tarik napas dalam-dalam. Kamu bisa melewati ini 💪',
};

export default function HomeScreen() {
  const [permStatus, setPermStatus] = useState('loading');
  const [selectedMood, setSelectedMood] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [history, setHistory] = useState([]);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    setupNotifications();

    notificationListener.current =
      Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);
      });

    return () => {
      if (notificationListener.current?.remove) notificationListener.current.remove();
      if (responseListener.current?.remove) responseListener.current.remove();
    };
  }, []);

  async function setupNotifications() {
    if (!Device.isDevice) {
      setPermStatus('no-device');
      return;
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      setPermStatus('denied');
      return;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mood Check Reminder',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
      });
    }
    setPermStatus('granted');
  }

  async function sendMoodReminder() {
    if (!selectedMood) {
      Alert.alert('Pilih Mood Dulu', 'Pilih mood kamu sebelum mengirim reminder 😊');
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🧠 Mood Check — ${selectedMood.emoji} ${selectedMood.label}`,
        body: MOTIVASI[selectedMood.label],
        sound: true,
      },
      trigger: null,
    });
  }

  async function sendScheduledReminder() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧠 Mood Check Harian',
          body: 'Hei! Sudah cek mood kamu hari ini? Yuk luangkan sebentar 💜',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 10,
          repeats: false,
        },
      });
      Alert.alert(
        '⏰ Reminder Dijadwalkan',
        'Notifikasi mood check akan muncul dalam 10 detik.\n\nMinimize app sekarang!',
        [{ text: 'OK, Siap!' }]
      );
    } catch (e) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧠 Mood Check Harian',
          body: 'Hei! Sudah cek mood kamu hari ini? Yuk luangkan sebentar 💜',
          sound: true,
        },
        trigger: null,
      });
    }
  }

  function selectMood(mood) {
    setSelectedMood(mood);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setLastChecked(timeStr);
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    setHistory(prev => [{ mood, time: timeStr, date: dateStr }, ...prev].slice(0, 5));
  }

  const statusColor = permStatus === 'granted' ? '#10b981' : '#ef4444';
  const statusLabel = permStatus === 'granted' ? 'Aktif' : permStatus === 'loading' ? 'Memuat...' : 'Tidak aktif';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4c1d95" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🧠</Text>
          <Text style={styles.headerTitle}>Mood Check</Text>
          <Text style={styles.headerSubtitle}>Kenali perasaanmu setiap hari</Text>
          <View style={styles.headerBadge}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={styles.headerBadgeText}>Notifikasi {statusLabel}</Text>
          </View>
        </View>

        <View style={styles.body}>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bagaimana mood kamu sekarang?</Text>
            {lastChecked && (
              <Text style={styles.cardMeta}>Terakhir dicek pukul {lastChecked}</Text>
            )}
            <View style={styles.moodRow}>
              {MOODS.map((mood) => {
                const isSelected = selectedMood?.label === mood.label;
                return (
                  <TouchableOpacity
                    key={mood.label}
                    style={[
                      styles.moodBtn,
                      { backgroundColor: isSelected ? mood.bg : '#f3f4f6' },
                      isSelected && { borderWidth: 2, borderColor: mood.color },
                    ]}
                    onPress={() => selectMood(mood)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={[styles.moodLabel, isSelected && { color: mood.color, fontWeight: 'bold' }]}>
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedMood && (
              <View style={[styles.motivasiBox, { backgroundColor: selectedMood.bg, borderLeftColor: selectedMood.color }]}>
                <Text style={[styles.motivasiText, { color: selectedMood.color }]}>
                  {MOTIVASI[selectedMood.label]}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Kirim Reminder</Text>

            <TouchableOpacity
              style={[styles.btnPrimary, !selectedMood && styles.btnDisabled]}
              onPress={sendMoodReminder}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>🔔  Kirim Sekarang</Text>
              <Text style={styles.btnPrimarySubtext}>Sesuai mood yang dipilih</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={sendScheduledReminder}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSecondaryText}>⏰  Jadwalkan (10 detik)</Text>
              <Text style={styles.btnSecondarySubtext}>Minimize app setelah konfirmasi</Text>
            </TouchableOpacity>
          </View>

          {history.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Riwayat Mood</Text>
              {history.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={[styles.historyDot, { backgroundColor: item.mood.color }]} />
                  <Text style={styles.historyEmoji}>{item.mood.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyMood}>{item.mood.label}</Text>
                    <Text style={styles.historyTime}>{item.date} · {item.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#4c1d95',
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: '#f5f3ff',
  },
  header: {
    backgroundColor: '#4c1d95',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#c4b5fd',
    marginTop: 4,
    marginBottom: 16,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 14,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 4,
    width: '100%',
  },
  moodBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    flex: 1,
    marginHorizontal: 3,
  },
  moodEmoji: {
    fontSize: 26,
  },
  moodLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 5,
    textAlign: 'center',
  },
  motivasiBox: {
    marginTop: 16,
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 12,
  },
  motivasiText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  btnPrimary: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDisabled: {
    backgroundColor: '#c4b5fd',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnPrimarySubtext: {
    color: '#ddd6fe',
    fontSize: 11,
    marginTop: 2,
  },
  btnSecondary: {
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  btnSecondaryText: {
    color: '#7c3aed',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnSecondarySubtext: {
    color: '#8b5cf6',
    fontSize: 11,
    marginTop: 2,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  historyEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  historyMood: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  historyTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
});

registerRootComponent(HomeScreen);
