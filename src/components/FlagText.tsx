import { Text, type StyleProp, type TextStyle } from 'react-native';

import { type } from '../theme';

type Props = { flag: string; playerColor: string; lines?: 1 | 2; style?: StyleProp<TextStyle> };

/** A player's flag, always in curly quotes so it reads as their words. Plain text only. */
export function FlagText({ flag, playerColor, lines = 2, style }: Props) {
  return (
    <Text style={[type.callout, { color: playerColor }, style]} numberOfLines={lines} ellipsizeMode="tail">
      {`“${flag}”`}
    </Text>
  );
}
