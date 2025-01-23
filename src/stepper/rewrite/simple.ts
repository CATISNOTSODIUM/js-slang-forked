
// Draft
import es from 'estree'
import { substituterNodes } from "../../types"
import { oneStep, oneStepPossible } from "./reduce"
import {codify} from "../stepper"

function evaluate(node: substituterNodes): string[] {
  const steps: string[] = []
  for (let i = 0; i < 10; i++) {
    node = oneStep(node)
    steps.push(codify(node).replace('\n',''))
    if (!oneStepPossible(node)) break
  }
  return steps
}



export function getEvaluationSteps(program: es.Program) {
  // simple expression stepper
  const expr = program
  // console.log(JSON.stringify(expr, null, 2), evaluate);
  console.log(evaluate(expr));
}
