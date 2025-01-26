import es from 'estree'
import { substituterNodes } from '../../types'
import * as ast from '../../utils/ast/astCreator'

type irreducibleNodes =
  | es.FunctionExpression
  | es.ArrowFunctionExpression
  | es.Literal
  | es.ArrayExpression

export function substitute(
    name: es.Identifier,
    replacement: irreducibleNodes | es.Identifier,
    target: substituterNodes
) {
  const substituters = {
    Identifier(target: es.Identifier) {
      if (replacement.type === 'Literal') {
        if (target.name === name.name) {
          return ast.primitive(replacement.value)
        }
        return target;
      } else {
        return target; 
      }
    },
    ExpressionStatement(target: es.ExpressionStatement) {
      return ast.expressionStatement(substitute(name, replacement, target.expression));
    },
    UnaryExpression(target: es.UnaryExpression) {
      return ast.unaryExpression(target.operator, substitute(name, replacement, target.argument));
    },
    BinaryExpression(target: es.BinaryExpression) {
      return ast.binaryExpression(target.operator, substitute(name, replacement, target.left), substitute(name, replacement, target.right));
    },
    ConditionalExpression(target: es.ConditionalExpression) {
      return ast.conditionalExpression(
        substitute(name, replacement, target.test),
        substitute(name, replacement, target.consequent),
        substitute(name, replacement, target.alternate)
      )
    },
    Program(target: es.Program) {
      // naive implementation -> keep substituting until the end of the program (not efficient)
      const programBody: es.Statement[] = target.body.map((_target) => substitute(name, replacement, _target));
      return ast.program(programBody);
    }
  }
  const substituter = substituters[target.type];
  if (substituter === undefined) {
    return target;
  } else {
    return substituter(target);
  }
}

// V01: Naive implementation
/*
export function substitute(
    name: es.Identifier,
    replacement: irreducibleNodes | es.Identifier,
    target: substituterNodes
) {
  const substituters = {
    Identifier(target: es.Identifier) {
      if (replacement.type === 'Literal') {
        if (target.name === name.name) {
          return ast.primitive(replacement.value)
        }
        return target;
      } else {
        return target; 
      }
    },
    ExpressionStatement(target: es.ExpressionStatement) {
      return ast.expressionStatement(substitute(name, replacement, target.expression));
    },
    UnaryExpression(target: es.UnaryExpression) {
      return ast.unaryExpression(target.operator, substitute(name, replacement, target.argument));
    },
    BinaryExpression(target: es.BinaryExpression) {
      return ast.binaryExpression(target.operator, substitute(name, replacement, target.left), substitute(name, replacement, target.right));
    },
    ConditionalExpression(target: es.ConditionalExpression) {
      return ast.conditionalExpression(
        substitute(name, replacement, target.test),
        substitute(name, replacement, target.consequent),
        substitute(name, replacement, target.alternate)
      )
    },
    Program(target: es.Program) {
      // naive implementation -> keep substituting until the end of the program (not efficient)
      const programBody: es.Statement[] = target.body.map((_target) => substitute(name, replacement, _target));
      return ast.program(programBody);
    }
  }
  const substituter = substituters[target.type];
  if (substituter === undefined) {
    return target;
  } else {
    return substituter(target);
  }
}
  */