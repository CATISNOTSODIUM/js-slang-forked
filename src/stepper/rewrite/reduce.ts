import es from 'estree'
import { substituterNodes } from '../../types'
import * as ast from '../../utils/ast/astCreator'
import { evaluateBinaryExpression, evaluateUnaryExpression } from '../../utils/operators'

function isBooleanLiteral(node: substituterNodes) {
  return node.type === 'Literal' && typeof node.value === 'boolean'
}

function isNumberLiteral(node: substituterNodes) {
  return node.type === 'Literal' && typeof node.value === 'number'
}

function contractible(node: substituterNodes): boolean {
  const validators = {
    Literal() {
      return false;
    },
    UnaryExpression(node: es.UnaryExpression) {
      switch (node.operator) {
        case '!':
          return isBooleanLiteral(node.argument)
        case '-':
          return isNumberLiteral(node.argument)
        default:
          return false
      }
    },
    BinaryExpression(node: es.BinaryExpression) {
      return (
        isNumberLiteral(node.left) &&
        isNumberLiteral(node.right) &&
        (node.right as es.Literal).value !== 0
      )
    },
    LogicalExpression(node: es.LogicalExpression) {
      switch (node.operator) {
        case '&&':
        case '||':
          return isBooleanLiteral(node.left) && isBooleanLiteral(node.right);
        default: 
          return false;
      }
    },
    ConditionalExpression(node: es.ConditionalExpression) {
      return isBooleanLiteral(node.test);
    }
  }
  const validator = validators[node.type];
  if (validator === undefined) {
    return false;
  } else {
    return validator(node);
  }
}

function contract(node: irreducibleNodes): substituterNodes {
  // The implementor must ensure that node is contractible before sending through this function.
  const contractors = {
    UnaryExpression(node: es.UnaryExpression) {
      return ast.literal(
        evaluateUnaryExpression(node.operator, (node.argument as es.Literal).value),
        node.loc
      )
    },
    BinaryExpression(node: es.BinaryExpression) {
      return ast.literal(
        evaluateBinaryExpression(
          node.operator,
          (node.left as es.Literal).value,
          (node.right as es.Literal).value
        ),
        node.loc
      );
    },
    LogicalExpression(node: es.LogicalExpression) {
      return node.operator === '&&'
        ? (node.left as es.Literal).value
          ? node.right
          : ast.literal(false, node.loc)
        : (node.left as es.Literal).value
        ? ast.literal(true, node.loc)
        : node.right;
    },
    ConditionalExpression(node: es.ConditionalExpression) {
      return (node.test as es.Literal).raw === 'true' ? node.consequent : node.alternate;
    }
  }
  const contractor = contractors[node.type];
  if (contractor === undefined) {
    return node;
  } else {
    return contractor(node);
  }
}

export function oneStepPossible(node: substituterNodes): boolean {
  if (contractible(node)) {
    return true
  }
  const validators = {
    Program(node: es.Program) { 
      if (node.body.length === 1 && !oneStepPossible(node.body[0])) {
        return false;
      } else {
        return true;
      }
    },
    UnaryExpression(node: es.UnaryExpression) {
      return oneStepPossible(node.argument);
    },
    BinaryExpression(node: es.BinaryExpression) {
      return oneStepPossible(node.left) || oneStepPossible(node.right)
    },
    LogicalExpression(node: es.LogicalExpression) {
      return oneStepPossible(node.left) || oneStepPossible(node.right);
    },
    ConditionalExpression(node: es.ConditionalExpression) {
      return oneStepPossible(node.test)
    },
    ExpressionStatement(node: es.ExpressionStatement) {
      return oneStepPossible(node.expression);
    }
  }
  const validator = validators[node.type];
  if (validator === undefined) {
    return false;
  } else {
    return validator(node);
  }
}

type irreducibleNodes =
  | es.FunctionExpression
  | es.ArrowFunctionExpression
  | es.Literal
  | es.ArrayExpression

// !Important: All nodes passed into this function must ensure that oneStepPossible(node) is true.
export function oneStep(node: substituterNodes): substituterNodes {
  // Contraction E -> E'
  if (contractible(node)) {
    return contract(node as irreducibleNodes)
  }

  // E1; E2; -> E1'; E2;
  // Program-intro V; E;  -> V; E';
  // Program-reduce V1; V2; ...; Vk; E1, E2, ... -> Vk; E1', E2, ...

  if (node.type === 'Program') {
    const programBody = node.body
    if (programBody.length == 0) {
      return ast.identifier('undefined')
    }
    // E; -> E';
    if (programBody.length == 1) {
      node.body[0] = oneStep(programBody[0]) as es.Statement
      return node
    }
    // Contract only first two statements
    // E1; E2; -> E1'; E2;
    for (let i = 0; i < 2; i++) {
      if (oneStepPossible(programBody[i])) {
        node.body[i] = oneStep(programBody[i]) as es.Statement
        return node
      }
    }
    // V1; V2; -> V2;
    node.body.shift(); // fix: very inefficient
    return node
  }

  if (node.type === 'ExpressionStatement') {
    // E; -> E';
    return ast.expressionStatement(oneStep(node.expression) as es.Expression)
  }

  // OpArg1 p1[E] -> p1[E']
  if (node.type === 'UnaryExpression') {
    return ast.unaryExpression(node.operator, oneStep(node.argument) as es.Expression)
  }

  if (node.type === 'BinaryExpression') {
    if (oneStepPossible(node.left)) {
      // p2[E1, E2] -> p2[E1', E2]
      return ast.binaryExpression(node.operator, oneStep(node.left) as es.Expression, node.right)
    } else {
      // p2[V, E] -> p2[V, E']
      return ast.binaryExpression(node.operator, node.left, oneStep(node.right) as es.Expression)
    }
  }

  if (node.type === 'LogicalExpression') {
    if (oneStepPossible(node.left)) {
      // p2[E1, E2] -> p2[E1', E2]
      return ast.logicalExpression(
        node.operator,
        oneStep(node.left) as es.Expression,
        node.right,
        node.loc
      )
    } else {
      // p2[V, E] -> p2[V, E']
      return ast.logicalExpression(
        node.operator,
        node.left,
        oneStep(node.right) as es.Expression,
        node.loc
      )
    }
  }

  if (node.type === 'ConditionalExpression') {
    if (oneStepPossible(node.test)) {
      // E1 : E2 ? E3 -> E1' : E2 ? E3
      return ast.conditionalExpression(
        oneStep(node.test) as es.Expression,
        node.consequent,
        node.alternate
      )
    }
  }

  return node
}
