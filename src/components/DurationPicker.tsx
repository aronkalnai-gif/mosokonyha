// Hours + minutes scroll wheels, like the iPhone Timer.
import { useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../lib/theme';

const ITEM = 40; // row height
const VISIBLE = 5; // rows shown; the middle one is selected

// CSS scroll snapping on the web (react-native-web passes these through).
const snapList = Platform.OS === 'web' ? ({ scrollSnapType: 'y mandatory' } as object) : {};
const snapItem = Platform.OS === 'web' ? ({ scrollSnapAlign: 'center' } as object) : {};

function Wheel({
  count,
  value,
  onChange,
  label,
  accessibilityLabel,
}: {
  count: number;
  value: number;
  onChange: (v: number) => void;
  label: string;
  accessibilityLabel: string;
}) {
  const ref = useRef<ScrollView>(null);
  const [offset, setOffset] = useState(value * ITEM);
  const lastEmitted = useRef(value);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  // Follow changes made outside the wheel (e.g. a preset was tapped).
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    ref.current?.scrollTo({ y: value * ITEM, animated: true });
  }, [value]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setOffset(y);
    const i = Math.min(count - 1, Math.max(0, Math.round(y / ITEM)));
    if (i !== lastEmitted.current) {
      lastEmitted.current = i;
      onChange(i);
    }
  };

  return (
    <View style={styles.wheel} accessibilityLabel={accessibilityLabel}>
      <ScrollView
        ref={ref}
        style={[styles.list, snapList]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={() => ref.current?.scrollTo({ y: value * ITEM, animated: false })}
      >
        {items.map((i) => {
          const distance = Math.min(2, Math.abs(i * ITEM - offset) / ITEM);
          return (
            <Pressable
              key={i}
              style={[styles.item, snapItem]}
              onPress={() => ref.current?.scrollTo({ y: i * ITEM, animated: true })}
            >
              <Text style={[styles.num, { opacity: 1 - distance * 0.35, transform: [{ scale: 1 - distance * 0.08 }] }]}>
                {i}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.unit} pointerEvents="none">
        {label}
      </Text>
    </View>
  );
}

/** Lets the user pick a duration in whole minutes (1 minute to 5 h 59 min). */
export function DurationPicker({
  minutes,
  onChange,
  hoursLabel,
  minutesLabel,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
  hoursLabel: string;
  minutesLabel: string;
}) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (
    <View style={styles.picker}>
      <View style={styles.band} pointerEvents="none" />
      <Wheel count={6} value={h} onChange={(v) => onChange(v * 60 + m)} label={hoursLabel} accessibilityLabel={hoursLabel} />
      <Wheel count={60} value={m} onChange={(v) => onChange(h * 60 + v)} label={minutesLabel} accessibilityLabel={minutesLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { flexDirection: 'row', justifyContent: 'center', gap: 8, height: ITEM * VISIBLE },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM * 2,
    height: ITEM,
    borderRadius: 12,
    backgroundColor: colors.sand,
  },
  wheel: { width: 130, flexDirection: 'row', alignItems: 'center' },
  list: { height: ITEM * VISIBLE, flexGrow: 0, width: 64 },
  content: { paddingVertical: ITEM * 2 },
  item: { height: ITEM, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 },
  num: { fontSize: 26, fontWeight: font.light, color: colors.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 15, fontWeight: font.medium, color: colors.text },
});
