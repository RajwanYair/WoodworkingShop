import { Text, View } from '@react-pdf/renderer';
import { C } from '../pdf-tokens';
import {
  CALIBRATION_RULER_LENGTH_MM,
  getCalibrationRulerTickPositions,
  millimetresToPdfPoints,
} from './pdf-calibration-ruler';

interface PdfCalibrationRulerProps {
  title: string;
  instructions: string;
}

export function PdfCalibrationRuler({ title, instructions }: Readonly<PdfCalibrationRulerProps>) {
  const rulerWidth = millimetresToPdfPoints(CALIBRATION_RULER_LENGTH_MM);
  const ticks = getCalibrationRulerTickPositions();

  return (
    <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.text }}>{title}</Text>
      <View
        style={{
          width: rulerWidth,
          height: 12,
          borderBottomWidth: 0.8,
          borderColor: C.text,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        {ticks.map((position, index) => (
          <View
            key={position}
            style={{
              position: 'absolute',
              left: position,
              width: 0.6,
              height: index % 5 === 0 ? 10 : 5,
              backgroundColor: C.text,
            }}
          />
        ))}
      </View>
      <View style={{ width: rulerWidth, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 6, color: C.text }}>0 mm</Text>
        <Text style={{ fontSize: 6, color: C.text }}>{CALIBRATION_RULER_LENGTH_MM} mm</Text>
      </View>
      <Text style={{ fontSize: 6, color: C.muted }}>{instructions}</Text>
    </View>
  );
}
