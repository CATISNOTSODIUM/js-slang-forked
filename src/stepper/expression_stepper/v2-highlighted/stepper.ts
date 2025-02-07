import es from 'estree'
import { StepperExpression } from "./expression";
import { convert } from './converter';
import { codify } from './converter';

export class Stepper {
    private payload: StepperExpression
    private steps: StepperExpression[]
    constructor(payload: es.Node) {
        this.payload = convert(payload);
        this.steps = [];
    }

    run(max_iteration = 10) {
        for (let i = 0; i < max_iteration; i++) {
            // highlight regex 
            if (!this.payload.oneStepPossible()) break; 
            this.steps.push(Object.assign({}, this.payload)); 
            // reduce and highlight output regex
            this.payload = this.payload.oneStep();
            this.steps.push(Object.assign({}, this.payload)); 
        }
    }

    getSteps(): StepperExpression[] {
        return this.steps;
    }

    getStepsCodify(): string[] {
        return this.steps.map(codify);
    }
}