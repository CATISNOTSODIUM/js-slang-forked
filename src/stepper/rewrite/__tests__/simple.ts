import { mockContext } from '../../../mocks/context'
import { getEvaluationSteps } from '../simple'
import { parse } from '../../../parser/parser'



test(`test 1`, async () => {
  const programStr = '3 * 5 + 4;'
  const context = mockContext();
  getEvaluationSteps(parse(programStr, context)!);
})
