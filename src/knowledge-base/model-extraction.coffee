import {Component} from 'react'
import h from 'react-hyperscript'

KBImage = (props)->
  {path, rest...} = props
  src = path.replace "img/", "/kb-images/"
  h 'img', {src, rest...}

class ModelExtraction extends Component
  render: ->
    {index} = @props
    console.log @props

    fig = null
    if @props.assoc_img_path?
      fig = h KBImage, {path: @props.assoc_img_path}

    h 'div.model-extraction', [
      h 'div.index', index
      h 'div.images', [
        fig
        h KBImage, {path: @props.target_img_path}
      ]
      h 'div', [
        h 'p', @props.target_unicode
        h 'p', @props.assoc_unicode
      ]
    ]

export {ModelExtraction}
