import es from 'estree'
import { StepperExpression } from "./expression";
import { convert } from './converter';
import { codify } from './converter';

export function getEvaluationStepsExpr(program: es.Program): string[] {
  const parsedExpr = (program.body[0] as es.ExpressionStatement).expression;
  const stepper = new Stepper(parsedExpr);
  stepper.run();
  return stepper.getStepsStringify();
}

export class Stepper {
    private payload: StepperExpression
    private steps: StepperExpression[]
    constructor(payload: es.Node) {
        this.payload = convert(payload);
        this.steps = [];
    }

    run(max_iteration = 10) {
        for (let i = 0; i < max_iteration; i++) {
            if (!this.payload.oneStepPossible()) break;
            // this.steps.push(this.payload); // highlight regex 
            this.payload = this.payload.oneStep();
            this.steps.push(this.payload); // highlight output regex
        }
    }

    getSteps(): StepperExpression[] {
        return this.steps;
    }

    getStepsStringify(): string[] {
        return this.steps.map(ast => JSON.stringify(ast));
    }

    getStepsCodify(): string[] {
        return this.steps.map(codify);
    }
}