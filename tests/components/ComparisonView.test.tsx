import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComparisonView } from '../../src/components/optimizer/ComparisonView';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { OptimizationSuggestion } from '../../src/engine/types';
import { makeOptimizationResult } from '../helpers';

describe('ComparisonView', () => {
  it('compares original and optimized metrics and reports the changed dimension', () => {
    const suggestion: OptimizationSuggestion = {
      originalConfig: { ...DEFAULT_CONFIG },
      optimizedConfig: { ...DEFAULT_CONFIG, width: DEFAULT_CONFIG.width + 50 },
      originalResult: makeOptimizationResult({ totalSheets: 3, overallYield: 72, totalWaste: 400_000 }),
      optimizedResult: makeOptimizationResult({ totalSheets: 2, overallYield: 84, totalWaste: 250_000 }),
      savings: { sheetsRemoved: 1, yieldImprovement: 12, wasteReduced: 150_000 },
      strategy: 'adjust-width',
      explanation: { en: 'The adjusted width improves sheet yield.', he: 'הרוחב המתוקן משפר את ניצולת הלוחות.' },
      score: 1,
    };

    render(<ComparisonView suggestion={suggestion} />);

    expect(screen.getByText('Original vs Optimized')).toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Optimized')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/W\s*:\s*1,000\s*→\s*1,050\s+mm/)).toBeInTheDocument();
  });
});
