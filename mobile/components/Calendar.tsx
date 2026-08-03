import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { CalendarEvent } from "@/src/services/calendarMockService";

const { width } = Dimensions.get("window");
const CELL_SIZE = Math.floor((width - 32 - 36) / 7);

function formatDateYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function Calendar({ events, onDayPress }: { events: CalendarEvent[]; onDayPress?: (isoDate: string) => void }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const today = useMemo(() => new Date(), []);

  const monthData = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = base.getFullYear();
    const month = base.getMonth();

    // start from Monday
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday=0
    const startDate = new Date(year, month, 1 - startOffset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }

    return { base, days };
  }, [monthOffset, today]);

  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [events]);

  const monthLabel = `${monthData.base.toLocaleString("pt-BR", { month: "long" })} ${monthData.base.getFullYear()}`;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setMonthOffset((m) => m - 1)} style={styles.navButton}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => setMonthOffset((m) => m + 1)} style={styles.navButton}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekDaysRow}>
        {['Seg','Ter','Qua','Qui','Sex','Sab','Dom'].map((d) => (
          <Text key={d} style={[styles.weekDay, { width: CELL_SIZE }]}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {monthData.days.map((d) => {
          const iso = formatDateYMD(d);
          const inMonth = d.getMonth() === monthData.base.getMonth();
          const isToday = formatDateYMD(d) === formatDateYMD(today);
          const dayEvents = eventMap.get(iso) || [];
          const hasEvents = dayEvents.length > 0;
          const hasWorkouts = dayEvents.some(e => e.isWorkout);
          const hasReminders = dayEvents.some(e => !e.isWorkout);

          const circleStyles: any[] = [styles.dateCircle];
          if (!inMonth) circleStyles.push(styles.outsideMonth);
          if (isToday) circleStyles.push(styles.todayActive);
          
          if (hasWorkouts && hasReminders) {
            circleStyles.push(styles.bothEventsDay);
          } else if (hasWorkouts) {
            circleStyles.push(styles.workoutEventDay);
          } else if (hasReminders) {
            circleStyles.push(styles.reminderEventDay);
          }

          return (
            <View key={iso} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}> 
              <TouchableOpacity
                style={circleStyles}
                onPress={() => onDayPress && onDayPress(iso)}
              >
                <Text style={[
                  styles.dateText,
                  !inMonth && styles.outsideText,
                  isToday && styles.todayText,
                  hasEvents && styles.eventText,
                ]}>{d.getDate()}</Text>
                
                {hasEvents && (
                  <View style={styles.dotsRow}>
                    {hasWorkouts && <View style={[styles.eventDot, styles.workoutDot]} />}
                    {hasReminders && <View style={[styles.eventDot, styles.reminderDot]} />}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
  },
  navText: {
    color: "#ff6b6b",
    fontSize: 22,
  },
  monthLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  weekDaysRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 6,
  },
  weekDay: {
    color: "#b0b0b0",
    textAlign: "center",
    fontSize: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  } as any,
  cell: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  dateCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
  },
  dateText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  outsideMonth: {
    backgroundColor: "transparent",
  },
  outsideText: {
    color: "#555555",
    fontWeight: "500",
  },
  todayText: {
    color: "#ff6b6b",
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  workoutDot: {
    backgroundColor: "#51cf66",
  },
  reminderDot: {
    backgroundColor: "#ff922b",
  },
  dotsRow: {
    position: "absolute",
    bottom: 6,
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  workoutEventDay: {
    backgroundColor: "#112a18",
    borderColor: "#2b8a3e",
    borderWidth: 1,
  },
  reminderEventDay: {
    backgroundColor: "#2b1a0a",
    borderColor: "#d9480f",
    borderWidth: 1,
  },
  bothEventsDay: {
    backgroundColor: "#21200a",
    borderColor: "#e5db9c",
    borderWidth: 1,
  },
  eventDay: {
    backgroundColor: "#2d5e3a",
    borderColor: "#51cf66",
  },
  todayActive: {
    borderWidth: 2,
    borderColor: "#ff6b6b",
  },
  eventText: {
    color: "#ffffff",
  },
});

export default Calendar;
