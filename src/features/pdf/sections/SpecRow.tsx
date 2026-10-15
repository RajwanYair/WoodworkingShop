import { Text, View } from '@react-pdf/renderer';
import { s } from '../pdf-tokens';

export function SpecRow({
  label,
  value,
  isRTL = false,
  fontFamily = 'Helvetica',
  fontFamilyBold = 'Helvetica-Bold',
}: {
  label: string;
  value: string;
  isRTL?: boolean;
  fontFamily?: string;
  fontFamilyBold?: string;
}) {
  return (
    <View style={[s.specRow, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
      <Text style={[s.specLabel, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      <Text style={[s.specValue, { fontFamily: fontFamilyBold, textAlign: isRTL ? 'right' : 'left' }]}>{value}</Text>
    </View>
  );
}
