import type es from 'estree'

import { mockContext } from '../../mocks/context'
import { parse } from '../../parser/parser'
import { getSteps } from '../stepperV2/steppers'
import { createStepperExpression } from '../stepperV2/nodes/Expression'

test('arithmetic', () => {
    const code = `
    (1 + 2) * (3 + 4);
  `
const program = parse(code, mockContext())!
const targetExpression = program.body[0] as es.ExpressionStatement;
console.log(getSteps(createStepperExpression(targetExpression.expression)));
})