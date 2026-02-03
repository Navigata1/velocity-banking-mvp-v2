# Port Notes — `wealth-transfer-timeline.jsx` → React Native (Expo)

This prototype is written as a **web React component** (`div`, `span`, `input`, Tailwind classes). Our MVP stack is **React Native + Expo + NativeWind**, so it needs a straight port.

## What to keep
- The **6-step story flow** is excellent: Inputs → Revelation → Opportunity Cost → Generational (optional) → Alternative → CTA.
- The **progress dots** + stepper navigation is a strong UI pattern for mobile.
- The animated counters are a great “this just clicked” moment.

## What to change (required)
1) Replace DOM elements with RN components:
   - `div` → `View`
   - `span` → `Text`
   - `input` → `TextInput`
   - `button` → `Pressable`

2) Replace `style` tag animations:
   - RN can’t use `@keyframes`.
   - Use **Reanimated** for particles + pulses, or remove particles for MVP.

3) Replace Tailwind gradients:
   - NativeWind supports many classes, but gradients usually require `expo-linear-gradient`.

4) Replace `requestAnimationFrame` counter:
   - Works in RN, but better to use `Animated` or `react-native-reanimated` for consistent timing.

## IMPORTANT: accuracy
The prototype includes **simplified placeholders** (e.g., "~7 years" assumption and estimated velocity interest). In the production app:
- Drive *all* results from the **simulation engine** outputs.
- Keep this screen as a *presentation layer*.

## Copy safety
The prototype contains strong language ("robbed", "death pledge").
- Keep the intensity as an *optional* tone setting.
- Default app store tone should be firm, but not inflammatory.

## Suggested route
- Place this under `/(tabs)/learn/wealth-transfer.tsx` (or `/(tabs)/reports/wealth-transfer.tsx` if you add a Reports tab).
- Also allow access from **Vault Dashboard** (“Wealth Transfer Timeline”).

