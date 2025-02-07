
// Draft
import es from 'estree'
import { substituterNodes } from "../../types"
import { OneStep, OneStepPossible } from "./reducer"
import {codify} from "../stepper"

function evaluate(node: substituterNodes, maxStep = 100): string[] {
  const steps: string[] = []
  steps.push(codify(node).replace(/\n/g,'')); // "codify" is from the original stepper implementation
  for (let i = 0; i < maxStep; i++) {
    node = OneStep(node)
    steps.push(codify(node).replace(/\n/g,''));
    if (!OneStepPossible(node)) break;
  }
  return steps
}

export function getEvaluationSteps(program: es.Program) {
  const expr = program
  return evaluate(expr);
}
