import es, { BinaryOperator, LogicalOperator, UnaryOperator } from 'estree'
import { convert } from './converter'
import { evaluateBinaryExpression } from '../../../utils/operators'
/** V2: Naive OOP Implementation */

export type StepperExpression = (
  | StepperUnaryExpression
  | StepperLiteral
  | StepperBinaryExpression
  | StepperLogicalExpression
  | StepperConditionalExpression
)

function isBooleanLiteral(node: StepperExpression) {
  return node.type === 'Literal' && typeof node.value === 'boolean'
}
function isNumberLiteral(node: StepperExpression) {
  return node.type === 'Literal' && typeof node.value === 'number'
}

export interface StepperAST {
  contractible(): boolean
  contract(): StepperExpression
  oneStepPossible(): boolean
  oneStep(): StepperExpression
}

export class StepperLiteral implements StepperAST {
  type: 'Literal'
  value: string | boolean | number | null
  raw?: string | undefined

  constructor(value: string | number | boolean | null) {
    this.type = 'Literal';
    this.value = value;
    this.raw = undefined;
  }

  static create(payload: es.SimpleLiteral): StepperLiteral {
    return new StepperLiteral(payload.value);
  }

  contractible(): boolean {
    return false
  }
  contract() {
    return this
  }
  oneStepPossible() {
    return this.contractible()
  }
  oneStep() {
    return this
  }
}

export class StepperUnaryExpression implements StepperAST {
  type: 'UnaryExpression'
  operator: UnaryOperator
  prefix: true
  argument: StepperExpression
  constructor(operator: UnaryOperator, argument: StepperExpression) {
    this.type = 'UnaryExpression';
    this.operator = operator;
    this.prefix = true;
    this.argument = argument;
  }

  static create(input: es.UnaryExpression) {
    return new StepperUnaryExpression(
      input.operator,
      convert(input.argument)
    );
  }
 
  contractible(): boolean {
    return this.operator === '!'
      ? isBooleanLiteral(this.argument)
      : this.operator === '-'
      ? isNumberLiteral(this.argument)
      : false
  }
  contract(): StepperExpression {
    return new StepperUnaryExpression(this.operator, this.argument.contract())
  }
  oneStepPossible(): boolean {
    return this.contractible() || this.argument.oneStepPossible()
  }
  oneStep(): StepperExpression {
    if (this.contractible()) return this.contract()
    return new StepperUnaryExpression(this.operator, this.argument.oneStep())
  }
}

export class StepperLogicalExpression implements StepperAST {
  type: 'LogicalExpression'
  operator: LogicalOperator
  left: StepperExpression
  right: StepperExpression

  constructor(operator: LogicalOperator, left: StepperExpression, right: StepperExpression) {
    this.type = 'LogicalExpression'
    this.operator = operator
    this.left = left
    this.right = right
  }

  static create(input: es.LogicalExpression) {
    return new StepperLogicalExpression(
      input.operator,
      convert(input.left),
      convert(input.right)
    )
  }

  contractible(): boolean {
    switch (this.operator) {
      case '&&':
      case '||':
        return isBooleanLiteral(this.left) && isBooleanLiteral(this.right)
      default:
        return false
    }
  }

  contract(): StepperExpression {
    return this.operator === '&&'
      ? (this.left as StepperLiteral).value
        ? this.right
        : new StepperLiteral(false)
      : (this.left as StepperLiteral).value
      ? new StepperLiteral(true)
      : this.right
  }

  oneStepPossible(): boolean {
    return this.contractible() || this.left.oneStepPossible() || this.right.oneStepPossible()
  }
  oneStep(): StepperExpression {
    if (this.contractible()) return this.contract()
    // BinOp[E1, E2] -> BinOp[E1', E2]
    if (this.left.oneStepPossible()) {
      return new StepperLogicalExpression(this.operator, this.left.oneStep(), this.right)
    } else {
      return new StepperLogicalExpression(this.operator, this.left, this.right.oneStep())
    }
  }
}

export class StepperBinaryExpression implements StepperAST {
  type: 'BinaryExpression'
  operator: BinaryOperator
  left: StepperExpression
  right: StepperExpression

  constructor(operator: BinaryOperator, left: StepperExpression, right: StepperExpression) {
    this.type = 'BinaryExpression'
    this.operator = operator
    this.left = left
    this.right = right
  }

  static create(input: es.BinaryExpression) {
    return new StepperBinaryExpression(
      input.operator,
      convert(input.left),
      convert(input.right)
    )
  }

  contractible(): boolean {
    return isNumberLiteral(this.left) && isNumberLiteral(this.right)
  }

  contract(): StepperExpression {
    const evaluatedExpression = evaluateBinaryExpression(
      this.operator,
      (this.left as StepperLiteral).value,
      (this.right as StepperLiteral).value
    )
    const result = new StepperLiteral(evaluatedExpression);
    return result;
  }

  oneStepPossible(): boolean {
    return this.contractible() || this.left.oneStepPossible() || this.right.oneStepPossible()
  }

  oneStep(): StepperExpression {
    if (this.contractible()) return this.contract()
    // BinOp[E1, E2] -> BinOp[E1', E2]
    if (this.left.oneStepPossible()) {
      return new StepperBinaryExpression(this.operator, this.left.oneStep(), this.right)
    } else {
      return new StepperBinaryExpression(this.operator, this.left, this.right.oneStep())
    }
  }
}

export class StepperConditionalExpression implements StepperAST {
  type: 'ConditionalExpression'
  test: StepperExpression
  alternate: StepperExpression
  consequent: StepperExpression

  constructor(
    test: StepperExpression,
    alternate: StepperExpression,
    consequent: StepperExpression
  ) {
    this.type = 'ConditionalExpression'
    this.test =  test
    this.alternate = alternate
    this.consequent = consequent
  }

  static create(input: es.ConditionalExpression) {
    return new StepperConditionalExpression(
      convert(input.test), convert(input.alternate), convert(input.consequent)
    )
  }

  contractible(): boolean {
    return isBooleanLiteral(this.test)
  }

  contract(): StepperExpression {
    return (this.test as StepperLiteral).value === true ? this.alternate : this.consequent
  }

  oneStepPossible(): boolean {
    return this.contractible() || this.test.oneStepPossible()
  }

  oneStep(): StepperExpression {
    if (this.contractible()) return this.contract()
    if (this.test.oneStepPossible()) {
      // E1 : E2 ? E3 -> E1' : E2 ? E3
      return new StepperConditionalExpression(
        this.test.oneStep(),
        this.consequent,
        this.alternate
      )
    } else {
      return this.oneStep()
    }
  }
}
