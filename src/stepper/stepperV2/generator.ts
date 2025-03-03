import { generate } from 'astring'
import { IStepperPropContents } from '.'
import { sourceGen } from '../../utils/ast/astToString'

export function toStringWithMarker(props: IStepperPropContents) {
  const ast = props[0]
  const target = props[1]
  const markerType = props[2]
  var markerPosition = undefined
  // modify astring.generate
  const content = generate(ast, {
    generator: Object.fromEntries(
      Object.entries(sourceGen).map(([nodeType, generator]: any) => {
        const modifiedGenerator = (node: any, state: any) => {
          if (node === target) {
            // track marker position
            const beforeMarker = state.toString().length
            generator(node, state)
            const afterMarker = state.toString().length
            markerPosition = [beforeMarker, afterMarker, markerType]
          } else {
            generator(node, state)
          }
        }
        return [nodeType, modifiedGenerator]
      })
    )
  })
  // return as array of text with tags
  if (markerPosition) {
    const firstPart = content.substring(0, markerPosition[0])
    const middlePart = content.substring(markerPosition[0], markerPosition[1])
    const lastPart = content.substring(markerPosition[1])
    return [
      { text: firstPart, className: '' },
      { text: middlePart, className: markerPosition[2] },
      { text: lastPart, className: '' }
    ]
  } else {
    return [{ text: content, className: '' }]
  }
}