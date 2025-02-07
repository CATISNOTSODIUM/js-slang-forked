import es from 'estree'
import { StepperExpression } from "./expression";
import { convert } from './converter';
import { codify } from './converter';
import { OneStep, OneStepPossible } from './one-step';

export class Stepper {
    private payload: StepperExpression
    private steps: StepperExpression[]
    private oneStepPossible: OneStepPossible;
    private oneStep: OneStep;
    constructor(payload: es.Node) {
        this.payload = convert(payload);
        this.steps = [];
        this.oneStepPossible = new OneStepPossible();
        this.oneStep = new OneStep();
    }

    run(max_iteration = 10) {
        for (let i = 0; i < max_iteration; i++) {
            if (!this.oneStepPossible.visit(this.payload)) break;
            this.steps.push(this.payload); // highlight regex 
            this.payload = this.oneStep.visit(this.payload);
            this.steps.push(this.payload); // highlight output regex
        }
    }

    getSteps(): StepperExpression[] {
        return this.steps;
    }

    getStepsCodify(): string[] {
        return this.steps.map(codify);
    }
}