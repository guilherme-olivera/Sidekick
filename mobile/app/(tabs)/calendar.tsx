import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  Text,
  StyleSheet,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
} from "react-native";
import Calendar from "@/components/Calendar";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { CalendarEvent } from "@/src/services/calendarMockService";

export default function CalendarScreen() {
  const {
    loadWorkouts,
    calendarEvents,
    loadCalendarEvents,
    getCalendarEventsByDate,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useDashboard();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("08:00");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkouts();
    loadCalendarEvents();
  }, []);

  const selectedDayEvents = selectedDate ? getCalendarEventsByDate(selectedDate) : [];

  const startNewEvent = (isoDate: string) => {
    setSelectedDate(isoDate);
    setTitle("");
    setDescription("");
    setTime("08:00");
    setEditingId(null);
    setModalVisible(true);
  };

  const handleDayPress = (isoDate: string) => {
    startNewEvent(isoDate);
  };

  const handleEventEdit = (event: CalendarEvent) => {
    setSelectedDate(event.date);
    setTitle(event.title);
    setDescription(event.description || "");
    setTime(event.time || "08:00");
    setEditingId(event.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    if (!title.trim()) {
      Alert.alert("Preencha o título", "O evento precisa de um nome para ser salvo.");
      return;
    }

    try {
      const payload = {
        date: selectedDate,
        title: title.trim(),
        description: description.trim(),
        time: time.trim() || "08:00",
      };

      if (editingId) {
        await updateEvent(editingId, payload);
      } else {
        await createEvent(payload);
      }

      await loadCalendarEvents();
      setModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível salvar o evento.");
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    try {
      await deleteEvent(editingId);
      await loadCalendarEvents();
      setModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível remover o evento.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendário</Text>
      </View>

      <Calendar events={calendarEvents} onDayPress={handleDayPress} />

      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Eventos — {selectedDate}</Text>

                {selectedDayEvents.length > 0 ? (
                  <View style={styles.eventList}>
                    {selectedDayEvents.map((event) => (
                      <TouchableOpacity
                        key={event.id}
                        style={styles.eventRow}
                        onPress={() => handleEventEdit(event)}
                      >
                        <View>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          <Text style={styles.eventSubtitle} numberOfLines={2}>
                            {event.description || "Sem descrição"}
                          </Text>
                          <Text style={styles.eventMeta}>{event.time}</Text>
                        </View>
                        <Text style={styles.eventSource}>{event.source || "Sidekick"}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>
                    Nenhum evento salvo para este dia. Crie um novo evento abaixo.
                  </Text>
                )}

                <Text style={styles.sectionLabel}>{editingId ? "Editar evento" : "Criar novo evento"}</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Título"
                  style={styles.input}
                  placeholderTextColor="#888"
                />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Descrição"
                  style={[styles.input, styles.textArea]}
                  placeholderTextColor="#888"
                  multiline
                />
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="Hora (HH:mm)"
                  style={styles.input}
                  placeholderTextColor="#888"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveText}>{editingId ? "Atualizar" : "Salvar"}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "92%",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#0a0a0a",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  typePicker: {
    paddingVertical: 8,
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  typeOption: {
    color: "#b0b0b0",
    fontSize: 12,
    marginBottom: 4,
  },
  typeOptionActive: {
    color: "#51cf66",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  eventList: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#0f1411",
    borderWidth: 1,
    borderColor: "#223225",
    padding: 8,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#171f1a",
    borderRadius: 10,
  },
  eventTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  eventSubtitle: {
    color: "#b0b0b0",
    fontSize: 12,
    marginBottom: 4,
    maxWidth: 180,
  },
  eventSource: {
    color: "#ffb703",
    fontSize: 11,
    fontWeight: "700",
  },
  eventMeta: {
    color: "#b0b0b0",
    fontSize: 12,
  },
  emptyText: {
    color: "#b0b0b0",
    marginBottom: 12,
  },
  sectionLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: "#51cf66",
    padding: 12,
    borderRadius: 8,
  },
  saveText: { color: "#000", fontWeight: "700" },
  deleteButton: {
    backgroundColor: "#ff6b6b",
    padding: 12,
    borderRadius: 8,
  },
  deleteText: { color: "#fff", fontWeight: "700" },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
  },
  cancelText: { color: "#b0b0b0" },
});
