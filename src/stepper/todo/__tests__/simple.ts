import { mockContext } from '../../../mocks/context'
import { getEvaluationSteps } from '../simple'
import { parse } from '../../../parser/parser'



test(`test 1`, async () => {
  const programStr = 'const x = 2; x;'
  const context = mockContext();
  getEvaluationSteps(parse(programStr, context)!);
})
