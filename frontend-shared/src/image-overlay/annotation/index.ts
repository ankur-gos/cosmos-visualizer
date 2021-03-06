import {useContext, useState} from 'react';
import h from '@macrostrat/hyper';
import {min, max} from 'd3-array';
import {Intent} from '@blueprintjs/core';
import classNames from 'classnames';

import {Rectangle, StaticRectangle} from './drag-rect';
import {EditMode} from '~/enum';
import {EditorContext} from '~/image-overlay/context';
import {AnnotationControls} from './controls'
import {
  useTags,
  useAnnotationColor,
  useAnnotationUpdater,
  useAnnotationActions,
  useAnnotationIndex,
  useSelectedAnnotation,
  useSelectionUpdater,
} from '~/providers'


const tagBounds = boxes => [
  min(boxes, d => d[0]),
  min(boxes, d => d[1]),
  max(boxes, d => d[2]),
  max(boxes, d => d[3])
];

const tagCenter = function(boxes){
  const d = tagBounds(boxes);
  return [(d[0]+d[2])/2, (d[1]+d[3])/2];
};

const AnnotationPart = (props)=>{
  const {update, onDelete, bounds, color, ...rest} = props

  return h(Rectangle, {bounds, update, color, ...rest}, [
    h.if(onDelete != null)(ToolButton, {
      icon: 'cross',
      className: 'delete-rect',
      intent: Intent.DANGER,
      onClick: onDelete
    })
  ])
}

function annotationPartUpdater(update, ix){
  /* Returns an updater function for a particular
     annotation subpart
  */
  if (update == null) { return null; }
  // Return an updater function
  return spec=> {
    const {bounds: subSpec} = spec;
    if (subSpec == null) { return; }
    return update({boxes: {[ix]: subSpec}});
  };
}

interface AnnotationProps {
  obj: Annotation,
  children: React.ReactChild
}

const Annotation = (props: AnnotationProps)=>{
  const {obj} = props;
  const {boxes, name: tag_name, tag_id} = obj;

  const {selectAnnotation} = useAnnotationActions()!
  /* This could be simplified significantly;
     we rely on indexing to tell if we have the same annotations
  */
  const ix = useAnnotationIndex(obj)
  const update = useAnnotationUpdater(obj)
  const isSelected = update != null
  const overallBounds = tagBounds(boxes);

  const c = useAnnotationColor(obj)
  let alpha = isSelected ? 0.6 : 0.3;

  const color = c.alpha(alpha).css();

  const tags = useTags()
  let tagName = tags.find(d => d.tag_id === tag_id)?.name ?? tag_name;
  // Sometimes we don't return tags

  const {actions, editModes} = useContext(EditorContext);

  const onMouseDown = () => {
    if (editModes.has(EditMode.LINK)) {
      (actions.addLink(ix))();
      actions.setMode(EditMode.LINK, false);
    } else {
      selectAnnotation(ix)();
    }
    // Don't allow dragging
    event.stopPropagation();
  };


  const className = classNames({active: isSelected});
  return h('div.annotation', {className}, [
    h(Rectangle, {
      bounds: overallBounds,
      color,
      backgroundColor: 'none',
      style: {pointerEvents: 'none'}
    }, [
      h('div.tag-name', {style: {color: c.darken(2).css()}}, tagName),
      h(AnnotationControls, {
        annotation: obj
      })
    ]),
    h('div.tag', {className}, boxes.map((bounds, i)=> {
      // Need actual logic here to allow display if editing is enabled
      let onDelete = null
      let editingEnabled = false
      if (boxes.length <= 1) editingEnabled = false
      if (editingEnabled) {
        onDelete = () => update({boxes: {$splice: [[i,1]]}})
      }

      return h(AnnotationPart, {
        bounds,
        update: annotationPartUpdater(update, i),
        onDelete,
        onMouseDown,
        color
      })
    }))
  ]);
}

// TODO: Not sure where this belongs
// setTag(tag){
//   const {update} = this.props;
//   console.log(tag);
//   return update({tag_id: {$set: tag.tag_id}});
// }

const LockedAnnotation = (props: AnnotationProps)=>{
  const {obj} = props;
  const {tag_id, boxes} = obj

  const c = useAnnotationColor(obj)
  const alpha = 0.2;
  const color = c.alpha(alpha).css();

  return h('div.annotation.locked', boxes.map((bounds, i)=> {
    return h(Rectangle, {
      bounds,
      color
    });
  }));
}

interface BasicAnnotationProps extends AnnotationProps {
  alpha?: number,
  onClick?: React.UIEventHandler,
  onMouseOver?: React.UIEventHandler,
  onMouseLeave?: React.UIEventHandler,
  className?: string
}

const BasicAnnotation = (props: BasicAnnotationProps)=>{
  const {obj, children, alpha, className, ...rest} = props;
  const {name, boxes, score} = obj

  const c = useAnnotationColor(obj)
  const color = c.alpha(alpha ?? 0.5).css();

  return h('div.annotation', {className}, boxes.map((bounds, i)=> {
    return h(StaticRectangle, {
      bounds,
      color,
      ...rest
    }, [
    h('div.tag-name', {style: {color: c.darken(2).css()}}, `${name} (${score})`),
        children
    ]);
  }));
}


const SelectableAnnotation = (props: AnnotationProps)=>{
  const selected = useSelectedAnnotation()
  const isSelected = selected == props.obj
  const updateSelection = useSelectionUpdater()

  return h(BasicAnnotation, {
    ...props,
    alpha: isSelected ? 0.6 : 0.3,
    onClick: ()=>updateSelection(props.obj)
  })
}

const SimpleAnnotation = BasicAnnotation

export {
  SimpleAnnotation,
  SelectableAnnotation,
  Annotation,
  AnnotationProps,
  LockedAnnotation,
  tagCenter,
  tagBounds
};
