import { evaluateBinaryExpression } from "../../../utils/operators";
import { Visitor, StepperBinaryExpression, StepperConditionalExpression, StepperExpression, StepperLiteral, StepperLogicalExpression, StepperUnaryExpression } from "./expression";

function isBooleanLiteral(node: StepperExpression) {
  return node.type === 'Literal' && typeof node.value === 'boolean'
}
function isNumberLiteral(node: StepperExpression) {
  return node.type === 'Literal' && typeof node.value === 'number'
}

export class Contractible extends Visitor {
  visitLiteral(_node: StepperLiteral): boolean {
    return false;
  }
  visitUnaryExpression(node: StepperUnaryExpression): boolean {
    return node.operator === '!'
      ? isBooleanLiteral(node.argument)
      : node.operator === '-'
      ? isNumberLiteral(node.argument)
      : false;
  }
  visitBinaryExpression(node: StepperBinaryExpression) {
      return isNumberLiteral(node.left) && isNumberLiteral(node.right);
  }
  visitConditionalExpression(node: StepperConditionalExpression) {
      return isBooleanLiteral(node.test)
  }
  visitLogicalExpression(node: StepperLogicalExpression) {
    switch (node.operator) {
      case '&&':
      case '||':
        return isBooleanLiteral(node.left) && isBooleanLiteral(node.right)
      default:
        return false
    }
  }
}

export class Contract extends Visitor {
  visitLiteral(node: StepperLiteral): StepperExpression {
    return node;
  }
  visitUnaryExpression(node: StepperUnaryExpression): StepperExpression {
    return new StepperUnaryExpression(node.operator, this.visit(node.argument))
  }
  visitBinaryExpression(node: StepperBinaryExpression): StepperExpression {
    const evaluatedExpression = evaluateBinaryExpression(
      node.operator,
      (node.left as StepperLiteral).value,
      (node.right as StepperLiteral).value
    )
    const result = new StepperLiteral(evaluatedExpression);
    return result;
  }

  visitConditionalExpression(node: StepperConditionalExpression): StepperExpression {
      return (node.test as StepperLiteral).value === true 
        ? node.alternate 
        : node.consequent
  }
  visitLogicalExpression(node: StepperLogicalExpression): StepperExpression {
    return node.operator === '&&'
          ? (node.left as StepperLiteral).value
            ? node.right
            : new StepperLiteral(false)
          : (node.left as StepperLiteral).value
          ? new StepperLiteral(true)
          : node.right
  }

  // @Override
  visit(node: StepperExpression): StepperExpression {
    // highlighted node
    node.contractionStatus = 'AFTER_CONTRACTED';
    return super.visit(node);
  }
}