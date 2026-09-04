import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gradeFillInBlank } from '@/features/learning/grading/fill-in-blank.grader';

type GoldenFixture = {
  gradingVersion: number;
  cases: Array<{
    id: string;
    correctAnswer: string;
    acceptedVariants: string[];
    userAnswer: string;
    expected: { isCorrect: boolean; matchedVariant: string | null };
  }>;
};

const fixture = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/features/learning/contracts/fill-in-blank.v1.json'),
    'utf8',
  ),
) as GoldenFixture;

describe('fill-in-blank grader v1 golden fixtures (FE parity)', () => {
  it('uses gradingVersion 1', () => {
    expect(fixture.gradingVersion).toBe(1);
  });

  it.each(fixture.cases)('$id', (testCase) => {
    const result = gradeFillInBlank({
      userAnswer: testCase.userAnswer,
      correctAnswer: testCase.correctAnswer,
      acceptedVariants: testCase.acceptedVariants,
    });
    expect(result.gradingVersion).toBe(1);
    expect(result.isCorrect).toBe(testCase.expected.isCorrect);
    expect(result.matchedVariant).toBe(testCase.expected.matchedVariant);
  });
});
