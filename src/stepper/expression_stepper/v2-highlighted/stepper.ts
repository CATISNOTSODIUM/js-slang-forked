import es from 'estree'
import { StepperExpression } from "./expression";
import { convert } from './converter';
import { codify } from './converter';
import * as astring from 'astring'
import { sourceGen } from '../../../utils/ast/astToString';

interface IStepperOutput {
    ast: string;
    markers: IMarker[];
    explanation: string
}

export interface IMarker {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
    className: string;
}

export function getEvaluationStepsExpr(program: es.Program): IStepperOutput[] {
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

    getStepsWithExplanation(): IStepperOutput[] {
        return this.steps.map(ast => ({
            ast: JSON.stringify(ast),
            explanation: "🔥 rampage",
            markers: getMarker(ast)
        }));
    }

    getMarkers(): IMarker[] {
        const markerList: IMarker[] = [];
        this.steps.forEach(expr => astToStringWithMarkers(expr, markerList));
        return markerList;
    }
}

// extract all markers from AST nodes
export const getMarker = (node: any): IMarker[] => {
    const markerList: IMarker[] = [];
    astToStringWithMarkers(node, markerList);
    return markerList;
}

export const astToStringWithMarkers = (node: any, markerList: IMarker[]) : string => {
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
          });
        } else {
          generator(node, state);
        }
      }
      return [nodeType, modifiedGenerator] 
    })
  )
  })
  return content;
}