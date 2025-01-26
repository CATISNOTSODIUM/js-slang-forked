import { mockContext } from '../../../mocks/context'
import { getEvaluationSteps } from '../stepper'
import { parse } from '../../../parser/parser'
// yarn test -- --silent=false exp_stepper.ts  
test(`Order of simplification`, async () => {
  const programStr = '1 * 2 + 3 * 4;'
  const context = mockContext();
  const result = getEvaluationSteps(parse(programStr, context)!).join('\n');
  console.log(result);
});

test(`Multiple statements`, async () => {
  const programStr = '5 + 6; 7 + 8; 9 + 10;'
  const context = mockContext();
  const result = getEvaluationSteps(parse(programStr, context)!).join('\n');
  console.log(result);
});

test(`Conditional statements`, async () => {
  const programStr = '(1 + 1 === 2) ? 5 + 6 : 7 * 8 + 9;'
  const context = mockContext();
  const result = getEvaluationSteps(parse(programStr, context)!).join('\n');
  console.log(result);
});