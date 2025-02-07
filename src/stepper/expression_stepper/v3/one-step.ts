import { Contract, Contractible } from "./contract";
import { Visitor, StepperBinaryExpression, StepperConditionalExpression, StepperExpression, StepperLiteral, StepperLogicalExpression, StepperUnaryExpression } from "./expression";


export class OneStepPossible extends Visitor {
    contractible: Contractible;
    contract: Contract
    constructor() {
        super();
        this.contract = new Contract();
        this.contractible = new Contractible();
    }
    visitLiteral(node: StepperLiteral): boolean {
        return this.contractible.visit(node);
    }
    visitUnaryExpression(node: StepperUnaryExpression): boolean {
        return this.contractible.visit(node) 
            || this.visit(node.argument);
    }
    visitBinaryExpression(node: StepperBinaryExpression): boolean {
        return this.contractible.visit(node) 
            || this.visit(node.left) || this.visit(node.right);
    }
    visitLogicalExpression(node: StepperLogicalExpression): boolean {
        return this.contractible.visit(node) 
            || this.visit(node.left) || this.visit(node.right);
    }
    visitConditionalExpression(node: StepperConditionalExpression): boolean {
        return this.contractible.visit(node) 
            || this.visit(node.test);
    }

}

export class OneStep extends Visitor {
    contractible: Contractible;
    contract: Contract;
    oneStepPossible: OneStepPossible;
    constructor() {
        super()
        this.contract = new Contract();
        this.contractible = new Contractible();
        this.oneStepPossible = new OneStepPossible();
    }
    visitLiteral(node: StepperLiteral): StepperExpression {
        return node;    
    }
    visitUnaryExpression(node: StepperUnaryExpression): StepperExpression {
        if (this.contractible.visit(node))  {
            return this.contract.visit(node)
        }
        return new StepperUnaryExpression(
            node.operator, this.visit(node.argument)
        );
    }
    visitBinaryExpression(node: StepperBinaryExpression): StepperExpression {
        if (this.contractible.visit(node)) return this.contract.visit(node)
        // BinOp[E1, E2] -> BinOp[E1', E2]
        if (this.oneStepPossible.visit(node.left)) {
        return new StepperBinaryExpression(
            node.operator, this.visit(node.left), node.right)
        } else {
        return new StepperBinaryExpression(
            node.operator, node.left, this.visit(node.right)
        )
        }
    }
    visitLogicalExpression(node: StepperLogicalExpression): StepperExpression {
        if (this.contractible.visit(node)) return this.contract.visit(node)
        // BinOp[E1, E2] -> BinOp[E1', E2]
        if (this.oneStepPossible.visit(node.left)) {
        return new StepperLogicalExpression(
            node.operator, this.visit(node.left), node.right)
        } else {
        return new StepperLogicalExpression(
            node.operator, node.left, this.visit(node.right)
        )
        }
    }
    visitConditionalExpression(node: StepperConditionalExpression): StepperExpression {
        if (this.contractible.visit(node)) return this.contract.visit(node)
        if (this.oneStepPossible.visit(node.test)) {
        // E1 : E2 ? E3 -> E1' : E2 ? E3
        return new StepperConditionalExpression(
            this.visit(node.test),
            node.alternate,
            node.consequent
        )
        } else {
        return this.visit(node);
        }
    }
}