import es from 'estree'
import * as stepper from './expression';

const undefinedNode = new stepper.StepperLiteral('undefined');


const nodeConverters: {[Key: string]: (node: any) => stepper.StepperExpression} = {
  Literal: (node: es.SimpleLiteral) => stepper.StepperLiteral.create(node),
  UnaryExpression: (node: es.UnaryExpression) => stepper.StepperUnaryExpression.create(node),
  BinaryExpression: (node: es.BinaryExpression) => stepper.StepperBinaryExpression.create(node),
  LogicalExpression: (node: es.LogicalExpression) => stepper.StepperLogicalExpression.create(node),
  ConditionalExpression: (node: es.ConditionalExpression) => stepper.StepperConditionalExpression.create(node),
};

export function convert(node: es.Node) {
  const converter = nodeConverters[node.type as keyof typeof nodeConverters];
  const result =  converter ? converter(node as any) : undefinedNode;
  return result;
}

const nodeTreeify = {
    Literal: (node: stepper.StepperLiteral) => node.value?.toString(),
    UnaryExpression: (node: stepper.StepperUnaryExpression) => node.operator + treeify(node.argument),
    BinaryExpression: (node: stepper.StepperBinaryExpression) =>  treeify(node.left) + ' ' +  node.operator + ' ' +  treeify(node.right),
    LogicalExpression: (node: stepper.StepperLogicalExpression) =>  treeify(node.left) + ' ' + node.operator + ' ' + treeify(node.right),
    ConditionalExpression: (node: stepper.StepperConditionalExpression) => treeify(node.test) + ' ? ' + treeify(node.consequent) + ' : ' + treeify(node.alternate),
}
function treeify(node: stepper.StepperExpression, isHighlighted = true): string {
    const treeifiers = nodeTreeify[node.type as keyof typeof nodeTreeify];
    if (!treeifiers) {
        return "";
    }
    const res = (treeifiers(node as any) ?? '').toString();
    return res;
}

export function codify(node: stepper.StepperExpression): string {
    const res = treeify(node);
    return res;
}