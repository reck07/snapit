import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';

/**
 * Calm, nature-inspired motion primitives.
 * Scale/press and hover lift mimic leaves settling, not bouncy UI chrome.
 */

export function PressableScale({
  children,
  style,
  hoverStyle,
  containerStyle,
  disabled,
  onPress,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = useState(false);

  const animate = toValue => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: false,
      speed: 28,
      bounciness: 3,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => animate(0.98)}
      onPressOut={() => animate(1)}
      style={containerStyle}
      {...rest}
    >
      <Animated.View
        style={[
          style,
          hovered && !disabled && hoverStyle,
          disabled && { opacity: 0.55 },
          { transform: [{ scale }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** Cards drift up 8px and fade in, staggered like leaves opening. */
export function FadeIn({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/** Wind-turning refresh icon. */
export function Spin({ spinning, children, style }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) {
      rotation.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rotation, spinning]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[style, { transform: [{ rotate }] }]}>{children}</Animated.View>
  );
}

/** Soft organic background blobs for the sign-in screen. */
export function OrganicBackdrop() {
  if (Platform.OS !== 'web') {
    return (
      <View style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <View
          style={{
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: 'rgba(91, 124, 79, 0.08)',
            top: -90,
            right: -70,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: 'rgba(196, 122, 90, 0.08)',
            bottom: -80,
            left: -80,
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <View
        style={{
          position: 'absolute',
          width: 340,
          height: 340,
          borderRadius: 170,
          backgroundColor: 'rgba(91, 124, 79, 0.09)',
          top: -120,
          right: -90,
          transform: [{ rotate: '-12deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: 'rgba(196, 122, 90, 0.09)',
          bottom: -110,
          left: -90,
          transform: [{ rotate: '18deg' }],
        }}
      />
    </View>
  );
}
