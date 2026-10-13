// Minimal line icons drawn with plain views (no icon font needed).
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../lib/theme';

/** A washing machine / dryer outline. When running, a small dot circles the door. */
export function MachineGlyph({ size = 72, color = colors.text, running = false }: { size?: number; color?: string; running?: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running) return;
    spin.setValue(0);
    const anim = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }));
    anim.start();
    return () => anim.stop();
  }, [running, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const stroke = Math.max(1.25, size / 48);
  const door = size * 0.52;

  return (
    <View style={{ width: size * 0.86, height: size, borderWidth: stroke, borderColor: color, borderRadius: size * 0.12, alignItems: 'center' }}>
      <View style={{ alignSelf: 'stretch', height: size * 0.18, borderBottomWidth: stroke, borderColor: color, flexDirection: 'row', alignItems: 'center', paddingHorizontal: size * 0.09, gap: size * 0.05 }}>
        <View style={{ width: size * 0.07, height: size * 0.07, borderRadius: size, backgroundColor: color }} />
        <View style={{ flex: 1 }} />
        <View style={{ width: size * 0.2, height: stroke, backgroundColor: color }} />
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ width: door, height: door, borderRadius: door, borderWidth: stroke, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[StyleSheet.absoluteFill, running && { transform: [{ rotate }] }]}>
            {running && (
              <View style={{ position: 'absolute', top: door * 0.12, alignSelf: 'center', width: door * 0.12, height: door * 0.12, borderRadius: door, backgroundColor: color }} />
            )}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

/** Two slider lines: the settings icon. */
export function SettingsIcon({ color = colors.text }: { color?: string }) {
  const line = (knobLeft: number) => (
    <View style={{ width: 20, height: 8, justifyContent: 'center' }}>
      <View style={{ height: 1.5, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', left: knobLeft, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: color, backgroundColor: colors.bg }} />
    </View>
  );
  return (
    <View style={{ gap: 4, padding: 4 }}>
      {line(3)}
      {line(10)}
    </View>
  );
}
