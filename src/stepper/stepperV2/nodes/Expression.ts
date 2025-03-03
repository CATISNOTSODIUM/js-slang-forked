import { BinaryExpression, Expression, SimpleLiteral, UnaryExpression } from 'estree'
import { StepperBinaryExpression } from './BinaryExpression'
import { StepperUnaryExpression } from './UnaryExpression'
import { StepperLiteral } from './Literal'

export type StepperExpression = StepperBinaryExpression | StepperUnaryExpression | StepperLiteral

export function createStepperExpression(expression: Expression): StepperExpression {
    switch (expression.type) {
    case 'BinaryExpression':
      return StepperBinaryExpression.create(expression as BinaryExpression)
    case 'UnaryExpression':
      return StepperUnaryExpression.create(expression as UnaryExpression)
    case 'Literal':
      return StepperLiteral.create(expression as SimpleLiteral)
    default:
      throw new Error(`Unsupported expression type: ${expression.type}`)
  }
}
