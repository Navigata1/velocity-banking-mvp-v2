import { Pressable, Text, View } from 'react-native';

export type MobileMode =
  | 'dashboard'
  | 'simulator'
  | 'cockpit'
  | 'portfolio'
  | 'learn'
  | 'vault'
  | 'settings';

export const modes: Array<{ id: MobileMode; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'learn', label: 'Learn' },
  { id: 'vault', label: 'Vault' },
  { id: 'settings', label: 'Settings' },
];

export const modeRoutes: Record<
  MobileMode,
  '/' | '/simulator' | '/cockpit' | '/portfolio' | '/learn' | '/vault' | '/settings'
> = {
  dashboard: '/',
  simulator: '/simulator',
  cockpit: '/cockpit',
  portfolio: '/portfolio',
  learn: '/learn',
  vault: '/vault',
  settings: '/settings',
};

function ModeButton({
  active,
  id,
  label,
  onPress,
}: {
  active: boolean;
  id: MobileMode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label} mobile section`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      aria-selected={active}
      onPress={onPress}
      style={{
        backgroundColor: active ? '#047857' : '#111827',
        borderColor: active ? '#34d399' : '#243244',
        borderCurve: 'continuous',
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
      testID={`mobile-mode-tab-${id}`}
    >
      <Text selectable style={{ color: active ? '#ecfdf5' : '#cbd5e1', fontSize: 13, fontWeight: '800' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function MobileModeNavigation({
  activeMode,
  onModeChange,
}: {
  activeMode: MobileMode;
  onModeChange: (mode: MobileMode) => void;
}) {
  return (
    <View
      accessibilityLabel="Mobile section navigation"
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
    >
      {modes.map((mobileMode) => (
        <ModeButton
          active={activeMode === mobileMode.id}
          id={mobileMode.id}
          key={mobileMode.id}
          label={mobileMode.label}
          onPress={() => onModeChange(mobileMode.id)}
        />
      ))}
    </View>
  );
}
