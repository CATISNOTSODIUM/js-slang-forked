import { mockContext } from '../../../mocks/context';
import { parse } from '../../../parser/parser'
import es from 'estree'
import { Stepper } from '../v2-highlighted/stepper';


test(`Simple parsing`, async () => {
  const programStr = '24 * 31 + 12 * 6;'
  const context = mockContext();
  console.log((parse(programStr, context) as es.Program).body[0]);
  const parsedExpr = (parse(programStr, context)?.body[0] as es.ExpressionStatement).expression;
  const stepper = new Stepper(parsedExpr);
  stepper.run();
  console.log(stepper.getStepsCodify().join('\n'));
  console.log(stepper.getMarkers()); 
});
