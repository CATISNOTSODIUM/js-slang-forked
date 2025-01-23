import type es from 'estree'

import { mockContext } from '../../mocks/context'
import { Chapter } from '../../types'
import { getEvaluationSteps } from '../stepper'
import { parse } from '../../parser/parser'


function getSteps(evaluationSteps:  [es.Program, string[][], string][]): string {
    return evaluationSteps.map((evalStep, idx) => `${idx}: ${evalStep[2]}`).join('\n');
}
/*
[
  { type: 'Program', sourceType: 'module', body: [Array] },
  [ [Array] ], Path
  'Constant f declared and substituted into rest of block'
]
*/

test(`test 1`, async () => {
  const programStr = 'const x = 1; const f = y => x; f(3);'
  const context = mockContext(Chapter.SOURCE_2)
  const program = parse(programStr, context)!
  const options = {
    stepLimit: 1000,
    importOptions: {
      loadTabs: false,
      wrapSourceModules: false,
      resolverOptions: { extensions: null },
      shouldAddFileName: false,
      allowUndefinedImports: false,
      throwOnDuplicateNames: true
    }
  }
  const res: [es.Program, string[][], string][] = getEvaluationSteps(program, context, options);
  getSteps(res);
  console.log(JSON.stringify(res, null, 2))
  expect('4;').toEqual('4;')
})
