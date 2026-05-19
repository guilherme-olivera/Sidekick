import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TextInput, StyleSheet, Button } from 'react-native';
import prefsService, { NotificationPrefs } from '../../src/services/notificationPrefs';

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState('1');
  const [time, setTime] = useState('08:00');

  useEffect(() => {
    (async () => {
      const p = await prefsService.loadPrefs();
      setPrefs(p);
      setEnabled(p.enabled);
      setDays(String(p.remindBeforeDays));
      setTime(p.remindTime);
    })();
  }, []);

  const save = async () => {
    const parsedDays = Math.max(0, Math.min(7, parseInt(days || '1', 10) || 1));
    const newPrefs = await prefsService.savePrefs({ enabled, remindBeforeDays: parsedDays, remindTime: time });
    setPrefs(newPrefs as NotificationPrefs);
    alert('Preferências salvas');
  };

  if (!prefs) return (
    <View style={styles.container}><Text>Carregando...</Text></View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notificações</Text>
      <View style={styles.row}>
        <Text>Ativar lembretes</Text>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>

      <View style={styles.rowColumn}>
        <Text>Dias antes (0 = mesmo dia)</Text>
        <TextInput style={styles.input} value={days} onChangeText={setDays} keyboardType="numeric" />
      </View>

      <View style={styles.rowColumn}>
        <Text>Horário do lembrete (HH:mm)</Text>
        <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="08:00" />
      </View>

      <Button title="Salvar" onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rowColumn: { marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginTop: 6, width: 120 },
});
