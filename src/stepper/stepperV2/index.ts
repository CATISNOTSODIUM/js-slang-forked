import { StepperExpression } from './nodes/Expression'

export let redex: { preRedex: StepperExpression | null; postRedex: StepperExpression | null } = {
  preRedex: null,
  postRedex: null
}

export type IStepperPropContents = [StepperExpression, StepperExpression | null, string];
export { toStringWithMarker } from "./generator"