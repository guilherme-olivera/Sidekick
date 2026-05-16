import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MockEvent } from "@/src/mocks/germiniMock";

const { width } = Dimensions.get("window");
const CELL_SIZE = Math.floor((width - 32 - 12) / 7);

function formatDateYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function Calendar({ events, onDayPress }: { events: MockEvent[]; onDayPress?: (isoDate: string) => void }) {
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
    const map = new Map<string, MockEvent[]>();
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

          return (
            <View key={iso} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}> 
              <TouchableOpacity
                style={[
                  styles.dateCircle,
                  !inMonth && styles.outsideMonth,
                  hasEvents && styles.eventDay,
                  isToday && styles.todayActive,
                ]}
                onPress={() => onDayPress && onDayPress(iso)}
              >
                <Text style={[
                  styles.dateText,
                  !inMonth && styles.outsideText,
                  isToday && styles.todayText,
                  hasEvents && styles.eventText,
                ]}>{d.getDate()}</Text>
                {hasEvents && <View style={styles.eventDot} />}
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
    justifyContent: "space-between",
    marginBottom: 8,
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
    position: "absolute",
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#51cf66",
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
