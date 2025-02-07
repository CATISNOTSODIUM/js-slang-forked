import es from 'estree'
import * as ast from '../../utils/ast/astCreator'
import { evaluateBinaryExpression, evaluateUnaryExpression } from '../../utils/operators'
import { substituterNodes } from '../../types'
type Node = substituterNodes
// Literal checkers
function isBooleanLiteral(node: Node) {
  return node.type === 'Literal' && typeof node.value === 'boolean'
}
function isNumberLiteral(node: Node) {
  return node.type === 'Literal' && typeof node.value === 'number'
}

// Contract regex
function contractible(node: Node): boolean {
  const contractibleValidators = {
    Literal() {
      return false
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
          return isBooleanLiteral(node.left) && isBooleanLiteral(node.right)
        default:
          return false
      }
    },
    ConditionalExpression(node: es.ConditionalExpression) {
      return isBooleanLiteral(node.test)
    },
    default(_: Node) {
      return false
    }
  }
  const validator = contractibleValidators[node.type] || contractibleValidators.default
  return validator(node)
}

function contract(node: Node): Node {
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
      )
    },
    LogicalExpression(node: es.LogicalExpression) {
      return node.operator === '&&'
        ? (node.left as es.Literal).value
          ? node.right
          : ast.literal(false, node.loc)
        : (node.left as es.Literal).value
        ? ast.literal(true, node.loc)
        : node.right
    },
    ConditionalExpression(node: es.ConditionalExpression) {
      return (node.test as es.Literal).raw === 'true' ? node.alternate : node.consequent
    },
    default(node: Node) {
      return node
    }
  }

  // The implementor must ensure that node is contractible before sending through this function.
  const contract = contractors[node.type] || contractors.default
  return contract(node)
}

export function OneStepPossible(node: Node): boolean {
  const OneStepValidators = {
    Program(node: es.Program) {
      if (node.body.length === 1 && !OneStepPossible(node.body[0])) {
        return false
      } else {
        return true
      }
    },
    ExpressionStatement(node: es.ExpressionStatement) {
      return OneStepPossible(node.expression)
    },
    UnaryExpression(node: es.UnaryExpression) {
      return OneStepPossible(node.argument)
    },
    BinaryExpression(node: es.BinaryExpression) {
      return OneStepPossible(node.left) || OneStepPossible(node.right)
    },
    LogicalExpression(node: es.LogicalExpression) {
      return OneStepPossible(node.left) || OneStepPossible(node.right)
    },
    ConditionalExpression(node: es.ConditionalExpression) {
      return OneStepPossible(node.test)
    },
    default(_: Node) {
      return false
    }
  }
  if (contractible(node)) {
    return true
  }
  const validator = OneStepValidators[node.type] || OneStepValidators.default
  return validator(node)
}

// !Important: All nodes passed into this function must ensure that OneStepPossible(node) is true.
export function OneStep(node: Node): Node {
  const OneSteppers = {
    contractible(node: Node) {
      return contract(node) // reduction E -> E' (changing the AST type)
    },
    Program(node: es.Program): es.Program {
      /**
        @Rule E1; E2; -> E1'; E2;
        @ProgramIntro V; E;  -> V; E';
        @Programcontract V1; V2; ...; Vk; E1, E2, ... -> Vk; E1', E2, ...
      */
      if (node.body.length == 0) {
        return ast.program([])
      }
      if (node.body.length == 1) {
        // E; -> E';
        const newBody = OneStep(node.body[0]) as es.Statement
        return ast.program([newBody])
      }
      for (let i = 0; i < 2; i++) {
        // contract only first two statements
        if (OneStepPossible(node.body[i])) {
          let newBody = node.body
          newBody[i] = OneStep(node.body[i]) as es.Statement
          return ast.program(newBody as es.Statement[])
        }
      }
      node.body.shift(); // remove the first value-inducing statement
      return ast.program(node.body as es.Statement[])
    },
    ExpressionStatement(node: es.ExpressionStatement): es.ExpressionStatement {
      // E; -> E';
      return ast.expressionStatement(OneStep(node.expression) as es.Expression)
    },
    UnaryExpression(node: es.UnaryExpression): es.UnaryExpression {
      // UnaryOp(E) -> UnaryOp(E')
      return ast.unaryExpression(node.operator, OneStep(node.argument) as es.Expression)
    },
    BinaryExpression(node: es.BinaryExpression): es.BinaryExpression {
      if (OneStepPossible(node.left)) {
        // BinOp[E1, E2] -> BinOp[E1', E2]
        return ast.binaryExpression(
          node.operator,
          OneStep(node.left) as es.Expression,
          node.right
        )
      } else {
        // BinOp[V, E] -> BinOp[V, E']
        return ast.binaryExpression(
          node.operator,
          node.left,
          OneStep(node.right) as es.Expression
        )
      }
    },
    LogicalExpression(node: es.LogicalExpression): es.LogicalExpression {
      if (OneStepPossible(node.left)) {
        // BinOp[E1, E2] -> BinOp[E1', E2]
        return ast.logicalExpression(
          node.operator,
          OneStep(node.left) as es.Expression,
          node.right,
          node.loc
        )
      } else {
        // BinOp[V, E] -> BinOp[V, E']
        return ast.logicalExpression(
          node.operator,
          node.left,
          OneStep(node.right) as es.Expression,
          node.loc
        )
      }
    },
    ConditionalExpression(node: es.ConditionalExpression): es.ConditionalExpression {
      if (OneStepPossible(node.test)) {
        // E1 : E2 ? E3 -> E1' : E2 ? E3
        return ast.conditionalExpression(
          OneStep(node.test) as es.Expression,
          node.alternate,
          node.consequent
        )
      } else {
        // conditionalExpression is contractible already
        return OneStep(node) as es.ConditionalExpression
      }
    },
    default(node: Node): Node {
      return node
    }
  }
  const stepper = contractible(node)
    ? OneSteppers['contractible']
    : OneSteppers[node.type] ?? OneSteppers.default
  node = stepper(node)
  return node
}
