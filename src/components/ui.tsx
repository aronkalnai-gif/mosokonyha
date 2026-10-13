import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, font, radius } from '../lib/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  small?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, small }: ButtonProps) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.35 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, fg: colors.primaryText, border: colors.primary },
  secondary: { bg: 'transparent', fg: colors.text, border: colors.border },
  danger: { bg: 'transparent', fg: colors.danger, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.muted, border: 'transparent' },
};

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({ progress, color, height = 3 }: { progress: number; color: string; height?: number }) {
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View
        style={{
          width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`,
          height,
          borderRadius: height,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** A small coloured dot followed by a label: "● Szabad". */
export function Status({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.status}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

/** Small uppercase label above a section. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function Title({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: 14, borderRadius: 10 },
  buttonText: { fontSize: 15, fontWeight: font.medium, letterSpacing: 0.2 },
  buttonTextSmall: { fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  track: { backgroundColor: colors.track, overflow: 'hidden', width: '100%' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: font.medium, letterSpacing: 0.2 },
  eyebrow: { fontSize: 11, fontWeight: font.semibold, color: colors.muted, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: font.regular, color: colors.text, letterSpacing: -0.4 },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 21 },
});
