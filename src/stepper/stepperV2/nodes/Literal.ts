import { Comment, SimpleLiteral, SourceLocation } from 'estree'
import { StepperBaseNode } from '../interface'
import { StepperExpression } from './Expression'

export class StepperLiteral implements SimpleLiteral, StepperBaseNode {
  type: 'Literal'
  value: string | number | boolean | null
  raw?: string
  leadingComments?: Comment[]
  trailingComments?: Comment[]
  loc?: SourceLocation | null
  range?: [number, number]

  constructor(value:  string | number | boolean | null) {
    this.type = 'Literal'
    this.value = value
  }

  static create(literal: SimpleLiteral) {
    return new StepperLiteral(literal.value);
  }

  isContractible(): boolean {
    return false
  }

  isOneStepPossible(): boolean {
    return false
  }

  contract(): SimpleLiteral & StepperBaseNode {
    throw new Error('Method not implemented.')
  }

  oneStep(): StepperExpression {
    throw new Error('Method not implemented.')
  }
}
