import es from 'estree'
import * as ast from '../../utils/ast/astCreator'
import { evaluateBinaryExpression, evaluateUnaryExpression } from '../../utils/operators'
import { substituterNodes } from '../../types';

type Node = substituterNodes;

// Literal checkers

function isBooleanLiteral(node: Node) {
  return node.type === 'Literal' && typeof node.value === 'boolean'
}

function isNumberLiteral(node: Node) {
  return node.type === 'Literal' && typeof node.value === 'number'
}

// E -> E'
function reducible(node: Node): boolean {
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
    },
    default(_: Node) {
      return false;
    }
  }
  const validator = validators[node.type] || validators.default;
  return validator(node);
}

function reduce(node: Node): Node {
  // The implementor must ensure that node is reducible before sending through this function.
  const reducers = {
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
      return (node.test as es.Literal).raw === 'true' ? node.alternate : node.consequent;
    },
    default(node: Node) {
      return node;
    }
  }
  const reducer = reducers[node.type] || reducers.default;
  return reducer(node);
}

export function reduceOneStepPossible(node: Node): boolean {
  if (reducible(node)) {
    return true
  }
  const validators = {
    Program(node: es.Program) { 
      if (node.body.length === 1 && !reduceOneStepPossible(node.body[0])) {
        return false;
      } else {
        return true;
      }
    },
    ExpressionStatement(node: es.ExpressionStatement) {
      return reduceOneStepPossible(node.expression);
    },
    UnaryExpression(node: es.UnaryExpression) {
      return reduceOneStepPossible(node.argument);
    },
    BinaryExpression(node: es.BinaryExpression) {
      return reduceOneStepPossible(node.left) || reduceOneStepPossible(node.right)
    },
    LogicalExpression(node: es.LogicalExpression) {
      return reduceOneStepPossible(node.left) || reduceOneStepPossible(node.right);
    },
    ConditionalExpression(node: es.ConditionalExpression) {
      return reduceOneStepPossible(node.test)
    },
    default(_: Node) {
      return false;
    }
  }
  const validator = validators[node.type] || validators.default;
  return validator(node);
}

// !Important: All nodes passed into this function must ensure that reduceOneStepPossible(node) is true.
// Stepper
export function reduceOneStep(node: Node): Node {
  const steppers = {
    Reducible(node: Node) { 
      return reduce(node) // reduction E -> E'
    },
    Program(node: es.Program) {
      /**
        @Rule E1; E2; -> E1'; E2;
        @ProgramIntro V; E;  -> V; E';
        @ProgramReduce V1; V2; ...; Vk; E1, E2, ... -> Vk; E1', E2, ...
      */
      if (node.body.length == 0) {
        return ast.identifier('undefined');
      }
      if (node.body.length == 1) { // E; -> E';
        const newBody = reduceOneStep(node.body[0]) as es.Statement;
        return ast.program([newBody]);
      }
      for (let i = 0; i < 2; i++) {  // reduce only first two statements      
        if (reduceOneStepPossible(node.body[i])) {
          let newBody = node.body;
          newBody[i] = reduceOneStep(node.body[i]) as es.Statement;
          return ast.program(newBody as es.Statement[]);
        }
      }
      node.body.shift(); 
      return ast.program(node.body as es.Statement[]);
    },
    ExpressionStatement(node: es.ExpressionStatement) { // E; -> E';
      return ast.expressionStatement(reduceOneStep(node.expression) as es.Expression)
    },
    UnaryExpression(node: es.UnaryExpression) { // UnaryOp(E) -> UnaryOp(E')
      return ast.unaryExpression(node.operator, reduceOneStep(node.argument) as es.Expression)
    },
    BinaryExpression(node: es.BinaryExpression) {
      if (reduceOneStepPossible(node.left)) {
        // BinOp[E1, E2] -> BinOp[E1', E2]
        return ast.binaryExpression(node.operator, reduceOneStep(node.left) as es.Expression, node.right)
      } else {
        // BinOp[V, E] -> BinOp[V, E']
        return ast.binaryExpression(node.operator, node.left, reduceOneStep(node.right) as es.Expression)
      }
    },
    LogicalExpression(node: es.LogicalExpression) {
      if (reduceOneStepPossible(node.left)) {
        // BinOp[E1, E2] -> BinOp[E1', E2]
        return ast.logicalExpression(
          node.operator,
          reduceOneStep(node.left) as es.Expression,
          node.right,
          node.loc
        )
      } else {
        // BinOp[V, E] -> BinOp[V, E']
        return ast.logicalExpression(
          node.operator,
          node.left,
          reduceOneStep(node.right) as es.Expression,
          node.loc
        )
      }     
    },
    ConditionalExpression(node: es.ConditionalExpression) {
      if (reduceOneStepPossible(node.test)) {
        // E1 : E2 ? E3 -> E1' : E2 ? E3
        return ast.conditionalExpression(
          reduceOneStep(node.test) as es.Expression,
          node.consequent,
          node.alternate
        )
      } else { // conditionalExpression is reducible already
        return reduceOneStep(node);  
      }
    },
    default(node: Node) {
      return node;
    }
  }

  const stepper = reducible(node) ? steppers["Reducible"] : steppers[node.type] ?? steppers.default;
  node = stepper(node);
  return node;
}
