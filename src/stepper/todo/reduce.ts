import es from 'estree'
import * as ast from '../../utils/ast/astCreator'
import { evaluateBinaryExpression, evaluateUnaryExpression } from '../../utils/operators'
import { substituterNodes } from '../../types';
import { substitute } from './substitute';
type Node = substituterNodes;
type irreducibleNodes =
  | es.FunctionExpression
  | es.ArrowFunctionExpression
  | es.Literal
  | es.ArrayExpression

// Literal checkers

function isBooleanLiteral(node: Node) {
  return node.type === 'Literal' && typeof node.value === 'boolean'
}

function isNumberLiteral(node: Node) {
  return node.type === 'Literal' && typeof node.value === 'number'
}

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
    VariableDeclaration(node: es.VariableDeclaration) {
      // TODO
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
    VariableDeclaration(node: es.VariableDeclaration) {
      // const result = node.declarations.reduce((acc, childNode) => acc && reduceOneStepPossible(childNode), true);
      return true;
    },
    VariableDeclarator(node: es.VariableDeclarator) {
      const result = node.init && reduceOneStepPossible(node.init);
      return result;
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
export function reduceOneStep(node: Node): Node {
  // TODO: A queue that handles substitutions
  const substitutionQueue: es.VariableDeclarator[] = [];

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
      // V1; V2; -> V2; (remove the first statement)
      // a little bit inefficient, but keep it simple!
      node.body.shift(); 
      return ast.program(node.body as es.Statement[]); // fix
    },
    ExpressionStatement(node: es.ExpressionStatement) { // E; -> E';
      return ast.expressionStatement(reduceOneStep(node.expression) as es.Expression)
    },
    VariableDeclaration(node: es.VariableDeclaration) {
      for (var [index, childNode] of node.declarations.entries()) {
          if (reduceOneStepPossible(childNode)) {
            let newDeclarations = node.declarations;
            const reducedChildNode = reduceOneStep(childNode) as es.VariableDeclarator; 
            newDeclarations[index] = reducedChildNode;
            return ast.variableDeclaration(newDeclarations);
          } 
      }

      node.declarations.forEach(childNode => {
        substitutionQueue.push(childNode);
      });

      return ast.literal('undefined');
    },
    VariableDeclarator(node: es.VariableDeclarator) {
      return ast.variableDeclarator(node.id, reduceOneStep(node.init!) as es.Expression);
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
  
  while (substitutionQueue.length > 0) {
    const currentSubstitution = substitutionQueue.pop();
    console.log("SUBSTITUTE", currentSubstitution?.id, node);
    node = substitute(currentSubstitution!.id as es.Identifier, currentSubstitution!.init as irreducibleNodes, node);
  }
  return node;
}

// Fix substitution "undefined"