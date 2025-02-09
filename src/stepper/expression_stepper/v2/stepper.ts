import es from 'estree'
import * as astring from 'astring'
import { StepperExpression } from "./expression";
import { convert } from './converter';
import { codify } from './converter';
import { sourceGen } from '../../../utils/ast/astToString';

interface IStepperOutput {
    ast: string,
    explanation: string
}

export interface IMarker {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
    className: string;
}

export function getEvaluationStepsExpr(program: es.Program): IStepperOutput[]{
  const parsedExpr = (program.body[0] as es.ExpressionStatement).expression;
  const stepper = new Stepper(parsedExpr);
  stepper.run();
  return stepper.getStepsWithExplanation();
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

    getStepsWithExplanation(): IStepperOutput[] {
        return this.steps.map(ast => ({
            ast: JSON.stringify(ast),
            explanation: "🔥 rampage"
        }));
    }

    getStepsCodify(): string[] {
        return this.steps.map(codify);
    }
}

export const astToStringWithMarkers = (node: Node) : [string, any[]] => {
  let markerList: any[] = [];
  const getMarkerInformation = (content: string): number[] => {
    const splittedContent = content.split('\n');
    const rowNumber = splittedContent.length - 1;
    const colNumber = splittedContent[rowNumber].length;
    return [rowNumber, colNumber];
  }
  const content = astring.generate(node, {
    generator: Object.fromEntries(
    Object.entries(sourceGen).map(
    ([nodeType, generator]: any) => {
      const modifiedGenerator = (node: any, state: any) => {
        if (node.status !== undefined) { // beforeMarker & afterMarker
          const beforeGenerated = getMarkerInformation(state.toString());
          generator(node, state);
          const afterGenerated = getMarkerInformation(state.toString());
          markerList.push({
            startRow: beforeGenerated[0],
            startCol: beforeGenerated[1],
            endRow: afterGenerated[0],
            endCol: afterGenerated[1],
            className: node.status,
            type: 'background'
          });
        } else {
          generator(node, state);
        }
      }
      return [nodeType, modifiedGenerator] 
    })
  )
  })
  return [content, markerList];
}