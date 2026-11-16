import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { color, radius, size, space } from '../theme';
import { Store } from './icons';
import { Pill } from './Pill';

type Props = { lat: number; lng: number; name: string; mine: boolean; onPress?: () => void };

/** Shop marker: 36 px circle, gold border (lime when I hold it), Store icon, name pill underneath. */
export function ShopPin({ lat, lng, name, mine, onPress }: Props) {
  return (
    <Marker coordinate={{ latitude: lat, longitude: lng }} anchor={{ x: 0.5, y: 0.3 }} onPress={onPress}>
      <View style={styles.wrap}>
        <View style={[styles.circle, { borderColor: mine ? color.accent : color.reward }]}>
          <Store size={size.icon - space.sm} strokeWidth={size.iconStroke} color={color.reward} />
        </View>
        <Pill label={name} style={styles.pill} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.xs },
  circle: {
    width: size.shopPin,
    height: size.shopPin,
    borderRadius: radius.pill,
    borderWidth: size.hairline * 2,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { alignSelf: 'center' },
});
