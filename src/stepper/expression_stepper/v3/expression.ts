import es, { BinaryOperator, LogicalOperator, UnaryOperator } from 'estree'
import { convert } from '../v3/converter'
/** V3: Adapt Visitor pattern 
// TODO - fix repeated conversion
*/

type VisitorReturnType = StepperExpression | boolean
export type StepperExpression =
  | StepperUnaryExpression
  | StepperLiteral
  | StepperBinaryExpression
  | StepperLogicalExpression
  | StepperConditionalExpression

export abstract class StepperNode {
  contractionStatus: undefined | 'BEFORE_CONTRACTED' | 'AFTER_CONTRACTED'
  constructor() {
    this.contractionStatus = undefined;
  }
  abstract accept(visitor: Visitor): VisitorReturnType
}

export abstract class Visitor {
  protected abstract visitLiteral(node: StepperLiteral): VisitorReturnType
  protected abstract visitUnaryExpression(node: StepperUnaryExpression): VisitorReturnType
  protected abstract visitBinaryExpression(node: StepperBinaryExpression): VisitorReturnType
  protected abstract visitLogicalExpression(node: StepperLogicalExpression): VisitorReturnType
  protected abstract visitConditionalExpression(
    node: StepperConditionalExpression
  ): VisitorReturnType
  visit(node: StepperExpression) {
    // cheat way to implement
    const nodeType = node.constructor.name.replace('Stepper', '')
    const visitMethod = this[`visit${nodeType}` as keyof Visitor]
    if (visitMethod && typeof visitMethod === 'function') {
      return visitMethod.call(this, node)
    } else {
      throw new Error(`No visitor method found for node type: ${nodeType}`)
    }
  }
}

export class StepperLiteral extends StepperNode {
  type: 'Literal'
  value: string | boolean | number | null
  raw?: string | undefined
  constructor(value: string | number | boolean | null) {
    super()
    this.type = 'Literal'
    this.value = value
    this.raw = undefined
  }

  static create(payload: es.SimpleLiteral): StepperLiteral {
    return new StepperLiteral(payload.value)
  }

  public accept(visitor: Visitor): VisitorReturnType {
    return visitor.visit(this)
  }
}

export class StepperUnaryExpression extends StepperNode {
  type: 'UnaryExpression'
  operator: UnaryOperator
  prefix: true
  argument: StepperExpression
  constructor(operator: UnaryOperator, argument: StepperExpression) {
    super()
    this.type = 'UnaryExpression'
    this.operator = operator
    this.prefix = true
    this.argument = argument
  }

  static create(input: es.UnaryExpression) {
    return new StepperUnaryExpression(input.operator, convert(input.argument))
  }

  public accept(visitor: Visitor): VisitorReturnType {
    return visitor.visit(this)
  }
}

export class StepperLogicalExpression extends StepperNode {
  type: 'LogicalExpression'
  operator: LogicalOperator
  left: StepperExpression
  right: StepperExpression
  constructor(operator: LogicalOperator, left: StepperExpression, right: StepperExpression) {
    super()
    this.type = 'LogicalExpression'
    this.operator = operator
    this.left = left
    this.right = right
  }

  static create(input: es.LogicalExpression) {
    return new StepperLogicalExpression(input.operator, convert(input.left), convert(input.right))
  }

  public accept(visitor: Visitor): VisitorReturnType {
    return visitor.visit(this)
  }
}

export class StepperBinaryExpression extends StepperNode {
  type: 'BinaryExpression'
  operator: BinaryOperator
  left: StepperExpression
  right: StepperExpression

  constructor(operator: BinaryOperator, left: StepperExpression, right: StepperExpression) {
    super()
    this.type = 'BinaryExpression'
    this.operator = operator
    this.left = left
    this.right = right
  }

  static create(input: es.BinaryExpression) {
    return new StepperBinaryExpression(input.operator, convert(input.left), convert(input.right))
  }

  public accept(visitor: Visitor): VisitorReturnType {
    return visitor.visit(this)
  }
}

export class StepperConditionalExpression extends StepperNode {
  type: 'ConditionalExpression'
  test: StepperExpression
  alternate: StepperExpression
  consequent: StepperExpression
  constructor(
    test: StepperExpression,
    alternate: StepperExpression,
    consequent: StepperExpression
  ) {
    super()
    this.type = 'ConditionalExpression'
    this.test = test
    this.alternate = alternate
    this.consequent = consequent
  }

  static create(input: es.ConditionalExpression) {
    return new StepperConditionalExpression(
      convert(input.test),
      convert(input.alternate),
      convert(input.consequent)
    )
  }

  public accept(visitor: Visitor): VisitorReturnType {
    return visitor.visit(this)
  }
}
